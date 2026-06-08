# Digital Rapport — Current State

---

## NOW — Open priorities (2026-06-06)

### Done this session (2026-06-06)

**AI card purple palette — exact color match + grain**
- `AI_GRADIENT` token corrected to exact source values: `oklch(0.97 0.04 300) → oklch(0.96 0.05 260) → oklch(0.97 0.04 350)`. Middle stop `260` (blue-purple) is the key — previous `280/295` values were too neutral.
- Two glow orbs added to all AI surfaces: top-left violet `oklch(0.85 0.16 300 / 0.55)` + bottom-right blue `oklch(0.86 0.14 220 / 0.5)`, both `opacity-60 blur-3xl`.
- `NoiseTexture` upgraded from `cinematic/overlay` to `fine/soft-light opacity={0.45}` across all AI cards — gentler grain on light surfaces.
- Global positive color updated to `oklch(0.7 0.16 155)` (`≈ #2db87a`) in `tokens.ts` (`TREND_POS`), `highlight-numbers.tsx` (both themes), and `landing-sections.tsx` hardcoded spans.
- Landing panel pills reverted to original: `border-white/70 bg-white/60 backdrop-blur-sm` with `color: oklch(0.35 0.15 290)`.
- `integrations/page.tsx` wired to `AI_GRADIENT` + `AI_BORDER` tokens (was hardcoded).
- Orbital rings SVG added to all AI card surfaces: 3 concentric circles, `r=120/180/240`, purple stroke `oklch(0.62 0.22 295)` at `0.25/0.15/0.08` opacity, anchored to right edge.

**DashboardHero — split layout matching homepage**
- Rebuilt to mirror the landing `AiInsightPanel` exactly: `5/12` left + `7/12` right on `lg`.
- Left: AI headline (`dashboard_hero.headline`) as the big display text (`3rem`, font-display, dark indigo).
- Right: white glass card `oklch(1 0 0 / 0.7)` with `"Denna vecka"` pulsing dot label outside the card, sub text at `1.7rem` inside, CTA pill at bottom.
- Removed: Sparkles icon, "AI-sammanfattning" eyebrow, period label inside card, supporting tagline.
- Card padding `p-5/sm:p-7/lg:p-9`, outer card `p-5/sm:p-10/lg:p-16` matching homepage proportions.

---

### Done this session (2026-06-05)

**Engagement KPI: switched from bounceRate to engagementRate**
- Root issue: `engagement-kpi` was reading `trafficOverview.bounceRate` (a low-is-good metric, 30–70%) under the label "Engagemang". This caused reversed arrows, inverted sparklines, and wrong badge colors.
- `ga4-mapper.ts`: added `engagementRate` metric (`summary.engagementRate * 100`, `trendGoodKey: "engagementRate"`). `TREND_GOOD_WHEN_UP.engagementRate = true` already existed.
- `schema.ts`: added `engagementRate: MetricSchema.optional()` to `TrafficOverviewSchema`.
- `registry.ts`: `engagement-kpi` `metricPath` changed from `trafficOverview.bounceRate` to `trafficOverview.engagementRate`.
- `dashboard/metrics.tsx`: removed the special-case `upIsGood` inversion for `engagement-kpi`.
- `KpiCard.tsx`: removed sparkline inversion (`100 - pt.value` → `pt.value`), reverted arrow direction to use `state.change.direction` (now naturally correct).

**Smart number highlighting utility (`highlight-numbers.tsx`)**
- `src/lib/utils/text.ts`: added exported regex constants `NUM_SPLIT`, `NUM_TEST`, `POS_TEST`, `NEG_TEST`.
- `src/lib/utils/highlight-numbers.tsx` (new): `highlightNumbers(text, theme)` splits text by number tokens and wraps them in `<span>`. Positive (`+x%`) → green, negative (`-x%`) → red, plain numbers → underline. Two themes: `"dark"` (white card on gradient) and `"light"` (dark card on light bg).
- Applied to: `SlideHero`, `SlideRecommendations`, `SlideStrategicInsight`, `SlideRecap`, `DashboardHero`, `AISummary`, and the landing `AiInsightPanel`.

**New merged `CLARIX_SYSTEM_PROMPT`**
- Old prompt: priority ordering + JSON rules. New prompt (user-provided): pedagogical advisor persona, 4-question framework, ❌/✅ vocabulary rules.
- Merged in `src/lib/ai-insights/generate.ts`: new advisor voice ("senior digital rådgivare med över 20 års erfarenhet"), 4-question framework (Vad har hänt / Varför / Positivt eller negativt / Nästa steg), priority ordering from old prompt rewritten in plain Swedish, forbidden vocabulary with ❌/✅ examples, anti-hallucination rule ("Hitta aldrig på siffror"), rounding rule (4 963 → "cirka 5 000"), JSON rules block at bottom.

**AI cards recolored to purple oklch palette**
- Replaced red/coral gradient with the violet/purple aurora palette from the landing page.
- `src/components/report/tokens.ts`: new token set — `AI_GRADIENT` (oklch 300→295→350 arc), `AI_SHADOW` (purple), `AI_TEXT_PRIMARY` (dark indigo), `AI_TEXT_SECONDARY` (medium violet), `AI_BORDER` (soft purple), `AI_SHIMMER` (pulse shimmer).
- Applied to 7 files: `tokens.ts`, `AISummary.tsx`, `DashboardHero.tsx`, `SlideStrategicInsight.tsx`, `SlideRecap.tsx`, `SlideConversion.tsx`, `SlideAIVisibility.tsx`, and `landing-sections.tsx` (`AiInsightPanel`).

**Debug logging in `useAiInsights.ts`**
- Added `console.log` statements throughout fetch lifecycle to diagnose production failure (missing env vars on hosted domain: `AI_INSIGHTS_PROVIDER`, `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` not set in deployment environment).

---

### Done this session (2026-05-26/27)

**AI insights cache — production-grade upgrade**

*SHA-256 + canonical hash*
- `hashAiInsightMetrics` rewritten: `sortKeysDeep()` recursively sorts all object keys before `JSON.stringify` so nested fields (`value`, `prev`, `channels`, etc.) are always included. Previous `JSON.stringify(obj, keysArray)` replacer silently dropped all nested data — different metric values could produce identical hashes.
- Hash input broadened from a hand-picked flat list to a canonical normalized object covering all advisor-relevant fields: traffic (sessions, organic, paid, bounce, channels), SEO (clicks, impressions, position), conversions (total, rate), paid (spend, clicks, CPC, CTR, conversions, CPA, ROAS), top pages, available sources.
- `AI_INSIGHTS_CACHE_VERSION` added to `types.ts` (separate from `AI_INSIGHTS_PROMPT_VERSION`). Single lever to bust all user caches on prompt/classifier/schema changes. Provider + model included in hash so model switches invalidate stale copy.
- `cache.ts` marked SERVER-ONLY — no client imports.

