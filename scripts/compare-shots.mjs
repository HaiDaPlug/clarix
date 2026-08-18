/* THROWAWAY — screenshots the three channel-slide treatments for comparison.
 * Delete with src/app/report-lab/.
 *   npm run dev  →  node scripts/compare-shots.mjs                */

import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve(".lab-shots/compare");
const VARIANTS = ["cards", "rows", "stacked"];
const CASES = ["layout-2", "layout-3", "layout-6", "ps-rollup"];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 2,
});

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const findings = [];

for (const caseId of CASES) {
  for (const variant of VARIANTS) {
    for (const expand of [false, true]) {
      await page.goto(`${BASE_URL}/report-lab/compare?case=${caseId}&variant=${variant}`, {
        waitUntil: "networkidle",
      });
      const canvas = page.locator(`[data-testid="canvas-${variant}-${caseId}"]`);
      await canvas.waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(1900);

      if (expand) {
        const toggles = page.locator('[role="button"][aria-expanded="false"]');
        const n = await toggles.count();
        for (let i = 0; i < n; i++) await toggles.nth(i).click({ force: true });
        if (n === 0) continue; // nothing expandable — skip the duplicate shot
        await page.waitForTimeout(700);
      }

      const overflow = await page.evaluate(() => {
        const el = document.querySelector("[data-channel-area]");
        return el ? el.scrollHeight - el.clientHeight : 0;
      });
      if (overflow > 1) {
        findings.push(`CLIPPED ${variant}/${caseId}${expand ? " (expanded)" : ""}: +${overflow}px`);
      }

      await canvas.screenshot({
        path: path.join(OUT_DIR, `${caseId}--${variant}${expand ? "-expanded" : ""}.png`),
      });
      process.stdout.write(`  ✓ ${caseId} / ${variant}${expand ? " expanded" : ""}\n`);
    }
  }
}

await browser.close();
console.log(`\n→ ${OUT_DIR}`);
if (errors.length) console.log("Console errors:\n  " + [...new Set(errors)].join("\n  "));
console.log(findings.length ? "\n" + findings.join("\n") : "\nNo overflow in any variant.");
