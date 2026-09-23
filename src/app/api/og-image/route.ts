import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/utils/supabase/server";

/* Serves the og:image for one page of a client's site, for SlidePages.
 *
 * Returns the image bytes on success. On failure the status code tells the
 * client WHICH kind of failure it was, because the slide renders them very
 * differently — a page that doesn't respond is a finding worth showing the
 * client; a page that simply lacks a meta tag is not:
 *
 *   200 → image bytes
 *   404 → page loads fine, but declares no og:image  (quiet favicon fallback)
 *   502 → page itself is 4xx/5xx/timeout             (surfaced as "broken")
 *   400 → the request was malformed or blocked
 *
 * Never conflate 404 and 502 in the UI. A missing og tag says nothing about
 * whether the page works — measured on real Swedish sites, most 200-OK pages
 * have no og:image at all.
 *
 * Access: this route makes the server fetch other sites, so it is not open to
 * the world. A signed-in user may use it; a viewer of a public share link may
 * use it with that link's token, and then only for the shared report's own
 * domain. Every hop is fetched by hand (redirect: "manual") and its host
 * re-checked, so a public page cannot bounce the fetch to an internal address. */

const PAGE_TIMEOUT_MS = 4000;
const IMAGE_TIMEOUT_MS = 4000;
const HEAD_BYTES = 60_000; // og tags live in <head>; never read a whole page
const MAX_IMAGE_BYTES = 3_000_000;
const UA = "Mozilla/5.0 (compatible; ClarixReportBot/1.0; +https://clarix.se)";
const MAX_REDIRECTS = 5;

// Reported to the client via header so the slide can explain itself.
type Reason = "ok" | "no-tag" | "page-error" | "image-error" | "bad-request";

function fail(status: number, reason: Reason, detail?: string) {
  return new NextResponse(null, {
    status,
    headers: {
      "x-og-reason": reason,
      ...(detail ? { "x-og-detail": detail.slice(0, 120) } : {}),
      // Cache failures too, briefly — a dead page shouldn't be re-fetched on
      // every render, but should recover without a deploy once it's fixed.
      // Private: access depends on the caller, so no shared cache may keep it.
      "Cache-Control": "private, max-age=1800",
    },
  });
}

/** Block private/link-local/loopback ranges — this route fetches a URL that
 *  ultimately derives from connected-account data, so treat it as untrusted. */
function isPrivateAddress(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||            // link-local
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||  // CGNAT
      a >= 224                               // multicast + reserved
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
    // IPv4-mapped (::ffff:10.0.0.1) — unwrap and re-check
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true;
}

async function assertPublicHost(hostname: string) {
  // Resolve every A/AAAA record; one public answer alongside a private one is
  // still a rebinding risk, so require all of them to be public.
  const results = await lookup(hostname, { all: true });
  if (results.length === 0) throw new Error("no dns record");
  for (const { address } of results) {
    if (isPrivateAddress(address)) throw new Error("private address");
  }
}

async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, ...(init.headers ?? {}) },
      ...init,
    });
  } finally {
    clearTimeout(timer);
  }
}

class BlockedError extends Error {}

/** Follows redirects by hand, re-checking scheme and host on every hop, so a
 *  public page can't redirect the server to a private address. Returns the
 *  final response and the URL it came from. */
async function safeFetch(url: string, ms: number, init: RequestInit = {}): Promise<{ res: Response; url: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new BlockedError("scheme");
    try {
      await assertPublicHost(u.hostname);
    } catch {
      throw new BlockedError("host not publicly routable");
    }
    const res = await fetchWithTimeout(current, ms, { ...init, redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      res.body?.cancel().catch(() => {});
      current = new URL(location, current).href;
      continue;
    }
    return { res, url: current };
  }
  throw new BlockedError("too many redirects");
}

const bareHost = (d: string) =>
  d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase().trim().replace(/^www\./, "");

/** Signed in, or holding a valid share token whose report is about `domain`. */
async function authorize(req: NextRequest, domain: string): Promise<NextResponse | null> {
  const share = req.nextUrl.searchParams.get("share");
  if (share) {
    if (!/^[A-Za-z0-9_-]{32,}$/.test(share)) return fail(401, "bad-request", "invalid share token");
    const supabase = createClient(await cookies());
    const { data } = await supabase
      .rpc("get_shared_report_by_token_hash", { p_token_hash: createHash("sha256").update(share).digest("hex") })
      .maybeSingle();
    const reportDomain = (data as { report_data?: { meta?: { clientDomain?: string | null } } } | null)
      ?.report_data?.meta?.clientDomain;
    if (!reportDomain || bareHost(reportDomain) !== bareHost(domain)) {
      return fail(403, "bad-request", "not this report's site");
    }
    return null;
  }
  const auth = await requireUser();
  return auth.ok ? null : fail(auth.state === "error" ? 503 : 401, "bad-request", "sign-in required");
}

