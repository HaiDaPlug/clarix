# Supabase custom auth domain — future migration

**Status: not done. Nothing in this document has been applied.** Written
2026-09-20 so the work can be picked up later without re-deriving it.

## The problem this solves

On the Google sign-in consent screen users currently read:

> Continue to **xhxcxzpjdnzkknnwmwxe.supabase.co**

Google shows the *host of the redirect URI*, and it will not show an app name
instead unless the OAuth client has passed brand verification — which requires
proving ownership of every authorized domain in Search Console. `supabase.co`
cannot be verified by us, so no consent-screen setting removes that string.

For SME clients in Sweden being asked to hand over Analytics access, a random
20-character host at the moment of trust is a conversion problem, not only a
cosmetic one.

**A blog-post workaround claiming this is fixable for free with Google Cloud
config alone does not work for our case.** Its own before/after replaces the
project ref with an app name but keeps the `.supabase.co` host, and it depends
on the verified-domain path we cannot complete. Do not spend time on it.

Scope note: this affects **Clarix sign-in only**. The Google *data* grant
(GA4/GSC) already runs through our own `/api/google/oauth/callback` on
`clarix.se` and shows our domain. See the split table at the top of
[google-oauth-production.md](google-oauth-production.md).

## What it costs

| | |
|---|---|
| Price | **$10/month per project** ($0.0137/hour), billed per project |
| Plan | Requires a paid Supabase plan |
| Permissions | Owner or Admin on the project |
| Constraint | Subdomains only — `auth.clarix.se`, not `clarix.se` |

Proposed subdomain: **`auth.clarix.se`**.

The alternative, if the add-on is ever unwanted: drop Google sign-in and use
email/password for identity (already implemented in `src/app/login/page.tsx`),
keeping Google purely for the data grant. Free, but a worse sign-up experience.

---

## 1. Register the domain

Supabase CLI, against the production project (`xhxcxzpjdnzkknnwmwxe`):

```powershell
Get-Content .env.local | Where-Object { $_ -match '^SUPABASE_' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "env:$k" $v }
npx supabase domains create --project-ref xhxcxzpjdnzkknnwmwxe --custom-hostname auth.clarix.se
```

The command returns the CNAME and TXT records to create. Verify the exact flag
names against `npx supabase domains --help` before running — the CLI surface
has changed between versions and the commands above are from the docs, not from
a run against this project.

## 2. DNS records

At the DNS provider for `clarix.se`, add the CNAME and TXT verification records
exactly as the previous step printed them.

**Verify:** `nslookup -type=CNAME auth.clarix.se` and
`nslookup -type=TXT auth.clarix.se` resolve to the printed values. DNS
propagation can take up to a few hours; do not start §4 until both answer.

## 3. Google Cloud — add the new callback BEFORE activating

**This is the step that breaks sign-in if skipped or reordered.**

Google Cloud Console → APIs & Services → Credentials → the Web application
client whose ID is `GOOGLE_CLIENT_ID` → Authorized redirect URIs.

Add:

```
https://auth.clarix.se/auth/v1/callback
```

**Keep** `https://xhxcxzpjdnzkknnwmwxe.supabase.co/auth/v1/callback` in the list
for now. Both must be present during the transition so sign-ins that are
already in flight when the domain activates do not fail with
`redirect_uri_mismatch`. Remove the old one only at §7.

Google's docs call this the "prepare OAuth integrations" step. It must happen
before activation, not after.

## 4. Activate

```powershell
npx supabase domains activate --project-ref xhxcxzpjdnzkknnwmwxe
```

From this point Supabase advertises `auth.clarix.se` as its callback host.

**Verify:** `https://auth.clarix.se/auth/v1/health` answers over HTTPS with a
valid certificate.

## 5. Point the app at the new host

`NEXT_PUBLIC_SUPABASE_URL` changes from
`https://xhxcxzpjdnzkknnwmwxe.supabase.co` to `https://auth.clarix.se`, in:

- `.env.local` (local dev)
- Vercel → Project → Settings → Environment Variables (all environments)

The value is read in exactly four places, all thin wrappers, so no other code
changes:

- `src/utils/supabase/client.ts`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`
- `src/utils/supabase/admin.ts`

**`NEXT_PUBLIC_` is baked into the client bundle at build time — a redeploy is
required, not just an environment-variable change.** Changing it in Vercel
without redeploying leaves the browser talking to the old host.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` are unchanged;
the project and its keys are the same, only the hostname moved.

## 6. Verify end to end

1. Local: `npm run dev`, sign in with Google at `http://localhost:3000/login`.
   The consent screen must read **Continue to auth.clarix.se**.
2. The dev-server console shows
   `[auth/callback] { outcome: 'exchange_ok', redirectOrigin: 'http://localhost:3000' … }`
   — the browser stayed on localhost.
3. Production: same check on `https://www.clarix.se`.
4. Existing sessions: an already-signed-in user reloads `/dashboard` and stays
   signed in. Session cookies are scoped to the *app* host (`clarix.se`), not
   the Supabase host, so the move should not sign anyone out — confirm rather
   than assume.
5. The Google data grant still works: Integrationer → *Anslut Google* →
   *Ansluten*. It never used this host, so this is a regression check only.

## 7. Clean up

Once §6 passes in production:

- Remove `https://xhxcxzpjdnzkknnwmwxe.supabase.co/auth/v1/callback` from the
  Google OAuth client's redirect URIs.
- Update the two stale references in
  [google-oauth-production.md](google-oauth-production.md): the `<project-ref>`
  callback URI in §3, and step 30 of the manual test script.

## Rollback

Low risk and quick, as long as §3 was done properly:

1. Set `NEXT_PUBLIC_SUPABASE_URL` back to
   `https://xhxcxzpjdnzkknnwmwxe.supabase.co` and **redeploy**.
2. The old callback URI is still on the Google client (that is why §7 comes
   last), so sign-in works immediately.
3. Deactivate the custom domain in Supabase when convenient.

No data migration is involved at any point — this only changes the hostname the
project answers on.

## Unverified assumptions

Flagged rather than silently assumed, to be confirmed at migration time:

- Exact CLI command and flag names (§1) — from Supabase docs, not from a run
  against this project.
- Whether activation invalidates existing sessions (§6.4). Reasoning says no,
  because session cookies are scoped to the app host; it is listed as an
  explicit check because being wrong means signing out every user at once.
- Whether the Supabase dashboard offers this without the CLI. The docs describe
  the CLI path; a dashboard equivalent may exist.

## Sources

- [Supabase — Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)
- [Supabase — Manage Custom Domain usage (pricing)](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains)
- [Supabase — Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
