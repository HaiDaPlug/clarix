"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { type SlideData } from "../slide-data";
import { SlideHeading } from "../primitives/SlideHeading";
import { TREND_POS, TREND_NEG, TREND_NEG_BG } from "../tokens";
import { useSlideReveal, fadeUp } from "../primitives/reveal";
import { useShareToken } from "../share-token";

function TrendCell({ trend, delta }: { trend: "up" | "down" | "flat" | null; delta: number | null }) {
  if (!trend || trend === "flat") {
    return <span className="text-[15px]" style={{ color: "var(--muted-foreground)" }}>—</span>;
  }
  const isUp = trend === "up";
  const color = isUp ? TREND_POS : TREND_NEG;
  return (
    <span className="inline-flex items-center gap-1 text-[14px] font-semibold tabular-nums" style={{ color }}>
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
        {isUp
          ? <path d="M6 10V2M2 6l4-4 4 4" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M6 2v8M2 6l4 4 4-4" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
      {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : null}
    </span>
  );
}

/* Thumbnail states, in the order we degrade through them.
 *
 * Three failure modes, deliberately kept apart — they are different facts
 * about the client's site and conflating them would misinform:
 *
 *   "broken"     the page itself didn't respond (4xx/5xx/timeout). A real
 *                defect worth flagging hard.
 *   "no-image"   the page declares an og:image, but that image 404s. Also a
 *                real defect — sharing this page shows a blank preview — but
 *                the page works, so it reads as a warning, not an outage.
 *   "favicon"    the page is healthy and simply never declared an og:image.
 *                Not a defect. Stays quiet.                                 */
type ThumbState = "loading" | "og" | "favicon" | "letter" | "broken" | "no-image";

/** Reasons the route reports; exported so the slide can count them. */
export type OgReason = "ok" | "no-tag" | "page-error" | "image-error" | "unknown";

function reasonToState(reason: OgReason): ThumbState {
  if (reason === "ok") return "og";
  if (reason === "page-error") return "broken";
  if (reason === "image-error") return "no-image";
  return "favicon"; // no-tag / unknown — the page is fine, stay quiet
}

function ogImageUrl(domain: string, path: string, shareToken: string | null) {
  const share = shareToken ? `&share=${encodeURIComponent(shareToken)}` : "";
  return `/api/og-image?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}${share}`;
}

/** One GET: the status and x-og-reason header decide the state, and the same
 *  bytes become the <img> source, so the server fetches the client's page
 *  once per thumbnail (a HEAD first made the route do all its work twice). */
function useOgImage(domain: string, path: string, onReason?: (r: OgReason) => void) {
  const shareToken = useShareToken();
  const [result, setResult] = useState<{ state: ThumbState; src: string | null }>({ state: "loading", src: null });
  // Keep the callback out of the effect deps so an inline arrow from the
  // parent doesn't re-fire the fetch on every render.
  const report = useRef(onReason);
  useEffect(() => {
    report.current = onReason;
  });

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    fetch(ogImageUrl(domain, path, shareToken))
      .then(async (res) => {
        const reason = (res.headers.get("x-og-reason") as OgReason | null) ?? "unknown";
        if (!res.ok) {
          if (!alive) return;
          report.current?.(reason);
          setResult({ state: reasonToState(reason), src: null });
          return;
        }
        const blob = await res.blob();
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        report.current?.(reason);
        setResult({ state: "og", src: objectUrl });
      })
      .catch(() => {
        if (!alive) return;
        report.current?.("unknown");
        setResult({ state: "favicon", src: null });
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [domain, path, shareToken]);

  return result;
}

export function PageThumb({
  domain,
  path,
  fallbackLetter,
  onReason,
}: {
  domain: string;
  path: string;
  fallbackLetter: string;
  onReason?: (r: OgReason) => void;
}) {
  const { state, src } = useOgImage(domain, path, onReason);
  const [imgFailed, setImgFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);

  // Wide enough for an og image to read, short enough that six rows plus the
  // header still fit the 720px canvas without clipping the last one.
  const box = "shrink-0 h-9 w-[58px] rounded-md overflow-hidden flex items-center justify-center";

  if (state === "loading") {
    return <div className={box} style={{ background: "var(--muted)" }} aria-hidden />;
  }

  if (state === "broken") {
    return (
      <div
        className={box}
        style={{ background: TREND_NEG_BG, border: `1px solid ${TREND_NEG}33` }}
        title="Sidan svarade inte när rapporten skapades"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 8v5M12 16.5v.5" stroke={TREND_NEG} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" stroke={TREND_NEG} strokeWidth="1.75" />
        </svg>
      </div>
    );
  }

  // Declared an og:image that doesn't load. The page works, so this is a
  // muted "torn image" mark rather than the red page-down warning.
  if (state === "no-image") {
    return (
      <div
        className={box}
        style={{ background: "var(--muted)", border: "1px dashed var(--border)" }}
        title="Sidans delningsbild saknas — länken visar ingen bild när sidan delas"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="var(--muted-foreground)" strokeWidth="1.6" opacity="0.75" />
          <path d="M3.5 16l4.2-4.2a1.6 1.6 0 012.2 0l2.4 2.4" stroke="var(--muted-foreground)" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
          <circle cx="15" cy="9.2" r="1.4" fill="var(--muted-foreground)" opacity="0.6" />
          <path d="M4 20L20 4" stroke="var(--muted-foreground)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (state === "og" && src && !imgFailed) {
    return (
      <div className={box} style={{ background: "var(--muted)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  if (!faviconFailed) {
    return (
      <div className={box} style={{ background: "var(--muted)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/favicon?domain=${encodeURIComponent(domain)}`}
          alt=""
          width={20}
          height={20}
          onError={() => setFaviconFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${box} text-[15px] font-bold`}
      style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
    >
      {fallbackLetter}
    </div>
  );
}

/** Swedish plural for the summary line — "1 sida" vs "3 sidor". */
function pageWord(n: number) {
  return n === 1 ? "sida" : "sidor";
}

export function SlidePages({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();
  const domain = d.clientDomain ?? "example.com";
  const fallback = domain.replace("www.", "").slice(0, 1).toUpperCase();

  // Collected per row so the slide can state the finding in words, not just
  // as icons. Keyed by path — rows re-report on remount and must not double-count.
  const [reasons, setReasons] = useState<Record<string, OgReason>>({});
  const noteReason = useCallback((path: string, reason: OgReason) => {
    setReasons((prev) => (prev[path] === reason ? prev : { ...prev, [path]: reason }));
  }, []);

  const values = Object.values(reasons);
  const brokenPages = values.filter((r) => r === "page-error").length;
  const brokenImages = values.filter((r) => r === "image-error").length;

  return (
    <div ref={ref} className="flex flex-col gap-4 h-full">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="De mest besökta sidorna under perioden.">
          Dina mest besökta sidor
        </SlideHeading>
      </motion.div>

      {/* shrink-0: the canvas is a fixed 720px, so the table must keep its
          natural height. Letting it shrink silently clips the last row —
          the row heights below are budgeted to fit six rows plus the header. */}
      <div className="flex shrink-0 flex-col divide-y divide-border/75 rounded-2xl border border-border bg-background/90 overflow-hidden">
        {/* Header — inverted */}
        <div className="grid items-center px-5 py-3.5 shrink-0" style={{ gridTemplateColumns: "1fr 110px 120px", background: "#1a1714" }}>
          <span className="text-[13px] font-bold uppercase tracking-[0.18em]" style={{ color: "#ffffff" }}>Sida</span>
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-right" style={{ color: "#ffffff" }}>Besök</span>
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-right" style={{ color: "#ffffff" }}>Trend</span>
        </div>

        {d.topPages.map((row, i) => {
          const label = row.title ?? row.p;
          const shortUrl = row.p.length > 42 ? row.p.slice(0, 42) + "…" : row.p;
          const href = `https://${domain}${row.p}`;
          return (
            <motion.a
              key={row.p}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="grid items-center hover:bg-muted/30 transition-colors no-underline"
              {...fadeUp(active, reduced, { y: 8, duration: 0.4, delay: 0.15 + i * 0.06 })}
              style={{
                gridTemplateColumns: "1fr 110px 120px",
                color: "inherit",
                paddingTop: 9,
                paddingLeft: 20,
                paddingRight: 20,
                paddingBottom: 9,
              }}
            >
              {/* Page */}
              <div className="flex items-center gap-3.5 min-w-0">
                <PageThumb
                  domain={domain}
                  path={row.p}
                  fallbackLetter={fallback}
                  onReason={(r) => noteReason(row.p, r)}
                />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-[1.25] truncate text-foreground">{label}</p>
                  <p className="text-[12px] leading-[1.2] text-foreground/50 truncate">{shortUrl}</p>
                </div>
              </div>

              {/* Visit count */}
              <div className="text-right">
                <span className="font-stat text-[21px] font-bold tabular-nums tracking-tight text-foreground">
                  {row.v.toLocaleString("sv-SE")}
                </span>
              </div>

              {/* Trend + delta */}
              <div className="flex items-center justify-end">
                <TrendCell trend={row.trend} delta={row.d} />
              </div>
            </motion.a>
          );
        })}
      </div>

      {/* States the findings in words. Only renders when there is something to
          report, so a healthy site sees no filler. The two are kept separate:
          a dead page and a missing share image are different problems. */}
      {(brokenPages > 0 || brokenImages > 0) && (
        <motion.div
          className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]"
          {...fadeUp(active, reduced, { y: 6, duration: 0.4, delay: 0.55 })}
        >
          {brokenPages > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: TREND_NEG }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke={TREND_NEG} strokeWidth="2" />
                <path d="M12 8v5M12 16.5v.5" stroke={TREND_NEG} strokeWidth="2" strokeLinecap="round" />
              </svg>
              {brokenPages} {pageWord(brokenPages)} svarade inte
            </span>
          )}
          {brokenImages > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              {brokenImages} {pageWord(brokenImages)} saknar delningsbild
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
