# Stat Contract — Data Source Field Mapping

This document is the authoritative reference for what GA4 and Google Search Console return, how their fields map to the internal `ReportData` schema, and what additional fields are available for future features.

When building the real API connector, this document is the implementation spec. No guesswork — every field name, type, unit, and transformation is defined here.

---

## How the APIs work (brief)

### GA4 Data API (v1beta)

Every query is a `runReport` POST request. You specify which dimensions and metrics you want. The response is a pivot table:

```
dimensionHeaders: [{ name: "date" }, { name: "defaultChannelGroup" }]
metricHeaders:   [{ name: "sessions", type: "TYPE_INTEGER" }]
rows: [
  {
    dimensionValues: [{ value: "2026-03-01" }, { value: "Organic Search" }],
    metricValues:   [{ value: "542" }]
  }
]
```

**Critical:** every metricValue is a string, even numbers. Always parse before using.

One `runReport` call = one query shape. Getting sessions + channel breakdown + time series requires **3 separate requests**. Batch them in parallel.

### GSC Search Analytics API

One POST to `searchanalytics.query`. You choose what to group by (`dimensions`). The response is a flat array of rows with real number fields (not strings):

```json
{
  "rows": [
    {
      "keys": ["2026-03-01"],
      "clicks": 310,
      "impressions": 9400,
      "ctr": 0.033,
      "position": 9.2
    }
  ]
}
```

CTR is `0–1` (not percent). Position is a decimal average.

### OAuth scopes (read-only)

| Source | Scope |
|--------|-------|
| GA4 | `https://www.googleapis.com/auth/analytics.readonly` |
| GSC | `https://www.googleapis.com/auth/webmasters.readonly` |

---

## Part 1 — GA4: full field inventory

This is every metric and dimension useful for a performance report. Grouped by what they tell you.

### Session & user volume

| GA4 field name | Type | Unit | What it is |
|---|---|---|---|
| `sessions` | metric | integer | Total sessions in period |
| `totalUsers` | metric | integer | Unique users (use this, not `users` which is deprecated) |
| `newUsers` | metric | integer | First-time users |
| `activeUsers` | metric | integer | Users with at least one engaged session |
| `returningUsers` | metric | integer | Users who have visited before |

### Engagement

| GA4 field name | Type | Unit | What it is |
|---|---|---|---|
| `engagementRate` | metric | float 0–1 | Fraction of sessions that were engaged (inverse of bounce) |
| `bounceRate` | metric | float 0–1 | Fraction of sessions with no engagement |
| `averageSessionDuration` | metric | float (seconds) | Mean session length |
| `userEngagementDuration` | metric | float (seconds) | Total engaged time across all users |
| `engagedSessions` | metric | integer | Sessions classified as engaged by GA4 |
| `screenPageViews` | metric | integer | Total page views |
| `screenPageViewsPerSession` | metric | float | Pages per session |

### Conversions

| GA4 field name | Type | Unit | What it is |
|---|---|---|---|
| `conversions` | metric | integer | Key event completions (replaces "goals" in UA) |
| `conversionRate` | metric | float 0–1 | Conversions / sessions |
| `eventCount` | metric | integer | Total events fired (all types) |

### Channel / source

| GA4 field name | Type | What it is |
|---|---|---|
| `defaultChannelGroup` | dimension | Predefined channel bucket: `"Organic Search"`, `"Paid Search"`, `"Direct"`, `"Referral"`, `"Social"`, `"Email"`, `"Display"`, `"Video"`, `"Affiliates"`, `"(Other)"` |
| `sessionDefaultChannelGroup` | dimension | Same as above but session-scoped (use this over `firstUser` variants for traffic reports) |
| `sessionSource` | dimension | Specific source: `"google"`, `"facebook"`, `"(direct)"` |
| `sessionMedium` | dimension | Medium: `"organic"`, `"cpc"`, `"referral"`, `"(none)"` |
| `sessionCampaignName` | dimension | UTM campaign name |
| `sessionSourceMedium` | dimension | Combined `source / medium`: `"google / organic"` |