*Generation lease (stampede guard)*
- Two migrations added: `20260526000000_ai_cache_generation_lock.sql` adds `generation_status ('pending'|'done'|'failed')` and `generation_expires_at` columns. `claim_ai_insights_generation` Postgres RPC atomically claims the generation slot using `FOR UPDATE` locking — no race window. Returns `{claimed, cached}`.
- `20260526001000_ai_cache_rpc_ttl_and_auth.sql` patches the RPC: adds 24h TTL check to the done case (previously cached forever), adds `auth.uid() = p_user_id` guard so users cannot claim another user's row, adds `set search_path = public`.
- Route uses RPC before generating: `cached=true` → read and return; `claimed=false, cached=false` → return `{generating: true}` with HTTP 202; `claimed=true` → proceed with generation.
- On provider error or parse failure, route marks lease as `failed` (not pending) so next request can reclaim immediately without waiting 60s.

*Client hook polling*
- `useAiInsights` no longer imports `hashAiInsightMetrics` (Node `crypto`, server-only). Replaced with `clientDataFingerprint()` — plain string from 5 numbers + sorted sources, purely for React dedup.
- 202 response triggers `fetchInsights(attempt+1)` after 3s delay, up to 8 attempts (~24s total). `cancelled` flag prevents `setState` after unmount.

**Structured observability in `buildReportDataForUser`**
- Each source fetch now returns typed `SourceResult {ok, reason, detail}` instead of `Partial<ReportData> | undefined`. Failure reasons: `token_missing`, `token_refresh_failed`, `google_401`, `google_403`, `google_5xx`, `unknown` — logged with source + property_id.
- DB query errors now logged (previously silent). `caller` param threads through so logs show which route triggered the build.
- `generate-insights` route logs `report.status` when build does not return ok, and logs full sufficiency map + insight types + totalSessions + availableSources before the provider call.

**AI insights parse error fix (smart quotes)**
- Model was returning Swedish curly quotes (`"direkt"`) inside JSON string values. `JSON.parse` rejects these because U+201C/U+201D are not ASCII `"` (U+0022).
- `extractJsonObject` now normalizes U+201C/201D → `'` and U+2018/2019 → `'` before parsing using Unicode escape sequences in the regex (avoids editor encoding issues with literal smart quote characters in source).
- System prompt updated to explicitly instruct the model not to use typographic quotes in JSON strings.

**Donut chart overlap fix**
- `strokeLinecap="round"` extended each arc ~11px beyond its endpoint (≈7.5° at R=84), swallowing the 2.8° gap entirely. Changed to `"butt"` — clean cut at arc boundary.
- Gap widened from 2.8° to 3.5°. Hover `strokeWidth` bump removed (incompatible with butt linecap; opacity handles hover/dim instead). Track circle `strokeWidth` widened by 2px to sit flush behind segments.

**Engagement KPI badge color fix**
- Badge colored red for a bounce rate drop because `KpiCard` keyed the color off `change.direction` (down = red) instead of `state.isGood`. `getChangeState` already computed `isGood` correctly for `engagement-kpi` (upIsGood=false), so fix was one line: `state.isGood` now drives background/color.

**Sidebar logo size**
- Logo enlarged from `h-11` (44px) to `h-16` (64px).

**Token handling fixes (multi-user support)**
- `getValidAccessToken` no longer returns `session.provider_token` as a shortcut. The provider_token is the OAuth token for whoever is currently logged in — for any other user it pointed at the wrong Google account → 403. All token fetches now always read from `connected_sources`.
- `getStoredGoogleCredential` in connect route was selecting `refresh_token, token_expires_at` but not `access_token`. Fixed.
- `_pending` cleanup in connect route now filters by source (not hardcoded to ga4).
- Optimistic fallback: when token is expired and no refresh_token exists, returns stored `access_token` and lets Google return 401/403 rather than pre-emptively returning null.

**AI gradient applied globally**
- `AI_GRADIENT` and `AI_SHADOW` tokens added to `src/components/report/tokens.ts`.
- `AISummary`, `DashboardHero`, `NextStepsCard`, and landing AI section all use the shared token. Gradient: deep red→coral→amber. NextStepsCard upgraded from plain bone to full gradient treatment.

### Done this session (2026-05-24)

**Responsive shell + dashboard/report mobile pass (2026-05-24)**
- Landing page mobile optimization completed: header, hero sizing, CTA stacking, showcase visuals, cards, pricing, final CTA, and footer now use tighter mobile spacing and safer text/container sizing.
- Landing desktop header adjusted: navbar uses a centered desktop column and the Clarix logo is larger across mobile/tablet/desktop breakpoints.
- Shared `AppShell` added for authenticated app pages. It owns mobile drawer state and desktop sidebar collapsed state.
- `Sidebar` rebuilt as a proper responsive navigation feature: mobile drawer with backdrop/close behavior, desktop collapse/expand rail, icon-only collapsed mode, larger brand treatment, active states, language/theme controls, user block, and dev scenario controls.
- Dashboard route now uses the shared shell and has mobile-safe header/actions, responsive KPI grids, responsive section grids, and better banner wrapping.
- Dashboard date picker popover now behaves like a viewport-aware mobile sheet on small screens while keeping desktop popover behavior.
- Report page mobile polish completed for its own isolated canvas: top controls wrap on small screens, date preset control becomes full-width on mobile, slide surface padding is tighter, dot nav hides on phones, and bottom controls shrink.
- Report route intentionally does not use the shared sidebar yet. `(report)/layout.tsx` is back to an isolated no-sidebar layout, per current product direction.
- Verification: targeted ESLint passed for touched dashboard/report/sidebar files with only existing warnings, and `npm.cmd run build` passed successfully after the responsive shell work.

**AI insights — living advisor pass (v7–v11)**

*P0 — Cache bug fixed*
- Root cause: a stale all-null payload in `ai_report_cache` (written before the API key was live) was being served forever. `isFreshAiInsightsCache` returned `true`, `AiInsightsPayloadSchema.safeParse` succeeded on all-null, and the route short-circuited without ever calling OpenAI.
- Fix: cache reads now only short-circuit if at least one slot has real content (`Object.values(result.data).some(v => v !== null)`). An all-null cached row is treated as a miss and forces a fresh LLM call.
- Removed two debug `console.log` lines from `generate-insights/route.ts`.

*P1 — Prompt architecture overhauled*
- `generate.ts` system prompt replaced from 1 throwaway line to the full Clarix advisor persona: prioritization order (intäkter → kostnad → konvertering → kanaler), language rules ("besökare" not "sessions", never guarantee, distinguish traffic from business value), "siffror är inte målet, beslut är målet", Swedish-only output.
- `buildReasoningRules()` added to `route.ts`: maps each `InsightType` to advisor reasoning logic, injected only when that pattern is present in this client's classified insights. 14 rules covering all insight types. Model now receives not just "what happened" but "how an advisor should think about this pattern."
- Data block in `buildPrompt()` expanded: SEO clicks, avg position, conversion rate, paid spend/ROAS all included when present.
- Surface constraints tightened with EXEMPEL blocks (FEL/RÄTT pairs) for `dashboard_hero`, `slide_hero`, `slide_recs`, `slide_recap`. Each example is drawn from real bad output observed in the product.
- `slide_hero` expanded from 1 sentence to 2–4 sentence flowing paragraph: what happened, why it might be so, what to watch next. Prompt role reframed as "rådgivare i fickan."
- `AI_INSIGHTS_PROMPT_VERSION` bumped through v7→v11 as each prompt change was made.

