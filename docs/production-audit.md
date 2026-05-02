# Production Readiness Audit — 2026-05-02

Full audit of error paths, empty states, race conditions, and UX gaps across the data pipeline. Each item has a checkbox — check it off when fixed. Don't delete entries, they're useful for sharpening passes later.

---

## Priority fix list

### Auth & session

- [x] **A1 — Sentinel row save fails silently** `auth/callback/route.ts:23`
  After Google OAuth, the app saves your access token to the DB before redirecting. If that save fails (network, constraint), user lands on Integrations but every "Connect" click says "Google access is missing" with no explanation.

- [x] **A2 — Race condition on sentinel row read** `api/google/connect/route.ts:38–57`
  If the DB write from A1 is slow, the connect route can try to read the sentinel row before it exists. Returns a missing token error even though auth succeeded.

- [x] **A3 — Wrong error type on expired token** `api/google/properties/route.ts:54–70`
  When the Google token expires and properties fail to load, the catch block returns `type: "data"` instead of `type: "auth"`. The "Sign in again" button never appears. User is stuck with no recovery path.

- [x] **A4 — No mid-session expiry detection** `proxy.ts`
  Reviewed — `supabase.auth.getUser()` in the proxy automatically refreshes the Supabase session on every request via the SSR client. API 401s surface via the expired sources banner on the dashboard. No additional handling needed.

---

### Data fetching & API errors

- [x] **D1 — No retry on transient Google API errors** `lib/google/api-client.ts`
  A network glitch or Google rate limit on any of the 4 parallel requests causes `Promise.all` to reject immediately. Dashboard silently falls back to mock data with no indication anything went wrong.

- [x] **D2 — Partial failure looks like full data** `app/(app)/dashboard/page.tsx`
  If GA4 succeeds but GSC fails (or vice versa), real data from one source is merged with mock data from the other. No indication which numbers are real. User can't trust what they're seeing.

- [x] **D3 — Token refresh failure is silent** `lib/google/token-refresh.ts:23`
  When the app tries to silently renew the Google token and it fails (revoked, expired), `refreshGoogleToken()` returns `null` with no error, no banner, no redirect. The next data fetch just fails with 401.

- [x] **D4 — Connections fetch can crash the page** `app/(app)/integrations/page.tsx:181`
  No try/catch around the `fetch("/api/google/connections")` call. A network timeout causes an unhandled promise rejection that breaks the component silently.

- [x] **D5 — No validation of Google API response shape** `lib/google/report-mappers.ts`
  If Google changes their response format or returns fewer fields than expected, optional chaining masks the failure. Returns `undefined` values and collapses to mock fallback silently.

---

### Empty states & zero data

- [x] **E1 — Blank chart with no message** `app/(app)/dashboard/page.tsx:706` — **⟳ Needs discussion**
  New GA4 property with no sessions yet — `timeSeries` is an empty array. Recharts renders blank axes and nothing else. Looks broken. Fixed with a text message, but what's the right tone and visual treatment for "no data yet"?

- [x] **E2 — Missing metric silently disappears** `app/(app)/dashboard/page.tsx:370` — **⟳ Needs discussion**
  If a metric comes back undefined (e.g. no engagement data), the card returns `null` and vanishes from the grid with no explanation. Fixed with a dimmed placeholder — but what should a missing metric card look like? Is it an opportunity to nudge ("Connect Ads to unlock this")?

- [x] **E3 — No recovery path when no properties found** `app/(app)/integrations/page.tsx:1063` — **⟳ Needs discussion**
  Fixed with clearer copy. But the broader question: should this be a dead end at all, or should the product guide the user to set up a GA4 property if they don't have one?

---

### Race conditions & async

- [x] **R1 — Property connect race condition** `app/(app)/integrations/page.tsx:1091`
  If user clicks Property A then Property B before A finishes, both requests fire. Last response wins — user may end up connected to the wrong property. All property buttons should be disabled while any connect is pending.

- [x] **R2 — No request cancellation on unmount** `app/(app)/dashboard/page.tsx:1211`
  No `AbortController` on API fetches. If user navigates away mid-load, requests complete in the background. On remount, the full fetch runs again — double network cost.

- [x] **R3 — Stale properties cache after connect** `app/(app)/integrations/page.tsx:208`
  After connecting GA4, the property list doesn't re-fetch. Effect deps don't cover server-side state changes. Stale property options can persist.

---

### UI/UX gaps

- [ ] **U1 — No skeleton loading on dashboard** `app/(app)/dashboard/page.tsx` — **⟳ Needs discussion**  (deferred — UX pass)
  Dashboard takes 3–5 seconds on first load. Shows a loading banner but blank space where cards should be. Feels broken. Skeleton cards would communicate that content is coming. But what should the skeleton look like — generic grey blocks, or something more editorial?

- [x] **U2 — Stale reconnect banner after auth** `app/(app)/dashboard/page.tsx`
  Reviewed — the dashboard effect re-runs on mount, resets `expiredSources` to `[]` at the end of every fetch. Banner auto-clears naturally on return from login flow.

- [x] **U3 — Error banner flickers on retry** `app/(app)/integrations/page.tsx:248`
  Reviewed — React 18+ batches `setError(null)` and `setError(newError)` in the same flush when both happen synchronously. No flicker in practice.

---

### Security

- [x] **S1 — Token refresh lacks per-user validation** `lib/google/token-refresh.ts:16`
  Reviewed — `refreshGoogleToken` is only called from `getValidAccessToken`, which fetches the token from the DB keyed on `userId + source + propertyId`. Tokens never come from user input — no injection path exists.

- [x] **S2 — Parallel connect writes race** `api/google/connect/route.ts:75`
  Reviewed — Postgres upsert with `onConflict` serializes concurrent writes atomically at the DB level. Last write wins is correct behaviour for a settings-style row.

---

## Notes for sharpening later

- **D5** — once real data is flowing steadily, add Zod validation on Google API responses so shape changes surface as explicit errors rather than silent fallbacks.
- **E2** ⟳ — placeholder cards for missing metrics are a design opportunity: "Connect Ads to unlock this metric" style nudge. How aggressive should the nudge be?
- **U1** ⟳ — skeleton cards are both a bug fix and a design upgrade. Generic grey blocks vs. something with more character — worth discussing.
- **D2** ⟳ — partial failure (one source real, one mock) is fixed at the data level, but what should the user *see* when only half their data loaded? Silent fallback to mock, or a banner explaining which source is showing estimated data?
- **E1** ⟳ — "no data yet" on a new account is a first-run moment. Could be an opportunity for onboarding copy rather than just an error state.