### Time

| GA4 field name | Type | Format | What it is |
|---|---|---|---|
| `date` | dimension | `"YYYYMMDD"` | Day — use for time series |
| `yearMonth` | dimension | `"YYYYMM"` | Month — use for monthly aggregations |
| `week` | dimension | `"YYYYWW"` | ISO week number |

**Note:** GA4 returns date as `"20260301"` (no hyphens). You'll need to parse to `"2026-03-01"` for your schema.

### Pages & content

| GA4 field name | Type | What it is |
|---|---|---|
| `pagePath` | dimension | URL path: `"/kontorsstolar"` |
| `pageTitle` | dimension | `<title>` tag value |
| `landingPage` | dimension | First page of the session |
| `exitPage` | dimension | Last page of the session |

### Geography & device

| GA4 field name | Type | What it is |
|---|---|---|
| `country` | dimension | Full country name: `"Sweden"` |
| `countryId` | dimension | ISO-3166 code: `"SE"` |
| `city` | dimension | City name |
| `deviceCategory` | dimension | `"desktop"`, `"mobile"`, `"tablet"` |
| `operatingSystem` | dimension | `"iOS"`, `"Android"`, `"Windows"` |
| `browser` | dimension | `"Chrome"`, `"Safari"` |

### User type

| GA4 field name | Type | What it is |
|---|---|---|
| `newVsReturning` | dimension | `"new"` or `"returning"` |
| `userAgeBracket` | dimension | `"18-24"`, `"25-34"`, etc. (requires Demographics enabled) |
| `userGender` | dimension | `"male"`, `"female"` (requires Demographics enabled) |

---

## Part 2 — GSC: full field inventory

GSC is simpler — the same four metrics are always returned. Only the grouping dimension changes.

### Metrics (always present in every response row)

| GSC field name | Type | Unit | What it is |
|---|---|---|---|
| `clicks` | number | integer | Clicks from Google Search results |
| `impressions` | number | integer | Times the site appeared in search results |
| `ctr` | number | float 0–1 | `clicks / impressions` — multiply by 100 for display |
| `position` | number | float | Average rank in search results (lower is better) |

### Dimensions (choose what to group by)

| GSC dimension | `keys[]` value | What it gives you |
|---|---|---|
| `date` | `"YYYY-MM-DD"` | Daily breakdown — use for time series |
| `query` | search term string | Top queries driving impressions/clicks |
| `page` | full URL | Per-page performance |
| `country` | ISO-3166-1 alpha-3: `"SWE"` | Country-level breakdown |
| `device` | `"DESKTOP"`, `"MOBILE"`, `"TABLET"` | Device split |
| `searchAppearance` | `"WEB_LIGHT"`, `"AMP_BLUE_LINK"`, etc. | Rich result types |

**Note:** You can combine up to 3 dimensions in one query, e.g. `["date", "query"]` gives daily data per query.

---

## Part 3 — Current field mapping (mock → real)

This is the precise translation from each API response to your `ReportData` schema properties. This is what the mapper functions will implement.

### `trafficOverview` ← GA4

All traffic overview data requires **3 GA4 requests** run in parallel.

---

#### Request A — Summary metrics (no dimension)

```
dateRange: { startDate, endDate }
metrics: [sessions, totalUsers, newUsers, bounceRate, engagementRate, averageSessionDuration, conversions, conversionRate]
```

| ReportData field | GA4 metric | Transform |
|---|---|---|
| `trafficOverview.totalSessions.value` | `sessions` | `parseInt(value)` |
| `trafficOverview.bounceRate.value` | `bounceRate` | `parseFloat(value) * 100` (convert to %) |
| `trafficOverview.avgSessionDuration.value` | `averageSessionDuration` | `parseFloat(value)` (seconds) |
| `conversions.totalConversions.value` | `conversions` | `parseInt(value)` |
| `conversions.conversionRate.value` | `conversionRate` | `parseFloat(value) * 100` (convert to %) |

