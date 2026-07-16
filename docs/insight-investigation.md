# AI Insight Cards — Investigation Reference

> Read-only reference for tweaking AI insight output. Every surface, constraint, question, data shape, rendering component, and known issue in one place.

---

## System Foundation

### CLARIX_SYSTEM_PROMPT
**File**: `src/lib/ai-insights/generate.ts`

The persistent advisor persona injected into every provider call. Current version establishes:

- **Philosophy**: "Data är inte målet. Förståelse är målet." Every insight should make the reader feel "Nu fattar jag vad som händer" — not "Jag fick fler siffror."
- **Audience**: Business owners, CEOs, ops managers who don't work with digital marketing daily. No GA4, SEO, attribution knowledge assumed.
- **4-Part Framework** (applied per surface, not all four per sentence):
  1. Vad hände? (one figure, one fact)
  2. Är det bra eller dåligt? (take a real stance — never hedge)
  3. Varför kan det ha hänt? (use "Det kan bero på", never overconfident)
  4. Vad bör man hålla koll på? (one concrete signal or step)
- **Priority order**: Leads/revenue → Cost per result → Conversion rate → Traffic sources → Build-on opportunities → Warnings → Minor changes
- **Jargon translation rules** (always apply, no exceptions):

| Technical term | Plain Swedish |
|---|---|
| Organic Search / Obetald söktrafik | "Besökare som hittade er via Google utan annons" |
| Organic Social / Obetald social trafik | "Besökare som kom via inlägg på sociala medier" |
| Direct Traffic / Direkttrafik | "Besökare som skrev in adressen direkt eller hade den sparad" |
| Referral | "Besökare som kom via en länk på en annan webbplats" |
| Bounce Rate / Avvisningsfrekvens | "Andel som lämnade sidan utan att gå vidare" |
| CTR / Klickfrekvens | "Andel som klickade vidare" |
| Sessioner | "Besök" |
| Impressioner | "Gånger webbplatsen visades i sökresultaten" |
| Konverteringsfrekvens | "Andelen besökare som hörde av sig eller köpte" |
| Attribution / Kanalmix / Funnel | Explain without the term |
| Cross-network | "Annonser som visas på flera olika plattformar samtidigt" |

- **Tone**: Pedagogisk, trygg, erfaren, rak, konkret, affärsorienterad. Never: teknisk, akademisk, svävande, konsultfluffig.
- **JSON output**: Always valid JSON, no markdown, straight quotes only.
- **Provider**: OpenAI (gpt-4o-mini default) or Anthropic (claude-sonnet-4-6 default), set via `AI_INSIGHTS_PROVIDER` env var. Max tokens: 1600.

### Cache & Versioning
- **`AI_INSIGHTS_PROMPT_VERSION`** (`"ai-insights-v11"`) — logged only, does NOT invalidate cache
- **`AI_INSIGHTS_CACHE_VERSION`** (`"cache-v1"`) — bump this when prompt logic or classifier rules change; busts all user caches
- **Cache table**: `ai_report_cache` in Supabase, keyed by `(user_id, period_start, period_end)`, 24h TTL
- **Generation lease**: RPC `claim_ai_insights_generation` serializes concurrent requests (60-second lock). On failure: marked `failed` immediately so next request can retry.

---

## Data Pipeline

### Snapshot Data in Every Prompt
All surfaces receive this calculated context block:

```
Period: {label}

TRAFIKDATA:
- Besök denna period: {visits}
- Besök föregående period: {visitsPrev}
- Förändring: {visitsDelta %}
- Starkaste kanal: {topChannelLabel} ({topChannelPct}%)
- Attributionssäkerhet: [note if direct/unclear]
- Avvisningsfrekvens: {bounceRate}% (föregående: {bouncePrev}%)

SÖKSYNLIGHET (Google): [if seo data available]
- Klick från Google: {clicks} (föregående: {clicksPrev})
- Genomsnittsposition: {avgPos} (föregående: {avgPosPrev})

KONVERTERINGAR: [if conv data available]
- Konverteringsgrad: {convRate}% (föregående: {convRatePrev}%)
- Antal konverteringar: {totalConversions}

BETALDE ANNONSER: [if paid data available]
- Annonskostnad: {spend} kr
- ROAS: {roas}

KLASSIFICERADE INSIKTER (sorterade efter allvar):
- [SEVERITY] type: {metrics JSON}

[Per-insight reasoning rules for detected patterns]
```

