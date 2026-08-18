/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — screenshots every SlideChannels layout, collapsed and expanded,
 * and flags any case whose content overflows the clipped 484px channel area.
 *
 * Delete with src/app/report-lab/ and src/lib/mock-data/scenario-lab.ts.
 *
 *   npm run dev            (in one terminal)
 *   npm run lab:shots      (in another)  →  .lab-shots/
 *
 * Options:  BASE_URL=http://localhost:3001 npm run lab:shots
 *           npm run lab:shots -- --headed
 * ──────────────────────────────────────────────────────────────────────────── */

import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve(".lab-shots");
const HEADED = process.argv.includes("--headed");

// Kept in sync by hand with LAB_CASES — this script runs outside the bundler and
// cannot import the TS fixture directly.
const CASES = [
  "layout-1",
  "layout-1-subs",
  "layout-2",
  "layout-3",
  "layout-4",
  "layout-5",
  "layout-6",
  "layout-7-rollup",
  "ps-none",
  "ps-one",
  "ps-four",
  "ps-rollup",
  "ps-declining",
  "ps-unmapped",
];

async function measureOverflow(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-channel-area]");
    if (!el) return null;
    // The canvas clips instead of scrolling, so any excess here is lost content.
    return {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      overflow: el.scrollHeight - el.clientHeight,
    };
  });
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const findings = [];

  for (const id of CASES) {
    for (const expanded of [false, true]) {
      const url = `${BASE_URL}/report-lab?case=${id}${expanded ? "&expand=1" : ""}`;
      await page.goto(url, { waitUntil: "networkidle" });

      const canvas = page.locator(`[data-testid="canvas-${id}"]`);
      await canvas.waitFor({ state: "visible", timeout: 15_000 });
      // Let the reveal + bar-fill + expand animations settle.
      await page.waitForTimeout(expanded ? 2200 : 1800);

      const suffix = expanded ? "-expanded" : "";
      await canvas.screenshot({ path: path.join(OUT_DIR, `${id}${suffix}.png`) });

      const box = await measureOverflow(page);
      if (box && box.overflow > 1) {
        findings.push(
          `CLIPPED  ${id}${suffix}: content is ${box.overflow}px taller than the ${box.clientHeight}px channel area`,
        );
      }
      process.stdout.write(`  ✓ ${id}${suffix}\n`);
    }
  }

  await browser.close();

  console.log(`\nScreenshots → ${OUT_DIR}`);

  if (consoleErrors.length > 0) {
    console.log(`\nConsole errors (${consoleErrors.length}):`);
    for (const e of [...new Set(consoleErrors)]) console.log(`  ! ${e}`);
  }

  if (findings.length > 0) {
    console.log(`\nOverflow findings (${findings.length}):`);
    for (const f of findings) console.log(`  ${f}`);
    process.exitCode = 1;
  } else {
    console.log("\nNo overflow: every layout fits the clipped canvas.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
