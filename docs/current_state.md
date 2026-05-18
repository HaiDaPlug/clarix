# Digital Rapport — Current State

## What it is and why

Digital Rapport is a premium reporting SaaS for SME business owners who want clarity on their digital performance — not another BI dashboard. The core idea: connect your Google data sources, get a calm, narrative-driven report that tells you what happened, why it matters, and what to do next.

It is not agency software. The end user is a business owner who logs in, connects their own GA4 and Search Console accounts, and sees their numbers presented with editorial restraint and clear language — not a wall of charts.

The product has two layers:
- **Dashboard** — always-on home base. Narrative metric cards, traffic chart, channel breakdown. Designed to answer "how are we doing?" at a glance.
- **Report** — the depth layer. Two report formats now exist side-by-side: Rapport 1 (editorial, narrative-driven slide deck assembled dynamically from real data) and Rapport 2 (cinematic scroll-surface presentation — 10 floating cards on a grey surface, smooth spring scroll, keyboard nav, fullscreen present mode).

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
├── login/page.tsx                    # Sign-in page (Google OAuth + email/password)
├── signup/page.tsx                   # Registration page (Google OAuth + email/password/confirm)
├── auth/callback/route.ts            # OAuth code exchange handler → redirects to /dashboard
├── (app)/
│   ├── layout.tsx                    # App shell — renders Sidebar + content area
│   ├── dashboard/page.tsx            # Dashboard overview (narrative cards, chart, channels)
│   ├── integrations/page.tsx         # Connect GA4 / GSC / Ads — V2 shell + real auth logic
│   ├── clients/page.tsx              # Client workspace grid
│   └── settings/page.tsx            # Settings with tabbed sidebar nav
├── (report)/
│   ├── layout.tsx                    # Isolated report layout — no sidebar, clean canvas
│   ├── report/page.tsx               # Rapport 1 — narrative slide deck, real data wired
│   └── report2/page.tsx              # Rapport 2 — cinematic presentation shell (Clarix traffic report design)
```

The `(app2)` parallel design system route group has been fully merged into `(app)` and deleted.

---

## Auth flow

Auth is fully wired and enforced via `src/proxy.ts` (Next.js 16's equivalent of middleware):

1. User hits `/` (landing page — always public)
2. Clicks "Logga in" → hits `/login`
3. Google OAuth: `signInWithOAuth` fires with `access_type: offline` + `prompt: consent` — forces Google to return a `refresh_token`
4. Supabase redirects to Google OAuth consent screen
5. Google sends user back to `/auth/callback?code=...`
6. `route.ts` exchanges code for session via `supabase.auth.exchangeCodeForSession()`
7. User lands on `/dashboard`

Email/password: `/login` calls `signInWithPassword`, `/signup` calls `signUp` with client-side validation (passwords match, min 8 chars). "Registrera dig" on login links to `/signup`; "Logga in" on signup links back to `/login`. Back button on both pages goes to `/`.

Protected routes (`/dashboard`, `/integrations`, `/clients`, `/settings`, `/report`) redirect unauthenticated users to `/login`. Authenticated users hitting `/login` are bounced to `/dashboard`.

---

## Login & signup page design

Both `/login` and `/signup` share the same two-column layout:

**Left column (35%)** — form content on bone background. Headline + Google OAuth button + divider + email form + toggle link. Fields use bottom-border-only style with focus transitions. Spacing: `gap-8` between headline and form group, `gap-4` between fields.

**Right panel (65%)** — interactive photo reveal effect:
- Base layer: sharp `cloudmind.jpg` (`/public/metaphors/cloudmind.jpg`)
- Blur layer: same photo at `blur(36px) scale(1.15)` — full-panel fog on load
- Wipe mechanic: mousemove drives a spring (`stiffness: 120, damping: 20`) pixel value; a `linear-gradient` CSS mask cuts the blur layer left of the cursor, revealing the sharp photo underneath
- Reveal lock: once the cursor sweeps past 97% of panel width, the blur layer fades out permanently until refresh
- Grain: `NoiseTexture` SVG at `opacity-[0.18]` sits above both photo layers for film texture
- **Dark gradient scrim** — `linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, transparent 65%)` at `z-[15]` between grain and tagline, ensures text legibility over any photo
- Tagline bottom-left: "Få **klarhet** i din data, / med **Clarix**." — plain words white, "klarhet" and "Clarix" use `AuroraText` with Clarix accent colors (pink `#FF4D9E` → coral `#FF6B55` → amber `#FFB830`). "klarhet" sweeps slow (`speed: 0.5`), "Clarix" sweeps faster with reversed color order (`speed: 1.4`) so they're always out of phase.

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

## Rapport 2

[src/app/(report)/report2/page.tsx](../src/app/(report)/report2/page.tsx)

A cinematic scroll-surface report viewer. All 10 slides rendered as floating white cards stacked vertically on a grey surface (`oklch(0.965 0.005 270)`). No slideshow transitions — free mouse scroll with a spring damping effect, arrow keys snap-center to each card.

**Canvas system** — each card is `1280×720` (logical canvas) scaled down via CSS `transform: scale()`. Scale factor computed from container width × `0.86` multiplier, so cards float with visible surface on both sides. `fontSize: 20` on the canvas root makes all `rem`-based type scale linearly together.

**Navigation:**
- Mouse wheel: intercepted, spring-lerped (`0.1` per frame toward target, `0.8` delta multiplier) for a smooth decelerated feel
- Arrow keys / space / enter: `scrollTo` with exact center math (`offsetTop - viewHeight/2 + cardHeight/2`)
- Dot nav (right edge): `IntersectionObserver` tracks which card is most centered, dots reflect reality, click to jump
- Bottom frosted glass pill: left/right arrows + `↑↓` keyboard hints + `1 / 10` counter. `backdrop-blur-md`, 55% white background, white border
- Top bar: back link, slide counter, Present button (fullscreen toggle)

