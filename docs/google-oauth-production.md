# Google OAuth — production checklist

What has to be configured by hand, outside this repository, for the Google
Analytics / Search Console integration to work for real users. Code cannot do
any of this. Work top to bottom; each block says how to verify it.

Two separate systems are involved. Keep them apart in your head:

| Concern | Where it lives | Owns |
|---|---|---|
| **Clarix sign-in** ("who is this?") | Supabase Auth → Google provider | Login with Google, email/password, session cookies |
| **Google data grant** ("may Clarix read GA4/GSC?") | Our own OAuth client via `/api/google/oauth/*` | Refresh token in `google_connections`, refreshed with `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` |

Sign-in no longer requests analytics scopes. The data grant is given (and
renewed) from **Integrationer → Anslut Google**, never by logging in again.

---

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | unchanged |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | unchanged |
| `SUPABASE_SECRET_KEY` | **yes, new** | Supabase → Project Settings → API Keys → *Secret keys* (`sb_secret_…`). The legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted too. Server-only; never `NEXT_PUBLIC_`. |
| `GOOGLE_CLIENT_ID` | yes | The **Web application** OAuth client in Google Cloud (see §3). |
| `GOOGLE_CLIENT_SECRET` | yes | Its secret. Also used to sign the OAuth state cookie. |
| `NEXT_PUBLIC_APP_URL` | **yes in prod** | `https://www.clarix.se` (no trailing slash). Used **only** by the Google data grant (`/api/google/oauth/*`) to pin the redirect URI Google matches byte-for-byte; a start on any other host is first sent to this host. Clarix sign-in never uses it — `/auth/callback` always redirects back to the host the request arrived on, so the session cookies it just wrote are the ones the next request sends. |

Why `SUPABASE_SECRET_KEY` is required: `google_connections` has RLS enabled
and **no** policies, so refresh tokens are unreadable from the browser. Only
the server (service role) can touch that table. Without the key the app runs,
but Integrations shows *Kunde inte kontrollera — servern saknar konfiguration*
and no data loads.

**Verify:** open `/integrations` signed in. The Google card must not say
"servern saknar konfiguration".

## 2. Database migrations

```powershell
Get-Content .env.local | Where-Object { $_ -match '^SUPABASE_' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "env:$k" $v }
npx supabase db push
```

Applies, in order:

- `20260914000000_google_connections_and_clients.sql` — `google_connections`, `clients`, `client_sources`, `set_active_client()`, and a **backfill** that copies every existing `connected_sources` row forward (credential → one `google_connections` row; first GA4 + first GSC → one active workspace; extra rows → their own workspaces). `connected_sources` is left in place as the rollback path.
- `20260914000100_ai_report_cache_client_scope.sql` — `ai_report_cache.client_id`, new unique key, workspace-scoped `claim_ai_insights_generation()`.
- `20260914000200_connected_sources_lockdown.sql` — drops the own-row RLS policy and revokes every grant on `connected_sources` from `anon`/`authenticated`. The legacy plaintext tokens stay for rollback but are **no longer readable from the browser**; only `service_role` can see them. The migration header shows the two statements that restore browser access if the old app version ever has to be redeployed.

**Verify (SQL editor):**

```sql
select user_id, status, status_reason, refresh_token is not null as has_refresh from google_connections;
select user_id, name, is_active from clients order by user_id, created_at;
select client_id, source, property_id from client_sources;
-- lockdown: must return zero rows for both tables
select grantee, table_name, privilege_type from information_schema.role_table_grants
 where table_schema = 'public' and table_name in ('connected_sources', 'google_connections')
   and grantee in ('anon', 'authenticated');
```

Every user who had rows before must have one `google_connections` row and one
`is_active = true` client. A row with `status = reconnect_required` and
`status_reason = missing_refresh_token` is expected for users whose legacy row
never stored a refresh token — they reconnect once, their properties survive.

**Rollback:** the old tables and old code path are intact. Revert the app
deploy; nothing in the new tables is referenced by the old code. Drop the three
new tables only after the new flow has been live and verified.

**Later cleanup (not now):** once verified in production, a follow-up
migration should `drop table public.connected_sources` so stale tokens do not
linger.

## 3. Google Cloud Console — OAuth client

APIs & Services → Credentials → the **Web application** client whose ID is
`GOOGLE_CLIENT_ID`.

- **Authorized redirect URIs** must contain **both**:
  - `https://www.clarix.se/api/google/oauth/callback` — the data grant (new)
  - `https://<project-ref>.supabase.co/auth/v1/callback` — Supabase sign-in (existing)
  - For local dev add `http://localhost:3000/api/google/oauth/callback`.