### AiInsightsPayload Type
**File**: `src/lib/ai-insights/types.ts`

```typescript
{
  dashboard_hero: { headline: string, sub: string } | null
  next_steps:     Array<{ rationale: string }> | null   // max 3
  slide_hero:     string | null
  slide_insight:  { body: string[], bottom_line: string } | null
  slide_recs:     Array<{ body: string }> | null         // max 3
  slide_recap:    Array<{ body: string }> | null         // exactly 3
}
```

### Client Polling
**File**: `src/lib/hooks/useAiInsights.ts`

- Fires `POST /api/generate-insights` on mount
- If server returns 202 (generating): polls every 3 seconds
- Max 8 poll attempts (24 seconds total), then gives up
- Dedupes by fingerprint (sessions + clicks + spend + conversions + sources)

---

## Insight Classification

**File**: `src/lib/engine/derive-insights.ts`

16 insight types, sorted by severity (critical → warning → positive → neutral).

| Type | Trigger Threshold | Severity | Surfaces |
|---|---|---|---|
| `traffic_up_broadly` | visitsDelta > 10% | positive | dashboard_hero, slide_hero, slide_insight, slide_recap |
| `traffic_down_broadly` | visitsDelta < -5% | warning/critical | dashboard_hero, slide_hero, slide_insight, slide_recap |
| `traffic_drop_organic` | organic Δ < -10% | warning/critical | slide_insight, slide_recs, next_steps |
| `traffic_drop_paid` | paid Δ < -10% | warning/critical | slide_insight, slide_recs, next_steps |
| `traffic_channel_concentrated` | one channel > 60% share | neutral | slide_hero, slide_insight |
| `engagement_down` | bounceRate Δ > +2 points | warning/critical | slide_insight, slide_recs, slide_recap, next_steps |
| `engagement_up` | bounceRate Δ < -2 points | positive | slide_insight, slide_recap |
| `contact_page_lost_visibility` | contact page trend = "down" | warning | slide_insight, slide_recs, next_steps |
| `paid_roas_strong` | ROAS ≥ 3.0 | positive | slide_recs, next_steps |
| `paid_cost_up_conversions_flat` | spend Δ > 5% AND conv Δ < 5% | warning | slide_recs, slide_insight, next_steps |
| `seo_positions_improving` | avgPos improved > 1 position | positive | slide_insight, slide_recap |
| `seo_positions_declining` | avgPos worse > 2 positions | warning/critical | slide_insight, slide_recs, next_steps |
| `conversion_rate_improved` | convRate Δ ≥ +0.5 points (min 20 sessions) | positive | slide_insight, slide_recap |
| `conversion_rate_declined` | convRate Δ ≤ -0.5 points (min 20 sessions) | warning/critical | slide_insight, slide_recs, next_steps |
| `ai_visibility_untracked` | always fires | neutral | slide_recap |
| `data_missing_tracking_issue` | no sessions data | warning | dashboard_hero, slide_hero, slide_insight, slide_recs, slide_recap |

---

## Surface-by-Surface Reference

### dashboard_hero

**File**: `src/components/dashboard/DashboardHero.tsx`  
**Question it answers**: "Did we do well or poorly this period?"  
**Who reads it**: Business owner, first contact with their data, before opening the report  
**Job**: Deliver a verdict and earn the click to the report. Not a summary — an opinion.

**Constraint** (from `route.ts`):
```
headline: max 8 words — take a stand, name the most important thing that happened
sub: Exactly 3 sentences, max 15 words each
  Sentence 1: what happened (one figure, no channel)
  Sentence 2: good or bad — take a real stance, explain business impact
  Sentence 3: the one thing to watch now
```

**Data passed**:
```
visits, visitsDelta, topChannel (label + pct), attributionUnclear (bool), attributionNote, bounceRate
```

**Sufficiency gate**: `totalSessions > 0`

