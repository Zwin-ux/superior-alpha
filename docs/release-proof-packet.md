# SUPERIOR 0.19 Release Proof Packet

Last checked: 2026-06-06

Status: alpha proof review ready. Not public beta ready until the current commit is rebuilt into fresh installer and extension artifacts, and live OAuth is manually verified.

## Ship Claim

SUPERIOR currently proves a local Windows alpha loop:

```text
clean install -> account/spore setup -> Chrome hand bind -> skill proof -> reinstall -> same local spore loads
```

The spore remains local ownership state. Supabase account state can sit beside it for Google, X, and Discord connection display, but Supabase does not own the spore and portable spore export stays secret-free.

## Proof Artifacts

| Proof | Current artifact |
| --- | --- |
| Windows MSI | `.clawdbot/artifacts/windows/SUPERIOR-0.7.0-alpha-win-x64.msi` |
| Chrome MV3 ZIP | `.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip` |
| Release-facing Godot MP4 | `.clawdbot/video-proof/2026-06-03T03-04-54-967Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-03T03-04-54-967Z.mp4` |
| Showcase poster | `.clawdbot/video-proof/2026-06-03T03-04-54-967Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-03T03-04-54-967Z.png` |
| Showcase contact sheet | `.clawdbot/video-proof/2026-06-03T03-04-54-967Z-godot-showcase/review-frames/contact-sheet-1s.png` |
| Current Godot engine MP4 | `.clawdbot/video-proof/2026-06-03T04-25-13-066Z-godot-engine/SUPERIOR-godot-engine-2026-06-03T04-25-13-066Z.mp4` |
| Native loop fixture | `.clawdbot/verification/native-loop-fixture-1780757763571.json` |
| Account/spore continuity fixture | `.clawdbot/verification/supabase-account-continuity-fixture-1780757490846.json` |
| Mobile companion fixture | `.clawdbot/verification/mobile-companion-fixture-1780757490460.json` |
| Host contract fixture | `.clawdbot/verification/host-contract-fixture-1780757654529.json` |
| ChatGPT app sprint gate | `.clawdbot/sprint-gates/2026-06-06T14-53-53-359Z-chatgpt-app.json` |
| OS first-boot onboarding sprint gate | `.clawdbot/sprint-gates/2026-06-06T14-46-46-622Z-os-first-boot-onboarding.json` |
| Account/spore sprint gate | `.clawdbot/sprint-gates/2026-06-06T14-32-38-492Z-account-spore-continuity.json` |
| Live OAuth redirect smoke | `.clawdbot/verification/live-oauth-smoke-1780758866547.json` |

## Current Artifact Rebuild

Rebuilt locally on 2026-06-06 from the current alpha workspace.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `.clawdbot/artifacts/windows/SUPERIOR-0.7.0-alpha-win-x64.msi` | `89052800` | `411DBEA3D3ADEC5BC45E065405C1BAEA1D9FE29837197B4136DAEB466CB7195B` |
| `.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip` | `1325565` | `3A874BC741D8F3C5FD44AE2EFDC378B7750922CD888936EA814EEB2AE599C697` |

## Exact Commands

Run these from `C:\Users\mzwin\Documents\Buddy\clawdbot` before cutting an alpha packet:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm superior:engine-check
corepack pnpm video:showcase
corepack pnpm windows:installed-loop-smoke
corepack pnpm fixture:host-contract
corepack pnpm fixture:supabase-account
corepack pnpm fixture:mobile-companion
corepack pnpm smoke:oauth-live
corepack pnpm gate:chatgpt-app
corepack pnpm gate:sprint -- --sprint release-proof --prompt "build current alpha release proof packet" --lane docs --lane root
```

## Caveats

- Windows scheduled-task service registration can report `needs-admin` on this machine unless the smoke is elevated or local policy allows current-user task registration.
- Live Google, X, and Discord OAuth depend on Supabase provider settings plus local `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; do not place provider secrets in docs, fixtures, or spore exports.
- The current live OAuth smoke verifies clean-profile provider availability and first-hop redirects to Google, X, and Discord. It does not complete an interactive user credential flow or store a Supabase session.
- Repeated Repo Reader runs against GitHub can hit unauthenticated rate limits; set `GITHUB_TOKEN` or `GH_TOKEN` locally for repeat validation.
- The mobile and ChatGPT app lanes are read-only companion surfaces. They are not remote Workshop replacements.
- The public GitHub release can lag the local proof packet. Rebuild and republish artifacts before making a public beta claim.

## Release Decision

Alpha proof review can use this packet. The beta-candidate blocker is no longer evidence organization, artifact rebuild, or first-hop provider configuration. The remaining public-release work is full interactive account callback validation and a manual installed-app walkthrough on a clean Windows profile.