*Direct traffic attribution fix*
- `buildPrompt()` now detects when the dominant channel is Direct/Direkt/Unassigned/Ej tilldelad/unknown and keeps the channel label separate from attribution guidance.
- Prompt data now sends `topChannel`, `attributionUnclear`, and `attributionNote` separately instead of stuffing instructions into the channel name.
- `traffic_channel_concentrated` reasoning rule updated to branch: Direct/unknown → attribution problem framing; real channel → vulnerability/diversification framing.
- Goal: prevent the "114 besök, alla från direkttrafik" pattern where Direct is presented as a confirmed marketing source.

*NextStepsCard rationale fixed*
- Was falling back to `FALLBACK_TEXT` ("Inte nog med data…") when AI rationale was absent.
- Now falls back to the deterministic `step.rationale` from `deriveNextSteps()` — always shows real data-driven copy even without AI. `FALLBACK_TEXT` import removed from `NextStepsCard.tsx`.
- `deriveNextSteps()` moved into shared `src/lib/dashboard/next-steps.ts`; both the dashboard card and AI prompt now use the same deterministic action list. AI `next_steps` rationales are requested in that exact action order, reducing the risk of mismatched rationale/action copy.

*Period punctuation*
- `withPeriod(text)` helper added to `src/lib/utils/text.ts`: ensures AI-generated sentences end with `.` — leaves strings already ending in `.`, `!`, `?` untouched.
- Applied to: `DashboardHero` headline + sub, `NextStepsCard` rationale, `SlideHero` gradient card AI line, `SlideStrategicInsight`, `SlideRecommendations`, and `SlideRecap`.

*SlideHero layout*
- Subtext under headline restored: deterministic, period-aware — "Jämfört med föregående period" when comparison exists, "Ingen föregående period att jämföra med" when not.
- Gradient card line 1: visit count always rendered; delta percentage shown only when a prior period exists (no more "circa 114 fler än förra månaden" hallucination from `visits - 0`).
- AI `slide_hero` text is line 2 of the gradient card — not duplicated as subtext above the sparkline.

*Numbers highlighted green in DashboardHero*
- `highlightNumbers()` utility added: splits AI text on numeric tokens (Swedish thousand-spaced numbers, percentages, decimals, multipliers) and wraps them in `#6EF5A8` at `font-weight: 700`. Applied to both headline and sub line.

### Done this session (prior)

**Dashboard welcome header**
- "Välkommen, {name}" replaced with a world-class greeting: large display heading with "Välkommen" as a muted prefix inline, client name bold, period + "Din digitala rapport är redo." as a subtitle line beneath.
- KPI card source icons (GA/GSC/Ads) enlarged to `h-7 w-7`, border/background container removed — icons render bare.
- KPI card layout fixed: label + number grouped tightly in a `flex-col gap-1`, icon floated top-right with `items-start justify-between`. Eliminated the excess gap between label and number.

**Report — Tid på sidan is now real data**
- `SlideKpis` was hardcoded to `"2 min 14 s"`. Now reads `d.avgDuration` (seconds from GA4) formatted as `X min Y s`.
- `timeDelta` in `buildSlideData` was incorrectly computed from bounce rate. Fixed to compare `avgSessionDuration` current vs previous period.

**AI insights rendering — fallback text eliminated**
- Removed `"Inte nog med data för att bedöma din digitala närvaro."` from all slide rendering paths (`SlideHero`, `SlideStrategicInsight`, `SlideRecommendations`, `SlideRecap`).
- New unified pattern across all AI slots: `aiInsights === null` (loading) → shimmer skeleton; slot has data → AI text; slot is null after resolve → hardcoded copy (never the fallback string).
- `AI_INSIGHTS_FALLBACK_TEXT` import removed from all slide files.

**SlideHero — line 1 deterministic, line 2 AI**
- Line 1 always renders immediately: visit count colored by direction.
- Line 2: shimmer while loading, AI `slide_hero` string when resolved, nothing if null.
- `slide_hero` prompt rewritten: role is now "kontextlinje" — 1 sentence about strongest channel and a signal (what grew, what dropped, what to watch). Max 25 words, never starts with "Besöken"/"Trafiken".
- `slide_hero` sufficiency gate set to `true` always — was previously being blocked even with real data.
- `AI_INSIGHTS_PROMPT_VERSION` bumped to `v6` to bust cache after prompt changes.

**AI insights debugging**
- Confirmed root cause of null returns: `OPENAI_API_KEY` was empty in `.env.local`. Provider was set to OpenAI but key missing.
- Added temporary logging (`console.log` of raw model output + parse result) to `generate-insights/route.ts` for diagnosis.

### Done this session (prior)

**Report page modularization — `report/page.tsx` 1553 → 347 lines**
- `src/components/report/tokens.ts` — design tokens (`TREND_POS/NEG/BG`, `ACCENT`) + canvas constants (`CANVAS_W/H`, `SLIDE_GAP`)
- `src/components/report/slide-data.tsx` — `SlideData` type + `buildSlideData()` (kept under `components/` not `lib/` because it references Lucide icon components)
- `src/components/report/primitives/` — `Shimmer`, `TrendPill` (+ `fmtNum`/`sign`/`formatDuration`), `SlideHeading` (+ `Eyebrow`), `AISummary` (+ `pos`/`neg`/`trendSpan`)
- `src/components/report/slides/` — 10 individual slide files (`SlideHero` through `SlideRecap`)
- `src/components/report/layout/useCardScale.ts` — ResizeObserver hook; `containerW` removed (was tracked but never consumed)
- `src/components/report/layout/SlideCard.tsx` — motion wrapper + canvas scaling shell
- `src/components/report/slide-list.tsx` — `buildSlides()` array builder
- `page.tsx` now contains only: data loading effect, `ReportPageInner` state/hooks, and chrome UI (top bar, dot nav, bottom controls)
- Unused props removed: `d` from `SlideStrategicInsight` and `SlideRecap`, `containerW` from `SlideCard`, `neg` from `SlideHero`, `cardH` from page
- Build passes. Zero behavior or visual changes.

### Done this session (prior)

