# SUPERIOR Alpha Build Notion Template

Use this as the Notion mirror for active alpha planning. Keep implementation details in repo docs and code; Notion stores decisions, owners, status, and proof checkpoints.

Date this file is useful as a template source: `2026-06-04`.

## Page Stack

### 1) Command Center (one page)

Keep one page named `SUPERIOR Alpha Command Center` with these sections:

- Current milestone (`superior/0.18` or active release number)
- Single-line alpha goal
- Critical risk count (today)
- Weekly commit target
- "Do not skip in alpha": `Contracts`, `Proof`, `Installer`, `Browser loop`, `Identity continuity`
- Active blockers (2 lines max)
- Green/amber/red status for: `Product`, `Engineering`, `QA`, `Packaging`, `Security`

Use this page for short status updates only; move task work to subpages.

### 2) Databases

Create the three DBs below.

#### A. Build Board

Title: `Build Board`

Properties:
- `Status`: Not Started / In Progress / Blocked / Review / Done
- `Lane`: Contract / Engine / Daemon / Desktop / Extension / Windows / Mobile / Asset / QA / Docs / Release
- `Priority`: P0 / P1 / P2
- `Owner`: text
- `Release`: 0.10, 0.15, 0.16, 0.17, 0.18...
- `Proof Required`: checkbox
- `Proof Command`: text
- `Proof Artifact`: URL or file path
- `Last Proof`: date
- `Depends On`: relation to Build Board
- `Caveat`: text
- `Next Action`: text

Recommended views:
- `HOT QUEUE`: P0 + Not Started + In Progress
- `VERIFICATION`: `Proof Required = true`
- `BLOCKED`
- `MOBILE PREP`: `Lane = Mobile` or `Lane = Asset`

Existing workspace note: if the live Notion `Lane` select has not yet been updated with `Mobile` and `Asset`, use `Engine` for the GLB gate and `Contract` for mobile-safe API work until the schema is adjusted.

#### B. Release Gates

Title: `Release Gates`

Properties:
- `Gate`: text (e.g. Host Contract Fixture, Browser Loop)
- `Platform`: Desktop / Extension / Windows Native / Web Hub / Service / Mobile / Asset
- `Ring`: alpha / beta / release
- `Command`: text
- `Report Path`: text
- `Result`: Pass / Fail / N/A
- `Evidence`: URL or artifact path
- `Owner`: text
- `Gate Date`: date
- `Ready`: checkbox
- `Blocker`: text

Recommended views:
- `alpha` only
- `pass vs fail`
- `platform-first`

Existing workspace note: if the live `Platform` select has not yet been updated with `Mobile` and `Asset`, store mobile asset gates under `Engine` and add `Mobile prep` in `Blocker` or `Evidence`.

#### C. Risks & Decisions

Title: `Risks & Decisions`

Properties:
- `Severity`: High / Medium / Low
- `Type`: Product / Privacy / Infra / UX / Data / Packaging / Process
- `Status`: Open / Monitoring / Resolved / Deferred
- `Owner`: text
- `Decided Date`: date
- `Resolved By`: text
- `Decision`: text
- `Reason`: text
- `Fallback`: text
- `Regression Risk`: checkbox

Recommended views:
- `open by severity`
- `resolved this sprint`

## Seed Items (copy into Build Board)

> This is the current alpha execution baseline. Adjust only when the plan changes.

