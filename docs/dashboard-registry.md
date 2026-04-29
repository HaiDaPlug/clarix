# Dashboard Registry

This document is the canonical human-readable definition of every card and section on the Digital Rapport dashboard. It is the source of truth before any code is written. The code registry in `src/lib/dashboard/registry.ts` must match this document exactly.

## Design principles

- The dashboard is the always-on home base. It answers "how are we doing?" at a glance.
- It is not the report. No slides, no cinematic transitions, no deep narrative arcs.
- It should always feel full and confident — never broken, never accusatory about missing data.
- Every card earns its place by answering a question a business owner actually asks.
- Missing sources render nothing silently, except for one calm nudge at the bottom inviting the highest-value missing connection.
- Only one nudge at a time. Never a list of everything they haven't done.

## Nudge priority (highest-value missing source shown first)

1. GA4 — if not connected, nudge: "Connect Google Analytics to see how many people visit your site and where they come from."
2. GSC — if not connected (but GA4 is), nudge: "Connect Google Search Console to see how people find you organically."
3. Google Ads — if not connected (but GA4 + GSC are), nudge: "Connect Google Ads to see how your paid budget is performing."

Never show more than one nudge. Never show a nudge if all three core sources are connected.

---

## Cards and sections — in priority order

### 0 · AI Summary Hero
- **Type:** hero
- **Required sources:** none (degrades gracefully)
- **Optional sources:** ga4, gsc, google_ads
- **Required fields:** executiveSummary.headline
- **Optional fields:** executiveSummary.subheadline, executiveSummary.highlights, executiveSummary.aiSummary
- **Business question:** What is the one-sentence verdict on this period?
- **Decision use:** Lets the owner decide whether to act immediately or read the full report.
- **Render variants:**
  - full — headline, subheadline, highlight pills, "Read full report" CTA
  - simplified — headline only, CTA
- **Notes:** Always renders if executiveSummary exists. The dark hero card. Never removed.

---

### 1 · Traffic KPI card
- **Type:** kpi
- **Required sources:** ga4
- **Optional sources:** none
- **Required fields:** trafficOverview.totalSessions
- **Optional fields:** trafficOverview.totalSessions.previousValue
- **Business question:** Are more people visiting the site than last period?
- **Decision use:** First signal of whether acquisition is working.
- **Render variants:**
  - full — large number, delta chip, headline sentence, insight line
  - simplified — large number, delta chip only (no insight line)
- **Notes:** Core card. Always first KPI if GA4 is connected.

---

### 2 · Organic Reach KPI card
- **Type:** kpi
- **Required sources:** ga4
- **Optional sources:** none
- **Required fields:** trafficOverview.organicSessions
- **Optional fields:** trafficOverview.organicSessions.previousValue
- **Business question:** Is organic traffic growing without paid spend?
- **Decision use:** Shows whether SEO effort is compounding over time.
- **Render variants:**
  - full — large number, delta chip, headline sentence, insight line
  - simplified — large number, delta chip only
- **Notes:** Core card. Separate from total traffic to show SEO health distinctly.

---

### 3 · Search Clicks KPI card
- **Type:** kpi
- **Required sources:** gsc
- **Optional sources:** none
- **Required fields:** seoOverview.totalClicks
- **Optional fields:** seoOverview.totalClicks.previousValue
- **Business question:** Are people clicking through from search results?
- **Decision use:** CTR signal — visibility alone isn't enough, clicks matter.
- **Render variants:**
  - full — large number, delta chip, headline sentence, insight line
  - simplified — large number, delta chip only
- **Notes:** Core card. Only renders if GSC is connected.

---

### 4 · Engagement KPI card
- **Type:** kpi
- **Required sources:** ga4
- **Optional sources:** none
- **Required fields:** trafficOverview.bounceRate
- **Optional fields:** trafficOverview.bounceRate.previousValue
- **Business question:** Are visitors staying and engaging, or leaving immediately?
- **Decision use:** Quality signal — high bounce rate means acquisition is working but landing experience isn't.
- **Render variants:**
  - full — large number, delta chip, headline sentence, insight line
  - simplified — large number, delta chip only
- **Notes:** Core card. Label: "Engagement" in the UI. Underlying metric is GA4 engagement rate (inverse of bounce rate). trendGood = false for bounce rate direction.

---

### 5 · Conversions KPI card
- **Type:** kpi
- **Required sources:** ga4
- **Optional sources:** google_ads
- **Required fields:** conversions.totalConversions
- **Optional fields:** conversions.conversionRate, conversions.totalConversions.previousValue
- **Business question:** Is traffic turning into leads or sales?
- **Decision use:** Most direct signal of whether digital activity creates business value.
- **Render variants:**
  - full — large number, delta chip, conversion rate, headline sentence, insight line
  - simplified — large number, delta chip only