**Rendering**:
- Left panel: animated dot + "Denna vecka" label + large headline (text-[2.15rem]–text-[3rem]) with `highlightNumbers()`
- Right panel: white glass card with sub text (text-[1.25rem]–text-[1.7rem]) + "Läs hela rapporten" link
- Shimmer overlay while loading

**Good examples**:
```
headline: "Färre besök – men fler verkar vara rätt besökare"
headline: "Google driver mer trafik – en tydlig förbättring"

sub: "Webbplatsen fick 6 182 besök — 15 % färre än förra perioden.
     Det är en nedgång, men besökarna som kom verkar mer intresserade.
     Håll koll på om konverteringsgraden håller i sig när trafiken återhämtar sig."
```

**Bad examples**:
```
headline: "Trafiken har ökat" — no stance, generic
sub: "Det kom 6 182 besök från obetald trafik från sociala medier
     som stod för 90 % av trafiken, en nedgång på −15 %." — three facts, no judgment
```

---

### slide_hero

**File**: `src/components/report/slides/SlideHero.tsx`  
**Question it answers**: "Why did it happen?"  
**Who reads it**: Owner who already read the dashboard verdict and opened the report  
**Job**: Explain the cause behind the verdict. Never repeat what happened — explain what's behind it.

**Constraint** (from `route.ts`):
```
MUST return a string — never null. Exactly 3 sentences.
Do NOT start with "Besöken", "Trafiken", or a figure — start with cause or context.
  Sentence 1: most likely explanation (use "Det kan bero på", "En sannolik förklaring är" — never overconfident)
  Sentence 2: what it means for the business, not for the metrics
  Sentence 3: what to keep in mind reading the rest of the report
No headings, no lists.
```

**Data passed**: Same as `dashboard_hero` + classified insights reasoning rules

**Sufficiency gate**: Always generates (`sufficient.slide_hero = true`)

**Rendering**:
- Large centered headline (text-[3.1rem]–text-[3.8rem]) + "Jämfört med föregående period."
- Line 1 in AISummary card: visit count + delta (highlighted) from `ReportData` directly
- Line 2: AI `slide_hero` text with `highlightNumbers()`
- Shimmer for line 2 while loading

**Good examples**:
```
"Det kan bero på att synligheten från obetald trafik via sociala medier minskade
 under perioden — en vanlig orsak är att publiceringsfrekvensen gått ner.
 För verksamheten betyder det att färre nya personer hittar till webbplatsen.
 Ha det i bakhuvudet när du tittar på konverteringarna — lägre volym
 kan ändå dölja bättre kvalitet."
```

**Bad examples**:
```
"Besöken minskade med 15 % och direkttrafiken stod för 90 % av trafiken."
— repeats dashboard, explains nothing
```

**Key tension**: dashboard_hero and slide_hero currently answer different questions but share the same data snapshot. The design intent is that dashboard = verdict, slide_hero = cause. If a client shares only the report (not the dashboard), slide_hero assumes they've already read the verdict — which they haven't. This is a known structural issue to resolve.

---

### slide_insight

**File**: `src/components/report/slides/SlideStrategicInsight.tsx`  
**Question it answers**: "What does this actually mean for the business?"  
**Who reads it**: Decision-maker going deeper than the verdict  
**Job**: Teach what a figure means, not just that it changed. Causal, educational, concludes with a sharp verdict.

**Constraint** (from `route.ts`):
```
Return { "body": ["paragraph 1", "paragraph 2"], "bottom_line": "1 sharp sentence" }
EXACTLY 2 paragraphs, max 2 sentences each.
Every sentence must carry information — no filler.
bottom_line: advice from an experienced analyst, not a headline.
```

**Data passed**: Only insights with `surface.includes("slide_insight")` (type + severity + metrics JSON)

**Sufficiency gate**: `totalSessions > 0 OR channelBreakdown.length > 0`

**Rendering**:
- Left column: heading "Vad siffrorna faktiskt betyder" + up to 3 deterministic signal cards (from `deriveSignalCards()`)
- Right column (AI): "Det vi ser just nu" header + body paragraphs + bottom_line in framed block
- AI gradient background, noise texture, gradient blurs

