# SUPERIOR Alpha PRD

Status: alpha executable built
Updated: 2026-05-30
Source: local-first worktree, Superior OS, SUP Playable Core, Synergy
Verification: [alpha-verification.md](alpha-verification.md)
User cases: [user-cases-player-base.md](user-cases-player-base.md)
Repo playpen plan: [repo-playpen-continuation-plan.md](repo-playpen-continuation-plan.md)
Account OAuth setup: [account-oauth-setup.md](account-oauth-setup.md)

## Product Sentence

SUPERIOR is a creature-based way to install and operate AI systems: hatch one spore, equip a skill, connect Chrome, and watch the same bot act across the machine.

## Current Focus

`0.15` is the spore ownership demo. Stop widening until this loop is undeniable:

```text
SUPERIOR boot -> register -> hatch Clawd -> choose Gremlin / Moss / Pixel -> equip Article X-Ray -> connect Chrome -> extension icon becomes Clawd -> run skill -> Clawd reacts
```

Everything else is secondary until this loop works as a contract fixture and a critique-worthy MP4.

## Alpha Promise

The alpha is not a dashboard. It is an exe that spins up a powerful local buddy.

The first launch should feel like:

```text
open SUPERIOR -> bot wakes up -> daemon checks in -> browser pairs -> page skill runs -> result lands -> bot wears the part
```

Current alpha evidence:

- Windows installer and MSI build successfully.
- Built exe starts the local daemon when port `5317` is free.
- Portable smoke copied the release exe and resources to a temp folder, stripped normal Node from `PATH`, and started bundled `resources/node/node.exe` with `resources/daemon/server.mjs`.
- Packaged alpha stages the MV3 extension folder and the Browser Link tray can open it.
- The portable daemon reported `missing_config` when no `.env.local` was present, which is the expected clean-machine state.
- A packaged smoke with a temp local state folder and `.env.local` reports daemon health `ready`.
- Daemon health exposes the active local state directory, key file path, key-file presence, and OpenAI config source.
- Successful browser skills are recorded in daemon-owned recent results and shown in the Workshop Continue tray.
- Repo Reader classifies public GitHub repos by project surface, peeks into common folders, and recommends a local playpen plus learn/spin-up setup paths.
- Repo Reader saves local repo workspace records for successful reads and can use a local `GITHUB_TOKEN` or `GH_TOKEN` when present.
- Daemon health, pairing, Article X-Ray, Page Explainer, and custom JS/TS import proposal have been smoke tested.
- The desktop bot eyes/lens follow the cursor and reset when focus leaves.
- Workshop Options shows the key-file state and an `Open Folder` recovery action.
- Scheduled-task service install is code-ready but blocked by this Windows account policy; see verification notes.

## Name Rule

User-facing product name is `SUPERIOR`.

Allowed internal names during alpha:

- `@clawdbot/*` package names
- `CLAWDBOT_*` env vars
- existing local state folder names
- implementation notes that explain migration history

Blocked user-facing names:

- Clawdbot
- Clawdbot Workshop
- Clawbot

## Audience

The first alpha user is a power user who wants a strange, useful desktop creature that can read the internet, inspect pages, and eventually import local JS/TS tools as skills.

They should not need to understand Tauri, Node, OpenAI keys, or extension internals to feel the product working.

## Product Shape

Desktop composition:

- Left: old PC launcher menu.
- Center: clay workbench creature.
- Right: parts tray, loadout, service state, pairing state.
- Bottom: compact runtime status.

Extension composition:

- Tiny clay head with the same body, pigment, eye, and equipped pieces.
- Pairing panel when unpaired.
- Two alpha skills when paired: `Explain Page` and `Article X-Ray`.
- Short status pill.

Workshop service composition:

- `Repo Reader` accepts a GitHub repo link.
- It identifies whether the project presents as an exe, extension, web app, service, CLI, library, docs repo, or monorepo.
- It recommends whether SUPERIOR should learn it first, spin it up, or do both.
- It picks the first playpen: SUPERIOR Browser, Extension Lab, Loopback Bench, Desktop Bench, Terminal Cage, Package Shelf, Docs Table, or Repo Map.
- It returns setup commands, access needs, and risk notes as a short parts-tray result.
- It remembers successful reads as local repo workspace records under `.clawdbot/repos/`.

No marketing homepage. No generic AI app framing.

## Source DNA

### Superior / SUP

Borrow:

- arcade clarity
- readable `state + number + action`
- short command copy
- feedback-first loop
- optional bot power, not bot-first onboarding
- run-back energy after a result

Translate into SUPERIOR:

- `READY`, `UNPAIRED`, `MISSING KEY`, `OFFLINE`
- `Pair`, `Explain Page`, `Article X-Ray`, `Scan Folder`
- skill parts that visibly attach
- result feedback that invites another browser action

### Synergy

Borrow:

- constrained assistant behavior
- approved-route mindset
- no invented URLs
- deterministic fallback skills
- reviewable generated proposals

Translate into SUPERIOR:

- Page Explainer only explains supplied page content.
- Article X-Ray is deterministic and local.
- Custom skill import scans JS/TS metadata first; it does not run or equip anything until a smoke run passes.

### Claymation Identity

Keep:

- matte clay body
- soft dents and uneven silhouettes
- chunky pressed buttons
- warm shadows
- skill parts that pop onto the bot
- tiny extension icon that matches the built bot

## Alpha Requirements

### R1. Windows Exe Starts The Product