**Slides (10):**
1. Sammanfattning (Hero) — centered headline, trend pill + subtitle row, tag pills, full-width AI summary card below
2. Nyckeltal — 2×2 KPI cards with large display numbers
3. Trafiköversikt — area chart + per-channel right column + channel bar breakdown
4. Trafikkällor — 3-col channel cards with icons, percentages, deltas
5. Bästa sidor — 3-col page rank cards with colored rank badges
6. Strategisk bedömning — centered heading + full-width Clarix executive insight card, "Bottom line" purple accent pill
7. Rekommendationer — 3-col action cards (Skala / Fixa / Bygg)
8. Konvertering — 3 metric cards if conversions exist, else upsell layout
9. AI-synlighet — left text + right 2×2 AI source status grid
10. Kort summerat — bullet list left + booking CTA card right

**Data:** same real GA4/GSC pipeline as Rapport 1 — fetches from `/api/ga4` and `/api/gsc`, merges with `scenario2` mock fallback via `mergeReportData`.

---

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
12. ~~**Dashboard loading UX + shimmer**~~ — ✅ Done. Purple/blue shimmer sweep (`ShimmerCard`, `ShimmerOverlay` in `src/components/primitives/ShimmerCard.tsx`) replaces all grey skeleton blocks. Shimmer only runs when connected sources exist — mock-only users get instant render. KPI skeleton count derived from actual connected source types (GA4 → 4, GSC → +1, Ads → +1) so placeholder count matches the real dashboard. Counter animation (`AnimatedCounter`) only runs after real data loads. GA4 API parallelized (current + prior period fetched simultaneously) — halved fetch time.
13. ~~**Dashboard modularized**~~ — ✅ Done. `dashboard/page.tsx` extracted from 1,579 lines to ~200 lines. All components moved to `src/components/dashboard/`: `KpiCard`, `DashboardHero`, `SessionsChart`, `ChannelBreakdown`, `SearchVisibility`, `PaidPerformance`, `NextStepsCard`, `metrics` (shared helpers). TypeScript clean, zero logic changes.
14. **Open auth — unblock real users** — New users hitting the Google OAuth flow get a "not a developer / app unverified" block because the app is still in testing mode in Google Cloud Console. Fix: either submit the app for Google OAuth verification, or add authorized test users in the Google Cloud Console OAuth consent screen settings. This is blocking any real user from logging in and must be resolved before sharing the product with anyone outside the team.
15. **Report 2 — sharpen and promote, retire Report 1** — Rapport 2 (the cinematic Clarix-aesthetic shell) is the future. Polish its slides with real data, nail the visual identity, and make it the sole report format. Once Rapport 2 is undeniably better, remove Rapport 1 to reduce surface area and sharpen the product story.
16. **UX and feel of Clarix — holistic pass** — After auth and report work stabilize, do a full UX pass: transitions, micro-interactions, copy tone, empty states, loading feedback. The product should feel like a premium tool from first login to last slide — every click, every state, every moment of waiting should feel intentional.
17. **Dashboard — world-class with real data** — The shimmer and loading UX is solid. Next: make the dashboard undeniable. Real data QA pass (every KPI verified against GA4 dashboard), remove any remaining mock contamination, sharpen the narrative copy, elevate visual hierarchy. Every number must earn its space.
18. **File extraction — large files flagged** — Three files need splitting before they become blockers: `src/app/(app)/integrations/page.tsx` (1,206 lines — same problem dashboard had), `src/lib/google/report-mappers.ts` (722 lines — split into `ga4-mapper.ts` / `gsc-mapper.ts`), `src/app/page.tsx` (653 lines — landing page sections inlined). Do in a dedicated pass.
19. **Product model — accounts before reports, white-label architecture** — Before deepening the report feature, align on the business model: does a user/agency account own multiple client workspaces, each with their own report? White-label means the report renders with the agency's logo, domain, and accent color — not Clarix branding. Nail the data model (account → workspace → report) before building the UI so no architectural debt accumulates. Open questions: do we prioritize the account model or white-label first? Are these the same feature?
20. **AI insights — living, dynamic, per-slide and dashboard** — AI is Clarix's USP. The `InsightContract` type and three-field shape (`observation`, `implication`, `recommendedAction`) are already defined in `src/types/insight.ts`. The next step is to wire a Claude model call behind each slide and each dashboard section — not once on page load, but dynamically as data changes. Every slide sends its raw JSON + module type + period context → model returns insight → rendered inline on the slide. Dashboard gets the same treatment. The insight must feel alive: contextual, specific to the numbers, written for a business owner. This is what differentiates Clarix from every other reporting tool.
21. **Insight contract + AI wiring** — wire a model to fill the three-field `InsightContract` shape per slide using real data as evidence. Each slide sends its raw JSON + module type + period context to the model; model returns `{ observation, implication, recommendedAction }`. The `InsightContract` type and prompt discipline are already defined in `src/types/insight.ts` and the founder notes. `executiveSummary` generation can be folded into this pass.
22. **PDF export** — each slide as a page, animations stripped, typography and layout fully respected. The most beautiful PDF a client has ever received.

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

---

## Auth + integration fixes — completed 2026-05-01

A full pass fixing the OAuth redirect loop, the provider_token loss bug, and the post-connection UX.

### What was fixed

**Supabase URL configuration**
Site URL set to `https://clarix.se`. Redirect URLs: `https://clarix.se/**` and `http://localhost:3000/**`. Without the wildcard, Supabase stripped the path and redirected to the landing page root with the code as a query param — causing an infinite sign-in loop.

**Auth callback — smart routing**
`/auth/callback` now checks `connected_sources` after exchanging the code. New users (no real connections) are sent to `/integrations`. Returning users with existing connections go to `/dashboard`.

**provider_token persistence**
Supabase only provides `session.provider_token` (the Google access token) during the initial OAuth exchange. On any subsequent request it is gone. Fix: the auth callback immediately writes the token to a `connected_sources` row with `property_id = "_pending"`. The `/api/google/properties` and `/api/google/connect` routes fall back to reading from this sentinel row when the session token is absent. The `_pending` row is filtered out of the UI and overwritten with the real property once the user connects.

**Integrations page — UX**
- `_pending` rows filtered from the displayed connected sources list
- Auto-redirect to `/dashboard` as soon as both GA4 and GSC are connected
- "Gå till dashboard" button added to the integrations header — always visible regardless of connection state

**Light/dark toggle on landing page**
`ThemeToggle` component added to the landing page header, to the left of "Logga in". Reads/writes `localStorage` and toggles `.dark` on `<html>` — consistent with the app's theme system.

