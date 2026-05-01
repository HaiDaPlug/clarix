# Digital Rapport — Current State

## What it is and why

Digital Rapport is a premium reporting SaaS for SME business owners who want clarity on their digital performance — not another BI dashboard. The core idea: connect your Google data sources, get a calm, narrative-driven report that tells you what happened, why it matters, and what to do next.

It is not agency software. The end user is a business owner who logs in, connects their own GA4 and Search Console accounts, and sees their numbers presented with editorial restraint and clear language — not a wall of charts.

The product has two layers:
- **Dashboard** — always-on home base. Narrative metric cards, traffic chart, channel breakdown. Designed to answer "how are we doing?" at a glance.
- **Report** — the depth layer. A slide-by-slide walkthrough assembled dynamically from whatever data sources are connected. The report is a feature inside the app, not the whole product.

The design language is Barlow (headings) + Satoshi (body), pure white background, deliberate whitespace. Every block is expected to answer "so what?" — not just display a number.

---

## Repository

GitHub: https://github.com/HaiDaPlug/clarix.git — `main` branch

---

## Tech stack

- **Next.js 16** with App Router and React 19
- **TypeScript** strict mode throughout
- **Tailwind CSS v4** with a custom design token layer in `globals.css`
- **Framer Motion** (the `motion` package, v12) for entrance animations and transitions
- **Recharts** for data visualizations (wrapped in custom chart components)
- **Zod v4** for runtime schema validation of all report data
- **shadcn/ui** (base-nova style) for base UI primitives
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — auth and database foundation, wired up but not yet driving data
- **Google OAuth** — credentials configured in Google Cloud and Supabase; sign-in flow is live

---

## App structure

The app uses a Next.js route group `(app)` for all authenticated pages. The layout wraps every page with the fixed sidebar.

```
src/app/
├── page.tsx                          # Landing page (public)
├── login/page.tsx                    # Google OAuth sign-in page
├── auth/callback/route.ts            # OAuth code exchange handler → redirects to /dashboard
├── (app)/
│   ├── layout.tsx                    # App shell — renders Sidebar + content area
│   ├── dashboard/page.tsx            # Dashboard overview (narrative cards, chart, channels)
│   ├── report/page.tsx               # Report viewer with scenario selector
│   ├── integrations/page.tsx         # Connect GA4 / GSC / Ads — V2 shell + real auth logic
│   ├── clients/page.tsx              # Client workspace grid
│   └── settings/page.tsx            # Settings with tabbed sidebar nav
```

The `(app2)` parallel design system route group has been fully merged into `(app)` and deleted.

---

## Auth flow