- **Authorized JavaScript origins:** `https://www.clarix.se` (and `http://localhost:3000` for dev). Not strictly needed for a server-side code flow, but harmless and expected by the verification reviewer.
- The Supabase Google provider (Supabase → Authentication → Providers → Google) must use **this same client ID and secret**. Legacy tokens migrated from `connected_sources` were issued by whatever client Supabase used; they can only be refreshed by that client. If they differ, every migrated user reconnects once — acceptable, but know it in advance.

**Verify:** Integrationer → *Anslut Google* → Google consent → back on
`/integrations` with the green *Ansluten* badge. A `redirect_uri_mismatch`
error page from Google means the first bullet is wrong.

## 4. Google Cloud Console — APIs enabled

APIs & Services → Library. Enable, in the same project as the OAuth client:

- **Google Analytics Admin API** (property discovery, web-stream domain)
- **Google Analytics Data API** (report numbers)
- **Google Search Console API** (sites + search analytics)

**Verify:** after connecting, the GA4 and Search Console pickers list
properties. An empty list with a 502 in the Vercel logs mentioning
`analyticsadmin.googleapis.com` means Admin API is off.

## 5. OAuth consent screen — audience & publishing status (the 7-day problem)

Google Auth Platform → Audience.

- **User type:** External.
- **Publishing status:** move the app **out of *Testing* to *In production***.

While the app is in *Testing*, Google **expires every test user's consent and
refresh token after 7 days** because Clarix requests scopes beyond basic
sign-in. That is exactly the "it keeps expiring weekly" symptom. It is not a
cookie problem and no code can fix it.

Be precise about what publishing does and does not do:

- Publishing **removes the seven-day Testing token lifetime**. Production
  refresh tokens stay valid until revoked by the user, by Google (e.g. a
  password change on some account types, six months of non-use), or by the
  app.
- Publishing does **not** make the sensitive-scope integration
  production-ready on its own. Until brand and data-access verification (§6,
  §8, §9) are approved, Google shows the "unverified app" interstitial on the
  consent screen and caps the app at 100 users who grant sensitive scopes.
- Google may refuse to switch to production until the Branding section is
  complete (§6). Do §6 first if the switch is greyed out.

**Verify:** Audience page shows *In production*. Then connect Google, wait
8+ days, open `/integrations` — the card must still say *Ansluten* (the page
forces a real refresh round-trip on every load, so this is a true check).

## 6. OAuth consent screen — branding

Google Auth Platform → Branding.

- App name: **Clarix**
- User support email: a monitored address on your domain
- App logo: optional, but a logo triggers brand verification review — leave it off until the rest is approved, then add.
- **App home page:** `https://www.clarix.se` — must be publicly reachable, describe what Clarix does, and link the privacy policy.
- **Privacy policy:** `https://www.clarix.se/privacy-policy` — same domain as the home page. The page in this repo was rewritten to match what the code actually stores (report cache, AI summaries, share snapshots, no app-level token encryption, OpenAI/Anthropic as processors). Do not change the implementation without changing the page.
- **Terms of service:** optional; if you add one it must be on the same domain.
- **Authorized domains:** `clarix.se` (Google infers `www.`). Every URL above must sit under an authorized domain.
- **Developer contact:** an address you read.

## 7. Domain ownership

Google Search Console → add `clarix.se` as a **Domain** property and verify via
DNS TXT. The OAuth verification reviewer requires the authorized domain to be
verified in Search Console by the same Google account (or an owner of the
Cloud project).

**Verify:** the domain shows as *Verified* in Search Console, and Google Auth
Platform → Branding accepts `clarix.se` without a warning.

## 8. Data Access (scopes)

Google Auth Platform → Data Access → *Add or remove scopes*. Declare exactly:

- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/webmasters.readonly`

Nothing else. The code requests only these two (`GOOGLE_REQUIRED_SCOPES` in
`src/lib/google/oauth.ts`); declaring more than the code uses fails review,
declaring fewer breaks consent. Both are classified **sensitive** by Google, so
the app needs **sensitive-scope verification** (§9). Neither is *restricted*,
so no third-party security assessment (CASA) is required.

## 9. Verification submission

Google Auth Platform → Verification Center.

Google's flow has an order; the Verification Center will not accept a
sensitive-scope submission before the earlier gates are done. Mirror it:

1. **Branding complete** (§6): app name, support email, home page, privacy
   policy, authorized domain, developer contact. If you add a logo, Google
   runs **brand verification** first and the app cannot show the logo (or
   pass step 4) until that is approved — leaving the logo off avoids a whole
   review cycle.
2. **Domain verified** in Search Console (§7) by an owner of the project.
3. **Audience: In production** (§5) and **Data Access: exactly the two
   scopes declared** (§8).
4. **Sensitive-scope verification** submitted from the Verification Center
   with the material below. This is the step that removes the unverified-app
   interstitial and the 100-user cap.

Only after step 4 is approved should the integration be treated as
production-ready for arbitrary Google accounts. Steps 1–3 are what stop the
seven-day expiry for people who accept the interstitial in the meantime.

What the reviewer needs, all of which the code now satisfies:

- Home page and privacy policy on the authorized domain (§6), privacy policy accurately describing storage (done).
- A **demo video** (YouTube, unlisted is fine, English narration or captions) showing: sign in → Integrationer → *Anslut Google* → the consent screen **with the app name and both scopes visible** → picking a GA4 property and a Search Console site → the dashboard/report rendering that data. Show the URL bar so the domain is visible.
- Scope justification, one paragraph each. Suggested text:
  - *analytics.readonly*: "Clarix reads aggregated Google Analytics 4 metrics (sessions, channels, top pages, conversions) for the properties the user selects, to render their own dashboard and periodic report. Read-only; nothing is written."
  - *webmasters.readonly*: "Clarix reads aggregated Search Console metrics (clicks, impressions, CTR, position, top queries) for the sites the user selects, to render search visibility in the same dashboard and report. Read-only."
- Confirm compliance with the Limited Use requirements (the privacy policy contains the required disclosure).

**Can this be submitted now?** The code side is ready: scopes are minimal
and read-only, the privacy policy describes the real storage, the redirect
URI and flow are fixed. Submission itself is gated by the order above — the
Verification Center only opens the sensitive-scope form once Branding is
complete, the domain is verified, and the app is published. Typical review
time is a few days to a few weeks. Until approval the consent screen shows
the "unverified app" interstitial and the 100-user cap applies, but every
grant given through it is a normal production grant with no seven-day
expiry.

## 10. Supabase — Auth settings (sign-in only)

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://www.clarix.se`
- **Redirect URLs:** one entry per host people can sign in from, because
  `/login` sends `redirectTo: <current origin>/auth/callback` and the
  callback keeps the browser on that same origin:
  - `https://www.clarix.se/**`
  - `http://localhost:3000/**`
  - `https://*-<vercel-team>.vercel.app/**` if you sign in on preview deploys
  - `https://clarix.se/**` only if the apex ever serves the app instead of redirecting to www.
  A host missing here makes Supabase fall back to the Site URL, which moves
  the browser to www with no session cookies for it — the exact "I signed
  in and I'm still signed out" symptom.

**Verify:** sign in on each host you listed and confirm the URL bar stays on
that host through `/auth/callback` → `/dashboard`. The Vercel function log
line `[auth/callback] { outcome: "exchange_ok", requestOrigin, redirectOrigin … }`
must show the same origin in both fields.

Supabase → Authentication → Providers → Google: enabled, client ID/secret as in
§3. No analytics scopes are configured or requested here any more.

## 11. Separate test project (recommended)

Create a second Google Cloud project ("Clarix Dev") with its own OAuth client,
in *Testing* with your team as test users, and use its ID/secret in
`.env.local`. The 7-day expiry is fine for development and it keeps the
production consent screen's history clean. Point its redirect URI at
`http://localhost:3000/api/google/oauth/callback`.

## 12. How to confirm production is no longer in Testing mode

1. Google Auth Platform → Audience: reads **In production**.
2. Sign in with a Google account that is **not** in the (now irrelevant) test-user list and connect Google — no "access blocked: app not verified for test users" error.
3. `select connected_at, last_refreshed_at, status from google_connections;` — `last_refreshed_at` keeps advancing past 7 days after `connected_at` with `status = active`.
4. Vercel logs contain no `token endpoint 400 invalid_grant` lines for that user.

---

## Manual end-to-end test script

Run after deploying. Each step names the state the UI must show.

**A. Sign-in (identity only)**
1. Signed-out browser → `/dashboard` → lands on `/login` once (no loop).
2. *Fortsätt med Google* → consent shows **only** basic profile, no analytics scopes → lands on `/integrations` (new user) or `/dashboard` (has a workspace). One sign-in, no second prompt.
3. Reload `/auth/callback?code=<old>` (press back then forward) → still signed in, lands on the app, not on `/login?error=…`.
4. Signed in → visit `/login` → bounced to `/dashboard`.
5. Sidebar → sign-out icon → lands on `/login`; `/dashboard` now redirects to `/login`.
6. Email/password: sign up, confirm, sign in → `/dashboard` shows the sample banner; `/integrations` Google card says *Inte ansluten*.