**proxy.ts moved to project root**
Next.js 16 requires `proxy.ts` at the project root, not inside `src/`. Build error resolved.

**Founder note — post-connection success modal**
After a data source is successfully connected, instead of the current "Gå till dashboard" button, show a modal overlay with:
- Header: "Klappat och klart!"
- Subtext: "Nu är [data source name] kopplat! Vill du se din data live?"
- Two buttons: "Gå till dashboard" (primary) and "Stannar kvar lite till" (secondary, dismisses the modal)

---

## Data merge fixes — completed 2026-05-01

Three bugs in `mergeReportData` that caused real data to partially overwrite or corrupt other real data.

### What was wrong

**kpiSnapshot overwrite** — GSC mapper emitted its own `kpiSnapshot` (2 metrics: clicks + position). Because the merge was a shallow spread, GSC's snapshot silently overwrote GA4's 6-metric snapshot. Users saw only 2 KPI cards.

**topPages never joined** — GA4 returned pages with sessions + bounce rate. GSC returned the same URLs with clicks + impressions + position. They lived in separate `topPages` objects and one always won. Pages never had both traffic and search data at once.

**paidOverview always mock** — No Google Ads connector exists yet. `paidOverview` came from the mock fallback and was passed through as if it were real, showing fake paid numbers to live users.

### What was fixed

**`src/lib/google/report-mappers.ts`**
GSC mapper no longer emits `kpiSnapshot`. The `mapGscKpiSnapshot` function removed entirely.

**`src/lib/google/connected-sources.ts`** — `mergeReportData` now:
- `mergeKpiSnapshot()` — collects `kpiSnapshot` from all real source parts, combines their metrics into one snapshot deduped by label, capped at 6. GA4 metrics + GSC metrics appear together.
- `mergeTopPages()` — when both GA4 and GSC return `topPages`, pages are joined by URL. A page present in both sources gets sessions/bounceRate (GA4) and clicks/impressions/position (GSC) merged onto the same row.
- `paidOverview` is set to `undefined` when `google_ads` is not in `availableSources` — mock paid data never leaks through to real users.

---

## Founder note — what needs to be designed next (2026-05-01)

The data pipeline is now solid. GA4 and GSC flow end-to-end, tokens refresh silently, the merge is correct, and mock data doesn't contaminate real data. The next frontier is not another technical fix — it's a product design conversation.

**The question is: what makes this feel like an agency in your pocket?**

Right now the dashboard shows real numbers with static narrative copy. The "Nästa steg" card derives action items from rules. The executive summary hero is generated from a bridge function. It works, but it reads like software that knows the data — not an advisor who understands the business.

The gap to close: **dynamic, data-aware language that speaks directly to what happened this month, not generic descriptions of metrics.**

Some open questions that need to be worked through before building:

**Report logic**
- Each slide currently shows a static headline and an insight line. These are strings in the i18n dictionary — the same text regardless of whether sessions are up 40% or down 15%. What should the logic be for switching between these? Rules? AI? A hybrid where rules determine the narrative branch and AI fills the copy within it?
- The `InsightContract` shape (`observation`, `implication`, `recommendedAction`) is defined and ready. The question is: does AI fill all three, or does the rule engine set the observation from data and AI only writes the implication and action?
- How much should the report "know" about the business? Right now it knows the numbers. Should it know the industry, the seasonality, the client's stated goals? And if so, where does that context live?

**Dashboard logic**
- The hero card today shows the executive summary headline — one sentence about total sessions trend. What should it show when sessions are flat? When only GSC is connected and there's no traffic data? When it's the first month and there's no prior period to compare against?
- The "Nästa steg" card derives up to 3 steps from three rules. Is that the right model? Should it be more like a prioritized inbox — a living list of open action items, some persistent across periods, some new each month?
- What is the right frequency of language? Monthly summaries feel editorial. Weekly feels operational. Daily would feel like noise. The cadence should match how often an SME owner actually changes behavior.

**The "agency in your pocket" feeling**
- A good agency doesn't just report what happened — it tells you what to do about it before you ask. The product should feel proactive, not reactive.
- The language should be first-person confident: "Your organic traffic dropped because position 6–10 rankings shifted. Here's what we'd do." Not: "Bounce rate increased 4.2% vs prior period."
- Numbers should only appear when they answer a question. Every number on screen should be paired with a "so what?" that a 50-year-old business owner without a marketing background would act on.

This is the design conversation that needs to happen before the AI wiring pass. Building the wiring first and filling in the product thinking later produces something technically correct but editorially empty.

---

## Core loop closed — completed 2026-05-04

The full end-to-end pipeline is now working. Real GA4 data flows from Google into the dashboard.

### What was fixed to close the loop

**Google Analytics Admin API not enabled**
Property listing (`analyticsadmin.googleapis.com/v1beta/accountSummaries`) requires the Admin API to be explicitly enabled in Google Cloud Console — having the Data API alone is not enough. Enabled manually in the project.

**Missing OAuth scope for Admin API**
Login page only requested `analytics.readonly` (Data API) and `webmasters.readonly` (GSC). Added `analytics` scope so the Admin API endpoint is authorized. Users must re-consent after this change.

**GA4 400: future end date rejected**
`currentCalendarMonthRange()` returned the last calendar day of the month as `endDate` (e.g. May 31 when today is May 4). GA4 Data API rejects any `endDate` in the future with 400. Fixed: `endDate` is now capped at today when the month hasn't ended yet.

### Confirmed working
- OAuth sign-in → `_pending` sentinel row written to DB
- `/integrations` lists real GA4 properties from Admin API
- User picks property → real row written, `_pending` deleted

### Root cause found and fixed — completed 2026-05-04

**`conversionRate` is not a valid GA4 Data API metric name.** The correct name is `sessionConversionRate`. GA4 rejects any request containing an unknown metric with a blanket 400, which killed the entire report set — sessions, traffic, channels, everything. Fixed in `src/lib/google/report-queries.ts` and the matching `readGa4Summary` call in `src/lib/google/report-mappers.ts`.

