# SUPERIOR

An alpha desktop creature utility: launch the exe, build a clay bot, pair the browser extension, and run local-first page skills.

SUPERIOR is structured as a TypeScript monorepo with a desktop launcher, browser extension, local daemon, and shared contracts.

The current canonical alpha PRD is [docs/superior-alpha-prd.md](docs/superior-alpha-prd.md).

## Workspace

```text
apps/
  desktop/   Tauri v2 + React + Vite SUPERIOR shell
  extension/ Chrome/Edge MV3 popup, page capture, and skill actions
  daemon/    Local Node service with Page Explainer and Article X-Ray
packages/
  shared/    Bot identity and message contracts
```

## Project Taste

Read [docs/operating-principles.md](docs/operating-principles.md) before changing product surfaces. SUPERIOR should show behavior through the clay bot, parts tray, status lights, icons, and browser actions instead of explaining itself with generic app copy.

Read [docs/clean-ui-motion-plan.md](docs/clean-ui-motion-plan.md) before adding app surfaces or animation. The product should combine clay art direction with a clean utility layer: clear status, direct controls, and small physical motion.

For skill surfaces, read [docs/skill-loadout-ui.md](docs/skill-loadout-ui.md). Skills should feel like equipped parts on a JRPG character, not a feature-card grid.

For daemon lifecycle and pairing, read [docs/service-runtime.md](docs/service-runtime.md). The daemon is the real local service boundary.

## Setup

```sh
corepack pnpm install
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local` before using live Page Explainer calls.

For the packaged Windows alpha, keep the same file format but place it in:

```text
%APPDATA%\SUPERIOR\.clawdbot\.env.local
```

## Scripts

```sh
corepack pnpm dev          # daemon + desktop dev loop
corepack pnpm dev:daemon   # daemon only
corepack pnpm dev:desktop  # desktop only
corepack pnpm dev:extension
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm service:install:windows
corepack pnpm service:uninstall:windows
```

The daemon listens on `127.0.0.1:5317` by default. The extension talks only to the local daemon; the OpenAI key stays on the local machine and never reaches the browser extension.
For a service install smoke test while the dev daemon is already running, call `apps\daemon\scripts\install-windows-service.ps1 -Build -TaskName "SUPERIOR Daemon Smoke" -NoStart`, then uninstall that smoke task.

Browser pairing is daemon-owned. Start pairing from `Browser Link` in SUPERIOR, paste that token into the extension popup, then browser skills must send the daemon-issued token with each request.

## First Skills

- `Page Explainer` uses the daemon's OpenAI adapter.
- `Article X-Ray` is local and deterministic: the extension captures readable page blocks, then the daemon cleans and scores them without calling OpenAI.

## Custom Skills

The first custom import path targets JS/TS project folders only. The daemon can scan a folder and return an adapter proposal from package metadata, TypeScript config, source paths, scripts, and test/config signals:

```text
POST /custom-skills/import-proposal
```

The scan does not run scripts and does not equip the skill. A custom part should only enter the loadout after adapter review and a local smoke run.

## Bot Ownership

The Workshop saves the current clay bot identity through the local daemon. Body, pigment, eye, equipped skills, extension action icon, and browser-tab favicon all derive from the same `BotIdentity` contract.

## Extension Icons

Chrome extension manifest icons are generated as PNG files in `apps/extension/public/icons/` and copied into `apps/extension/dist/icons/` during extension builds. Run this when changing the default icon art:

```sh
corepack pnpm --filter @clawdbot/extension icons
```

The installed default icon uses the Gremlin + Moss Green + Pixel Eye identity. The live toolbar icon is updated from the current `BotIdentity` when the extension starts, when popup state refreshes, and when extension-local bot identity storage changes.