The alpha must produce a Windows desktop executable through Tauri.

Acceptance:

- `corepack pnpm --filter @clawdbot/desktop tauri:build` creates a Windows bundle.
- The app opens as `SUPERIOR`.
- The first screen shows the creature, launcher menu, local status, and browser pairing state.
- The app can be installed or launched without manually opening the Vite dev server.
- The desktop shell attempts to start the daemon automatically through the native Tauri layer.

### R2. Local Daemon Is A Real Runtime Boundary

The daemon owns OpenAI access, local identity, browser pairing, deterministic skills, and custom skill scanning.

Acceptance:

- `/health` reports ready, missing-config, and browser link state.
- `/health` reports the local state directory and key file status.
- `/bot-identity` returns the live body, color, eye, skill, and browser state.
- `/browser-link/start`, `/browser-link/complete`, and `/browser-link/reset` work with a token.
- `/recent-results` returns the latest completed browser skill runs for the Workshop.
- OpenAI key stays in a local `.env.local`; the extension never receives it.
- Packaged alpha daemon startup uses bundled Node first, then falls back to `SUPERIOR_NODE_PATH` or system Node.

### R3. Browser Extension Pairing Feels Owned

The extension must look like the same bot and fail recoverably.

Acceptance:

- MV3 build includes generated icons.
- Packaged desktop carries the extension folder for Chrome/Edge `Load unpacked`.
- Popup shows the same bot name, body, pigment, eye, and equipped skill pieces.
- Invalid or stale tokens clear local pairing and ask the user to pair again.
- Unpaired state blocks skill actions without losing the bot identity.

### R4. First Skills Work

The alpha ships three skills.

`Page Explainer`:

- model-backed
- daemon-owned
- uses supplied page text only
- returns structured summary and key points

`Article X-Ray`:

- deterministic local skill
- extracts readable article/page text
- returns clean text, stats, quality, and warnings

`Repo Reader`:

- deterministic GitHub project classifier
- reads public repo metadata, root files, README, package signals, and common app/package folders
- uses local GitHub token env vars when present
- identifies project presentation: exe, extension, web app, service, CLI, library, docs, or monorepo
- recommends learn/spin-up/both environment setup
- picks a local playpen so the robot knows whether to use its browser, extension lab, service bench, desktop bench, terminal cage, package shelf, docs table, or repo map

Acceptance:

- Browser skills reject unpaired calls.
- Browser skills reject empty page text with recoverable messages.
- Successful skill runs land in the Workshop recent results tray.
- Page Explainer reports missing OpenAI key clearly.
- The Workshop shows where the local key file belongs.
- Article X-Ray works without OpenAI.
- Repo Reader works without OpenAI and does not clone or run the repo.
- Repo Reader shows playpen, robot loop, access needs, setup steps, and risk notes.
- Successful Repo Reader runs create a local repo workspace record but do not clone or run commands.

### R5. Custom Skill Import Starts As A Proposal

The first import target is JS/TS folders.

Acceptance:

- Desktop has a JS/TS folder path input and Tauri folder drop target in the skill tray.
- Daemon scans package metadata and source paths.
- The result proposes name, slot, effect, scripts, entrypoints, attachment, and warnings.
- Imported skills stay hidden until a local adapter smoke run passes.

### R6. SUPERIOR Feels Like A Game Utility

The UI should teach through feedback.

Acceptance:

- Buttons press like clay slabs.
- The desktop bot eyes/lens subtly follow the cursor like a small toy creature.
- Menu states change the right tray instead of stacking every setting at once.
- Equipped skills attach to the bot in desktop, popup, and icon rendering.
- Copy is short and tool-like.
- No SaaS hero layout, AI dashboard language, or feature-card grid.

## Alpha Out Of Scope

- hosted cloud runtime
- billing
- multi-user accounts
- real-money trading
- public skill marketplace
- Firefox packaging
- automatic execution of imported folders
- full system tray lifecycle polish

## Exe Packaging Plan

1. Keep dev loop: `corepack pnpm dev:daemon` and `corepack pnpm dev:desktop`.
2. Make Tauri app title, product name, and extension visible copy say `SUPERIOR`.
3. Confirm Tauri build prerequisites on Windows.
4. Run `corepack pnpm --filter @clawdbot/desktop tauri:build`.
5. Record the generated installer/exe path.
6. Smoke launch the exe.
7. Confirm daemon health, browser pair, extension popup, and the alpha skill set.

## Quality Gate

Run before calling alpha presentable:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @clawdbot/desktop tauri:build
```

Rendered QA:

- Desktop 1280x720
- Desktop narrow 375x812
- Extension popup 390x700
- Pairing flow
- Missing key state
- Empty page state
- Stale token reset

## Alpha Demo Script

1. Launch `SUPERIOR.exe`.
2. Show the clay bot on the workbench.
3. Change body, pigment, and eye.
4. Open Skills and show equipped slots.
5. Start browser pairing.
6. Pair the extension.
7. Run Article X-Ray on a readable page.
8. Run Page Explainer with OpenAI configured.
9. Paste a GitHub repo link into Repo Reader and show playpen, robot loop, presentation, and setup.
10. Reset pairing and show actions lock.
11. Scan a JS/TS folder and show proposal-only import.

## Open Questions

- Should the alpha window title be `SUPERIOR` or `SUPERIOR Workshop`?
- Should the clay creature have a proper name separate from the product, or should the bot itself also be called `Superior`?
