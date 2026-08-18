"use client";

/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — visual harness for the SlideChannels layouts.
 *
 * Delete with src/lib/mock-data/scenario-lab.ts and e2e/report-lab.spec.ts once
 * the layouts are signed off. Not linked from anywhere in the app.
 *
 *   npm run dev  →  http://localhost:3000/report-lab
 *   ?case=layout-5   render one case on its own
 *   ?expand=1        open every expandable channel on load
 * ──────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { LocaleProvider } from "@/lib/i18n";
import { LAB_CASES } from "@/lib/mock-data/scenario-lab";
import { buildSlideData } from "@/components/report/slide-data";
import { SlideChannels } from "@/components/report/slides/SlideChannels";
import { CANVAS_H, CANVAS_W } from "@/components/report/tokens";

const SCALE = 0.78;

/** Read once during the initial render rather than in an effect — this page is
 *  client-only and the query string never changes without a full navigation. */
function readParams() {
  if (typeof window === "undefined") return { only: null, expandAll: false };
  const params = new URLSearchParams(window.location.search);
  return { only: params.get("case"), expandAll: params.get("expand") === "1" };
}

export default function ReportLabPage() {
  const [{ only, expandAll }] = useState(readParams);

  const cases = only ? LAB_CASES.filter((c) => c.id === only) : LAB_CASES;

  return (
    <LocaleProvider>
      <main
        className="min-h-dvh px-10 py-12"
        style={{ backgroundColor: "var(--parchment)" }}
      >
        <header className="mx-auto mb-10 max-w-[1000px]">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            SlideChannels lab
          </h1>
          <p className="mt-2 text-[15px] text-foreground/60">
            Every channel count and paid-social shape, rendered on the real 1280×720
            canvas at {Math.round(SCALE * 100)}%. Throwaway — delete once signed off.
          </p>
        </header>

        <div className="space-y-16">
          {cases.map((c) => (
            <section
              key={c.id}
              id={c.id}
              data-testid={`case-${c.id}`}
              className="mx-auto w-fit"
            >
              <div className="mb-3 flex items-baseline gap-3">
                <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
                  {c.group}
                </span>
                <h2 className="text-[19px] font-semibold">{c.label}</h2>
                <code className="text-[12px] text-foreground/40">{c.id}</code>
              </div>
              <p className="mb-4 max-w-[900px] text-[14px] leading-relaxed text-foreground/55">
                {c.note}
              </p>
              <LabSlide caseId={c.id} data={c.data} expandAll={expandAll} />
            </section>
          ))}
        </div>
      </main>
    </LocaleProvider>
  );
}

/** Mirrors SlideCard's clipping shell + fixed canvas so clipping bugs show up
 *  here exactly as they would in the deck. */
function LabSlide({
  caseId,
  data,
  expandAll,
}: {
  caseId: string;
  data: Parameters<typeof buildSlideData>[0];
  expandAll: boolean;
}) {
  const slideData = buildSlideData(data);

  return (
    <div
      data-testid={`canvas-${caseId}`}
      style={{ width: CANVAS_W * SCALE, height: CANVAS_H * SCALE }}
      className="relative"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow:
            "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)",
          border: "1px solid rgba(20,18,16,0.05)",
        }}
      >
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${SCALE})`,
            transformOrigin: "top left",
            fontSize: 20,
          }}
          className="flex h-full flex-col justify-center px-16 py-12"
        >
          <SlideChannels d={slideData} />
        </div>
      </div>
      {expandAll && <AutoExpand caseId={caseId} />}
    </div>
  );
}

/** Clicks every expandable channel once the slide has mounted, so a screenshot
 *  run can capture the open state without scripting each case. */
function AutoExpand({ caseId }: { caseId: string }) {
  useEffect(() => {
    const root = document.querySelector(`[data-testid="canvas-${caseId}"]`);
    if (!root) return;
    const id = window.setTimeout(() => {
      root
        .querySelectorAll<HTMLElement>('[role="button"][aria-expanded="false"]')
        .forEach((el) => el.click());
    }, 400);
    return () => window.clearTimeout(id);
  }, [caseId]);

  return null;
}
