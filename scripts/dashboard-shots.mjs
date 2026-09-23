/* Screenshots the dashboard harness (/report-lab/dashboard) at fixed viewports,
 * in both themes and every data state, and flags horizontal overflow.
 * Mock data only — no sign-in needed.
 *
 *   npm run dev                              (in one terminal)
 *   node scripts/dashboard-shots.mjs [label] (in another)  →  .lab-shots/dashboard/<label>/
 *
 * Options:  BASE_URL=http://localhost:3001 node scripts/dashboard-shots.mjs after
 *           node scripts/dashboard-shots.mjs after desktop-ready   (only shots matching)
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const LABEL = process.argv[2] ?? "current";
const ONLY = process.argv[3] ?? null;
const OUT_DIR = path.resolve(".lab-shots/dashboard", LABEL);

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

const SHOTS = [
  { id: "desktop-ready", vp: "desktop", q: "scenario=2&state=ready&ai=on&theme=light", full: true },
  { id: "laptop-ready", vp: "laptop", q: "scenario=2&state=ready&ai=on&theme=light" },
  { id: "mobile-ready", vp: "mobile", q: "scenario=2&state=ready&ai=on&theme=light", full: true },
  { id: "desktop-dark", vp: "desktop", q: "scenario=2&state=ready&ai=on&theme=dark", full: true },
  { id: "laptop-dark", vp: "laptop", q: "scenario=2&state=ready&ai=on&theme=dark" },
  { id: "desktop-ai-off", vp: "desktop", q: "scenario=2&state=ready&ai=off&theme=light" },
  { id: "desktop-ai-long", vp: "desktop", q: "scenario=2&state=ready&ai=long&theme=light" },
  { id: "desktop-loading", vp: "desktop", q: "scenario=2&state=loading&theme=light" },
  { id: "desktop-sample", vp: "desktop", q: "scenario=2&state=sample&ai=on&theme=light" },
  { id: "desktop-nodata", vp: "desktop", q: "scenario=2&state=nodata&theme=light" },
  { id: "desktop-reconnect", vp: "desktop", q: "scenario=2&state=reconnect&theme=light" },
  { id: "desktop-scenario1", vp: "desktop", q: "scenario=1&state=ready&ai=on&theme=light" },
  { id: "desktop-scenario3", vp: "desktop", q: "scenario=3&state=ready&ai=on&theme=light" },
];

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const shot of SHOTS) {
  if (ONLY && !shot.id.includes(ONLY)) continue;
  const vp = VIEWPORTS[shot.vp];
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "sv-SE" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${shot.id}: ${String(e)}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${shot.id}: ${m.text()}`));
  // "load", not "networkidle": the sidebar's auth probe keeps a request open.
  await page.goto(`${BASE_URL}/report-lab/dashboard?${shot.q}`, { waitUntil: "load", timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector("main", { timeout: 60_000 });
  await page.waitForTimeout(3000); // entrances settle
  await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}.png`) });
  if (shot.full) await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}--full.png`), fullPage: true });

  const probe = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    mainH: document.querySelector("main")?.scrollHeight ?? 0,
  }));
  process.stdout.write(
    `✓ ${shot.id.padEnd(20)} ${vp.width}x${vp.height}  mainH=${probe.mainH}  overflowX=${probe.docW > vp.width ? "YES" : "no"}\n`,
  );
  await ctx.close();
}

await browser.close();
console.log(`\n→ ${OUT_DIR}`);
if (errors.length) console.log("Errors:\n  " + [...new Set(errors)].join("\n  "));
