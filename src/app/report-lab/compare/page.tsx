"use client";

/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — side-by-side of the shipping card layout against the two
 * candidate redesigns, on the same data.
 *
 *   http://localhost:3000/report-lab/compare
 *   ?case=layout-6     pick the fixture (default: layout-6)
 *   ?variant=rows      show one variant only (cards | rows | stacked)
 *
 * Delete with src/app/report-lab/.
 * ──────────────────────────────────────────────────────────────────────────── */

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { LocaleProvider } from "@/lib/i18n";
import { LAB_CASES } from "@/lib/mock-data/scenario-lab";
import { buildSlideData } from "@/components/report/slide-data";
import { SlideChannels } from "@/components/report/slides/SlideChannels";
import { CANVAS_H, CANVAS_W } from "@/components/report/tokens";
import { ProtoBarRows, ProtoStackedRail } from "../prototypes";
import { ProtoMockup } from "../prototype-c";
import { ProtoColumns } from "../prototype-d";

const SCALE = 0.74;

const VARIANTS = [
  {
    id: "columns",
    label: "D — vertical columns",
    note: "Copy of the reference layout: eyebrow, headline, emphasised subline, full-height tracks, floating value pills, marks above labels. Flat ranking — no drill-down yet.",
    render: (d: ReturnType<typeof buildSlideData>) => <ProtoColumns d={d} />,
  },
  {
    id: "mockup",
    label: "C — colleague's mockup",
    note: "Variant A plus column headers, a tinted panel around the expanded group, brand marks, and per-network bar colours.",
    render: (d: ReturnType<typeof buildSlideData>) => <ProtoMockup d={d} />,
  },
  {
    id: "cards",
    label: "Current — cards",
    note: "Shipping today. Echoes SlideKpis; expansion swaps the card body.",
    render: (d: ReturnType<typeof buildSlideData>) => <SlideChannels d={d} />,
  },
  {
    id: "rows",
    label: "A — bar rows at every count",
    note: "One idiom for 1–6. Row height and type scale with count; expansion grows in place.",
    render: (d: ReturnType<typeof buildSlideData>) => <ProtoBarRows d={d} />,
  },
  {
    id: "stacked",
    label: "B — stacked bar + detail rail",
    note: "One 100% bar for the whole picture, ranked list beneath. Hover a row to highlight its segment.",
    render: (d: ReturnType<typeof buildSlideData>) => <ProtoStackedRail d={d} />,
  },
] as const;

/* The query string is the only state this page has. useSyncExternalStore gives
 * the server (and the hydration pass) a stable "" and the client the real
 * search, so the two renders agree without an effect writing state. */
function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
const getSearch = () => window.location.search;
const getServerSearch = () => "";

export default function ComparePage() {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  const params = new URLSearchParams(search);
  const caseId = params.get("case") ?? "layout-6";
  const variant = params.get("variant");

  const labCase = LAB_CASES.find((c) => c.id === caseId) ?? LAB_CASES[0];
  const slideData = buildSlideData(labCase.data);
  const variants = variant ? VARIANTS.filter((v) => v.id === variant) : VARIANTS;

  return (
    <LocaleProvider>
      <main className="min-h-dvh px-10 py-12" style={{ backgroundColor: "var(--parchment)" }}>
        <header className="mx-auto mb-8 max-w-[960px]">
          <h1 className="font-display text-4xl font-bold tracking-tight">Channels — layout compare</h1>
          <p className="mt-2 text-[15px] text-foreground/60">
            Same data, three treatments. Click a channel with a chevron to expand.
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {LAB_CASES.filter((c) => c.group === "layout" || c.id === "ps-rollup").map((c) => (
              <Link
                key={c.id}
                href={`/report-lab/compare?case=${c.id}`}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  c.id === labCase.id
                    ? "bg-foreground text-background"
                    : "bg-foreground/8 text-foreground/60 hover:text-foreground"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </header>

        <div className="space-y-14">
          {variants.map((v) => (
            <section key={v.id} className="mx-auto w-fit">
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-[19px] font-semibold">{v.label}</h2>
                <Link
                  href={`/report-lab/compare?case=${labCase.id}&variant=${v.id}`}
                  className="text-[12px] text-foreground/40 underline-offset-2 hover:underline"
                >
                  isolate
                </Link>
              </div>
              <p className="mb-4 max-w-[900px] text-[14px] text-foreground/55">{v.note}</p>
              <Canvas testId={`${v.id}-${labCase.id}`}>{v.render(slideData)}</Canvas>
            </section>
          ))}
        </div>
      </main>
    </LocaleProvider>
  );
}

/** Mirrors SlideCard's clipping shell so overflow behaves exactly as in the deck. */
function Canvas({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <div
      data-testid={`canvas-${testId}`}
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
          boxShadow: "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)",
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
          {children}
        </div>
      </div>
    </div>
  );
}