- Build Board
  - Lock primary loop: `SUPERIOR wake -> configure bot -> bind browser -> run skill -> visible bot reaction`
    - Lane: Desktop
    - Priority: P0
    - Status: In Progress
    - Release: 0.18
    - Proof Command: `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build`
    - Next Action: keep this loop reproducible on clean machine
  - Registry onboarding + account seal
    - Lane: Desktop
    - Priority: P0
    - Status: Review
    - Release: 0.18
    - Proof Command: `corepack pnpm --filter @clawdbot/desktop build`
    - Caveat: Google OAuth requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
    - Next Action: run sign-in on a machine with Supabase account config loaded
  - Function kernel + skill runner compatibility (runnable contracts + unknown/missing permission errors)
    - Lane: Daemon
    - Priority: P0
    - Status: In Progress
    - Release: 0.18
    - Proof Command: `corepack pnpm fixture:host-contract`
    - Caveat: keep legacy paths delegating to runner
  - Browser loop proof through controlled profile
    - Lane: Extension
    - Priority: P0
    - Status: In Progress
    - Release: 0.15
    - Proof Command: `corepack pnpm fixture:spore-ownership`
    - Evidence: `.clawdbot/verification/spore-ownership-fixture-*.json`
  - Native Windows install/start/service baseline
    - Lane: Windows
    - Priority: P1
    - Status: In Progress
    - Release: 0.16
    - Proof Command: `corepack pnpm windows:installed-loop-smoke`
    - Caveat: scheduled-task install may require admin policy on this machine
  - Alpha packaging + artifact shelf
    - Lane: Release
    - Priority: P1
    - Status: In Progress
    - Release: 0.18
    - Proof Command: `corepack pnpm --filter @clawdbot/desktop tauri:build`
    - Artifact: `apps/desktop/src-tauri/target/release/bundle/nsis/SUPERIOR_0.2.0_x64-setup.exe`
    - Artifact: `apps/desktop/src-tauri/target/release/bundle/msi/SUPERIOR_0.2.0_x64_en-US.msi`
  - Godot engine runtime confidence and proof recording
    - Lane: Engine
    - Priority: P1
    - Status: In Progress
    - Release: 0.10
    - Proof Command: `corepack pnpm superior:engine-check`
    - Proof Artifact: `.clawdbot/video-proof/*godot-engine*.mp4`
  - Mobile dimensional asset shelf
    - Lane: Asset
    - Priority: P1
    - Status: Review
    - Release: 0.18-prep
    - Proof Command: `corepack pnpm assets:mobile-3d`
    - Proof Artifact: `assets/bots/mobile-3d/generated/mobile-3d-validation-report.json`
    - Caveat: mobile remains companion-only; this is not a phone Workshop
    - Next Action: replace generated contract GLB with reviewed Blender/hand-sculpted asset when runtime target is chosen
  - Mobile-safe companion contract
    - Lane: Mobile
    - Priority: P2
    - Status: Review
    - Release: post-0.18
    - Proof Command: `corepack pnpm fixture:mobile-companion`
    - Proof Artifact: `.clawdbot/verification/mobile-companion-fixture-1780640212004.json`
    - Caveat: no local OpenAI key, pairing token, browser profile, or page text should live in mobile storage
    - Next Action: keep this read-only and add mobile UI only after the Windows alpha loop remains stable

- Release Gates
  - Host Contract Fixture
    - Platform: Service
    - Ring: alpha
    - Command: `corepack pnpm fixture:host-contract`
    - Result: Pass
  - Desktop registry onboarding
    - Platform: Desktop
    - Ring: alpha
    - Command: `corepack pnpm --filter @clawdbot/desktop build`
    - Result: Pass
    - Caveat: OAuth provider buttons appear only when Supabase account config is loaded
  - Chrome/Edge skill fixture
    - Platform: Extension
    - Ring: alpha
    - Command: `corepack pnpm fixture:extension-skill`
    - Report: `.clawdbot/verification/extension-skill-fixture-*.json`
  - Native loop smoke
    - Platform: Windows Native
    - Ring: alpha
    - Command: `corepack pnpm windows:installed-loop-smoke`
    - Report: `.clawdbot/verification/native-loop-fixture-*.json`
  - Spore ownership loop
    - Platform: Service
    - Ring: alpha
    - Command: `corepack pnpm demo:spore-ownership`
    - Report: `.clawdbot/verification/spore-ownership-fixture-*.json`
  - Video production proof
    - Platform: Engine
    - Ring: alpha
    - Command: `corepack pnpm video:godot-engine`
    - Command: `corepack pnpm video:showcase`
    - Command: `corepack pnpm video:proof`
  - Mobile 3D asset validation
    - Platform: Asset
    - Ring: alpha
    - Command: `corepack pnpm assets:mobile-3d`
    - Result: Pass
    - Report: `assets/bots/mobile-3d/generated/mobile-3d-validation-report.json`
    - Evidence: `mobile-clawd-gremlin.glb: 492 triangles, 19064 bytes`
  - Mobile companion privacy fixture
    - Platform: Mobile
    - Ring: alpha
    - Command: `corepack pnpm fixture:mobile-companion`
    - Result: Pass
    - Report: `.clawdbot/verification/mobile-companion-fixture-1780640212004.json`
    - Evidence: sentinel Article X-Ray page text remains in daemon result history but is omitted from `GET /mobile-companion`