**Signal cards** (left column, deterministic — not AI):
Up to 3 cards built from `SIGNAL_COPY` templates mapped to insight types. Examples:
- `traffic_up_broadly` → "Trafiken växer" / "Besöken ökade {Δ}% mot förra perioden — fler hittar er."
- `engagement_down` → "Engagemanget sjunker" / "Avvisningen steg {Δ} punkter — fler lämnar utan att engagera sig."
- `conversion_rate_improved` → "Fler tar nästa steg" / "Konverteringsgraden steg till {rate}%."

**Fallback**: Hardcoded prose about "Trafiken ökar — men trafik som inte konverterar är bara en kostnad..."

---

### slide_recs

**File**: `src/components/report/slides/SlideRecommendations.tsx`  
**Question it answers**: "What should we do about it?"  
**Who reads it**: Action-taker, wants concrete next steps tied to real data  
**Job**: 3 actionable recommendations each referencing an actual figure or pattern. No generic advice.

**Constraint** (from `route.ts`):
```
Return array with max 3 objects: { "body": "1–2 sentences. Start with a concrete verb. Name why — tie to data." }
```

**Data passed**: Only insights with `surface.includes("slide_recs")` (type + severity + metrics JSON)

**Sufficiency gate**: At least one insight targeting surface has severity `warning` or `critical`

**Rendering**:
- 3-column card grid (Skala / Fixa / Bygg) with gradient icon backgrounds
- Static card titles ("Dubbla det som fungerar", "Täta läckan vid kontakt", "Bygg momentum")
- AI fills the body text; falls back to static examples if null

**Good examples**:
```
"Lägg mer budget på de annonser som gav flest förfrågningar förra månaden —
 annonskostnaden ökade med 22 % men konverteringarna stod still."

"Kontrollera kontaktsidans synlighet i Google — sidan tappade trafik
 den här perioden och det kan påverka antalet förfrågningar."
```

**Bad examples**:
```
"Optimera kampanjerna för bättre resultat." — no verb, no figure, no why
"Förbättra konverteringsresan." — generic, could apply to anyone
```

---

### slide_recap

**File**: `src/components/report/slides/SlideRecap.tsx`  
**Question it answers**: "What should I remember after closing this report?"  
**Who reads it**: Busy owner who may not retain detail  
**Job**: 3 sharp, standalone takeaways. Not a repeat of slides above — each row must be memorable on its own.

**Constraint** (from `route.ts`):
```
Return array with EXACTLY 3 objects: { "body": "1 sentence, max 15 words. Concrete, with figure if possible." }
```

**Data passed**: Top 3 insights (by severity) with `surface.includes("slide_recap")`, excluding `ai_visibility_untracked`

**Sufficiency gate**: At least one real insight targeting surface (excluding `ai_visibility_untracked`)

**Rendering**:
- Left column: "Tre saker att komma ihåg" + 3 items with icon + static title + AI body
- Right column: Booking CTA ("Boka strategigenomgång") — static, not AI

**Good examples**:
```
"Google stod för 71 % av trafiken — en kanal dominerar helt."
"Avvisningsfrekvensen sjönk 6 punkter — fler stannar och engagerar sig."
"Kontaktsidan tappade synlighet, vilket kan kosta förfrågningar framöver."
```

**Bad examples**:
```
"Trafiken ökade under perioden." — vague, no figure
"Det är viktigt att följa upp konverteringarna." — advice, not insight
```

---

### next_steps

**File**: `src/components/dashboard/NextStepsCard.tsx`  
**Question it answers**: "What's the priority action right now?"  
**Who reads it**: Owner on the dashboard, wants to know what to do next  
**Job**: Explain WHY each action is relevant to THIS client TODAY. Tie to a real data point.

**Constraint** (from `route.ts`):
```
Return array in EXACTLY same order as DATA.actions, max 3 objects:
{ "rationale": "1 sentence. Explain why this action is relevant. Name the figure or pattern that motivates it." }
```

**Data passed**: Deterministic action list from `deriveNextSteps()` + insights targeting surface

**Sufficiency gate**: At least one insight targeting surface has severity `warning` or `critical`

**Deterministic actions** (from `src/lib/dashboard/next-steps.ts` — these are not AI-generated):
1. "Skala upp de bäst presterande annonserna" — fires when paid ROAS data exists
2. "Optimera de sidor som rankar på position 8–15" — fires when avgPosition > 8
3. "Förbättra landningssidans relevans och laddningstid" — fires when bounceRate > 50%
   - Fallback: "Testa Google Ads med en liten budget" if no paid data