Auth is fully wired and enforced via `src/proxy.ts` (Next.js 16's equivalent of middleware):

1. User hits `/` (landing page — always public)
2. Clicks "Continue with Google" → hits `/login`
3. `signInWithOAuth` fires with `access_type: offline` + `prompt: consent` — forces Google to return a `refresh_token`
4. Supabase redirects to Google OAuth consent screen
5. Google sends user back to `/auth/callback?code=...`
6. `route.ts` exchanges code for session via `supabase.auth.exchangeCodeForSession()`
7. User lands on `/dashboard`

Protected routes (`/dashboard`, `/integrations`, `/clients`, `/settings`, `/report`) redirect unauthenticated users to `/login`. Authenticated users hitting `/login` are bounced to `/dashboard`.

Supabase clients:
- [src/utils/supabase/server.ts](../src/utils/supabase/server.ts) — for Server Components and API routes
- [src/utils/supabase/client.ts](../src/utils/supabase/client.ts) — for Client Components
- [src/utils/supabase/middleware.ts](../src/utils/supabase/middleware.ts) — for the proxy

---

## Dashboard

[src/app/(app)/dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx)

Currently powered by `scenario2` mock data (or real data when sources are connected). Structure:

1. **Sticky header** — period label + "Senaste 30 dagarna" date pill + "Exportera" dark button (replaced period toggle tabs)
2. **Sample data / expiry banner** — shown when not connected or token expired, links to integrations
3. **AI Summary hero** — purple gradient card, "Insikter från proffset" eyebrow, wavy SVG underline on headline, colorized numbers inline, "Läs hela rapporten" CTA
4. **Narrative KPI cards** (3-column grid) — large number + inline delta arrow, educational headline + insight line, flush sparkline strip at bottom
5. **Traffic chart** — dual area series (Besök + Besökare), dark tooltip, legend
6. **Channel breakdown** — SVG donut diagram with interactive arc segments; legend rows show channel name, bold session count, delta arrow, percentage pill. Hover cross-highlights arc + row.
7. **Search visibility** — 2×2 grid of GSC metrics with deltas
8. **Nästa steg card** — derived from real data (ROAS, SEO position, bounce rate, missing paid), max 3 steps with Effort/Vinst badges

---

## The report engine

### Data contract

Everything flows from a single `ReportData` object defined in [src/types/schema.ts](../src/types/schema.ts):

- `meta` — always required. Client name, report type, cadence, period, and `availableSources[]`
- Module data fields — all optional: `trafficOverview`, `seoOverview`, `paidOverview`, `kpiSnapshot`, `executiveSummary`, `topPages`, `conversions`, `siteHealth`, `issues`, `recommendations`

### Eligibility engine

[src/lib/engine/eligibility.ts](../src/lib/engine/eligibility.ts) — `evaluateEligibility()` runs three checks per module:

1. **Source gate** — required sources present in `meta.availableSources`?
2. **Field gate** — required data fields exist (dot-notation path resolution)?
3. **Variant downgrade** — optional fields < 50% populated → drops from `"full"` to `"simplified"` or `"minimal"`

### Module registry

[src/lib/modules/registry.ts](../src/lib/modules/registry.ts) — 10 modules in priority order:

`cover → executive-summary → kpi-snapshot → traffic-overview → seo-overview → top-pages → paid-overview → conversion → issues → recommendations`

### Deck assembly

[src/lib/engine/narrative.ts](../src/lib/engine/narrative.ts) — `assembleDeck(data)` evaluates all modules, maps to sections, sorts by priority, returns an ordered `AssembledDeck`.

### Slide components

[src/components/slides/](../src/components/slides/) — 10 slide components, each receiving `ModuleProps`. Compose from primitives (`SlideHeader`, `MetricDelta`, `Rule`, `Eyebrow`) and chart wrappers (`TrendLine`, `BarComparison`).

Viewer: [src/components/report/ReportViewer.tsx](../src/components/report/ReportViewer.tsx) — keyboard nav, dot indicators, Suspense lazy-loading.

---

## Integrations page

[src/app/(app)/integrations/page.tsx](../src/app/(app)/integrations/page.tsx)

V2 visual shell fully wired to real auth logic.

**Hero** — full-width gradient panel with large display headline ("Koppla dina viktigaste kanaler på 2 minuter." with italic purple gradient), body copy, shield trust line, and a staggered floating logo cluster (GA4, Google Ads, GSC) on the right.

**Progress bar** — animated gradient bar showing X of Y channels connected.

**Integration cards** — GA4, GSC, Google Ads with real logo SVGs, category eyebrow, purpose description, "unlocks" chips. Google Ads marked coming soon.

**Connect flow** — inline property picker expands below each card with `AnimatePresence` height animation. Loads available GA4 properties and GSC sites from `/api/google/properties`. Disconnect removes the row. `needs_refresh` surfaces a re-auth prompt. All loading/error states handled.

## Clients page

[src/app/(app)/clients/page.tsx](../src/app/(app)/clients/page.tsx)

V2 shell: client card grid with gradient avatar tiles, status badges (Aktiv/Inaktiv), report count, "Öppna arbetsyta" CTA. "Lägg till ny kund" dashed empty card at end. Currently uses static demo data.

## Settings page

[src/app/(app)/settings/page.tsx](../src/app/(app)/settings/page.tsx)

V2 shell: left-nav tab switching (Profil / White-label / Eget domännamn / AI-insikter), animated panel transitions, accent color picker, DNS config block with verified status, toggle switches. Currently uses static demo data.

---

## Mock data and scenarios

Three scenarios in [src/lib/mock-data/](../src/lib/mock-data/):

| Scenario | Sources | What it tests |
|----------|---------|---------------|
| 1 | GA4 + GSC | No paid data — paid slide excluded |
| 2 | GA4 + GSC + Google Ads | Full report, all modules eligible |
| 3 | Manual + GSC only | Partial data, variant downgrade logic |

Dashboard currently hardcodes scenario 2. Report page has the scenario selector for dev.

---

## Design system

One unified design system. The `(app2)` parallel system has been merged in and the route group deleted.

### Design tokens (`src/app/globals.css`)

- `--background: #ffffff` — pure white
- `--bone` / `--bone-dark` / `--parchment` — card and sidebar backgrounds (all `#ffffff` / `#F5F3EF`)
- `--charcoal` / `--charcoal-mid` — primary text and fills
- `--slate` / `--slate-light` — secondary text
- `--rule` / `--rule-light` — borders and dividers
- `--signal-up` / `--signal-up-bg` — positive delta (green)
- `--signal-down` / `--signal-down-bg` — negative delta (red)
- `--accent-coral` / `--accent-amber` — gradient accents
- `--c2-accent` — violet `oklch(0.62 0.22 295)` — used in integrations hero and landing
- `--c2-success` — green `oklch(0.7 0.16 155)`
- `--font-display: 'Barlow'` — headings, KPI values, hero text
- `--font-body: 'Satoshi'` — all body and UI text

Dark mode remaps all tokens via `.dark { ... }` block — warm inverted palette.

Shared components: [src/components/landing/](../src/components/landing/) (brand logos, showcase visuals, animated counter), [src/components/layout2/](../src/components/layout2/) (AppShell2, KpiCard2 — still used by landing page visuals).

---

## UI merge + new pages — completed 2026-04-30

`(app2)` route group fully deleted. All V2 visual work migrated into `(app)` as production pages.

### What changed

**Sidebar** — "Design v2" section removed. Kunder (`/clients`) and Inställningar (`/settings`) added to the Data section with bespoke SVG icons.

**Dashboard header** — Period tab switcher (This month / Last month / Custom) replaced with "Senaste 30 dagarna" date pill + "Exportera" dark button, matching V2 screenshot.

**`/integrations`** — V2 connections shell adopted: full-width hero with large italic gradient headline, floating logo cluster (staggered entrance), progress bar, rich integration cards. Real auth logic (connect/disconnect/property picker/refresh prompt) preserved exactly.

**`/clients`** (new) — V2 client card grid: gradient avatar tiles, status badges, report count, dashed empty card. Static demo data for now.

**`/settings`** (new) — V2 settings shell: left-nav tabs (Profil / White-label / Eget domännamn / AI-insikter), accent color picker, DNS config, toggle switches. Static demo data for now.

**Dashboard — Trafikkanaler** — replaced flat progress bars with a custom SVG donut diagram. Interactive: hover on arc segment or legend row cross-highlights both. Center shows total (or hovered channel's count + share). Legend rows show bold session number + delta arrow + percentage pill.

---

## Design v2 merge — completed 2026-04-29

Chris's Lovable/Clarix repo ported into the Next.js stack as a parallel design system. Both designs live simultaneously for side-by-side comparison — no data wiring needed in v2 yet.

### What was built

**Landing page** (`src/app/page.tsx`) — pixel-perfect port of Chris's index route. All sections inline (no one-off section components): sticky header, hero with `DashboardKpiVisual`, two Showcase blocks, AI insight panel, features grid, channels section, agencies section, 3-tier pricing, final CTA, footer.

**Route group `(app2)`** — 4 pages behind `AppShell2` (Chris's sidebar + header shell):
- `/dashboard2` — KPI grid (6 cards with sparklines), AI summary lavender panel, traffic AreaChart, channels PieChart, top pages BarChart, recommendations list
- `/connections` — hero section, smart Google hint banner, animated progress bar, search, recommended 2-col grid, others 3-col grid, full ConnectModal flow (consent → account picker → scope review → connecting → done + invite form)
- `/clients` — client card grid with gradient avatars, status badges, empty add card
- `/settings2` — tabbed sidebar nav (Profil / White-label / Domän / AI), accent color picker, DNS config, toggle switches

**Shared primitives** in `src/components/landing/`:
- `brand-logos.tsx` — 11 SVG brand logo components (GA4, GSC, Google Ads, Meta, LinkedIn, TikTok, Shopify, Matomo, YouTube, Excel, Google Business)
- `landing-showcase.tsx` — `Showcase`, `VisualFrame`, `DashboardKpiVisual`, `AiInsightsVisual`, `SeoChannelsVisual`
- `animated-counter.tsx` — requestAnimationFrame cubic ease-out counter

**Mock data** in `src/lib/demo-data2.ts` — kpis, trafficTrend, channelBreakdown, topPages, insights, integrations, clients.

**Sidebar** (`src/components/layout/Sidebar.tsx`) — "Design v2" section added with links to all four (app2) pages for comparison access from the main app.

### CSS collision strategy
All v2 tokens use `2` suffix or `--c2-` prefix. `font-display2` used instead of `font-display` (already mapped to Barlow). No shadcn token collisions — both systems share the same base `--background`, `--foreground`, `--border`, `--muted` vars.

---

## Product thinking — founder notes (2026-04-26)

These are raw directional thoughts to guide prioritization and design decisions going forward.

### PDF export — the cleanest report they've ever seen
When we build PDF export, it should be the most beautiful PDF a client has ever received from a digital agency. Not a screenshot, not a browser print. A proper document that respects every slide — layout, typography, whitespace, colors — with animations stripped out and replaced by static composure. The PDF should feel like it was designed by hand. Every slide becomes a page. The same narrative structure, the same insight lines, the same "so what?" — just frozen and ready to forward to a CEO or board. This is a premium differentiator and should be treated as one.

### The core feeling — always on agency
This should never feel like a tool. It should feel like a sharp, trusted agency is with you at all times — one that looks at your numbers, knows what they mean, and gives you super clear advice on what to do next. Every design decision, every insight line, every recommendation should be held against that standard: does this feel like a knowledgeable advisor, or does it feel like software?

### KPI focus first
Before expanding features, define what data is actually essential. Not everything that can be shown should be shown. The dashboard should answer "how are we doing?" with the fewest numbers that carry the most signal. Start by identifying the 4–6 KPIs that matter most to an SME owner and make those the core of the dashboard. Everything else is secondary.

### Report = storytelling, not data dump
The report feature is the core of the product. Each slide should be one step toward clarity — key data, what it means, and what the next step is. The slide sequence should feel like a narrative arc, not a list of metrics. Every slide earns its place by advancing the story.

### Color system — minimal but alive
Avoid the trap of being too safe (white/black/grey only). Colors should be tasteful and purposeful — especially on stats. When something is happening — a spike, a drop, a milestone — the color should quietly signal it. The goal is restraint with personality, not sterility.

### Charts and diagrams — earn their space
Every chart must speak clearly to a non-technical business owner. If a diagram doesn't immediately communicate something, it shouldn't be there. Prioritize clarity over completeness.

### Typography — third display face for numbers
Barlow + Satoshi is sufficient and stays. A third display-only typeface (e.g. Fraunces, Playfair Display) applied exclusively to large KPI numbers and report cover values adds contrast between "the number" and "the explanation" — reinforcing the storytelling angle without adding visual noise. Revisit when iterating on layout.

### Adaptive dashboard — sources drive what renders
Not every user will connect all sources. The dashboard should be dynamic: what cards and sections render depends on what's connected. Same principle as the report eligibility engine, applied to the dashboard. A user with only GA4 + Ads sees essentials from those two. As they connect more, the dashboard grows. This is a core UX promise.

### Data source integration — define the stat contract early
Before building the real API integrations (GA4, GSC, Ads), define exactly what stats each source should deliver and how they map to the KPIs on the dashboard and report slides. This prevents scope creep and ensures the mock data structure is already close to production shape.

### Missing module graceful fallback
When a module fails eligibility (e.g. conversions not connected), the slide should not silently disappear. Two acceptable behaviors:
- Collapse into a lower-tier card on the preceding slide with a message like "Conversion data not available — connect your goals in GA4"
- The recommendations slide acknowledges the gap directly in its narrative

Absence of data is itself information and should be treated as such in the narrative flow.

### Period comparison — always be explicit
Delta labels must state the comparison type explicitly: Month-over-Month (MoM) or Year-over-Year (YoY). "vs prior" is ambiguous. For Swedish SMEs, seasonality is significant — YoY is often the more honest comparison. The period selector should surface this clearly.

### Report mode — fullscreen with subtle exit
When a user enters the report, it takes over the full screen. The sidebar and app chrome are hidden. A subtle exit button sits top-right. The experience should feel cinematic and focused — like entering a presentation, not navigating to a subpage. The dashboard remains the home base; the report is an intentional departure from it.

### Dashboard vs report — two distinct surfaces
The dashboard is operational: always-on, functional, answers "how are we doing?" at a glance. The report is editorial: a focused narrative arc, cinematic, one slide at a time. They share schema and components but must feel different. The dashboard can be more utilitarian. The report should feel premium and deliberate.

### Data hierarchy — three tiers
Every metric earns its place by answering: does knowing this change what the client does next? If not, it does not belong in the main report.

**Must show (always in report if data exists):**
- Traffic trend
- Channel mix
- Organic search visibility
- Conversions / leads
- Paid efficiency (if Ads connected)
- Issues / watchouts
- Recommendations

**Contextual (show when relevant, not by default):**
- Device split
- Geography
- New vs returning users
- Top queries
- Landing page detail
- Campaign breakdown

**Appendix / fluff (never in main report):**
- Raw dimension tables
- Every minor channel
- Technical metrics with no action attached
- Generic engagement metrics with no decision value

### Insight contract — AI fills three fields per slide
Before connecting any AI model, define the exact output shape for every slide's "so what?". The AI receives the slide's raw JSON data, the module type, the period + comparison type, connected sources, and 2–3 prior periods for pattern context. Its job is to fill three fields:

- **Observation** — what the data shows ("Search clicks dropped 3.9%")
- **Implication** — what it means for the business ("Fewer people clicking through despite holding visibility")
- **Recommended action** — one concrete next step ("Test new meta descriptions on your top 5 pages")

The prompt discipline is: "You are a digital marketing analyst. Given this data, write an observation, an implication, and one concrete recommended action. Be specific to the numbers. Never be generic."

This prevents AI output from becoming decorative. It becomes deterministic evidence explained clearly. The base model already understands GA4 and GSC patterns — we just constrain the output shape tightly.

### Module business-purpose metadata
Each module in the registry should eventually carry not just eligibility rules but a declared business purpose:
- What question does this slide answer?
- Who cares (owner, marketer, CFO)?
- What decision could it influence?
- When should it be hidden even if technically eligible?

This prevents building modules that are data-eligible but not decision-useful.

### Recommendations slide — always follows a drop
Never show a metric going down without a corresponding recommendation or action immediately following. The narrative engine should enforce this: a negative delta on a key metric triggers an action item in the recommendations module. The story must close the loop.

### Next priorities (in order)
1. ~~**Product intelligence foundation**~~ — ✅ Done. Typed infrastructure for insight contracts, data hierarchy, business criticality, and missing module tracking.
2. ~~**Fullscreen report mode**~~ — ✅ Done. Report isolated in its own route group, no sidebar chrome, exit button, bottom-center dots, mount transition, dev scenario switcher.
3. ~~**Adaptive dashboard logic**~~ — ✅ Done. Dashboard registry, eligibility, assembly, and source-driven rendering across all three mock scenarios. Sample data banner restored.
4. ~~**i18n — Swedish default, English toggle**~~ — ✅ Done. Full translation layer, SV/EN toggle in sidebar.
5. ~~**Dark mode**~~ — ✅ Done. Light default, dark toggle in sidebar, persists to localStorage.
6. ~~**Stat contract per data source**~~ — ✅ Done. Full field inventory, mapper tables, query plan, trend logic, and future opportunities documented in `docs/stat-contract.md`.
7. ~~**GA4 + GSC mapper and API routes**~~ — ✅ Done. Pure mapper functions, typed API routes, parallel fetching. Not yet connected to the UI — 4 steps remain before real data flows.
8. ~~**Real data end-to-end**~~ — ✅ Done. OAuth scopes, DB schema, connect flow, property picker, dashboard wired to real data. Migration applied.
9. ~~**Wire `/report` to real data**~~ — ✅ Done. Report page reads connected sources from Supabase, fetches `/api/ga4` + `/api/gsc` in parallel, merges over localized mock fallback via `mergeReportData`, assembles deck from merged data. Dev scenario switcher preserved. `tsc` and `npm run lint` clean.
10. ~~**`executiveSummary` generation (rule-based bridge)**~~ — ✅ Done. `src/lib/engine/derive-executive-summary.ts` — pure function `deriveExecutiveSummary(data, locale)` builds headline, subheadline, and up to 4 highlight pills from real KPI deltas. Called in both `dashboard/page.tsx` and `report/page.tsx` after merge, only when `executiveSummary` is absent from real data. Replaced by AI wiring later.
11. ~~**Auth enforcement + token refresh**~~ — ✅ Done. Login page restored with correct OAuth scopes. Proxy guard protects all app routes. Server-side token refresh wired into both API routes — tokens auto-renew silently, no more hourly re-auth.
12. **Insight contract + AI wiring** — wire a model to fill the three-field `InsightContract` shape per slide using real data as evidence. Each slide sends its raw JSON + module type + period context to the model; model returns `{ observation, implication, recommendedAction }`. The `InsightContract` type and prompt discipline are already defined in `src/types/insight.ts` and the founder notes. `executiveSummary` generation can be folded into this pass.
13. **PDF export** — each slide as a page, animations stripped, typography and layout fully respected. The most beautiful PDF a client has ever received.

---

## Lint cleanup — completed 2026-04-27

Fixed three pre-existing lint errors across files untouched by the dashboard pass.

- `TrendLine.tsx` — removed `Math.random()` impure call during render, replaced gradient ID with a deterministic string from `color` + `data.length`. Removed unused `label` prop from interface and destructuring.
- `RecommendationsSlide.tsx` — escaped unescaped apostrophe (`'` → `&apos;`).
- `narrative.ts` — renamed `module` loop variable to `mod` to avoid shadowing the global `module` variable (Next.js lint rule). Removed unused `ModuleDefinition` import.

ESLint and `tsc --noEmit` both clean across all three files.

---

## Adaptive dashboard logic — completed 2026-04-27

The dashboard is now source-driven and deterministic. It no longer hardcodes scenario2 — it assembles itself from whatever sources are connected.

### New files
- `src/types/dashboard.ts` — `DashboardDefinition`, `AssembledDashboard`, `DashboardNudge`, eligibility result types
- `src/lib/dashboard/registry.ts` — 11 dashboard items matching `docs/dashboard-registry.md` exactly
- `src/lib/dashboard/eligibility.ts` — source gate + field gate + optional downgrade, mirrors report eligibility engine
- `src/lib/dashboard/assemble.ts` — `assembleDashboard(data)` returns ordered eligible items + one nudge

### How it works
`assembleDashboard(data)` walks the registry in priority order, evaluates each item against `availableSources` and data fields, downgrades variant when optional fields are sparse, filters to eligible only, and appends at most one nudge for the highest-value missing source (GA4 → GSC → Ads).

### Scenario behavior
- **Scenario 1 (GA4 + GSC)** — traffic, organic, search clicks, engagement KPIs, sessions chart, channel breakdown, search visibility. Google Ads nudge at bottom.
- **Scenario 2 (GA4 + GSC + Ads)** — full dashboard, all cards and sections, conversions and paid performance included. No nudge.
- **Scenario 3 (Manual + GSC)** — AI hero, search clicks KPI, search visibility grid. GA4 nudge at bottom. No broken placeholders.

### Design decisions locked in `docs/dashboard-registry.md`
The registry is human-defined before code. Every card, source gate, business question, decision use, and variant behavior is documented there. Codex implemented it, not defined it. Future card additions, removals, and reordering happen in that doc first, then the registry file.

### What's still mock-only
The empty spaces visible in some scenarios are a mock data limitation — certain optional fields aren't populated in all scenarios. The real stat contract pass will fill these gaps when GA4/GSC/Ads APIs are wired.

---

## Fullscreen report mode — completed 2026-04-27

The report is now a fully isolated presentation experience. Zero inheritance from the app shell.

### What changed

**`src/app/(report)/layout.tsx`** (new file)
- Dedicated route group layout with no sidebar, no `ml-64`, no app chrome
- Report gets a clean `min-h-dvh` canvas and nothing else

**`src/app/(report)/report/page.tsx`** (new file, replaces `(app)/report/page.tsx`)
- Mount transition: fade + `y: 20 → 0` using the shared `[0.16, 1, 0.3, 1]` easing
- Dev-only scenario switcher moved to a dark frosted-glass overlay top-left — invisible in production, unobtrusive in dev
- Defaults to scenario 2 (Full Report) — the most complete presentation
- URL stays exactly `/report`

**`src/app/(app)/report/page.tsx`** (deleted)
- Removed from app group entirely — no conditional hiding, no layout fighting

**`src/components/report/ReportViewer.tsx`**
- Exit button top-right — ghost style, frosted glass, `router.push("/dashboard")`, Escape key also exits
- Slide content wrapped in `max-w-5xl mx-auto` — readable width on wide screens, not edge-to-edge
- Progress dots moved from left-side vertical to bottom-center horizontal pill indicators — standard presentation convention
- Prev/Next arrow buttons bottom-right with disabled states at first/last slide
- Slide counter bottom-left (`1 / 8`)
- Keyboard nav preserved: arrows, space, enter to advance; Escape to exit
- All existing slide components, eligibility logic, and deck assembly untouched

### Why route group isolation
Next.js renders parent layouts unconditionally — a nested layout inside `(app)` would still inherit the sidebar render. Moving to a sibling `(report)` group gives true isolation with zero risk and keeps the door open for future public/shared report URLs without touching the authenticated app shell.

---

## Typed product infrastructure — completed 2026-04-26

The report engine now has a product intelligence layer on top of the eligibility engine. Four files changed, zero UI impact, TypeScript clean.

### What was added

**`src/types/insight.ts`** (new file)
- `InsightContract` — the canonical three-field shape every slide's AI output must fill: `observation`, `implication`, `recommendedAction`
- `InsightConfidence` — `"high" | "medium" | "low"`
- `MissingContextItem` — structured shape for surfacing absent data: `field`, `reason`, `impact`, `recommendedFix?`

**`src/types/modules.ts`**
- `DataHierarchy` — `"core" | "contextual" | "appendix"` — where a module belongs in the narrative
- `BusinessCriticality` — `"critical" | "important" | "optional"` — how bad it is if a module can't render (deliberately named to avoid confusion with eligibility engine's "required fields")
- `MissingModule` — rich shape for modules that couldn't render: `moduleId`, `moduleName`, `businessCriticality`, `missingRequired`, `missingOptional`, `reason`, `recommendedFix?`
- `ModuleDefinition` extended with: `dataHierarchy`, `businessCriticality`, `businessQuestion`, `decisionUse`, `insightContract?: Partial<InsightContract>`
- `AiSummaryContract` kept with legacy comment — additive, not replaced
- `AssembledDeck` now has `missingModules: MissingModule[]`

**`src/lib/modules/registry.ts`**
- All 10 modules populated with real `businessQuestion` and `decisionUse` copy
- All 10 modules assigned `dataHierarchy` and `businessCriticality` values
- No structural changes to how modules work

**`src/lib/engine/narrative.ts`**
- `assembleDeck` now tracks ineligible `critical` and `important` modules into `missingModules`
- Auto-generates a `recommendedFix` from `requiredSources` when applicable (e.g. "Connect google_ads to unlock this insight.")
- Eligible slide assembly logic untouched

### What this enables next
- Recommendations slide and future AI layer can read `deck.missingModules` and surface gaps explicitly to the user rather than silently skipping
- Each slide has a declared `InsightContract` shape ready for AI to fill — observation, implication, recommended action
- The engine now distinguishes between "technically ineligible" and "narratively missing" — critical to the storytelling model

---

## i18n — completed 2026-04-27

The app now defaults to Swedish with a live English toggle in the sidebar.

### Architecture

- `src/lib/i18n/sv.ts` — Swedish dictionary (default). Every user-facing string, including function-based strings (plurals, interpolations).
- `src/lib/i18n/en.ts` — English dictionary. Same shape, type-safe against `Translations`.
- `src/lib/i18n/index.tsx` — `LocaleProvider` (React context, defaults to `"sv"`) + `useLocale()` hook exposing `{ locale, setLocale, t }`.

### Coverage

All user-facing strings replaced with `t.key` calls across:
- All 10 slide components
- `ReportViewer` (aria-labels, exit button)
- `Sidebar` (nav sections, labels, user section)
- Dashboard page (heading, period buttons, sample banner, KPI labels, narrative text, chart labels)
- Integrations page (all copy, badge labels, integration names/taglines/descriptions/unlocks)
- Login page (wrapped in its own `LocaleProvider` since it's outside the app layout)

### Dashboard registry narratives

The registry text functions (headlines and insights on KPI cards, section narrative headlines) are translated at render time via `getRegistryHeadline()` and `getRegistryInsight()` helpers in the dashboard page — keyed by `itemId`. The registry itself stays locale-agnostic.

### Language toggle

`SV / EN` button pair in the sidebar, above the user section. Switching is instant — context re-renders all consumers. No page reload, no routing.

### Swedish copy status

Swedish strings are literal translations — correct but not yet polished. Codex prompt provided to the founder to refine to natural B2B Swedish.

---

## Dark mode — completed 2026-04-28

Light is default. User can switch to dark via the moon/sun icon in the sidebar. Choice persists to `localStorage` and is restored on next visit.

### How it works

- `src/lib/theme/index.tsx` — `ThemeProvider` + `useTheme()` hook. Reads from `localStorage` on mount, writes on change, toggles `.dark` class on `<html>`.
- `src/app/(app)/layout.tsx` — `ThemeProvider` wraps the app shell (outside `LocaleProvider`).
- `src/app/globals.css` — `.dark { ... }` block remaps all CSS custom properties to dark equivalents. Same warm editorial palette inverted: backgrounds go `#1A1916`, text becomes `#F0EDE8`, rules darken, signals desaturate slightly for legibility on dark bg.
- `src/components/layout/Sidebar.tsx` — moon icon shown in light mode (click → dark), sun icon shown in dark mode (click → light). Sits in the display controls row alongside the SV/EN language toggle.

Because every component uses `var(--charcoal)`, `var(--bone)`, etc. throughout, the entire UI flips with zero per-component changes.

---

## Mock data localization — completed 2026-04-28

The AI Summary hero and Executive Summary slide now switch language with the locale toggle.

### How it works

- `src/lib/mock-data/localize.ts` — `localizeMockReportData(data, locale)` overlays locale-specific `executiveSummary`, `kpiSnapshot.period/comparisonPeriod`, and `meta.period.label` by `reportData.meta.id`. Returns `data` unchanged for unknown ids or locales.
- `src/lib/mock-data/index.ts` — re-exports `localizeMockReportData`.
- Both `dashboard/page.tsx` and `report/page.tsx` call `localizeMockReportData(active.data, locale)` before assembling. The localized copy flows through without any change to the rendering path.

### What localizes

- Swedish locale: base scenario content (already Swedish prose from the Codex pass).
- English locale: English `executiveSummary` overlaid per scenario — polished natural English, not a literal translation mirror.
- Metric labels, channel names, and all dashboard/report UI copy continue to come from `t.*` (the i18n dictionary).

### Design decision

Narrative report content (executive summary, issues, recommendations) lives in mock data, not in the i18n dictionary — it is client-facing editorial content, not UI copy. The overlay pattern keeps `ReportData` shape intact so real API data can arrive pre-localized from the server without changing the rendering path.

---

## GA4 + GSC mapper and API routes — completed 2026-04-28

Pure mapper functions and thin API routes that translate raw Google API responses into `ReportData` shape. Typecheck and scoped lint clean. Not yet connected to any UI — the dashboard and report still use mock data.

### New files

**`src/lib/google/report-types.ts`**
Typed shapes for GA4 and GSC raw API responses (`Ga4RunReportResponse`, `GscSearchAnalyticsResponse`), response sets (`Ga4ResponseSet`, `GscResponseSet`), and `PartialReportData` — the subset of `ReportData` the routes return.

**`src/lib/google/report-queries.ts`**
Pure functions that build GA4 and GSC request bodies. One function per query: `buildGa4SummaryRequest`, `buildGa4ChannelRequest`, `buildGa4TimeSeriesRequest`, `buildGa4TopPagesRequest`, `buildGscSummaryRequest`, `buildGscTimeSeriesRequest`, `buildGscTopQueriesRequest`, `buildGscTopPagesRequest`. Also: `ga4Endpoint`, `gscEndpoint` with validation (numeric property ID, valid GSC site URL format).

**`src/lib/google/api-client.ts`**
`fetchGa4ReportSet` and `fetchGscReportSet` — each fires 4 requests in parallel via `Promise.all`. `GoogleApiError` class captures HTTP status and raw response body. No SDK — plain `fetch` with Bearer token.

**`src/lib/google/date-range.ts`**
`assertDateRange` (validates ISO format + ordering), `getPriorDateRange` (exact same-length window before current period), `gscCoverageForRange` (coverage < 1.0 within 3-day GSC lag window), `formatPeriod`.

**`src/lib/google/report-mappers.ts`**
`mapGa4Report` and `mapGscReport` — the core translation layer. Key behaviours:
- Locale-aware metric labels (sv/en) via `LABELS` lookup
- `trendGood` per metric from `TREND_GOOD_WHEN_UP` map (matches stat contract exactly)
- GA4 conversions suppressed when value is 0 — field gate does not pass on zero
- GA4 date format `"20260301"` → `"2026-03-01"` handled in `ga4DateToIso`
- GSC CTR multiplied by 100 for display; position rounded to 1 decimal
- Channel breakdown only emitted when rows exist — no fake empty arrays
- GA4 sampling coverage computed from `metadata.samplingMetadatas` ratio
- GSC top pages: full URL stripped to path via `pathFromUrl`
- `topPages` merges GA4 (sessions, bounce, trend) with GSC (clicks, impressions, position) — trend derived by comparing current vs prior sessions per page

**`src/app/api/ga4/route.ts`** and **`src/app/api/gsc/route.ts`**
Thin POST handlers. Validate request body with Zod. Read access token from Supabase session (`provider_token` → `access_token` fallback). Return `{ sourceConfidence: { ga4: { connected: false } } }` when property ID or token is missing. Distinguish 401/403 (connection error) from other errors (data error) in `GoogleApiError` handling.

### What's preserved
`src/types/schema.ts`, `src/lib/modules/registry.ts`, and all mock data files untouched.

---

## Real data end-to-end — completed 2026-04-28

The full integration pipeline is built. A user can now sign in, connect GA4 and GSC from the integrations page, and see their real data in the dashboard.

### What was built

**`supabase/migrations/20260428170000_connected_sources.sql`**
Creates the `connected_sources` table: `user_id`, `source` (ga4/gsc/google_ads), `property_id`, `display_name`, `access_token`, `refresh_token`, `token_expires_at`. RLS enabled — users can only read/write their own rows. `updated_at` trigger included. Migration applied.

**`src/lib/google/property-discovery.ts`**
Fetches available GA4 properties via `analyticsadmin.googleapis.com/v1beta/accountSummaries` and GSC sites via `webmasters/v3/sites`. GSC filtered to `siteOwner` / `siteFullUser` permission levels only.

**`src/lib/google/connected-sources.ts`**
Shared types (`ConnectedSource`, `GooglePropertiesResponse`), `currentCalendarMonthRange()` helper, and `mergeReportData()` — merges real `PartialReportData` over mock fallback, updates `availableSources` and `sourceConfidence`.

**`src/app/api/google/properties/route.ts`** — GET, returns available GA4 properties and GSC sites for the current session's access token.

**`src/app/api/google/connect/route.ts`** — POST, upserts a connected source row with tokens from the current session. Returns `needsRefresh: true` when `provider_refresh_token` is absent.

**`src/app/api/google/disconnect/route.ts`** — POST, deletes the connected source row for the current user + source.

**`src/app/api/google/connections/route.ts`** — GET, reads `connected_sources` server-side, computes `needs_refresh` from whether `refresh_token` is stored, returns safe metadata only — tokens never sent to browser.

**`src/app/(app)/integrations/page.tsx`** — fully live. On mount: loads connected sources, prefetches available properties. Connect button opens inline picker below each card. Disconnect removes the row. Re-auth prompt shown when `needs_refresh` is true. All states handled: loading, error, no properties found.

**`src/app/(app)/dashboard/page.tsx`** — on mount reads connected sources, POSTs to `/api/ga4` and `/api/gsc` for current calendar month, merges real data over localized mock fallback via `mergeReportData`. Falls back to mock gracefully for any unconnected source.

### Known limitations / future work
- `access_token` and `refresh_token` stored as plain text — encrypt in a future pass
- Integrations page has some Swedish/English copy in a local `COPY` object rather than `sv.ts`/`en.ts` — minor inconsistency, worth a cleanup pass

---

## Report page real data + executive summary bridge — completed 2026-04-28

Both the report page and dashboard now show real data end-to-end, including the hero/executive summary slide.

### What changed

**`src/app/(report)/report/page.tsx`**
Mirrored the dashboard's real-data loading pattern. On mount: reads `connected_sources` from Supabase, fires `/api/ga4` and `/api/gsc` in parallel with `currentCalendarMonthRange()`, merges results over the localized mock fallback via `mergeReportData`, assembles the deck from merged data. Uses `reportData ?? fallbackData` so the mock renders immediately while the fetch runs. Dev scenario switcher remains functional. `cancelled` flag prevents stale state updates on unmount.

**`src/lib/engine/derive-executive-summary.ts`** (new file)
Pure function `deriveExecutiveSummary(data: ReportData, locale: "sv" | "en"): ExecutiveSummary`. Rule-based bridge — no API calls, no async. Builds:
- Headline from traffic trend (up/down/absent) with full SV/EN copy
- Subheadline with total sessions formatted value
- Up to 4 highlight pills from: `totalSessions`, `totalClicks`, `avgPosition` (sentiment inverted — lower is better), `kpiSnapshot.primaryMetric`, `totalConversions`
- Each highlight value shows percentage change when `previousValue` is available, otherwise raw value
- `paragraphs: []` and `aiSummary: undefined` — reserved for AI wiring

**`src/app/(app)/dashboard/page.tsx`** and **`src/app/(report)/report/page.tsx`**
Both call `deriveExecutiveSummary(merged, locale)` after `mergeReportData`, guarded by `if (!merged.executiveSummary)` — mock data's own executive summary is preserved; only real-data fetches (which return no `executiveSummary`) trigger the bridge.

### What's not built yet

- Token refresh server-side — access tokens expire after 1 hour; no auto-refresh yet. Expiry banner now surfaces this on the dashboard (see below), but the user still has to manually re-auth.
- Token encryption — access/refresh tokens stored as plain text in `connected_sources`, encrypt in a future pass
- Period selector is UI-only — no data filtering logic wired to API calls yet (deferred until real data is confirmed working)
- PDF export
- Google Ads integration
- Integrations page i18n — copy strings in local `COPY` object instead of `sv.ts`/`en.ts`
- AI insight wiring — `deriveExecutiveSummary` and per-slide `InsightContract` fields are placeholders until the model is wired

---

## Frontend polish + token expiry signal — completed 2026-04-28

### Token expiry banner (`src/app/(app)/dashboard/page.tsx`)
Added `expiredSources: string[]` state. The per-source fetch loop now checks for `401`/`403` responses specifically — rather than treating them the same as other failures — and pushes the human-readable source name ("Google Analytics" or "Search Console") into `expired`. After all fetches resolve, `setExpiredSources(expired)` is called. A red-bordered banner renders above the sample data banner naming the expired source(s) and linking directly to Integrations with a "Reconnect" CTA. The rest of the dashboard still renders with whatever data did come through.

### Sidebar user profile (`src/components/layout/Sidebar.tsx`)
Replaced hardcoded "Your account / Free plan" with real session data. On mount, calls `supabase.auth.getUser()` and reads `user_metadata.full_name` → `user_metadata.name` → email prefix as display name, and `user.email` as the subline. Avatar initial is the first character of whichever name resolved. Falls back to i18n strings until the async call resolves.

### Scenario switcher moved to sidebar
Removed the floating dark frosted-glass overlay from the dashboard and report pages. Added a clean "Dev · Scenario" section in the sidebar above the language toggle — three buttons (SEO / Full / Partial) styled to match the sidebar. Wired via `DevScenarioContext` (`src/lib/dev-scenario.tsx`) — a tiny React context that wraps the app layout in dev only. The dashboard reads `activeId` from the context instead of local state. In production the provider is not rendered and the context returns the `scenario-2` default. The report page retains its own switcher (independent — report and dashboard can show different scenarios in dev).

### Header/sidebar border alignment
Both the sidebar logo block and the dashboard sticky header are now a fixed `height: 88px`. Previously they used padding-based sizing with different text sizes, causing the shared horizontal border to be misaligned. Fixed height guarantees pixel-perfect alignment regardless of font rendering.

### Header z-index
Raised from `z-10` to `z-30` so the sticky header correctly sits above the hero card's internal `z-10` layers when scrolling.

---

## Dashboard visual overhaul — completed 2026-04-30

Major design pass merging the best of v1 (layout, editorial copy, real data) and v2 (card shell, charts, AI summary panel). The dashboard now looks and feels like a premium product.

### Landing page
- Added quote bridge section between hero and showcase: warm cream card, wavy SVG orange quote marks, "Data är värdelös om du inte förstår den." — "Därför byggde vi Clarix." with purple underline on "Clarix"
- Updated AI-insikter showcase copy: new title and body text

### Dashboard — "Insikter från proffset" hero card
Replaced the old flat lavender hero with v2's AI summary shell, wired to real `executiveSummary` data:
- **Background** — purple-to-lilac gradient with three radial glows (top-left, bottom-right, center-right)
- **Eyebrow** — "Insikter från proffset — MARS 2026", same color and weight, dash separator
- **Headline** — `2rem–2.4rem`, `font-semibold`, with a wavy SVG underline in purple that fits the text width exactly
- **Subheadline** — `text-xl`, one step smaller, same weight as headline for hierarchy
- **Numbers** — colorized inline: green `#16a34a` for positive, red `#B91C1C` for negative, `font-weight: 800`
- **No pills** — removed highlight pills entirely. Headline + subheadline carry the full story
- **CTA** — "Läs hela rapporten" button inside the text column below the subheadline, with arrow icon

### Dashboard — KPI cards (3-column grid)
Redesigned card shell:
- Clean white background, `border: 1px solid var(--rule)`, subtle shadow
- **Label** — eyebrow at top
- **Number** — `2.4rem / 700 / -0.04em` tracking. Commands the card.
- **Delta** — inline beside the number at baseline, no pill background — just colored arrow + percentage
- **Educational text** — bold headline + lighter insight line, separated by a full-width rule
- **Sparkline** — flush to the bottom edge as its own strip, green when trend is good, red when bad. No fill gradient clutter.

### Dashboard — traffic chart
Replaced v1's single-line `TrendLine` with v2's dual `AreaChart`:
- Two overlapping area series: **Besök** (purple) and **Besökare** (green)
- Data from `trafficOverview.timeSeries` with `secondaryValue` as users, falling back to `value * 0.72`
- Custom dark tooltip (charcoal background, bone text)
- Legend top-right: colored line samples with bold labels
- Narrative header preserved: `1.5rem / 700` title + total count subline

### Dashboard — "Nästa steg" card
New card, derived entirely from real data — no hardcoded steps:
- `deriveNextSteps(data)` checks ROAS (scale ads), SEO position > 8 (optimize CTR), bounce rate > 50% (fix landing page), missing paid channel (test Ads). Returns max 3 steps.
- Each step: numbered circle, bold action title, one-sentence rationale, two badges — **Effort** (låg/medel/hög, green/amber/red) and **Vinst** (låg/medel/hög, blue/green/purple)
- Sits in the same 2-column grid as "Betald prestanda", beside it

### Global
- `--bone` changed to `#ffffff` (pure white). `--parchment` to `#ffffff`. Dashboard and all cards are now fully white.
- All section narrative headings unified to `1.5rem / 700 / -0.025em` (previously inconsistent 1.1rem/1.25rem)
- "Sessioner" renamed to "Besök" / "Besökare" throughout dashboard and i18n strings

### Mock data copy
- Scenario 2 headline: "En bra månad. Annonserna drog och SEO höll."
- Scenario 2 subheadline: "Ni fick 24 % fler leads från Google Ads och kostnade mindre per lead än månaden innan. Organiken tappade lite men inget att oroa sig för."
- Scenario 1 and 3 headlines rewritten to plain Swedish

---

## (app2) route group deleted — completed 2026-04-30

All five `(app2)` pages (`/dashboard2`, `/connections`, `/clients`, `/settings2`, layout) deleted from the codebase. The V2 visual work had already been migrated into `(app)` as production pages. The "Design v2" section in the sidebar was removed at the same time.

---

## Integrations page V2 shell — completed 2026-04-30

`/integrations` rebuilt with the V2 visual shell while preserving all real auth logic exactly.

**Visual changes:**
- `BrandMark` component: logo inside a rounded white container with soft border; fallback to colored initial tile
- Integration cards: hover lift + top-edge shimmer on hover, pill badges with live dot for connected state, `rounded-full` CTA buttons with elevated shadow
- Property picker moved out of inline accordion and into a modal (`ConnectModal`) with a browser-chrome header (lock icon + `accounts.google.com`) — mimics the real Google OAuth consent dialog
- Connected state inside modal: checkmark header, property/status/sync detail rows, "Koppla ifrån" / "Klar" button pair

**Logic preserved exactly:** all `fetch` calls to `/api/google/connections`, `/api/google/properties`, `/api/google/connect`, `/api/google/disconnect`; `needsRefresh` warning; `optionsBySource` memoization; locale/copy system; loading and error states.

---

## Dashboard polish + auth wiring — completed 2026-05-01

### KPI cards
- **Blue sparklines** — all KPI card sparklines use a single blue accent (`oklch(0.55 0.2 250)`), not green/red. The diagram communicates trend shape; the pill communicates direction.
- **Green/red delta pills** — bold pill beside the KPI number: green for up, red for down. Arrow icon + percentage, `fontWeight: 800`. Pill is inline-right of the number.
- **Secondary metric** on the same line as the number (e.g. "Konverteringsgrad: 3.0%" beside "340").
- **Layout** — label → number + secondary → pill → divider → headline/insight. All six cards consistent.

### Entrance animations
Replaced spring-based `scale: 0 → 1` explosions with a tasteful `opacity: 0 + y: 12 → 1 + 0` fade-lift, staggered 50ms per card. Hero fires first at 500ms duration. Numbers fade in with a subtle `y: 6` drift. Sparkline clip-reveal slowed to 1.2s. Next steps rows use vertical drift instead of horizontal slide. All `transformOrigin` hacks removed.

### Auth — fully wired
- **`src/app/login/page.tsx`** restored from `_archive/login/`. Google OAuth with `access_type: offline` + `prompt: consent` — forces `refresh_token` on every sign-in.
- **`src/proxy.ts`** — auth guard wired. Protected routes redirect to `/login`; authenticated users bounce from `/login` to `/dashboard`.
- **`src/lib/google/token-refresh.ts`** (new) — `getValidAccessToken()` checks expiry (with 60s buffer), auto-refreshes via Google token endpoint if within 60s of expiry, saves new token back to `connected_sources`. `refreshGoogleToken()` pure function handles the exchange.
- **`/api/ga4`** and **`/api/gsc`** — both now call `getValidAccessToken()` instead of manually querying the DB. Tokens auto-refresh silently; users are no longer forced to re-authenticate every hour.

---

## Repository
Codebase pushed to GitHub: https://github.com/HaiDaPlug/clarix.git (main branch)