- Risks & Decisions
  - `Notion vs repo source`: keep source-of-truth in repo, mirror in Notion only
    - Severity: Medium
    - Type: Process
    - Status: Open
    - Decision: Keep local docs as implementation source (`docs/*`, `packages/*`, fixtures)
  - `Scheduled task install blocked by local policy`
    - Severity: High
    - Type: Infra
    - Status: Open
    - Decision: Keep as explicit release caveat; continue with non-admin fallback
  - `Extension permissions`
    - Severity: High
    - Type: Privacy
    - Status: Open
    - Decision: no local key in extension, pairing token only
  - `Mobile scope creep`
    - Severity: Medium
    - Type: Product
    - Status: Monitoring
    - Decision: mobile is identity, recent proof, device state, and share capture only
    - Reason: cloning the desktop Workshop onto phone creates a cramped settings app and weakens the one-spore identity
    - Fallback: pause mobile UI and keep only the GLB/contract prep gate

## Alpha-Readiness Check Template (run before each build)

- [ ] Build checks pass: `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`
- [ ] Registry onboarding shows account/model/browser/save state without clipping
- [ ] Google OAuth starts from desktop and returns through local daemon callback
- [ ] Host contract fixture runs from the current host
- [ ] Spore ownership loop runs clean on local machine
- [ ] Browser attach works with controlled profile and icon identity sync
- [ ] Latest proof command outputs are referenced in `docs/alpha-verification.md`
- [ ] Release artifact and install path verified
- [ ] Mobile 3D asset gate passes if mobile prep changed: `corepack pnpm assets:mobile-3d`
- [ ] Mobile companion privacy fixture passes if mobile contract prep changed: `corepack pnpm fixture:mobile-companion`
- [ ] Risks register updated (new risks added, old risks resolved/accepted)
- [ ] Privacy caveats still valid (no local keys in extension/web payloads)

## CSV Import Seed (optional)

Paste this into Notion CSV import for a quick start.

```csv
Name,Status,Lane,Priority,Owner,Release,Proof Required,Proof Command,Proof Artifact,Due,Caveat,Next Action
Primary Workshop Loop,In Progress,Desktop,P0,,0.18,TRUE,"corepack pnpm typecheck && corepack pnpm test && corepack pnpm build",,2026-06-10,Keep loop reproducible on clean machine,Verify startup recovery path in fresh profile
Function Kernel and Runner Compatibility,In Progress,Daemon,P0,,0.18,TRUE,corepack pnpm fixture:host-contract,,2026-06-10,Keep legacy endpoints delegating to runner,Add regression test for typed errors
Browser Attachment Loop,In Progress,Extension,P0,,0.15,TRUE,corepack pnpm fixture:extension-skill,.clawdbot/verification/extension-skill-fixture-*.json,2026-06-10,Token recovery paths must remain explicit,Re-run with daemon offline + stale token
Native Loop on Windows,In Progress,Windows,P1,,0.16,TRUE,corepack pnpm windows:installed-loop-smoke,.clawdbot/verification/native-loop-fixture-*.json,2026-06-12,Scheduled-task install may require admin policy,Document install caveats per environment
Artifact Readiness,In Progress,Release,P1,,0.18,TRUE,corepack pnpm windows:msi,.clawdbot/artifacts/windows/SUPERIOR-0.7.0-alpha-win-x64.msi,2026-06-12,Keep release artifacts private until public-safe,Sync artifact links from release notes
Godot Engine Proof,In Progress,Engine,P1,,0.10,TRUE,corepack pnpm superior:engine-check,.clawdbot/video-proof/*godot-engine*.mp4,2026-06-10,Video must use engine recorder,Add newest path to alpha-verification
Mobile Dimensional Asset Shelf,Review,Asset,P1,,0.18-prep,TRUE,corepack pnpm assets:mobile-3d,assets/bots/mobile-3d/generated/mobile-3d-validation-report.json,2026-06-12,Mobile remains companion-only not a phone Workshop,Replace generated contract GLB with reviewed sculpt when runtime target is chosen
Mobile-Safe Companion Contract,Review,Mobile,P2,,post-0.18,TRUE,corepack pnpm fixture:mobile-companion,.clawdbot/verification/mobile-companion-fixture-1780640212004.json,2026-06-19,No local keys pairing tokens browser profiles or page text in mobile storage,Keep read-only and add mobile UI only after Windows alpha loop stays stable
```

## Copy-paste Notion page links

- `docs/build-plan.md`
- `docs/release-ladder.md`
- `docs/alpha-verification.md`
- `docs/platform-release-testing.md`
- `docs/agent-execution-model.md`
- `docs/agent-packets.md`