**B. Google data grant**
7. `/integrations` → *Anslut Google* → consent shows Clarix + both scopes → back on `/integrations` with the green notice and the card *Ansluten* — no manual refresh needed.
8. GA4 card → *Anslut* → picker lists properties → pick one → card shows *Vald för <workspace>* and *Ansluten*; a workspace was created silently (visible under Kunder).
9. GSC card → same. Progress bar reads 2 av 2.
10. Untick one scope on the consent screen (connect again) → notice explains the missing scope, card says *Behöver förnyas*, properties still listed on the cards.
11. Google account → Security → Third-party access → remove Clarix. Reload `/integrations` → card says *Behöver förnyas* (this page verifies against Google on load). `/dashboard` shows the reconnect banner, no numbers. `/report` shows *Google-åtkomsten behöver förnyas*.
12. *Anslut Google igen* → consent → back → *Ansluten*, both properties still selected, dashboard numbers return. No property was re-picked.
13. *Koppla från Google* → card *Inte ansluten*; Kunder still lists the workspace with its properties; connect again → everything works without re-selecting.

**C. Workspaces & isolation**
14. Kunder → *Ny kund* → name, pick a **different** GA4 property → save with *Gör till aktiv* unchecked. Two cards, first still *Aktiv*.
15. *Gör aktiv* on the second → badge moves instantly. `/dashboard` header says *Välkommen, <second>* and every KPI matches that property in GA4 directly. `/report` cover shows the second name/domain.
16. Refresh the browser and open the same account in another browser → the second workspace is still active in both.
17. Switch back to the first on Kunder, open `/report` → the deck never flashes the second customer's numbers before the first's.
18. **Cross-device:** keep `/dashboard` open on device A showing workspace 1. On device B switch to workspace 2. Change the date range on device A → device A keeps showing workspace 1 (header and numbers agree); it only changes after A reloads. Repeat with `/report` open on A.
19. **In-flight switch:** on `/report`, change the date range and, while the spinner is showing, switch workspace in another tab. The deck finishes with the workspace it started with, name and numbers from the same customer. Reload → the new workspace.
20. Edit a workspace → change its GA4 property → no Google consent is asked; `/dashboard` reflects the new property.
21. Remove the GA4 property from a workspace (Integrationer → Hantera → Ta bort) → the Google card stays *Ansluten*.
22. Delete the active workspace → the remaining one becomes active automatically; a `/dashboard` tab still open on the deleted one falls back to the "connect sources" state on its next request, never to another customer.
23. `/data` explorer only offers properties assigned to workspaces; posting a foreign property id to `/api/ga4-explorer` returns 403. Posting another user's or a random `clientId` to `/api/report-data`, `/api/generate-insights` or `/api/reports/share` returns 404, never data.
24. Share a report → open the link in an incognito window → it shows exactly the shared workspace's name and numbers.

**D. Sessions**
25. Delete the `sb-*` cookies while on `/dashboard`, click a nav link → one redirect to `/login`, no loop; sign in → `/dashboard`.
26. Wait for the Supabase access token to expire (1 h) with a tab open, then navigate → still signed in (refresh token used), no re-login.
27. Sign out → sign in as the other test account → nothing from the first account (workspaces, Google card) is visible.
28. Sign in with Google on `www.clarix.se`, on a preview host, and on localhost: each time the browser stays on the host it started on all the way to `/dashboard`, and the response header `x-clarix-auth` on the dashboard request reads `authenticated`.
29. Email/password sign-in → the page does a full navigation to `/dashboard` and the very next request is recognised (no bounce back to `/login`).
30. Block `https://<project-ref>.supabase.co` in the browser's devtools (network request blocking) and reload `/dashboard` → the page loads without redirecting to `/login`; API calls answer 503 `auth_unavailable`; unblock and reload → signed in, no re-login needed.

**E. Failure honesty**
31. Temporarily set `GOOGLE_CLIENT_SECRET` to garbage on a preview deploy → `/integrations` says *Kunde inte kontrollera* / server config, **not** *Behöver förnyas*; `google_connections.status` stays `active`. Restore the secret → *Ansluten* without reconnecting.
32. Vercel logs never contain an access or refresh token value (search for `ya29.` and `1//`).
33. In the SQL editor as `authenticated` (e.g. `set role authenticated;` in a transaction, then `select * from connected_sources;` / `google_connections`) → permission denied on both.