Run same query for comparison period (previous month) to get `.previousValue` for delta chips.

---

#### Request B — Channel breakdown (dimension: `sessionDefaultChannelGroup`)

```
dateRange: { startDate, endDate }
dimensions: [sessionDefaultChannelGroup]
metrics: [sessions]
```

| ReportData field | GA4 value | Transform |
|---|---|---|
| `trafficOverview.organicSessions.value` | row where `dimensionValue = "Organic Search"` → `sessions` | `parseInt(value)` |
| `trafficOverview.paidSessions.value` | row where `dimensionValue = "Paid Search"` → `sessions` | `parseInt(value)` |
| `trafficOverview.directSessions.value` | row where `dimensionValue = "Direct"` → `sessions` | `parseInt(value)` |
| `trafficOverview.referralSessions.value` | row where `dimensionValue = "Referral"` → `sessions` | `parseInt(value)` |
| `trafficOverview.channelBreakdown[]` | all rows | map each to `{ channel, sessions, share: sessions/total*100 }` |

---

#### Request C — Time series (dimension: `date`)

```
dateRange: { startDate, endDate }
dimensions: [date]
metrics: [sessions]
orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
```

| ReportData field | GA4 value | Transform |
|---|---|---|
| `trafficOverview.timeSeries[]` | all rows | map each to `{ date: "2026-03-01", value: parseInt(sessions) }` — parse date from `"20260301"` → `"2026-03-01"` |

---

### `seoOverview` ← GSC

All SEO data requires **3 GSC requests** run in parallel.

---

#### Request A — Summary totals (no dimension)

```
startDate, endDate
(no dimensions)
```

The response is a single row with aggregated totals.

| ReportData field | GSC field | Transform |
|---|---|---|
| `seoOverview.totalClicks.value` | `clicks` | direct (already integer) |
| `seoOverview.totalImpressions.value` | `impressions` | direct (already integer) |
| `seoOverview.avgCtr.value` | `ctr` | `ctr * 100` (convert to %) |
| `seoOverview.avgPosition.value` | `position` | `Math.round(position * 10) / 10` (1 decimal) |

Run for previous period to get `.previousValue`.

---

#### Request B — Time series (dimension: `date`)

```
startDate, endDate
dimensions: ["date"]
rowLimit: 100
```

| ReportData field | GSC value | Transform |
|---|---|---|
| `seoOverview.timeSeries[]` | all rows | map each to `{ date: keys[0], value: clicks }` |

---

#### Request C — Top queries (dimension: `query`)

```
startDate, endDate
dimensions: ["query"]
rowLimit: 10
orderBy: clicks descending (default)
```

| ReportData field | GSC value | Transform |
|---|---|---|
| `seoOverview.topQueries[]` | all rows | map each to `{ query: keys[0], clicks, impressions, position: Math.round(position*10)/10, ctr: ctr*100 }` |

---

### `kpiSnapshot` ← GA4 + GSC

Built from the summary values already fetched above — no additional requests needed.

| `kpiSnapshot.metrics[]` entry | Source | Fields |
|---|---|---|
| Total Sessions | GA4 Request A | `sessions` |
| Organic Sessions | GA4 Request B | channel row `"Organic Search"` |
| Total Clicks | GSC Request A | `clicks` |
| Avg. Position | GSC Request A | `position` |
| Bounce Rate | GA4 Request A | `bounceRate * 100` |
| Conversions | GA4 Request A | `conversions` |

---

### `topPages` ← GA4 + GSC combined

Requires one additional request each, run in parallel.

#### GA4 — top pages by sessions (dimension: `pagePath`)

```
dimensions: [pagePath, pageTitle]
metrics: [sessions, bounceRate, screenPageViews]
orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
limit: 10
```

#### GSC — top pages by clicks (dimension: `page`)

```
dimensions: ["page"]
rowLimit: 10
```

Merge on URL path. GA4 gives sessions + bounce, GSC gives clicks + impressions + position + CTR per page.

