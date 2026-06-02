# SUPERIOR Account OAuth Setup

Status: alpha wiring
Updated: 2026-05-31

SUPERIOR account login is for claiming the spore and syncing safe bot identity. It is not the local robot brain.

Cloud may store:

- Supabase user id and email
- handle
- connected providers: `google`, `x`
- active bot spore metadata
- starter preset and timestamps

Cloud must not store:

- OpenAI keys
- browser pairing tokens
- page text
- repo workspace state
- browser profile state
- local daemon logs

## Runtime Shape

```text
Godot / Windows setup
  -> POST /account/start-oauth { provider: "google" | "x" }
  -> Supabase returns authUrl
  -> app opens system browser
  -> Supabase Auth handles Google or X
  -> app callback stores session locally
  -> PUT /account/profile
  -> PUT /account/spore
```

The Edge Function route added for this slice is:

```http
POST /account/start-oauth
```

Request:

```json
{
  "type": "superior-account-start-oauth",
  "provider": "google",
  "redirectTo": "superior://auth/callback"
}
```

Result:

```json
{
  "type": "superior-account-oauth-started",
  "provider": "google",
  "authUrl": "https://...",
  "redirectTo": "superior://auth/callback",
  "createdAt": "..."
}
```

`provider: "x"` maps to Supabase's current X / Twitter OAuth 2.0 provider. Legacy `twitter` input is normalized to `x` only as a compatibility guard.

## Supabase Project Setup

Set Edge Function secrets:

```powershell
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
supabase secrets set SUPERIOR_AUTH_REDIRECT_URL="superior://auth/callback"
```

For local callback testing before the native protocol handler is finished:

```powershell
supabase secrets set SUPERIOR_AUTH_REDIRECT_URL="http://127.0.0.1:5317/account/oauth/callback"
```

Add every callback target to Supabase Auth redirect allow list.

## Google Provider

In Google Cloud:

- Create an OAuth client.
- Add the Supabase project callback URL from the Supabase Google provider screen.
- Use scopes `openid`, `email`, and `profile`.
- Add production and local origins only when they are actually used.

In Supabase Dashboard:

- Enable Google provider.
- Add Google Client ID and Client Secret.

## X Provider

In X Developer Dashboard:

- Use X / Twitter OAuth 2.0, not legacy Twitter OAuth 1.0a.
- Enable user email request when available.
- Add the Supabase callback URL.
- Add SUPERIOR privacy and terms URLs before public release.

In Supabase Dashboard:

- Enable X provider.
- Add X Client ID and Client Secret.

## Database

`profiles` stores safe account display state:

- `user_id`
- `email`
- `handle`
- `auth_providers`
- `active_spore_id`

`account_connections` stores safe provider presence:

- `user_id`
- `provider`: `google` or `x`
- `provider_user_id`
- `connected_at`

Both tables use RLS with `auth.uid() = user_id`.

## Next Callback Slice

The current patch starts OAuth and records provider state after a Supabase session exists. The next build slice should finish the native callback handler:

- register `superior://auth/callback` on Windows and future mobile clients
- store the Supabase access/refresh session in local secure storage
- call `PUT /account/profile`
- call `PUT /account/spore`
- show the account seal in onboarding without long copy

## References

- Supabase Google provider docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase X / Twitter provider docs: https://supabase.com/docs/guides/auth/social-login/auth-twitter
- Supabase OAuth API docs: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
- Supabase changelog checked: https://supabase.com/changelog.md