**Trust + calm report polish pass**
- **Date ranges end on yesterday** — `lastCompletedDay()` helper added to `connected-sources.ts`. All presets (`this-month`, `all-time`) and `rangeFromSearchParams` clamp `endDate` to yesterday. Partial-day data no longer creates FOMO dips at the end of charts. `labelFromSearchParams` uses the clamped range so the label always matches the data fetched.
- **`currentCalendarMonthRange` cleaned up** — removed the redundant `endDate = yesterday < firstOfMonth ? yesterday : yesterday` tautology. Logic is now clear and handles the 1st-of-month edge case correctly.
- **Negative percentage now renders red** — `trendSpan(delta, formatted)` helper added. `pos(sign(trafficDelta))` replaced with direction-aware color in the hero slide narrative and AISummary fallback copy.
- **AI insights wired into report page** — `ReportPageInner` now uses `useAiInsights` hook (same as dashboard) instead of cache-only read. `userId` stored in state, passed to hook. Removed manual `hashAiInsightMetrics` / `isFreshAiInsightsCache` / `AiInsightsPayloadSchema` imports. Report now calls `/api/generate-insights` when cache is cold.
- **`slide_insight` sufficiency gate relaxed** — now passes when `currentSessions > 0 || channels.length > 0`. Previously required `previousValue > 0`, which blocked all-time ranges from getting AI copy. `AI_INSIGHTS_PROMPT_VERSION` bumped to `ai-insights-v3` to invalidate stale null caches.
- **Slide 3 visual hierarchy** — sparkline changed from blue to Clarix accent (`#FF6B55`). Channel footer bars use Clarix gradient; top channel bar is taller (`h-[6px]`) and bolder. Duration formatted as `m min ss s` (was raw `Ns`) via scoped `formatDuration()`. `format.ts` global `seconds` format intentionally unchanged.
- **Slide 4 channel icon chips softened** — replaced saturated full Clarix gradient with light coral-tinted neutral (`oklch(0.97 0.012 30)` bg, subtle border, muted coral icon). Cards and delta badges unchanged.
- **InfoTooltip quieter** — trigger icon changed from deep purple to light grey/bone with subtle border and charcoal `i`. Example box text darkened to `#1e1c18`.
- **All traffic channels now shown** — removed `slice(0, 6)` cap on `topChannels` in `buildSlideData`. GA4 returns all channel groups; all now appear in slide 4.
- **Odd-channel grid layout fixed** — last card in slide 4 gets `col-span-2` when the channel count is odd, so 3 or 5 channels never leaves an orphaned empty cell.
- **X-axis tick density fixed** — interval set to `Math.max(0, Math.floor(dataLength / 7) - 1)` so slide 3 always shows ~7 evenly-spaced date labels regardless of range length. Eliminates the appearance of "missing" days.

**GA4 resilience**
- **Main GA4 route resilient** (`api-client.ts`) — `fetchGa4Optional()` wrapper added. `summary` still required (throws on failure). `channels`, `timeSeries`, `topPages` use optional path: non-auth errors return `{}` instead of killing the whole report. Auth errors (401/403) still propagate.
- **GA4 Explorer resilient** (`ga4-explorer/route.ts`) — same pattern. `summary` + `priorSummary` required. All 12 dimension breakdown requests use `ga4ReportOptional()`. Long date ranges ("Sen start") no longer blank out the explorer when one dimension quota fails.

**Date label integrity**
- `labelFromSearchParams` now delegates to `rangeFromSearchParams` for its effective range before matching presets, so the displayed label is always consistent with the data actually fetched.

### Next priorities

**P1 — Deepen the classifier (`deriveInsights`)**
The advisor quality is capped by what the classifier detects. Current insight types cover the basics but miss important patterns:
- `direct_traffic_dominates` — should be its own type (not just `traffic_channel_concentrated`) so the reasoning rule is always injected when Direct is dominant, not only when one channel >60%
- `traffic_up_but_conversions_flat` — trafik ökar men inga fler förfrågningar/köp, the most important tension to surface
- `source_attribution_unclear` — when >50% of sessions are Direct/Unassigned, flag it explicitly as a tracking concern
- `small_change_watch_only` — when deltas are <5% in either direction, model should calibrate language to "bevakas" not "åtgärdas"
These feed directly into `buildReasoningRules()` — more insight types = more targeted advisor copy.

**P2 — Deterministic fallbacks that reflect reality**
When AI is unavailable (no key, quota, cold start), every slot should fall back to a sentence built from real data — not hardcoded copy that may be factually wrong. Each fallback reads from `SlideData`/`ReportData` directly. `slide_recs` and `slide_recap` still show hardcoded placeholder copy when AI is null.

**P3 — Visual polish pass**
- Slide-by-slide review. Known issues: slide 3 right column overflow, slide 4 featured card border.
- Dashboard KPI card height consistency now that icon size changed.
- Property picker: make the "Välkommen, {name}" name clickable to switch GA4 property.

**P4 — LLM copy into more surfaces**
Currently only hero, insight, recs, recap have AI slots. Boring cards (KPI snapshot, pages) could have a one-line AI commentary. Define which cards benefit and wire them up.

**P5 — Dashboard copy pass**
Hero copy, KPI labels, and period labels need a Swedish copy pass. Some labels are technical (e.g. "Avvisningsfrekvens" may need a softer framing for SME owners).

**P6 — Date range debugging**
The "yesterday" clamp is in place but needs end-to-end verification with real data across timezones. Edge: user in UTC+2 at midnight will compute a different "yesterday" than the GA4 API (which uses property timezone).

### Still open / deferred

- **Slide 3 — core idea ownership.** Duration and colors fixed, but original "nothing demands attention" complaint is not fully resolved. Layout decision deferred.
- **Custom GA4 channel groups not appearing.** Mapper uses `sessionDefaultChannelGroup` (Google hardcoded). Custom groups are a separate dimension. Needs investigation.
- **KPI quiz / onboarding** — deferred. Design the quiz flow first. No code until then.
- **Cold report** — user opening `/report` before dashboard gets deterministic fallbacks. Future: cron pre-warm or on-demand generate button.

---

## What it is and why

Digital Rapport is a premium reporting SaaS for SME business owners who want clarity on their digital performance — not another BI dashboard. The core idea: connect your Google data sources, get a calm, narrative-driven report that tells you what happened, why it matters, and what to do next.

It is not agency software. The end user is a business owner who logs in, connects their own GA4 and Search Console accounts, and sees their numbers presented with editorial restraint and clear language — not a wall of charts.

