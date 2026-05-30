# SUPERIOR Service Runtime

## Purpose

The daemon is the real local service boundary for SUPERIOR.

It owns:

- OpenAI credentials
- bot identity persistence
- browser pairing state
- local deterministic skills
- custom skill import scanning
- model-backed skill adapters

The extension should never receive `OPENAI_API_KEY`. The browser only sends page context and a daemon-issued pairing token.

The desktop app now attempts to start the daemon on launch. It first checks loopback port `5317`; if nothing is listening, the native Tauri shell starts the daemon. During development it uses `apps/daemon/dist/server.js`; packaged builds include `resources/node/node.exe` and `resources/daemon/server.mjs`.

The packaged desktop app also carries the Chrome/Edge MV3 extension folder at `resources/extension`. The Workshop Browser Link tray opens that folder so alpha users can load it through Chrome's `Load unpacked` flow without hunting through the repo.

## Local Routes

```text
GET  /health
GET  /bot-identity
PUT  /bot-identity
POST /browser-link/start
POST /browser-link/complete
POST /browser-link/reset
GET  /browser-runtime
POST /browser-runtime/start
POST /browser-runtime/stop
GET  /browser-session/:sessionId/home
POST /browser-session/:sessionId/attach
POST /explain
POST /skills/article-xray
POST /skills/repo-reader
POST /custom-skills/import-proposal
GET  /recent-results
GET  /repo-workspaces
```

`/health` includes:

- daemon readiness
- browser link state
- local state directory
- expected key file path
- key file presence
- OpenAI config source

`/recent-results` returns compact local history rows for successful browser skills. It stores only the last eight result summaries in the local state folder:

```text
recent-results.json
```

`/skills/repo-reader` accepts a public GitHub repo link from the Workshop. It classifies how the project presents, peeks into common repo folders, detects stack signals, picks a local playpen, recommends a learn/spin-up path, and records a compact recent result.

`/repo-workspaces` returns local repo playpen records remembered from successful Repo Reader runs. These records are planning state only: repo URL, detected surfaces, playpen, setup path, risks, notes, and optional future local path. They do not mean SUPERIOR cloned the repo or ran commands.

Repo workspace records live under:

```text
repos/repo-workspaces.json
```

`/browser-runtime` reports the active daemon-owned `SUPERIOR Browser` session, if any.

`/browser-runtime/start` accepts a saved repo workspace id plus the active bot identity. It launches Chrome first, Edge as fallback, using a per-repo profile under:

```text
browser-profiles/<repo-id>/
```

The daemon starts the browser with a remote debugging port, the staged MV3 extension, no first-run screens, the robot home page, and the GitHub repo page. No cookies or credentials are imported from the user's daily browser profile.

`/browser-session/:sessionId/home` serves the robot profile room for that browser session. It uses the active bot icon as the favicon and carries a short-lived attach token. The staged extension content script reads that token and calls `/browser-session/:sessionId/attach` to complete daemon-owned pairing inside the controlled profile.

Repo Reader playpens:

- `SUPERIOR Browser`: web apps in a controlled browser profile.
- `Extension Lab`: MV3/extension projects in a controlled browser profile.
- `Loopback Bench`: local services on localhost.
- `Desktop Bench`: exe-style desktop apps and bundled helper processes.
- `Terminal Cage`: CLI help/version/build checks.
- `Package Shelf`: libraries and adapter study.
- `Docs Table`: docs-first projects.
- `Repo Map`: unclear or broad monorepos before a runtime is chosen.

## Browser Pairing

Pairing is daemon-owned.

1. Workshop calls `POST /browser-link/start`.
2. Daemon writes a pending token to local state.
3. Workshop shows the token.
4. Extension submits the token to `POST /browser-link/complete`.
5. Daemon marks the browser as paired.
6. Browser skill calls must include `X-Clawdbot-Pairing-Token`.

The extension does not invent tokens. If the token is missing or wrong, skill calls return `unauthorized`.

Use reset when the extension is removed, stale, or paired to the wrong browser profile.

## Local State

Default local state lives under:

```text
.clawdbot/
  bot-identity.json
  browser-link.json
```

During development this is the repo `.clawdbot/` folder. In a packaged run without a workspace root, SUPERIOR uses the user-local app folder:

```text
%APPDATA%\SUPERIOR\.clawdbot\
```

Override with:

```text
CLAWDBOT_STATE_DIR=C:\path\to\state
```

## OpenAI Key File

The daemon loads local key files in this order:

1. `SUPERIOR_ENV_PATH`
2. nearest `.env.local` above the daemon working directory
3. `.env.local` inside the SUPERIOR state directory

For a packaged alpha install, put the key file here:

```text
%APPDATA%\SUPERIOR\.clawdbot\.env.local
```

Do not commit `.clawdbot/` or `.env.local`.

## GitHub Token

Repo Reader can use a local GitHub token to avoid low unauthenticated rate limits:

```text
GITHUB_TOKEN=...
```

or:

```text
GH_TOKEN=...
```

The token is read by the daemon only. It is not sent to the extension.

## SUPERIOR Browser Overrides

Browser executable detection checks:

1. `SUPERIOR_BROWSER_PATH`
2. installed Chrome paths
3. installed Edge paths

Extension folder detection checks:

1. `SUPERIOR_EXTENSION_PATH`
2. `apps/extension/dist` in a development workspace
3. packaged resource folders such as `resources/extension`

Use overrides only for smoke tests, alternate installs, or packaged-runtime recovery.

## Windows Service

Install the daemon as a Windows scheduled task that starts at login:

```powershell
corepack pnpm service:install:windows
```

The installer targets the current Windows user with a limited run level. Some machines block scheduled-task registration by policy; in that case, run from an elevated terminal or allow per-user scheduled tasks.

For install/uninstall smoke tests while the dev daemon is already using port `5317`, install without starting:

```powershell
.\apps\daemon\scripts\install-windows-service.ps1 -Build -TaskName "SUPERIOR Daemon Smoke" -NoStart
```

Remove it:

```powershell
corepack pnpm service:uninstall:windows
```

The task runs:

```text
node apps/daemon/dist/server.js
```

Use `corepack pnpm build` after code changes so the installed service runs the latest compiled daemon.

## Desktop-Managed Startup

The alpha exe can start the daemon without a separate terminal or system Node install.

Build-time daemon bundle:

```powershell
corepack pnpm --filter @clawdbot/daemon bundle:desktop
```

Desktop package builds run this automatically before `tauri build`.

Build-time Node runtime staging:

```powershell
corepack pnpm --filter @clawdbot/desktop node:stage
```

The launcher checks runtime paths in this order:

- bundled `resources/node/node.exe`
- `SUPERIOR_NODE_PATH`
- system `node`
