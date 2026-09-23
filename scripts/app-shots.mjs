/* Screenshots the signed-in app — dashboard, report, integrations, clients,
 * data, settings — at desktop / laptop / mobile, in both themes, plus the
 * states that are hard to meet by hand (loading, Google errors, no source,
 * empty lists, long names). Hard states are forced by intercepting the app's
 * own API calls; nothing is written to the account.
 *
 *   npm run dev                              (in one terminal)
 *   node scripts/app-shots.mjs --login       once: a window opens, sign in, it closes
 *   node scripts/app-shots.mjs [label] [filter]   →  .lab-shots/app/<label>/
 *
 * The session is kept in .lab-shots/auth.json (gitignored). Delete it to sign out.
 * Mock-data dashboard states live in scripts/dashboard-shots.mjs.
 */

import { chromium } from "playwright";
import { mkdir, access, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const AUTH = path.resolve(".lab-shots/auth.json");
const args = process.argv.slice(2);

if (args.includes("--login")) {
  await mkdir(path.dirname(AUTH), { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/login`);
  console.log("Sign in in the window that opened (waiting up to 10 minutes)…");
  // Done only when Supabase has set a real session cookie AND we're on an app
  // page. Leaving /login is not enough: Google sign-in first sets a PKCE
  // code-verifier cookie and bounces through other pages before the session exists.
  const deadline = Date.now() + 600_000;
  for (;;) {
    const cookies = await ctx.cookies();
    const hasSession = cookies.some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));
    const onApp = /^\/(dashboard|integrations|clients|data|settings|report)/.test(new URL(page.url()).pathname);
    if (hasSession && onApp) break;
    if (Date.now() > deadline) { console.error("Timed out before a session existed; nothing saved."); process.exit(1); }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000);
  // Keep only the app's own session. Google sign-in leaves the person's Google
  // account cookies in the context too; those have no business on disk.
  const state = await ctx.storageState();
  const host = new URL(BASE_URL).hostname;
  state.cookies = state.cookies.filter((c) => c.domain.replace(/^\./, "") === host);
  state.origins = state.origins.filter((o) => o.origin === new URL(BASE_URL).origin);
  await writeFile(AUTH, JSON.stringify(state));
  await browser.close();
  console.log(`Session saved → ${AUTH}`);
  process.exit(0);
}

try { await access(AUTH); } catch {
  console.error("No session yet. Run: node scripts/app-shots.mjs --login");
  process.exit(1);
}

const LABEL = args[0] ?? "current";
const ONLY = args[1] ?? null;
const OUT_DIR = path.resolve(".lab-shots/app", LABEL);

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

const json = (body, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
const hang = () => new Promise(() => {}); // a request that never answers = a page stuck loading

// Each `route` entry: [url glob, handler(route)].
const reconnectHealth = {
  google: {
    status: "reconnect_required", reason: "invalid_grant", scopes: [], missingScopes: [],
    connectedAt: null, lastRefreshedAt: null, tokenExpiresAt: null, checkedAt: new Date().toISOString(),
  },
};
// A real /api/report-data answer with only its status changed, so the page
// gets every field the server always sends (workspace, sources, google).
const reportAs = (status) => async (route) => {
  const res = await route.fetch();
  const body = await res.json();
  const google = status === "reconnect_required" ? reconnectHealth.google : body.google;
  await route.fulfill({ response: res, json: { ...body, status, data: null, failures: [], google } });
};
const longName = async (route) => {
  const res = await route.fetch();
  const body = await res.json();
  for (const c of body.clients ?? []) c.name = "Advokatbyrån Lindqvist, Håkansson & Partners i Göteborg AB";
  await route.fulfill({ response: res, json: body });
};

const SCREENS = [
  // Ready states, every viewport, both themes.
  ...["dashboard", "report", "integrations", "clients", "data", "settings"].flatMap((p) =>
    Object.keys(VIEWPORTS).flatMap((vp) =>
      ["light", "dark"]
        .filter((t) => !(p === "report" && t === "dark")) // report renders light by design
        .map((theme) => ({ id: `${p}-${vp}-${theme}`, path: `/${p}`, vp, theme, full: true })),
    ),
  ),

  // Loading: the data call never answers.
  { id: "state-dashboard-loading", path: "/dashboard", vp: "desktop", route: [["**/api/report-data", hang]], wait: 2500 },
  { id: "state-report-loading", path: "/report", vp: "desktop", route: [["**/api/report-data", hang]], wait: 2500 },
  { id: "state-integrations-loading", path: "/integrations", vp: "desktop", route: [["**/api/clients", hang], ["**/api/google/connection**", hang]], wait: 2500 },
  { id: "state-clients-loading", path: "/clients", vp: "desktop", route: [["**/api/clients", hang]], wait: 2500 },
  { id: "state-settings-loading", path: "/settings", vp: "desktop", route: [["**/api/clients", hang]], wait: 2500 },

  // Connection problems.
  { id: "state-report-unavailable", path: "/report", vp: "desktop", route: [["**/api/report-data", reportAs("unavailable")]] },
  { id: "state-report-reconnect", path: "/report", vp: "mobile", route: [["**/api/report-data", reportAs("reconnect_required")]] },
  { id: "state-report-nodata", path: "/report", vp: "desktop", route: [["**/api/report-data", reportAs("no_data")]] },
  { id: "state-report-nosource", path: "/report", vp: "desktop", route: [["**/api/clients/active", (r) => r.fulfill(json({ client: null }))]] },
  { id: "state-dashboard-reconnect", path: "/dashboard", vp: "desktop", route: [["**/api/report-data", reportAs("reconnect_required")]] },
  { id: "state-integrations-reconnect", path: "/integrations", vp: "desktop", route: [["**/api/google/connection**", (r) => r.fulfill(json(reconnectHealth))]] },
  { id: "state-integrations-reconnect-dark", path: "/integrations", vp: "desktop", theme: "dark", route: [["**/api/google/connection**", (r) => r.fulfill(json(reconnectHealth))]] },
  { id: "state-data-failed", path: "/data", vp: "desktop", route: [["**/api/ga4-explorer", (r) => r.fulfill(json({ error: "x" }, 500))]] },
  { id: "state-data-failed-dark", path: "/data", vp: "desktop", theme: "dark", route: [["**/api/ga4-explorer", (r) => r.fulfill(json({ error: "x" }, 500))]] },

  // Sparse / empty / awkward content.
  { id: "state-data-nosource", path: "/data", vp: "desktop", route: [["**/api/clients", (r) => r.fulfill(json({ clients: [] }))]] },
  { id: "state-clients-empty", path: "/clients", vp: "desktop", route: [["**/api/clients", (r) => r.fulfill(json({ clients: [] }))]] },
  { id: "state-clients-empty-mobile", path: "/clients", vp: "mobile", route: [["**/api/clients", (r) => r.fulfill(json({ clients: [] }))]] },
  { id: "state-clients-longname", path: "/clients", vp: "desktop", route: [["**/api/clients", longName]] },
  { id: "state-clients-longname-mobile", path: "/clients", vp: "mobile", route: [["**/api/clients", longName]] },
  { id: "state-settings-longname", path: "/settings", vp: "mobile", route: [["**/api/clients", longName]] },
];

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const shot of SCREENS) {
  if (ONLY && !shot.id.includes(ONLY)) continue;
  const vp = VIEWPORTS[shot.vp];
  const theme = shot.theme ?? "light";
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "sv-SE", storageState: AUTH });
  await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${shot.id}: ${String(e)}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${shot.id}: ${m.text()}`));
  for (const [glob, handler] of shot.route ?? []) await page.route(glob, handler);

  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "load", timeout: 120_000 });
  if (/\/login/.test(page.url())) {
    console.error("Session expired. Run: node scripts/app-shots.mjs --login");
    process.exit(1);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(shot.wait ?? 6000); // real Google calls + entrances settle
  await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}.png`) });
  if (shot.full && shot.path === "/report") {
    // The deck scrolls inside its own container, so a full-page capture only
    // shows slide one. Step through it instead.
    for (let i = 1; i <= 4; i++) {
      const moved = await page.evaluate(() => {
        const el = [...document.querySelectorAll("div")].find((d) => getComputedStyle(d).overflowY === "auto" && d.scrollHeight > d.clientHeight);
        if (!el) return false;
        const before = el.scrollTop;
        el.scrollBy(0, el.clientHeight * 0.9);
        return el.scrollTop !== before;
      });
      if (!moved) break;
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}--slide${i + 1}.png`) });
    }
  } else if (shot.full) {
    await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}--full.png`), fullPage: true });
  }

  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  process.stdout.write(`✓ ${shot.id.padEnd(36)} ${vp.width}x${vp.height}  overflowX=${docW > vp.width ? "YES" : "no"}\n`);
  await ctx.close();
}

await browser.close();
console.log(`\n→ ${OUT_DIR}`);
if (errors.length) console.log("Errors:\n  " + [...new Set(errors)].join("\n  "));