/** Read at most `limit` bytes, then stop. Guards against huge responses. */
async function readBounded(res: Response, limit: number): Promise<Buffer> {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (total < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      total += value.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}

/** og:image / twitter:image from raw HTML, attribute-order agnostic. */
function extractImageUrl(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  let twitter: string | null = null;
  for (const tag of tags) {
    const key = tag.match(
      /(?:property|name)\s*=\s*["']?\s*(og:image(?::secure_url|:url)?|twitter:image(?::src)?)\s*["']?/i,
    );
    if (!key) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    const value = content?.[1]?.trim();
    if (!value) continue;
    if (key[1].toLowerCase().startsWith("og:")) return value; // og wins outright
    twitter ??= value;
  }
  return twitter;
}

export async function GET(req: NextRequest) {
  const domainParam = req.nextUrl.searchParams.get("domain") ?? "";
  const pathParam = req.nextUrl.searchParams.get("path") ?? "/";

  const domain = domainParam
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();

  // Must look like a real hostname: has a dot, no port, no credentials, not an IP.
  if (
    !domain ||
    !domain.includes(".") ||
    /[^a-z0-9.-]/.test(domain) ||
    /^\d+(\.\d+)*$/.test(domain) ||
    domain.endsWith(".local") ||
    domain.endsWith(".internal")
  ) {
    return fail(400, "bad-request", "invalid domain");
  }

  // Path must stay a path — no protocol-relative or absolute jumps to another host.
  const path = pathParam.startsWith("/") && !pathParam.startsWith("//") ? pathParam : "/";

  const refused = await authorize(req, domain);
  if (refused) return refused;

  try {
    await assertPublicHost(domain);
  } catch {
    return fail(400, "bad-request", "host not publicly routable");
  }

  // Resolve the site's real base first. GA4 reports paths against the live
  // site, but clientDomain is the bare property domain — clasohlson.com
  // redirects to www.clasohlson.com/se/, so joining the path to the bare
  // domain yields a 404 on a page that is perfectly healthy. Flagging that as
  // "broken" would be a false accusation, so follow the root redirect and
  // join against wherever the site actually lives.
  let base: URL;
  try {
    const root = await safeFetch(`https://${domain}/`, PAGE_TIMEOUT_MS, { method: "GET" });
    base = new URL(root.url);
    root.res.body?.cancel().catch(() => {});
  } catch {
    base = new URL(`https://${domain}/`);
  }

  let pageUrl: string;
  try {
    // Prefer the redirected base path (e.g. /se/) when the site uses a locale
    // prefix and the reported path doesn't already carry it.
    const prefix = base.pathname.replace(/\/$/, "");
    const joined = prefix && !path.startsWith(`${prefix}/`) ? `${prefix}${path}` : path;
    const u = new URL(joined, base.origin);
    pageUrl = u.href;
  } catch {
    return fail(400, "bad-request", "unparseable url");
  }

  try {
    await assertPublicHost(new URL(pageUrl).hostname);
  } catch {
    return fail(400, "bad-request", "resolved host not publicly routable");
  }

  // ---- Fetch the page -------------------------------------------------------
  let pageRes: Response;
  let pageFinalUrl: string;
  try {
    ({ res: pageRes, url: pageFinalUrl } = await safeFetch(pageUrl, PAGE_TIMEOUT_MS));
  } catch (e) {
    if (e instanceof BlockedError) return fail(400, "bad-request", e.message);
    const aborted = e instanceof Error && e.name === "AbortError";
    return fail(502, "page-error", aborted ? "timeout" : "unreachable");
  }

  // If a locale-prefixed guess 404s, the reported path may already have been
  // correct. Retry it bare before concluding the page is broken.
  if (pageRes.status === 404 && pageUrl !== new URL(path, base.origin).href) {
    try {
      const retry = await safeFetch(new URL(path, base.origin).href, PAGE_TIMEOUT_MS);
      if (retry.res.ok) {
        pageRes = retry.res;
        pageFinalUrl = retry.url;
      } else {
        retry.res.body?.cancel().catch(() => {});
      }
    } catch {
      /* keep the original result */
    }
  }

  if (!pageRes.ok) {
    // Rate limiting is about us, not the client's site — don't accuse a page
    // of being broken because we got throttled.
    const reason: Reason = pageRes.status === 429 ? "image-error" : "page-error";
    return fail(502, reason, `page ${pageRes.status}`);
  }

  const ctype = pageRes.headers.get("content-type") ?? "";
  if (!ctype.includes("html")) return fail(404, "no-tag", "not html");

  const html = new TextDecoder("utf-8", { fatal: false }).decode(
    await readBounded(pageRes, HEAD_BYTES),
  );

  const rawImage = extractImageUrl(html);
  if (!rawImage) return fail(404, "no-tag", "no og:image");

  // Resolve against the FINAL url — redirects move the base.
  let imageUrl: URL;
  try {
    imageUrl = new URL(rawImage, pageFinalUrl);
  } catch {
    return fail(404, "no-tag", "unresolvable og:image");
  }
  if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
    return fail(404, "no-tag", "unsupported scheme");
  }

  // The image often lives on a CDN — re-check that host too.
  try {
    await assertPublicHost(imageUrl.hostname);
  } catch {
    return fail(400, "bad-request", "image host not publicly routable");
  }

  // ---- Fetch the image ------------------------------------------------------
  try {
    const { res: imgRes } = await safeFetch(imageUrl.href, IMAGE_TIMEOUT_MS, {
      headers: { referer: pageUrl },
    });
    if (!imgRes.ok) {
      // Declared but not served. That IS a real site defect — but it breaks
      // sharing previews, not the page, so it stays distinct from page-error.
      return fail(502, "image-error", `og:image ${imgRes.status}`);
    }

    const imgType = imgRes.headers.get("content-type") ?? "";
    if (!imgType.startsWith("image/")) {
      return fail(502, "image-error", "og:image is not an image");
    }

    const declared = Number(imgRes.headers.get("content-length") ?? 0);
    if (declared > MAX_IMAGE_BYTES) return fail(502, "image-error", "og:image too large");

    const buf = await readBounded(imgRes, MAX_IMAGE_BYTES);
    if (buf.length === 0) return fail(502, "image-error", "og:image empty");

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": imgType,
        "x-og-reason": "ok",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    if (e instanceof BlockedError) return fail(400, "bad-request", `og:image ${e.message}`);
    const aborted = e instanceof Error && e.name === "AbortError";
    return fail(502, "image-error", aborted ? "og:image timeout" : "og:image failed");
  }
}
