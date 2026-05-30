# SUPERIOR Architecture

## Repository Shape

```text
clawdbot/
  package.json
  pnpm-workspace.yaml
  docs/
  apps/
    desktop/
    extension/
    daemon/
  packages/
    shared/
  assets/
    bots/
```

## App Responsibilities

### Desktop

Tauri v2, React, and Vite user interface for `SUPERIOR`: starting work, creating or customizing the bot, viewing status, reviewing output, and changing settings.

### Extension

Chrome/Edge MV3 browser-side surface for page context, user-triggered actions, permission-scoped browser interactions, the extension popup, and the right-click icon. Firefox support should be added later without changing shared message contracts.

### Daemon

Node TypeScript background process for local coordination, identity persistence, deterministic local skills, and model-backed work that should not live in the UI process. Page Explainer uses OpenAI. Article X-Ray is local and deterministic.

### Shared Package

Common types, message contracts, validation helpers, constants, and small utilities used across apps.

The shared package should own the bot identity model so each surface renders the same bot:

- `name`
- `body`
- `color`
- `eye`
- `skills`
- `rules`
- `browserLinkState`
- `iconVariant`

The shared package should also own the `Superior` skill catalog:

- `id`
- `label`
- `source`
- `status`
- `category`
- `attachment`
- `slot`
- `effect`
- `description`
- `gameLoop`

## Communication Model

Define explicit contracts before wiring implementation:

- Desktop to daemon: command requests and task status
- Extension to daemon: browser context and user-triggered actions
- Daemon to clients: health, progress, results, and errors
- Shared identity to every surface: launcher preview, floating buddy, extension popup, and right-click icon

All cross-app messages should be typed in `packages/shared`.

The rule is contracts first, surfaces second. If data crosses a process boundary, it should have a shared type and a recoverable error state.

## Local Runtime

- Package manager: `pnpm`
- Desktop UI dev server: Vite on `127.0.0.1:5173`
- Daemon: loopback HTTP service on `127.0.0.1:5317`
- OpenAI credentials: `.env.local` only, read by the daemon from the repo during development or the user-local SUPERIOR state folder in packaged runs
- Extension permissions: active tab capture, scripting, storage, context menu, and local daemon host access
- Packaged Windows alpha: Tauri resources include bundled Node and the daemon script.
- Packaged browser alpha: Tauri resources include the built MV3 extension folder for Chrome/Edge `Load unpacked`.

The extension never receives `OPENAI_API_KEY`. It sends page context and a pairing token to the local daemon.

Browser pairing is daemon-owned:

- Workshop starts pairing and receives a short token.
- Extension submits the token once.
- Daemon persists paired state locally.
- Browser skill calls must include `X-Clawdbot-Pairing-Token`.
- Daemon rejects invented or stale tokens.

`SUPERIOR Browser` is also daemon-owned. The desktop asks the daemon to start or stop a playpen, but the daemon detects Chrome/Edge, creates the per-repo profile folder, launches the process, serves the robot home page, and completes extension auto-pairing. The extension does not launch browsers and does not own profile state.

Controlled browser profile roots live under:

```text
.clawdbot/browser-profiles/<repo-id>/
```

The runtime must not import cookies or credentials from the user's daily browser profile.

## Asset Model

Bot visuals should be parameterized from the shared identity model where practical. The implementation can begin with CSS or vector-like drawing, but the target look is handmade clay: matte surfaces, soft bevels, uneven silhouettes, subtle dents, and warm shadows.

The right-click icon should be generated from the user's selected body, color, and eye style. Example: `Gremlin + Moss Green + Pixel Eye` renders as a tiny green clay gremlin head.

## Skill Loadout Model

Skills should be modeled like equipment, not feature cards.

Recommended shared fields:

```ts
type SkillSlot = "eye" | "crown" | "side" | "badge" | "charm";
type SkillReadyState = "runnable" | "source-mapped" | "concept";
```

The UI can then render:

- equipped slot
- stowed parts case
- bot attachment position
- typed daemon route, if implemented

This keeps the parts tray honest: if a skill cannot run yet, it should stay out of the user-facing loadout. Source-mapped Synergy/SUP skills are internal roadmap items until their adapter actually runs.

## Custom Skill Import

Later, the desktop app should accept a local folder drop in the parts tray. The daemon scans the folder, asks the model to propose a small adapter, and only promotes the skill into the loadout after a local smoke run succeeds.

First target: JS/TS project folders only.

Adapter proposal fields:

- trigger
- inputs
- output shape
- slot
- clay attachment
- permissions
- safety notes

Current scanner route:

```text
POST /custom-skills/import-proposal
```

The first scanner pass reads structure only: `package.json`, `tsconfig`, JS/TS source paths, scripts, and test/config signals. It does not run commands and does not send file contents to a model.

## Data Boundaries

Document these before adding persistence:

- What stays local
- What can be cached
- What can leave the machine
- What needs user consent
- What should be deleted on reset

## Engineering Rules

- Keep each app independently runnable.
- Share contracts, not UI assumptions.
- Avoid dependencies until a clear implementation need exists.
- Make background behavior observable and stoppable.
- Treat permission and error states as first-class product surfaces.
- Keep visual identity data shared instead of redefined per app.
- Prefer local deterministic skills before model-backed skills.
- Do not add explanatory UI copy when state, motion, or iconography can carry the meaning.
- Add abstraction for compatibility, privacy boundaries, or repeated contracts; do not add it for decoration.

## Debuggability

SUPERIOR should be easy to inspect locally:

- `/health` reports daemon readiness and configuration state.
- `/health` exposes local state and key-file status for the Workshop first-run recovery path.
- `/bot-identity` exposes the current local creature identity.
- `/browser-link/start` and `/browser-link/complete` own extension pairing.
- `/browser-runtime` exposes the active SUPERIOR Browser session.
- `/browser-runtime/start` launches a saved repo workspace in an isolated Chrome/Edge profile.
- `/browser-runtime/stop` stops the tracked browser process.
- `/browser-session/:sessionId/home` serves the robot-owned playpen home page.
- `/browser-session/:sessionId/attach` lets the staged extension auto-pair with a short-lived session token.
- `/recent-results` exposes daemon-owned browser skill history for the Workshop.
- `/skills/repo-reader` classifies public GitHub repos by project surface, peeks into common repo folders, and recommends a local playpen plus learn/spin-up environment.
- `/repo-workspaces` exposes local repo playpen records remembered from successful Repo Reader runs.
- Skill endpoints return typed results or typed errors.
- The extension never receives model credentials.
- Local state lives in explicit files or browser storage, not hidden globals.