The product has two layers:
- **Dashboard** — always-on home base. Narrative metric cards, traffic chart, channel breakdown. Designed to answer "how are we doing?" at a glance.
- **Report** — the depth layer. The cinematic scroll-surface presentation: 10 floating white cards on a grey surface, smooth spring scroll, keyboard nav, fullscreen present mode. This is now the only report format at `/report` — Rapport 1 (the old narrative slide deck) has been retired.

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
│   ├── data/page.tsx                 # GA4 Explorer — drag-and-drop data canvas (see below)
│   ├── clients/page.tsx              # Client workspace grid
│   └── settings/page.tsx            # Settings with tabbed sidebar nav
├── (report)/
│   ├── layout.tsx                    # Isolated report layout — no sidebar, clean canvas
│   └── report/page.tsx               # Cinematic slide viewer — 10 floating cards, spring scroll, keyboard nav, fullscreen
├── api/
│   ├── ga4/route.ts                  # GA4 data for dashboard/report
│   ├── gsc/route.ts                  # GSC data for dashboard/report
│   └── ga4-explorer/route.ts         # Full GA4 data dump for the Explorer canvas
├── privacy-policy/page.tsx           # Privacy policy page (required for Google OAuth verification)
```

The `(app2)` parallel design system route group has been fully merged into `(app)` and deleted.

---

## Auth flow

Auth is fully wired and enforced via `src/proxy.ts` (Next.js 16's equivalent of middleware):

1. User hits `/` (landing page — always public)
2. Clicks "Logga in" → hits `/login`
3. Google OAuth: `signInWithOAuth` fires with scopes `analytics.readonly` + `webmasters.readonly`, `access_type: offline` + `prompt: consent` — forces Google to return a `refresh_token`
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

Source-driven — renders real GA4/GSC data when connected, falls back to mock only when **no sources are connected at all**. Structure:

1. **Sticky header** — period label + date range picker + "Exportera" dark button
2. **Banners (stacked, shown as needed):**
   - *Token expired* — orange dot, source name, "Reconnect" link
   - *No data for period* — shown when GA4 is connected but has no data for the selected date range (e.g. connected after last month). Black text, Clarix-styled. No mock data ever shown when a source is connected.
   - *Sample data* — shown only when zero sources connected, with "Anslut källor" CTA
   - *GSC nudge* — when GA4 is connected but GSC is not
3. **Property greeting** — "Välkommen, **[GA4 display_name]**" shown above the hero card when a property is connected. Hidden in mock/sample mode.
4. **AI Summary hero** — full pink→coral→amber gradient card (`linear-gradient(135deg, #e8336d, #ff6b35, #ffb830)`), `NoiseTexture` grain overlay, "Insikter från proffset" eyebrow, wavy SVG underline on headline, white text, "Läs hela rapporten" CTA. AI copy generated server-side and cached in Supabase.
5. **Narrative KPI cards** (3-column grid) — large number + inline delta arrow, educational headline + insight line, flush sparkline strip at bottom using `#FF6B55`. Each card has a source logo badge (GA4 / GSC / Ads) top-right. Each KPI routes to its own time series.
6. **Traffic chart** — dual area series (Besök + Besökare), dark tooltip, legend
7. **Channel breakdown** — SVG donut diagram with interactive arc segments; soft coral/warm palette (coral → amber-coral → blush → terracotta → sand → sage). Legend rows show channel name, bold session count, delta arrow, percentage pill. Hover cross-highlights arc + row.
8. **Search visibility** — 2×2 grid of GSC metrics with deltas
9. **Nästa steg card** — derived from real data (ROAS, SEO position, bounce rate, missing paid), max 3 steps with Effort/Vinst badges

**Data loading behavior:**
- When sources are connected, an empty base (no mock numbers) is used as the merge base — real zeros show instead of fake data
- `noDataForPeriod` state: set when GA4 confirms connection (`connected: true`) but returns no rows for the date range. Suppresses `executiveSummary` and all KPI cards. Shows the "no data for period" banner.
- Mock data is shown **only** when `reportData === null` (no sources connected), via `activeData = reportData ?? fallbackData`

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

## GA4 Explorer — `/data`

[src/app/(app)/data/page.tsx](../src/app/(app)/data/page.tsx)  
[src/app/api/ga4-explorer/route.ts](../src/app/api/ga4-explorer/route.ts)

A drag-and-drop data canvas for exploring everything GA4 returns. Purpose: see all available data at a glance, verify new event tracking (e.g. AI search), and decide what's worth promoting to the dashboard or report.

**Canvas** — bone/parchment background (`#F5F3EF`) with a subtle dot-grid pattern. Cards float freely, draggable anywhere via Framer Motion `drag` with `dragMomentum={false}`. Positions persist to `localStorage` per session key `dr-data-canvas-v2`.

**Cards (7):**
| Card | Data | Metric |
|------|------|--------|
| Översikt | All summary metrics | Sessions, Users, New Users, Pageviews, Engagement Rate, Bounce Rate, Avg Session Duration, Conversions, Conversion Rate, Engagement Time |
| Kanaler | `sessionDefaultChannelGroup` | Sessions per channel |
| Enheter | `deviceCategory` | Sessions per device |
| Länder | `country` | Sessions per country (top 10) |
| Landningssidor | `landingPage` | Sessions per landing page (top 10) |
| Toppade sidor | `pagePath` | Pageviews per page (top 10) |
| Händelser | `eventName` | Event count per event (top 15, sorted desc) |

Each card shows current value + delta vs prior period (same duration, immediately preceding). New GA4 events (e.g. `ai_search`) appear automatically in the Händelser card — no code changes needed.

**Property switcher** — pill toggle in the header showing all connected GA4 properties by display name. Switching property refetches all data for that property. Works for multi-property accounts (e.g. one property per client).

**Shared date range** — uses the same URL-driven `useDateRange()` hook as the dashboard. Same picker, same `?from=&to=` params.

**Floating toolbar** — pinned bottom-center. Toggle each card on/off (pill highlighted in card's accent color when visible). "Återställ" resets positions and visibility to defaults.

**Design** — Clarix design language: white cards, `var(--bone-dark)` canvas, charcoal text, `#1A1916` card borders, Barlow font. Signal colors `#2D6A4F` / `#9B2335` for positive/negative deltas.

**Workflow:** When a new GA4 event or property appears in the Explorer, tell Claude which card/metric to promote and it will be implemented in the dashboard or report.

---

## Integrations page

[src/app/(app)/integrations/page.tsx](../src/app/(app)/integrations/page.tsx)

V2 visual shell fully wired to real auth logic.

**Hero** — full-width gradient panel with large display headline ("Koppla dina viktigaste kanaler på 2 minuter." with italic purple gradient), body copy, shield trust line, and a staggered floating logo cluster (GA4, Google Ads, GSC) on the right.

**Progress bar** — animated gradient bar showing X of Y channels connected.

**Integration cards** — GA4, GSC, Google Ads with real logo SVGs, category eyebrow, purpose description, "unlocks" chips. Google Ads marked coming soon.

**Connect flow** — modal opens on "Anslut". Property list has fixed `max-h-56` with scroll — never unbounded stacking. Per-row pending state: only the clicked property row turns dark with a spinner; all others dim. "Ansluter…" appears inline under that row. Loads available GA4 properties and GSC sites from `/api/google/properties`. Disconnect removes the row. `needs_refresh` surfaces a re-auth prompt. All loading/error states handled.

**Sidebar property indicator** — the sidebar logo section shows a small coral-dot chip with the connected GA4 `display_name` below the brand name. Queries `connected_sources` on mount. Hidden when no property is connected.

## Report

[src/app/(report)/report/page.tsx](../src/app/(report)/report/page.tsx)

The cinematic scroll-surface report viewer — previously "Rapport 2", now the sole report format at `/report`. The old narrative slide deck (Rapport 1) has been retired and removed. All 10 slides rendered as floating white cards stacked vertically on a grey surface (`oklch(0.965 0.005 270)`). No slideshow transitions — free mouse scroll with a spring damping effect, arrow keys snap-center to each card.

**Canvas system** — each card is `1280×720` (logical canvas) scaled down via CSS `transform: scale()`. Scale factor computed from container width × `0.86` multiplier, so cards float with visible surface on both sides. `fontSize: 20` on the canvas root makes all `rem`-based type scale linearly together.

**Navigation:**
- Mouse wheel: intercepted, spring-lerped (`0.1` per frame toward target, `0.8` delta multiplier) for a smooth decelerated feel
- Arrow keys / space / enter: `scrollTo` with exact center math (`offsetTop - viewHeight/2 + cardHeight/2`)
- Dot nav (right edge): `IntersectionObserver` tracks which card is most centered, dots reflect reality, click to jump
- Bottom frosted glass pill: left/right arrows + `↑↓` keyboard hints + `1 / 10` counter. `backdrop-blur-md`, 55% white background, white border
- Top bar: back link, slide counter, date range picker (center), Present button (fullscreen toggle)

**Date range picker** — dropdown in the top bar. Left column: 2 presets — "Denna månad" and "Sen start" (all-time from 2020-01-01). Right column: flight-booker style two-month calendar — click start date then end date, hover shows range preview, edges rendered as purple pills with soft fill between. Defaults to current calendar month (1st → today). Selecting any range pushes `?from=&to=` to the URL; `useDateRange` reads it and triggers a fresh fetch.

**Slides (10):**
1. **Sammanfattning (Hero)** — headline top-center, large inline traffic delta in subtext (green/red/grey depending on data), full-width coral sparkline (from `trafficOverview.timeSeries`) in the middle, AI summary card pinned to bottom. Layout: `justify-between py-12 mt-16`.
2. **Nyckeltal** — 2×2 KPI cards. Label `text-[20px]/text-[22px]`, value `text-[4.2rem]`. Grey `—` pill when no prior period data.
3. **Trafiköversikt** — headline matches all others at `3.1rem/3.8rem`. "Totala besök" label at `18px`, number at `3.3rem`. Area chart + per-channel right column + kanalfördelning bars baked into chart card footer. Period subhead at `21px`.
4. **Trafikkällor** — 2-col channel cards. Icon containers use the aurora gradient (`linear-gradient(135deg, #FF4D9E, #FF6B55, #FFB830)`). Text sizes: name `22px`, description `20px`, percentage `38px`, visit count `20px`.
5. **Dina mest besökta sidor** — 3-col page rank cards with colored rank badges. URL `24px`, visit number `30px`, "besök" `20px`. Subtitle: "De mest besökta sidorna under perioden, topp 6 ser du nedan."
6. **Strategisk bedömning** — centered heading + full-width Clarix executive insight card, "Bottom line" accent pill.
7. **Rekommendationer** — 3-col action cards (Skala / Fixa / Bygg). Icon containers use aurora gradient. Headline `text-[22px]/sm:text-[26px]`, subtext `text-[21px]`.
8. **Konvertering** — 3 metric cards if conversions exist, else upsell layout. "Vad du får" card is a standalone gradient card (not `AISummary`), content vertically centered, list items `text-[22px] font-semibold text-white`.
9. **AI-synlighet** — left text + right 2×2 AI source status grid.
10. **Kort summerat** — bullet list left (subtext `text-[20px]`) + booking CTA card right (pink→coral→amber gradient). Eyebrow `text-[16px] text-white`, tagline `text-[20px] text-white`.

**TrendPill — null state:** All delta calculations return `null` (not `0`) when no prior period data exists. `TrendPill` renders a grey `—` pill for `null`. Negative deltas render red, positive green. Zero is treated as no meaningful change (grey).

**Gradient cards (`AISummary` + standalone cards):** Deep pink→coral→amber gradient (`linear-gradient(135deg, #e8336d, #ff6b35, #ffb830)`) with `<NoiseTexture preset="cinematic" blendMode="overlay" />` grain (opacity `0.6`, `fractalNoise` at `0.72` baseFrequency, 4 octaves, unique filter ID per instance via `useId()`). Text is white. Label eyebrow is `text-white/70`. All spans inside (including `pos()`/`neg()` values) forced to `text-white font-bold` via `[&_span]` selector. Used on: AI summary, AI source status card, booking CTA card.

**`fmtNum` helper:** Numbers below 10 000 display exactly (e.g. "1 234"), 10 000+ abbreviate to `k`, 1 000 000+ to `mn`. Threshold raised from 1 000 to 10 000 to avoid showing "1,0 k" for small traffic numbers.

**Design details:**
- All headlines end with a coral dot (`#FF6B55`) — appended automatically by `SlideHeading`, added manually to bare `<h1>` headings
- `InfoTooltip` card lightened: background `#fdfcfb`, shadow `rgba(0,0,0,0.10)`, border `rgba(0,0,0,0.05)`
- `AISummary` sparkle icon block fully removed — gradient card has no icon, content starts immediately

**Data loading:**
- `loading: true` on mount → 4 shimmer skeleton cards rendered at correct canvas scale while fetching
- No mock fallback — all hardcoded placeholder numbers removed from `buildSlideData`
- If no sources connected or API returns empty → "Ingen data för den här perioden" state with link to Integrations
- Real data only: fetches from `/api/ga4` and `/api/gsc`, merges via `mergeReportData`

**InfoTooltip** — unified API: accepts either `text="..."` (plain) or `title` + `body` + `example` (rich). Tooltip opens downward-right. No animation on the trigger icon (scale removed). Example box uses `oklch(0.90 0.008 270)` background for clear contrast. BorderBeam animation removed — card has a plain `1px solid rgba(0,0,0,0.05)` border.

---

## Privacy & Google OAuth verification

[src/app/privacy-policy/page.tsx](../src/app/privacy-policy/page.tsx)

Privacy policy page added at `/privacy-policy` in preparation for Google OAuth verification. Covers: what's stored (tokens only — GA4/GSC data is never persisted), the two scopes requested, Google Limited Use policy compliance, GDPR rights, Supabase + Google Cloud as the only subprocessors.

**OAuth scopes** are now minimal: `analytics.readonly` + `webmasters.readonly` only. The write scope (`analytics`) was removed from both login and signup. These must match exactly what's declared in Google Cloud Console → OAuth consent screen.

Privacy policy link is wired in the landing footer ("Integritet"), and a consent notice appears below the form on both `/login` and `/signup`.

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

### `NoiseTexture` — `src/components/ui/noise-texture.tsx`

World-class reusable SVG grain component. Uses `feTurbulence fractalNoise` with unique filter ID per instance (via `useId()`) so multiple instances never clash. Zero dependencies, resolution-independent, no images.

**Props:**
- `preset` — `"fine" | "medium" | "coarse" | "cinematic"` (default: `"cinematic"`)
- `frequency` — overrides preset `baseFrequency`
- `octaves` — overrides preset `numOctaves`
- `opacity` — overrides preset opacity
- `blendMode` — CSS `mix-blend-mode` (`"overlay" | "multiply" | "soft-light"` etc, default: `"overlay"`)
- `animated` — animates grain seed over 8s for a subtle film drift (default: `false`)

**Presets:** `fine (0.85, 4oct, 0.5)`, `medium (0.65, 4oct, 0.65)`, `coarse (0.45, 3oct, 0.75)`, `cinematic (0.72, 4oct, 0.6)`

Used on: all gradient cards in the report (`AISummary`, conversion upsell, AI visibility, recap CTA) and the dashboard hero card.

---

## UI merge + new pages — completed 2026-04-30

`(app2)` route group fully deleted. All V2 visual work migrated into `(app)` as production pages.

### What changed

**Sidebar** — "Design v2" section removed. Kunder (`/clients`), Inställningar (`/settings`), and Data (`/data`) added to the DATA section with bespoke SVG icons. Inactive nav item text changed from `var(--slate)` to `var(--charcoal)` (full black) for legibility. All banner and nudge card text also bumped to `var(--charcoal)` and larger font sizes.

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

---

## Report polish — completed 2026-05-19

### Visual fixes

**Number formatting** — `fmtNum` now always writes full Swedish locale numbers (`1 800`, `14 200`) with no k/mn abbreviation. The entire report uses `toLocaleString("sv-SE")`.

**Color logic** — All `TrendPill` calls now use `delta > 0` (strictly positive) to render green. `delta === 0` and `delta === null` both render neutral grey. A negative number can never be green. Fixed across KPI cards, trend slide, channels slide, pages slide.

**Label rename** — `AISummary` default label changed from "AI-sammanfattning" to "Strategisk sammanfattning". The strategic insight slide uses "Det vi ser just nu". No AI terminology visible to end users.

**Channel names** — Cleaned up to plain Swedish for non-technical readers:
- `"Google (obetalt)"` (was "Google (Obetald söktrafik)")
- `"Direkttrafik"` — sub-copy now "Besökare som skrev in adressen direkt"
- `"Okänd trafik"` (was "Ej identifierad trafik" / "Okänd källa")

**All gray body text** — `text-foreground/70`, `/75`, `/80` replaced with full black (`text-foreground`) across the entire report for stronger contrast.

### SlideStrategicInsight redesign

Two-column layout: left side has heading + three signal bullets with green/red dots (Trafiken växer / Engagemanget sjunker / Kontaktsidan tappade synlighet), right side is the expanded gradient card with three focused body paragraphs and a sharp bottom-line callout. This is the product's USP slide — the right card goes deep on business diagnosis, not just restating numbers. Eyebrow removed. Headline line-breaks after "Synligheten ökar" so the em dash opens the second line.

---

## AI insights engine — built and secured 2026-05-19/20

The core architecture for LLM-generated copy. Full spec in [`docs/ai-insights-architecture.md`](./ai-insights-architecture.md).

### Philosophy

Deterministic for numbers and labels. LLM for sentences that should feel like an advisor wrote them. One Claude call per period per user, result cached — report always reads from cache, never triggers generation itself.

### Architecture — three layers

1. **Data** — `ReportData` built server-side from connected GA4/GSC sources. Browser never supplies metrics.
2. **Insight classifier** — `deriveInsights(data): Insight[]`, pure TypeScript, no LLM, returns facts classified by type and severity.
3. **LLM generation** — one Claude call, all 6 copy slots in one shot as structured JSON, validated with Zod, cached in Supabase.

### Files

**`src/lib/engine/derive-insights.ts`** — Insight classifier. Pure TypeScript, no LLM. Takes `ReportData`, returns `Insight[]` sorted by severity. Covers 16 insight types: traffic up/down broadly, organic/paid drop, channel concentration, engagement up/down, contact page lost visibility, paid ROAS strong, paid cost up + conversions flat, SEO positions improving/declining, conversions improved/declined, AI visibility untracked, data missing. Each insight carries `type`, `severity` (positive/neutral/warning/critical), `metrics` (real values), and `surface[]` (which UI slots consume it). `hasSufficientData(surface, insights, data)` is the null gate — checked per surface before invoking the LLM.

**`src/lib/engine/slide-headlines.ts`** — Deterministic headline lookup. `deriveSlideHeadline(insights)` picks the headline keyed to the highest-severity insight type. 14 distinct headlines mapped. `SlideHero` now receives `headline` as a prop — no more hardcoded "Din digitala synlighet går åt rätt håll".

**`src/lib/ai-insights/types.ts`** — Shared AI payload contract. Defines `AiInsightsPayloadSchema`, `AiInsightsPayload`, `AI_INSIGHTS_FALLBACK_TEXT`, `AI_INSIGHTS_PROMPT_VERSION`, and `createNullAiInsightsPayload()`. Every slot is nullable. Client code never imports types from a route module.

**`src/lib/ai-insights/cache.ts`** — Shared cache helpers. `hashAiInsightMetrics(data)` includes `AI_INSIGHTS_PROMPT_VERSION` and key input metrics — bumping the version string auto-invalidates all cached rows when the prompt changes. `isFreshAiInsightsCache()` enforces the 24-hour freshness window.

**`src/lib/report-data/server.ts`** — Server-owned report data builder. `buildReportDataForUser({ supabase, userId, dateRange, periodLabel, locale })` reads connected sources, refreshes tokens, fetches GA4/GSC in parallel with prior period, maps and merges into trusted `ReportData`. Used exclusively by `/api/generate-insights`. This is the single source of truth for AI generation — browser can never inject metrics here.

**`src/lib/hooks/useAiInsights.ts`** — Client hook. Fires after real `reportData` is set (not mock fallback), sends only `{ period: { start, end, label } }` to `/api/generate-insights`. Deduplication via `inflightKeyRef` prevents double-firing. Silent fail — UI keeps deterministic copy if the call errors or returns no result.

**`supabase/migrations/20260519000000_ai_report_cache.sql`** — Cache table `ai_report_cache` with RLS. Keyed on `(user_id, period_start, period_end)`. Users can read, insert, and update only their own rows; service role can manage all rows. Indexed on the composite key.

**`supabase/migrations/20260519001000_ai_report_cache_user_writes.sql`** — Policy repair migration for environments where the first cache migration already ran without user write policies.

**`src/app/api/generate-insights/route.ts`** — The generation route. Accepts only `{ period: { start, end, label } }` — no userId, no metrics from the browser. Flow: authenticate server-side from Supabase cookies → `buildReportDataForUser` (server-fetches GA4/GSC) → cache check (returns early if hit + valid hash + <24h old) → `deriveInsights` → `hasSufficientData` per surface → `buildPrompt` with role/data/constraint anatomy per surface → `generateAiInsightsText(prompt)` (provider adapter) → `extractJsonObject` → validate with `AiInsightsPayloadSchema` → `applySufficiencyGate` (server-side backstop enforcing nulls even if model ignores instructions) → cache upsert. Provider errors and malformed model output are **not cached** — the next request retries. Both `openai` and `@anthropic-ai/sdk` installed.

**`src/lib/ai-insights/generate.ts`** — Provider adapter. Single export: `generateAiInsightsText(prompt): Promise<string>`. Dispatches to OpenAI or Anthropic based on `AI_INSIGHTS_PROVIDER` env var. Returns raw text only — parsing and validation stay in the route. Throws typed `AiInsightsProviderError` on misconfiguration (missing key, unknown provider). Dynamic imports so only the active provider's SDK is loaded. Env vars: `AI_INSIGHTS_PROVIDER=openai|anthropic`, `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`).

### Prompt anatomy

Each surface has three sections in order: **ROLE** (who Claude is and what job it's doing on this surface), **DATA** (only the metrics that surface is responsible for — prevents referencing numbers the user hasn't seen), **CONSTRAINT** (output format and length, hard per surface). One call generates all 6 slots.

| Surface | Role | Type |
|---|---|---|
| `dashboard_hero` | Narrator | Educational — what happened this period |
| `slide_hero` | Summarizer | Pedagogical — for a non-technical SME owner |
| `slide_insight` | Strategist | Analytical — what this means for the business |
| `slide_recs` | Advisor | Actionable — what to do and why |
| `slide_recap` | Editor | Distillation — three things to remember |
| `next_steps` | Coach | Actionable — why this specific step for this client |

### Null state

If `hasSufficientData` returns false for a surface, that slot is `null` in the payload. Claude is instructed to return `null` for any surface marked `INSUFFICIENT DATA`. `applySufficiencyGate` enforces this server-side regardless of model output. UI fallback for any null slot: **"Inte nog med data för att bedöma din digitala närvaro."**

### Dashboard wiring

`dashboard/page.tsx` fetches `userId` on mount, calls `useAiInsights(reportData, userId, periodStart, periodEnd, periodLabel)`. The hook key is `${periodStart}:${periodEnd}:${metricsHash}` so it re-fires when data changes within the same period. `loading` and `aiInsights` are both passed to components.

- `DashboardHero` — shows skeleton placeholders while loading. Once resolved: `aiInsights.dashboard_hero.headline` + `.sub`, or fallback string if slot is null. No longer accepts or uses `item` prop (removed).
- `NextStepsCard` — action labels stay deterministic, rationale text shimmers while loading. `aiInsights.next_steps[i].rationale` replaces hardcoded copy when available. Null slot → fallback string.

### Report wiring

`/report` reads `ai_report_cache` after rebuilding `ReportData`. Cache query is scoped to the authenticated user — `getUser()` is called first; if it returns no user, the cache query is skipped entirely (no sentinel `""` query). Validates the cached payload with `AiInsightsPayloadSchema`, checks metric hash and 24-hour freshness, then passes `aiInsights` into:
- `SlideHero` — `slide_hero`
- `SlideStrategicInsight` — `slide_insight`
- `SlideRecommendations` — `slide_recs`
- `SlideRecap` — `slide_recap`

The report never triggers generation itself. If cache is cold (user opens report before dashboard), all surfaces show deterministic copy — this is intentional. If a cached slot is explicitly `null`, that surface renders the fallback sentence.

### Known limitation — cold report open

If a user navigates directly to `/report` without having opened the dashboard first, the cache will be empty and all AI surfaces show deterministic fallbacks. There is no self-healing trigger in the report. This is a deliberate product decision (dashboard generates, report reads). A future cron pre-warms the cache before users open anything — not yet built.

### Known bugs — do not set `ANTHROPIC_API_KEY` until resolved

~~**1. Classifier: `conversion_rate_improved` / `conversion_rate_declined` use total conversion count, not conversion rate.**~~ ✅ Fixed. Now uses `conv.conversionRate.value` / `.previousValue`. Total conversions count still included in `metrics` for context but does not drive classification.

~~**2. Classifier: SEO positions use percentage delta — wrong metric for rankings.**~~ ✅ Fixed. Now uses absolute delta (`avgPos.value - avgPos.previousValue`). Thresholds: `< -1` position = improving (positive), `> 2` positions lost = declining (warning/critical at `> 5`).

~~**3. Classifier: `traffic_shift_channel` is not a shift — it's a concentration check.**~~ ✅ Fully fixed. Renamed to `traffic_channel_concentrated` across InsightType, derive-insights, slide-headlines, prompt, and docs. Threshold now compares normalized share before rounding. Dominant channel selected explicitly (no longer assumes sorted order).

~~**4. Hook never fired — race between `userId` and `reportData` resolution.**~~ ✅ Fixed. `userId` resolved before `reportData` arrived; effect deps were `[key, userId]` so the effect ran once with `reportData=null`, bailed, then never re-ran. Fixed by adding `hasData` (stable boolean) as a dep — now fires when data arrives regardless of resolution order.

~~**5. `loading` from `useAiInsights` not consumed — no loading indicator.**~~ ✅ Fixed. `loading` now passed to `DashboardHero` (skeleton placeholders) and `NextStepsCard` (shimmer on rationale text).

~~**6. Provider errors and parse failures were cached as null payloads.**~~ ✅ Fixed. Cache write only happens on successful, non-null parse. Provider errors and malformed output return null to the client without poisoning the cache.

~~**7. Dead `item` prop on `DashboardHero`.**~~ ✅ Fixed. Prop removed from type and call site.

### Required env vars

```
AI_INSIGHTS_PROVIDER=openai   # or 'anthropic'
OPENAI_API_KEY=               # required if provider is openai
OPENAI_MODEL=gpt-4o-mini      # optional override
ANTHROPIC_API_KEY=            # required if provider is anthropic
ANTHROPIC_MODEL=claude-sonnet-4-6  # optional override
```

### Open — not yet built / known rough edges

- **AI copy quality not validated** — generated Swedish has not been reviewed against a real client dataset. Prompt tuning and tone review needed before showing to paying clients.
- **Handcrafted card templates** — each surface should have a design-approved template to constrain the AI output shape. Not yet built.
- **Cold report** — user opening `/report` before dashboard gets deterministic fallbacks. No self-healing trigger. Future: cron pre-warm or on-demand generate button on the report.
- **Supabase migrations not applied** — `ai_report_cache` table must exist. Run `npx supabase db push` or apply the two migration files in Supabase Studio.

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
1. ~~**Product intelligence foundation**~~ — ✅ Done.
2. ~~**Fullscreen report mode**~~ — ✅ Done.
3. ~~**Adaptive dashboard logic**~~ — ✅ Done.
4. ~~**i18n — Swedish default, English toggle**~~ — ✅ Done.
5. ~~**Dark mode**~~ — ✅ Done.
6. ~~**Stat contract per data source**~~ — ✅ Done.
7. ~~**GA4 + GSC mapper and API routes**~~ — ✅ Done.
8. ~~**Real data end-to-end**~~ — ✅ Done.
9. ~~**Wire `/report` to real data**~~ — ✅ Done.
10. ~~**`executiveSummary` generation (rule-based bridge)**~~ — ✅ Done.
11. ~~**Auth enforcement + token refresh**~~ — ✅ Done.
12. ~~**Dashboard loading UX + shimmer**~~ — ✅ Done.
13. ~~**Dashboard modularized**~~ — ✅ Done.
14. ~~**AI insights engine — classifier, cache, generation route, report + dashboard wiring**~~ — ✅ Done. Full three-layer architecture: server-side `ReportData` builder, pure TypeScript insight classifier, one-shot Claude call for all 6 copy surfaces, Supabase cache with RLS, report reads cache with authenticated user filter (skips query entirely if no user), dashboard triggers generation via `useAiInsights` hook. Auth is server-side — browser sends only the period, server fetches and classifies everything. Null gates enforced in classifier and as server-side backstop in route. All 6 surfaces wired in UI with deterministic fallbacks. `ANTHROPIC_API_KEY` env var required.

**Next — in priority order:**

15. ~~**Fix classifier bugs**~~ — ✅ Done. Conversion rate now uses `conversionRate` not count, SEO positions use absolute delta, channel concentration comment corrected.

16. ~~**Fix `useAiInsights` over-firing**~~ — ✅ Done. `reportData` removed from effect deps.

17. **Wire `loading` from `useAiInsights` to `DashboardHero`** — Pass the `loading` boolean to `DashboardHero` and show a subtle indicator while generation is in flight. A pulsing dot or "Analyserar..." on the hero eyebrow is enough.

18. **Set `ANTHROPIC_API_KEY` and smoke test end-to-end** — Fill the env var in `.env.local`, open the dashboard with real GA4/GSC data connected, confirm the generation route fires, cache writes, and AI copy appears in `DashboardHero`, `NextStepsCard`, and all 4 report slides. Check the null state by testing with only one source connected.

19. **Open auth — unblock real users** — App is still in testing mode in Google Cloud Console. Submit for Google OAuth verification or add authorized test users. Blocking all real users outside the team.

20. **Cron pre-warming** — Users who open `/report` without visiting the dashboard first always see deterministic copy. A daily cron calling `buildReportDataForUser` + generation for all users with connected sources fixes this. `src/lib/report-data/server.ts` makes it straightforward.

21. **PDF export** — Each slide as a page, animations stripped, typography fully respected. The most beautiful PDF a client has ever received.

22. **Product model — accounts, workspaces, white-label** — Nail the data model before building UI.

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
