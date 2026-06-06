# SUPERIOR Account OAuth Setup

Status: alpha wiring
Updated: 2026-06-06

SUPERIOR account login is for claiming the spore and syncing safe bot identity. It is not the local robot brain, and it is not the authority for the active local bot.

Cloud may store:

- Supabase user id and email
- handle
- connected providers: `google`, `x`, `discord`
- active bot spore metadata
- starter preset and timestamps

Cloud must not store:

- OpenAI keys
- browser pairing tokens
- page text
- repo workspace state
- browser profile state
- local daemon logs
- Supabase access or refresh tokens

Local machine remains authoritative for:

- active `BotIdentity`
- browser pairing token
- OpenAI key and model settings
- repo workspace records
- recent browser/page proof data

## Runtime Shape

```text
Godot / Windows setup
  -> POST /account/start-oauth { provider: "google" | "x" | "discord" }
  -> Supabase returns authUrl
  -> app opens system browser
  -> Supabase Auth handles Google, X, or Discord
  -> app callback stores session locally
  -> PUT /account/profile
  -> PUT /account/spore with safe BotSpore export only
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

`provider: "discord"` uses Supabase's Discord OAuth provider and can supply avatar metadata for the local account seal.

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

## Discord Provider

In Discord Developer Portal:

- Create an OAuth2 application.
- Add the Supabase callback URL.
- Use the minimum scopes needed for account display: `identify`, `email`, and avatar profile data when available.

In Supabase Dashboard:

- Enable Discord provider.
- Add Discord Client ID and Client Secret.

## Database

`profiles` stores safe account display state:

- `user_id`
- `email`
- `handle`
- `auth_providers`
- `active_spore_id`

`account_connections` stores safe provider presence:

- `user_id`
- `provider`: `google`, `x`, or `discord`
- `provider_user_id`
- `connected_at`

Both tables use RLS with `auth.uid() = user_id`.

## Continuity Proof

The deterministic account fixture proves the alpha boundary without calling live Supabase:

```powershell
corepack pnpm fixture:supabase-account
```

It seeds an isolated local state directory with:

- a signed-in account record with Google, X, and Discord provider metadata
- a separate local active spore
- fake Supabase URL, publishable key, access token, and raw browser pairing token sentinels

It then starts a temporary daemon and verifies:

- `/setup-state` shows the account as signed in while keeping the local spore as the active bot
- `/bot-identity` remains the local authority for the spore
- portable `BotSpore` export excludes account tokens, Supabase config, account email, and raw pairing tokens
- `/mobile-companion` can show account display state without exposing tokens or local file paths
- `POST /account/sign-out` clears account state without deleting the local spore

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
- Supabase Discord provider docs: https://supabase.com/docs/guides/auth/social-login/auth-discord
- Supabase OAuth API docs: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
- Supabase changelog checked: https://supabase.com/changelog.md