Also fixed this session:
- `successfulSourceIds` now only pushed when response has `trafficOverview` or `seoOverview` — previously a 200 with no real data (token missing) counted as success and poisoned the merge with mock data
- `meta.period` stamped with real month/year label when real data loads (was showing mock scenario's period label)
- `...merged.meta` removed from `mergeReportData` — it was always a no-op since no mapper returns `meta`
- Debug logging added to `/api/ga4/route.ts` (should be removed before production)

### Confirmed working
- Real GA4 data renders on the dashboard — sessions, channel breakdown, KPI cards
- `[ga4] mapped ok — sessions: N` visible in server terminal

### Known issues — next session priority
- **Some stats are suspiciously high** — likely mock data bleeding through for fields the GA4 mapper doesn't populate (e.g. `organicSessions` shows mock value when GA4 channel breakdown returns a different channel name). Need a QA pass comparing each KPI card value against GA4 dashboard directly.
- **All stats must be fully dynamic** — any field still falling back to mock data when GA4 is connected needs to be identified and either populated from real data or hidden. The "no mock contamination" rule must be absolute.
- Debug `console.log`/`console.error` calls in `/api/ga4/route.ts` should be removed once QA is complete.

### Next priorities
1. QA pass — open GA4 dashboard side-by-side, verify every KPI card value matches. Note any that are wrong.
2. For each wrong stat: trace whether it's a mapper gap (channel name mismatch, missing field) or a merge leak (mock fallback bleeding through).
3. Connect GSC and verify search data flows alongside GA4.
4. Remove debug logging from `/api/ga4/route.ts`.
5. AI wiring — `InsightContract` per slide using real data as evidence.
6. PDF export.

---

## Founder note — single-source dashboard behavior (2026-05-04)

When a user connects only one source (GA4 only, or GSC only), the dashboard must behave gracefully and honestly. Rules:

**GA4 only (no GSC):**
- Show: traffic KPIs (sessions, users, bounce rate, engagement), sessions chart, channel breakdown, "Nästa steg" card
- Hide: all GSC-dependent cards (organic reach, search clicks, search visibility grid, top queries)
- Top pages show: sessions + bounce rate only (no clicks/impressions/position columns)
- Executive summary: traffic-only headline, no search angle
- Nudge: one GSC nudge card at the bottom — "Koppla Search Console för att se hur din trafik hittar dig organiskt"

**GSC only (no GA4):**
- Show: search clicks KPI, avg position KPI, search visibility grid, top pages (clicks/impressions/position only)
- Hide: sessions chart, channel breakdown, all traffic-dependent KPIs, paid card
- Executive summary: search-only headline
- Nudge: GA4 nudge — "Koppla Google Analytics för att se hur besökarna beter sig på sajten"

**Both connected (full state):**
- Full dashboard as currently built. No nudges.

**Rules for all partial states:**
- Never show a card with undefined/null data — show the dimmed placeholder instead
- Never show mock data mixed with real data — if a section has no real source, it is hidden entirely (not filled with scenario mock)
- The nudge is always singular — show only the highest-value missing source, never stack nudges
- The progress bar on integrations reflects 0/1/2 channels, not 0/2 binary

**For later — onboarding quiz:**
Before the user connects anything, show a short quiz (2–3 questions max) on the integrations page or as a post-login interstitial:
- "What is your main goal with measuring data?" — options: Grow organic traffic / Understand what converts / Optimize ad spend / All of the above
- Based on answer, the recommended integration cards are reordered and highlighted: SEO goal → GSC first; Conversions → GA4 first; Ads → GA4 + Ads
- The quiz result sets a `user_goal` field (stored in Supabase user metadata or a `user_settings` table) that the eligibility engine and nudge copy can reference later
- This is a product/design decision — build the quiz UI and goal-routing logic only after the single-source dashboard behavior is confirmed working

---

## Auth + token pipeline hardening — completed 2026-05-04

Full stress-test and repair pass on the auth → token storage → properties fetch → dashboard render pipeline. 9 files changed.

### What changed

**`proxy.ts`**
Removed the authenticated-user redirect from `/login`. Logged-in users can now reach `/login` again to re-consent with Google without being bounced to `/dashboard`. This unblocks the re-auth flow when tokens expire.

**`src/lib/google/token-refresh.ts`**
- Missing or unparseable `token_expires_at` is now treated as refresh-needed (was previously treated as "not expired"). Prevents stale tokens from being used indefinitely when expiry is null.
- `refreshGoogleToken` now checks the Supabase update response for errors and throws `token_refresh_failed:update_failed` if the save fails — previously a failed DB write was silently swallowed.
- Returns `null` (not throws) when no `refresh_token` exists — correct behaviour, not an error.

**`src/app/api/google/properties/route.ts`**
Refactored token resolution into `getDiscoveryAccessToken()`: iterates all stored rows (sorted `_pending` first), tries each via `getValidAccessToken`, returns the first that yields a valid token. If all fail with `token_refresh_failed`, surfaces a single 401 auth error. Google API failures are now always 502 data errors (not 401) — cleaner error type separation.

**`src/app/api/google/connect/route.ts`**
Refactored stored credential lookup into `getStoredGoogleCredential()` with the same multi-row iteration pattern as the properties route. Catches `token_refresh_failed` from the lookup and returns a clean 401. The `_pending` cleanup delete is now hardcoded to `source: "ga4"` (correct — only GA4 has a `_pending` sentinel row; GSC never did).

**`src/lib/google/connected-sources.ts`**
- `mergeReportData` signature changed: `connectedSources` parameter is now `DataSource[]` (was `ConnectableSource[]`) — accepts the broader type from `meta.availableSources`.
- `availableSources` in the merged result now uses only `connectedSources` when real parts exist, rather than unioning with the fallback's sources. Prevents mock sources from leaking into the real-data merge.
- `sourceConfidence` no longer merges from fallback when real parts exist — only real API responses set confidence.

**`src/lib/google/report-mappers.ts`**
GSC mapper re-emits `kpiSnapshot` (4 metrics: clicks, impressions, CTR, position). Works correctly with `mergeKpiSnapshot()` which deduplicates by label across all real source snapshots.

**`src/app/(report)/report/page.tsx`**
Added `.neq("property_id", "_pending")` to the connected sources query — mirrors the fix already applied to the dashboard page.

**`supabase/migrations/20260504000000_connected_sources_property_key.sql`**
Made idempotent: wrapped both `DROP CONSTRAINT` and `ADD CONSTRAINT` in `DO $$ IF EXISTS / IF NOT EXISTS $$` blocks. Safe to run multiple times or on DBs where the constraint already exists.

**`supabase/migrations/20260504110000_connected_sources_property_key_repair.sql`** (new)
Identical idempotent migration for environments where the original migration file was already recorded in the migration history before the constraint was verified. Ensures all remote DBs reach the correct `(user_id, source, property_id)` constraint regardless of migration state.

### Verification
- `tsc --noEmit` passes clean.
- `npm run build` passes.
- Pre-existing lint errors in `src/app/page.tsx` remain (unrelated to this pass).

---

## Production readiness audit — 2026-05-02

Full findings in [`docs/production-audit.md`](production-audit.md) — checkboxes, priority order, and notes for future sharpening passes.

### What was fixed (2026-05-02)

All 18 items resolved. 14 were code fixes, 4 were reviewed and confirmed non-issues.

**Auth & session**
- A1 — Sentinel row upsert now checks for errors; redirects to `/login?error=token_save_failed` on failure instead of silently continuing
- A2 — Connect route retries sentinel row read once after 800ms to handle slow DB writes from the auth callback
- A3 — Properties route now classifies 401/403 errors as `type: "auth"` so the "Sign in again" CTA appears
- A4 — Reviewed: Supabase SSR client auto-refreshes sessions on every proxy request; API 401s surface via expired sources banner

**Data fetching**
- D1 — `withRetry` wrapper on all Google API calls: 2 attempts, 1s gap, permanent errors (400/401/403/404) not retried
- D2 — `successfulSourceIds` now only includes sources whose fetch returned data; failed sources no longer contaminate the merge with mock data
- D3 — `refreshGoogleToken` now throws with `token_refresh_failed:<reason>`; both API routes catch it and return `type: "connection"` + 401
- D4 — Connections fetch wrapped in try/catch; network timeouts now set error state instead of crashing the component
- D5 — Mapper calls wrapped in try/catch in both API routes; shape errors return explicit `type: "data"` 502 instead of unhandled crash

**Empty states**
- E1 — Empty `timeSeries` array shows "Ingen data för denna period" card instead of blank chart axes
- E2 — Undefined metric renders a dimmed placeholder card instead of silently vanishing from the grid
- E3 — No-properties state now has explicit copy explaining the sign-out, button reads "Logga in med annat konto"

**Race conditions**
- R1 — `isPending = pendingSource !== null` locks all property buttons while any connect is in flight
- R2 — `AbortController` wired to all dashboard fetch calls; navigating away cancels in-flight requests
- R3 — `propertiesRefreshKey` counter triggers property list re-fetch after every successful connect

**UX gaps**
- U1 — Deferred to UX discussion pass (skeleton loading design is a taste decision)
- U2 — Reviewed: effect re-runs on mount, banner auto-clears on return from login
- U3 — Reviewed: React 18 batching prevents flicker in practice

**Security**
- S1 — Reviewed: tokens come from DB keyed on userId, no user-input injection path
- S2 — Reviewed: Postgres upsert with onConflict is atomic, last write wins is correct

---

## Rapport 2 — completed 2026-05-12

New presentation format built alongside Rapport 1. Ported directly from the `clarix-traffic-report.zip` Vite/TanStack Router prototype into the Next.js `(report)` route group.

### Design language

Entirely different from Rapport 1. Where Rapport 1 is editorial (bone/charcoal, whitespace-first), Rapport 2 is cinematic:
- **Background** — soft `oklch(0.985 0.005 270)` near-white with two radial aurora gradients (violet top-left, teal bottom-right)
- **Cards** — rounded 3xl/2xl with soft multi-layer shadows and frosted glass on AISummary blocks
- **Color tokens** — `oklch`-based: `TREND_POS` green, `TREND_NEG` coral, `ACCENT` violet `oklch(0.5 0.18 290)`
- **Typography** — same Barlow/Satoshi stack but `font-display` used at `3.6rem` for hero headings
- **Bottom nav** — fixed frosted bar with prev/next buttons, expanding dot indicators (active dot widens to 32px)
- **Interaction** — drag-to-swipe (Framer Motion `drag="x"` with offset threshold), keyboard arrows, fullscreen present mode

### 10 slides

1. **Sammanfattning** — headline with inline TrendPill, summary badge strip, AISummary card with contextual copy
2. **Nyckeltal** — 2×2 grid of KPI cards (Besök, Antal personer, Tid på sidan, Leads) — min-height 220px, value grows to fill
3. **Trafikutveckling** — full-width AreaChart from real time-series data, gradient fill
4. **Trafikkällor** — 6-card grid (Google SEO, Direkt, Sociala medier, Google Ads, Referral, E-post) with share %, visit count, delta pill
5. **Bästa sidor** — 6-card grid with ranked color tiles (coral #1, gold #2, lavender #3, neutral for the rest)
6. **Strategisk bedömning** — two-column layout with AISummary "Clarix executive insight"
7. **Rekommendationer** — 3-card grid with tag pills (Skala / Fixa / Bygg) and icon avatars
8. **Konvertering** — conditional: 3-metric summary when conversions connected, upsell panel when not
9. **AI-synlighet** — 4 AI source status tiles (ChatGPT, Perplexity, Gemini, Claude) all showing "Ej spårat"
10. **Kort summerat** — 3 recap bullets + a "Boka strategigenomgång" CTA panel in violet gradient

### Real data wiring

Same pattern as Rapport 1. On mount: reads `connected_sources` from Supabase, fetches `/api/ga4` + `/api/gsc` in parallel with `currentCalendarMonthRange()`, merges over localized `scenario2` fallback via `mergeReportData`. `buildSlideData()` maps the `ReportData` schema fields to slide-specific values:
- Sessions/users from `trafficOverview.totalSessions` / `organicSessions`
- Channel breakdown from `trafficOverview.channelBreakdown[]`
- Time series from `trafficOverview.timeSeries[].value` (primary = sessions)
- Top pages from `topPages.pages[]`
- Conversions from `conversions.totalConversions`
- Falls back to curated Swedish mock data per section when real data is absent

### Sidebar

"Rapport 2" link added below "Rapport" in the Overview section of the sidebar. Distinct icon (document with a chart dot). Both `sv.ts` and `en.ts` updated with `report2` key.

---

## Landing navbar enlargement — completed 2026-05-12

`LandingHeader` in `src/components/landing/landing-sections.tsx`:
- Navbar height: `h-16` → `h-24`
- Logo: `h-8` → `h-16` (width/height props `96×32` → `200×64`)
- Horizontal padding: `px-6` → `px-8`
- Nav link text: `text-sm` → `text-base`, gap `gap-8` → `gap-10`
- Button text: `text-sm` → `text-base`, padding `px-4 py-2` → `px-5 py-2.5`
- CTA icon: `h-3.5 w-3.5` → `h-4 w-4`

---

## Repository
Codebase pushed to GitHub: https://github.com/HaiDaPlug/clarix.git (main branch)

---

## Rapport 2 — slide merge + viewer overhaul (2026-05-13 → 2026-05-14)

### Goal
Rapport 2 is the canonical report going forward. Rapport 1 is archived (still lives at `/report` untouched, but no longer the focus). The work this session was two-track: (1) enrich Rapport 2's traffic slide with the layout richness of Rapport 1, and (2) overhaul the viewer shell to feel like a premium slideshow — centered slide, grey breathing room, vertical dot nav, bottom keyboard controls.

---

### Track 1 — Traffic slide enriched (`SlideTrend`)

**What the user wanted:** Rapport 2's `SlideTrend` ("Trafikutveckling") was clean but naked — just a chart. Take the "Per kanal" right-side stats and "Kanalfördelning" bottom bar from Rapport 1's `TrafficOverviewSlide`, keep Rapport 2's warm aesthetic (rounded cards, muted backgrounds, blue chart).

**Heading changed** from "Så utvecklades trafiken" → "Så hittar besökarna till er" (matching Rapport 1's eyebrow "Trafiköversikt").

**Layout added:**
- Left: "Totala sessioner" label stacked above the big number, then the chart card
- Right: "Per kanal" card showing top 3 channels by visits (resolved by position, not name-matching — fixes the "Google SEO" vs "Organisk sökning" mismatch), plus Avvisningsfrekvens and Genomsn. besökstid when available
- Bottom: "Kanalfördelning" card with horizontal fill bars

**Chart updated:** Stroke 2.6px → 1.5px (thin, like Rapport 1), fill opacity 32% → 12% (whisper gradient). Date formatter added: ISO `2026-05-11` → Swedish `"11 maj"`.

**`SlideData` interface extended** with `bounceRate: number | null` and `avgDuration: number | null`. `buildSlideData` populates them from `traffic.bounceRate.value` and `traffic.avgSessionDuration.value`.

**`TrafficOverviewSlide.tsx` reverted** — was accidentally modified during the merge exploration, fully restored to original.

**Files changed:**
- `src/app/(report)/report2/page.tsx` — `SlideData`, `buildSlideData`, `SlideTrend`
- `src/components/slides/TrafficOverviewSlide.tsx` — restored to original

---

### Track 2 — Viewer shell redesign

**What the user wanted:** A slideshow that looks like reading a PDF on screen — slide centered with breathing room around it (same background, not a different grey), vertical dot progress on the right, keyboard hint controls centered at the bottom. Reference screenshot: Nike AI Visibility Report viewer (centered slide, dots on right, `space` / `return` / `↓` hint at bottom).

**What was built:**
- `h-screen` shell, no scroll
- Slide card: `width: min(90%, calc((100vh - 7rem) * 16/9))`, `aspect-ratio: 16/9`, `rounded-2xl`, soft shadow — centered in a flex stage
- Vertical dot nav: flex column of pill dots (`w-5 h-5` inactive, `w-5 h-22` active), sits as a flex sibling outside the card to the right — never overlaps the card
- Bottom controls: prev arrow · `space`, `return`, `→` kbd hint · next arrow — centered
- Top bar: minimal — "Clarix · N/total" left, "Present" button right, `h-11`
- Aurora background removed from inside the card (was leaking over content in bottom-right)
- Slide transitions: `motion.div` with `opacity: 0, x: dir * 20` → `opacity: 1, x: 0`
- Keyboard nav: arrows, space, enter advance; escape exits/back
- Drag-to-swipe removed (scroll paradigm replaced it)

**Files changed:**
- `src/app/(report)/report2/page.tsx` — full `Report2Page` component rewritten

---

### Track 3 — Fixed-canvas scale (attempted, incomplete)

**What the user wanted:** Content clips in the 16:9 frame — slides were designed with more vertical space than 720px provides. Agreed on CSS `scale()` approach: author at a fixed canvas size (1440×900), scale the inner canvas to fit the outer card, exactly like Figma/Google Slides present mode.

**What was implemented:**
- `CANVAS_W = 1440`, `CANVAS_H = 900` constants
- Outer card: sized by `ResizeObserver` on the stage container, drives `cardSize` state in pixels
- Inner div: always `1440×900`, `transform: scale(N)` with `transform-origin: top left`
- `scale = min(availW / 1440, availH / 900)` — tightest axis wins, recomputes on resize

**Current problem:** The scaling is geometrically correct but the slide content (especially `SlideKpis` with 4 large cards) still clips at the bottom. Root cause: the slide components themselves use `min-h-[180px]` / `min-h-[220px]` on KPI cards, and the total content height at 1440px wide exceeds 900px. The canvas isn't tall enough for the content as currently written.

**What needs to happen next:**
1. Audit each slide component's actual rendered height at 1440px wide. `SlideKpis` is the worst offender — 4 cards with `min-h-[220px]` + heading + gap = ~600-700px, which fits, but padding on the wrapper adds more.
2. Either: reduce `min-h` on KPI cards (they don't need to be that tall — value + label is enough), or increase `CANVAS_H` to 1000px (ratio becomes ~1.44:1, still reasonable for laptop screens), or reduce inner padding from `py-12` to `py-8`.
3. Verify the fix by testing slides 2 (KPIs), 3 (Trend — has chart + two side columns + bottom bars), and 6 (Strategic — two-column with AISummary).
4. After content fits, clean up: the `stageRef` ResizeObserver fires once immediately on mount which should guarantee correct initial scale — but verify this actually works before the first paint (no flash of unscaled content).

**Files changed:**
- `src/app/(report)/report2/page.tsx` — `CANVAS_W/H` constants, `scale`/`cardSize` state, `stageRef` ResizeObserver, card + inner canvas JSX

---

### clients/page.tsx — syntax fix

Corrupted string literal on line 39 — `style={{ backgroundColor: "var(--charcoal)", color: "var(--pnpm` was never closed, causing 17 TypeScript errors cascading from that line. Fixed by closing the style prop and restoring the button's JSX children (`<Plus />` + "Ny kund").

**File changed:** `src/app/(app)/clients/page.tsx`

---

## Report viewer — fixed-canvas stage overhaul (2026-05-15)

### Goal
The report viewer was clipping slide content at the bottom on laptop screens and showing too much grey dead space around the slide. Multiple iterations to arrive at a stable, correct implementation.

### Root cause (diagnosed)
CSS `transform: scale()` changes the **visual size** of an element but not its **layout footprint**. When centering was done via `grid place-items-center`, the browser centered the unscaled 1440×810 layout box, then scaled it visually afterward. On laptop heights, the visual canvas extended outside the stage bounds even though the layout box appeared centered. This caused systematic bottom cutoff.

### Final implementation

**Canvas dimensions:** `CANVAS_W = 1440`, `CANVAS_H = 810` (true 16:9)

**Scale formula:**
```ts
const VERTICAL_SAFE = 24;
const s = Math.min(w / CANVAS_W, Math.max(0, h - VERTICAL_SAFE) / CANVAS_H, 1);
```
- Width is fully greedy — no horizontal safe area
- Height reserves 24px to absorb sub-pixel rounding, DPR scaling, border/shadow, and browser chrome variation
- Clamped at 1 — never upscales beyond designed size

**Positioning — absolute, not grid-centered:**
```ts
left = Math.round((stageW - CANVAS_W * scale) / 2)
top  = Math.round((stageH - CANVAS_H * scale) / 2)
```
Canvas placed at manually computed offsets using the *visual* size (`CANVAS_W * scale`), not the layout footprint. `transformOrigin: "top left"`. This is the critical fix — browser no longer fights itself trying to center an unscaled footprint.

**Stage DOM:**
- `relative flex-1 min-h-0 overflow-hidden` — takes all space between top bar and bottom controls
- Canvas is absolutely positioned inside it
- Dot nav is an absolute overlay on the right edge — no longer a flex sibling stealing horizontal space

**Chrome:**
- Top bar: `h-10` (40px)
- Bottom controls: `pb-2 pt-1`
- Stage background: `oklch(0.97 0.005 270)` — subtle off-white so the white canvas reads as a composed page
- Slide canvas: white background, `border: 1px solid rgba(20,18,16,0.05)`, very soft shadow, `borderRadius: 4` — restrained page-boundary, not a SaaS card

**Slide transitions:**
- `motion.div` with `opacity: 0, x: dir * 20` → `opacity: 1, x: 0`
- Duration 380ms, `ease: [0.16, 1, 0.3, 1]` — smooth, not bouncy

**Files changed:** `src/app/(report)/report2/page.tsx`, `src/app/(report)/layout.tsx`

---

## Report slides — content presence pass (2026-05-15)

### Goal
With the viewer stage fixed, the slide content itself felt slightly timid on laptop — headings too small, KPI values underscaled, chart too short. A restrained 5–12% presence pass, touching shared primitives first, slide-specific second. No redesign, no template rewrites.

### What was changed

**`SlideHeading` (shared — affects slides 1, 2, 4, 5, 6, 7, 8):**
- `h1` base size: `text-[2rem]` → `text-[2.6rem]` (was stuck at 2rem because `sm:` / `lg:` breakpoints don't fire meaningfully inside a scaled canvas)
- Sub-label: `text-base` → `text-[1.05rem]`, removed responsive breakpoint variants
- `lg:text-[3.2rem]` retained for truly large viewports

**Slide 2 — KPI cards (`SlideKpis`):**
- Metric value: `text-[2rem]` / `sm:text-[2.8rem]` → `text-[3rem]` flat (breakpoints didn't fire in canvas context)
- Card min-height: `min-h-[180px]` / `sm:min-h-[220px]` → `min-h-[200px]` (unified, removed dual breakpoint)

**Slide 3 — Traffic overview (`SlideTrend`):**
- Chart height: `h-[180px]` → `h-[220px]`
- Per-kanal channel values: `text-xl` → `text-2xl`
- Standalone `h1` aligned: `text-[2rem]` → `text-[2.6rem]` (was not using `SlideHeading` component)

### What was intentionally left alone
- `Eyebrow` — `text-[11px]` uppercase is deliberate taste, not timid
- KPI card label text (`text-sm`) — header labels should stay quiet relative to the value
- Channel card values on slide 4 (`text-3xl`) — already confident
- All spacing/gap values — whitespace is part of the premium feeling
- `AISummary` body text — reading-scale intentional, not hero-scale
- All viewer/stage/canvas mechanics

**Files changed:** `src/app/(report)/report2/page.tsx`

---

### Next priorities — report sharpening

1. **Internal slide composition pass** — slides feel structurally correct but content density is uneven. Some slides (hero, strategic insight, recap) have too much empty vertical space below content. This is a per-template issue: headings and content blocks need to be distributed across the full canvas height, not stacked at the top and abandoned.
2. **Chart height (slide 3)** — still hardcoded at 220px. Should grow to fill its card naturally.
3. **Heading responsiveness** — `SlideHeading` now has a fixed `2.6rem` base. At very small scaled views (small laptop + browser zoom), this may feel too large. Worth testing at ~80% browser zoom.
4. **Taste sharpening** — colors, type weight, and editorial copy per slide. This is a founder-taste pass, not a code pass — should be driven by explicit direction on what "premium and calm" means per slide.

---

## Channel info-icons + label rewrite — completed 2026-05-17

### Goal
SME clients don't know what "Direkt", "Organisk social", "Ej tilldelad" mean. Made channel cards self-explanatory: sub-label always visible, purple Clarix ⓘ icon that shows a plain-language tooltip on hover.

### What was built

**`InfoTooltip` component** (`src/components/primitives/InfoTooltip.tsx`) — rewritten to use React `useState` for hover instead of CSS class tricks (Tailwind `group-hover` can't override inline styles, and `eyebrow` `text-transform: uppercase` was bleeding into tooltip text). Pure `onMouseEnter`/`onMouseLeave` state — works in all contexts.
- Purple Clarix accent (`oklch(0.5 0.18 290)`) on the ⓘ badge
- `side` prop (`"above"` default / `"below"`) for positioning control
- Returns `null` when `text` is empty — safe to call unconditionally

**Channel name + info-text map** — added to both `ChannelBreakdown.tsx` and `report2/page.tsx`. Maps every GA4 channel string variant (English keys, Swedish display labels, Swedish GA4 API strings) to a canonical `{ name, sub, info }` object. Covers: `organic / Organisk sökning`, `direct / Direkt`, `social / Organisk social`, `unassigned / Ej tilldelad`, plus paid, referral, email.

**Dashboard `ChannelBreakdown`** (`src/components/dashboard/ChannelBreakdown.tsx`):
- `getChannelRows` now passes a `channelKey` field — inferred from the raw channel string via fuzzy matching
- Each row renders: updated channel name → ⓘ icon → sub-label below → number + delta + bar (unchanged)
- `inferChannelKey()` handles case-insensitive substring matching so all GA4 string variants resolve correctly

**Report2 `SlideChannels`** (`src/app/(report)/report2/page.tsx`):
- `channelNames` map expanded with `info` field and updated names/subs
- Fallback mock data updated to use new Swedish copy
- Both live data path and fallback path include `info` field
- Card header: name + ⓘ icon inline, sub-label below (unchanged layout)
- `side="below"` on report2 cards (tooltip opens downward within the slide canvas)

**`SessionsChart` eyebrow** (`src/components/dashboard/SessionsChart.tsx`):
- `InfoTooltip` moved outside the `eyebrow`-classed element — `text-transform: uppercase` was making tooltip text all-caps
- Now: eyebrow `<p>` + `InfoTooltip` are siblings inside a flex wrapper div

### Label renames
- "Totala sessioner" → **"Totala besök"** — in `src/lib/google/mapper-utils.ts` (real GA4 data label) and hardcoded in `report2/page.tsx` trend slide
- "Direkt" → **"Direkttrafik"**, "Organisk sökning" → **"Google (Obetald söktrafik)"** — in `src/lib/i18n/sv.ts`, `en.ts`, and both channel maps
- "Organisk social" → **"Sociala medier"** with updated sub-label
- "Ej tilldelad" → **"Okänd källa"** with explanatory sub-label and hover text

---

## Auth + login page overhaul — completed 2026-05-17

### Auth strategy settled
- Google OAuth verification is required regardless (GA4/GSC scopes are sensitive). No auth split.
- **Short-term unblock**: add test users in Google Cloud Console OAuth consent screen (up to 100).
- **Parallel**: email + password auth added so users can sign in without Google while verification is pending.

### Login page rebuilt
Two-column layout: 35% form left, 65% visual right.

**Left column:**
- Headline only — no eyebrow, no description
- Google OAuth button (unchanged flow)
- "eller" divider
- Email + password inputs — hairline bottom-border style, focus transitions to `--charcoal`
- Submit button matches Google pill exactly
- Sign-in / sign-up mode toggle (single form, switches on click)
- Error states: wrong credentials, unconfirmed email, generic fallback
- Back button top-left (`← Tillbaka`, calls `router.back()`)

**Right column (current — interactive photo reveal):**
- Full-bleed `cloudmind.jpg` with blur-wipe mechanic and grain overlay (see Login & signup page design section above)
- Tagline bottom-left with `AuroraText` accents on "klarhet" and "Clarix"
- Dedicated `/signup` page with identical right panel, adds confirm-password field and client-side validation

**New components created:**
- `src/components/ui/animated-theme-toggler.tsx` — View Transitions API circle-reveal theme toggle
- `src/components/ui/dia-text-reveal.tsx` — horizontal color-band sweep reveal for text
- `src/components/ui/noise-texture.tsx` — SVG `feTurbulence` fractal noise overlay
- `src/components/ui/aurora-text.tsx` — animated gradient text; `background-position` sweep via `animate-aurora` keyframe; configurable colors and speed

### Theme toggle replaced globally
- **Sidebar** (`src/components/layout/Sidebar.tsx`) — old `IconMoon`/`IconSun` button replaced with `AnimatedThemeToggler`
- **Landing header** (`src/components/landing/landing-sections.tsx`) — `ThemeToggle` component rewritten to use `AnimatedThemeToggler`
- Circle-reveal view transition on every toggle, persists to `localStorage`, reads on mount via MutationObserver

### Dark mode polished
`--bone` in dark was `#2C2A27` (muddy warm brown) — buttons using it as text color looked boney. Fixed:
- `--bone` dark: `#ffffff` — buttons now show clean white text
- Background deepened: `#1A1916` → `#131211`
- Cards/sidebar stepped to `#1e1c1a` / `#1a1816` for clear depth hierarchy
- `--slate` bumped for better secondary text legibility on dark backgrounds

### i18n additions
`t.login` extended in both `en.ts` and `sv.ts`: `divider`, `emailPlaceholder`, `passwordPlaceholder`, `emailCta`, `switchToSignup`, `switchToLogin`, `errorInvalidCredentials`, `errorEmailNotConfirmed`, `errorGeneric`, `successSignup`.

---

## Current priorities (2026-05-17)

1. **Add test users in Google Cloud Console** — go to APIs & Services → OAuth consent screen → Test users. Unblocks real users immediately while verification is pending.
2. **Submit for Google OAuth verification** — required before public launch. Needs privacy policy URL, app homepage, demo video showing GA4/GSC scope usage.
3. **Sharpen Rapport 2** — content density pass, slide composition, editorial copy per slide. Remove Rapport 1 (`/report`) — Rapport 2 is the canonical format going forward.
4. **Polish the rest of the product to login-page standard** — the login/signup page now sets the bar: deliberate typography, layered depth, motion that means something. Apply the same level of craft across the landing page, dashboard, sidebar, integrations, and report pages. Specific angles: landing page hero deserves the same photo/blur/reveal energy; dashboard cards need tighter spacing and more confident type; sidebar transitions should feel as considered as the wipe effect; integrations and settings pages are currently functional but flat. The goal is every screen feeling like it was designed, not assembled.
5. **UX + feel pass** — overall product polish. Navigation, transitions, micro-interactions, empty states, loading states. Make it feel premium end-to-end.