| ReportData field | Source | Transform |
|---|---|---|
| `topPages.pages[].url` | GA4 `pagePath` | direct |
| `topPages.pages[].title` | GA4 `pageTitle` | direct |
| `topPages.pages[].sessions` | GA4 `sessions` | `parseInt` |
| `topPages.pages[].bounceRate` | GA4 `bounceRate` | `* 100` |
| `topPages.pages[].clicks` | GSC `clicks` | direct |
| `topPages.pages[].impressions` | GSC `impressions` | direct |
| `topPages.pages[].position` | GSC `position` | 1 decimal |
| `topPages.pages[].trend` | compare current vs prior sessions | `"up"` / `"down"` / `"flat"` |

---

### `paidOverview` ← Google Ads API

Google Ads is not yet implemented. Documented here for completeness when the time comes.

The Google Ads API (not covered in detail here) exposes: `metrics.cost_micros` (divide by 1,000,000 for currency), `metrics.clicks`, `metrics.impressions`, `metrics.ctr`, `metrics.conversions`, `metrics.cost_per_conversion`, `metrics.value_per_conversion` (ROAS proxy). Requires `https://www.googleapis.com/auth/adwords` scope and a Manager Account link or direct account access.

---

## Part 4 — Available for future features

Fields the APIs expose that we don't use today but could unlock future dashboard cards or report slides.

### GA4 — future opportunities

| Feature idea | Fields needed | Notes |
|---|---|---|
| **New vs returning users split** | dimension `newVsReturning`, metric `totalUsers` | Shows audience loyalty trend |
| **Device breakdown** | dimension `deviceCategory`, metric `sessions` | Desktop / mobile / tablet split |
| **Geography** | dimension `country` or `city`, metric `sessions` | Where traffic comes from — useful for local businesses |
| **Top landing pages** | dimension `landingPage`, metrics `sessions`, `bounceRate` | Which pages bring people in vs which fail them |
| **Top exit pages** | dimension `exitPage`, metric `sessions` | Where people leave — signals friction |
| **Page depth / engagement** | metrics `screenPageViewsPerSession`, `userEngagementDuration` | Quality of visit beyond bounce rate |
| **Campaign performance** | dimension `sessionCampaignName`, metrics `sessions`, `conversions` | Which UTM campaigns drive results |
| **Source/medium breakdown** | dimension `sessionSourceMedium` | Granular traffic attribution beyond channel groups |
| **Conversion by channel** | dimensions `sessionDefaultChannelGroup` + metrics `conversions`, `conversionRate` | Which channels convert, not just drive volume |
| **Hourly traffic** | dimension `hour` (with `date`) | Useful for spotting peak times |

### GSC — future opportunities

| Feature idea | Fields needed | Notes |
|---|---|---|
| **Device split for search** | dimension `device` | Desktop vs mobile CTR and position — often very different |
| **Country breakdown** | dimension `country` | Which markets your content ranks in |
| **Top pages by impressions** | dimension `page`, order by `impressions` | Pages with visibility but low CTR — CTR optimisation candidates |
| **Query × page matrix** | dimensions `["query", "page"]` | Which pages rank for which queries |
| **Cannibalization detection** | dimension `query`, look for multiple pages with same query | Multiple pages competing for same keyword |
| **Branded vs non-branded split** | dimension `query`, filter for brand name | Isolates brand equity from discovery traffic |
| **Rich result performance** | dimension `searchAppearance` | Which rich snippet types drive clicks |
| **Historical trend (12 months)** | extend date range to 12 months | YoY comparison — more honest for seasonal businesses |

---

## Part 5 — Metric label mapping (API name → UI label)

The `label` field on every `Metric` object in `ReportData` is what renders in the UI. This table maps API field names to their Swedish and English display labels.