- **Notes:** Core card. Only renders if conversions data exists. If missing but GA4 is connected, this is a candidate for the missing-context nudge on the recommendations slide — but NOT on the dashboard (too much friction).

---

### 6 · Paid Efficiency KPI card
- **Type:** kpi
- **Required sources:** google_ads
- **Optional sources:** none
- **Required fields:** paidOverview.totalSpend
- **Optional fields:** paidOverview.roas, paidOverview.costPerConversion
- **Business question:** Is the paid budget delivering efficient returns?
- **Decision use:** Drives budget reallocation decisions.
- **Render variants:**
  - full — spend, ROAS or cost-per-conversion, delta, headline sentence, insight line
  - simplified — spend and delta only
- **Notes:** Core card. Only renders if Google Ads is connected. Never renders a broken paid card when Ads is not connected.

---

### 7 · Sessions Over Time chart
- **Type:** chart
- **Required sources:** ga4
- **Optional sources:** none
- **Required fields:** trafficOverview.timeSeries
- **Optional fields:** none
- **Business question:** What did the traffic trend look like across the period?
- **Decision use:** Spots spikes, dips, and patterns that the KPI number alone hides.
- **Render variants:**
  - full — narrative sentence above chart, total sessions callout, area chart with axes
  - simplified — chart only, no narrative sentence
- **Notes:** Core section. Narrative sentence above the chart is mandatory in full variant — the chart never stands alone without a "so what?" line.

---

### 8 · Channel Breakdown
- **Type:** section
- **Required sources:** ga4
- **Optional sources:** none
- **Required fields:** trafficOverview.channelBreakdown or at least two of: organicSessions, paidSessions, directSessions
- **Optional fields:** trafficOverview.referralSessions
- **Business question:** Where is traffic coming from — and which channel is carrying the most weight?
- **Decision use:** Helps decide where to invest more or pull back.
- **Render variants:**
  - full — narrative headline, bar/progress rows per channel with delta arrows and percentages
  - simplified — rows without delta arrows
- **Notes:** Core section. Always paired with Sessions Over Time in the same visual band if possible.

---

### 9 · Search Visibility grid
- **Type:** section
- **Required sources:** gsc
- **Optional sources:** none
- **Required fields:** seoOverview.totalClicks, seoOverview.totalImpressions, seoOverview.avgCtr, seoOverview.avgPosition
- **Optional fields:** none
- **Business question:** Is the site becoming more or less visible in search?
- **Decision use:** Drives decisions on content, meta descriptions, and keyword targeting.
- **Render variants:**
  - full — 2×2 grid of GSC metrics with deltas and narrative headline
  - simplified — 2×2 grid, no narrative headline
- **Notes:** Core section. Only renders if GSC is connected and all four fields exist. If fewer than four fields exist, drops to simplified or does not render.

---

### 10 · Paid Performance section
- **Type:** section
- **Required sources:** google_ads
- **Optional sources:** none
- **Required fields:** paidOverview.totalSpend, paidOverview.totalClicks
- **Optional fields:** paidOverview.roas, paidOverview.avgCpc, paidOverview.conversions
- **Business question:** How is the paid budget performing in detail?
- **Decision use:** Gives enough paid detail to have an informed conversation about campaign efficiency.
- **Render variants:**
  - full — spend, clicks, CPC, ROAS, conversions with deltas and narrative headline
  - simplified — spend and clicks only
- **Notes:** Contextual section. Only renders if Google Ads is connected. Complements the Paid KPI card with more detail.

---

## Source → cards mapping (quick reference)

| Source connected | Cards/sections that unlock |
|---|---|
| GA4 only | Traffic KPI, Organic Reach KPI, Engagement KPI, Sessions chart, Channel breakdown |
| GSC only | Search Clicks KPI, Search Visibility grid |
| Google Ads only | Paid Efficiency KPI, Paid Performance section |
| GA4 + GSC | All of the above combined |
| GA4 + GSC + Ads | Full dashboard — all cards and sections |
| None | AI Summary hero only (if executiveSummary exists), plus nudge |

---

## Nudge component

- **Type:** notice
- **Position:** bottom of the dashboard, after all rendered sections
- **Condition:** at least one core source is missing
- **Copy:** contextual to the highest-value missing source (see nudge priority above)
- **Style:** calm, single line, subtle — not a warning, not a modal, not a banner. An invitation.
- **Never:** show more than one nudge. Never show if all sources connected.

---

## Future: dashboard customisation

This registry is designed to be the single source of truth for what renders. Future versions should allow:
- Toggling cards on/off per user preference
- Reordering sections via drag or config
- Agency-level overrides (show/hide certain cards for specific clients)
- Custom KPI cards mapped to manual data sources

The registry pattern (array of definitions with source gates, field gates, priority, and variants) is already built to support this — adding customisation is a config layer on top, not a rewrite.