**Rendering**:
- 3 numbered items (1, 2, 3) with static action title + AI rationale sentence
- Falls back to static rationale from `deriveNextSteps()` if AI returns null

---

## Summary: What Each Surface Answers

| Surface | Question | Tone | Output shape |
|---|---|---|---|
| `dashboard_hero` | Did we do well or poorly? | Verdict, business impact | Headline + 3 sentences (≤15 words each) |
| `slide_hero` | Why did it happen? | Explanatory, causal | 3-sentence narrative (never null) |
| `slide_insight` | What does it mean for the business? | Analytical, educational | 2 paragraphs + 1 sharp bottom line |
| `slide_recs` | What should we do? | Prescriptive, data-tied | Up to 3 actions (verb + why + figure) |
| `slide_recap` | What should I remember? | Memorable, sharp | Exactly 3 takeaways (≤15 words each) |
| `next_steps` | What's the priority action? | Coaching, contextual | Up to 3 rationale sentences |

---

## Known Issues & Tensions

### 1. dashboard_hero assumes client has read it before opening the report
`slide_hero` explains the *cause* behind the verdict. But if a client receives a shared report link directly, they never saw the dashboard verdict — so slide_hero's "why" lands without the "what". Both surfaces need to be able to stand alone. Currently they cannot.

### 2. Top channel attribution ambiguity
If the dominant channel is "direkttrafik" / "(direct)" / "ej identifierad", the prompt flags `attributionUnclear = true` and instructs the model not to present it as a confirmed channel. This is handled well in the prompt but not always reflected clearly in the rendered output.

### 3. slide_hero always generates regardless of data quality
`sufficient.slide_hero = true` unconditionally. If data is thin or misleading, the model still produces a cause-explanation. This can result in confident-sounding text built on poor data.

### 4. Bounce rate dead zone (±2 points)
Changes under 2 percentage points don't fire `engagement_up` or `engagement_down`. Edge case: 40% → 42% = no signal. Intentional to avoid noise but worth knowing.

### 5. Conversion rate minimum volume (20 sessions)
`conversion_rate_improved` and `conversion_rate_declined` require ≥20 sessions in both periods. Small sites with 5–15 sessions see no conversion signal regardless of rate change.

### 6. Cache version bump required after prompt changes
Changing `CLARIX_SYSTEM_PROMPT` or any constraint in `buildPrompt()` does NOT automatically invalidate cached insights. Must manually bump `AI_INSIGHTS_CACHE_VERSION` in `src/lib/ai-insights/cache.ts`.

### 7. slide_recs and next_steps only fire on warning/critical
If a period is entirely positive (traffic up, engagement up, conversion up), these surfaces return null and fall back to static content. The static fallback text is generic and doesn't reflect the actual good news.

---

## File Map

| Purpose | File |
|---|---|
| System prompt + provider adapter | `src/lib/ai-insights/generate.ts` |
| Prompt builder + all surface constraints | `src/app/api/generate-insights/route.ts` |
| Payload types and schema | `src/lib/ai-insights/types.ts` |
| Cache hash + version | `src/lib/ai-insights/cache.ts` |
| Insight classifier | `src/lib/engine/derive-insights.ts` |
| Signal card templates | `src/lib/engine/signal-cards.ts` |
| Deterministic next steps | `src/lib/dashboard/next-steps.ts` |
| Client polling hook | `src/lib/hooks/useAiInsights.ts` |
| Dashboard hero component | `src/components/dashboard/DashboardHero.tsx` |
| Next steps component | `src/components/dashboard/NextStepsCard.tsx` |
| Slide hero component | `src/components/report/slides/SlideHero.tsx` |
| Slide insight component | `src/components/report/slides/SlideStrategicInsight.tsx` |
| Slide recs component | `src/components/report/slides/SlideRecommendations.tsx` |
| Slide recap component | `src/components/report/slides/SlideRecap.tsx` |
| Number highlighting | `src/lib/utils/highlight-numbers.tsx` |
| Design tokens | `src/components/report/tokens.ts` |