| API field | English label | Swedish label |
|---|---|---|
| GA4 `sessions` | Total Sessions | Totala sessioner |
| GA4 `totalUsers` | Users | Användare |
| GA4 `newUsers` | New Users | Nya användare |
| GA4 `bounceRate` | Bounce Rate | Avvisningsfrekvens |
| GA4 `engagementRate` | Engagement Rate | Engagemangsgrad |
| GA4 `averageSessionDuration` | Avg. Duration | Genomsn. besökstid |
| GA4 `conversions` | Conversions | Konverteringar |
| GA4 `conversionRate` | Conversion Rate | Konverteringsgrad |
| GA4 channel `"Organic Search"` | Organic Search | Organisk sökning |
| GA4 channel `"Paid Search"` | Paid Search | Betald sökning |
| GA4 channel `"Direct"` | Direct | Direkt |
| GA4 channel `"Referral"` | Referral | Hänvisning |
| GA4 channel `"Social"` | Social | Sociala medier |
| GSC `clicks` | Total Clicks | Totala klick |
| GSC `impressions` | Total Impressions | Totala visningar |
| GSC `ctr` | Avg. CTR | Genomsn. CTR |
| GSC `position` | Avg. Position | Genomsn. position |

The mapper function should accept the current locale and set `label` accordingly when building the `Metric` object.

---

## Part 6 — Trend calculation

Every `Metric` object needs `trend: "up" | "down" | "flat"` and `trendGood: boolean`. These are derived, not returned by the API.

```
trend = currentValue > previousValue ? "up" : currentValue < previousValue ? "down" : "flat"
```

`trendGood` is domain logic — defined per metric:

| Metric | trendGood when up |
|---|---|
| sessions | true |
| organicSessions | true |
| totalClicks | true |
| totalImpressions | true |
| avgCtr | true |
| avgPosition | **false** — lower position number = better rank |
| bounceRate | **false** — lower bounce = better |
| engagementRate | true |
| conversions | true |
| conversionRate | true |
| averageSessionDuration | true |
| totalSpend | false — lower spend for same results = better |
| costPerConversion | false — lower cost = better |
| roas | true |

---

## Part 7 — Query plan (what to fetch per report)

A full report generation requires **8 API requests** (6 GA4 + 2 GSC for current period, same again for comparison period = 16 total). Run all current-period requests in parallel, then all prior-period requests in parallel.

### Current period requests

| # | API | Query | Populates |
|---|---|---|---|
| 1 | GA4 | Summary metrics (no dimension) | `trafficOverview` totals, `conversions` |
| 2 | GA4 | Channel breakdown (`sessionDefaultChannelGroup`) | `trafficOverview.channelBreakdown`, organic/paid/direct/referral sessions |
| 3 | GA4 | Time series (`date`) | `trafficOverview.timeSeries` |
| 4 | GA4 | Top pages (`pagePath`, `pageTitle`) | `topPages` sessions + bounce |
| 5 | GSC | Summary totals (no dimension) | `seoOverview` totals |
| 6 | GSC | Time series (`date`) | `seoOverview.timeSeries` |
| 7 | GSC | Top queries (`query`) | `seoOverview.topQueries` |
| 8 | GSC | Top pages (`page`) | `topPages` clicks + position |

### Prior period requests (same 8 queries, shifted date range)

Used only to compute `.previousValue` on each metric for delta chips. Results are not stored in full — only the summary values are needed.

---

## Part 8 — Error handling and partial data

Not every property will have all data. The mapper must handle:

- **GA4 not connected** — skip all GA4 requests, `trafficOverview` is `undefined`, eligibility engine suppresses affected cards
- **GSC not connected** — skip all GSC requests, `seoOverview` is `undefined`
- **No conversions configured in GA4** — `conversions` metric returns `"0"` — treat as `undefined` to suppress the conversions card rather than showing zero
- **GSC property not verified** — API returns 403 — surface as connection error, not data error
- **Partial date range** — GSC data lags 2–3 days. If `endDate` is within 3 days of today, note `sourceConfidence.gsc.coverage < 1.0`
- **GA4 sampling** — large properties may return sampled data. Check `metadata.samplingMetadatas` in response — if present, note in `sourceConfidence`
