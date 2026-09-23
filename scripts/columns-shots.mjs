/* THROWAWAY — shoots variant D resting and with a network segment hovered.
 * Delete with src/app/report-lab/.                                        */

import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve(".lab-shots/columns");
const CASES = ["layout-2", "layout-3", "layout-6", "ps-rollup"];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

for (const id of CASES) {
  await page.goto(`${BASE}/report-lab/compare?case=${id}&variant=columns`, { waitUntil: "networkidle" });
  const canvas = page.locator(`[data-testid="canvas-columns-${id}"]`);
  await canvas.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(2100);
  await canvas.screenshot({ path: path.join(OUT, `${id}.png`) });
  process.stdout.write(`  ✓ ${id}\n`);

  // Hover the largest network segment inside the subdivided column.
  const segs = canvas.locator("[data-seg]");
  const n = await segs.count();
  if (n > 0) {
    await segs.first().hover();
    await page.waitForTimeout(600);
    await canvas.screenshot({ path: path.join(OUT, `${id}-hover.png`) });
    process.stdout.write(`  ✓ ${id} hover (${n} segments)\n`);
  } else {
    process.stdout.write(`  · ${id} has no segments\n`);
  }

  const overflow = await page.evaluate(() => {
    const el = document.querySelector("[data-channel-area]");
    return el ? el.scrollHeight - el.clientHeight : 0;
  });
  if (overflow > 1) console.log(`  CLIPPED ${id}: +${overflow}px`);
}

await browser.close();
console.log(`\n→ ${OUT}`);
if (errors.length) console.log("Console errors:\n  " + [...new Set(errors)].join("\n  "));
