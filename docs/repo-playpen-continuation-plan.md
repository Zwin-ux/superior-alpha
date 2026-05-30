# SUPERIOR Repo Playpen Continuation Plan

Updated: 2026-05-30

## Goal

Make Repo Reader feel like the creature can pick up a GitHub project, understand what kind of object it is, then choose the right local place to play with it.

The product loop:

```text
GitHub link -> repo map -> project surface -> playpen -> staged run -> notes -> next move
```

This is not a hosted runtime. It is a local workbench with visible permissions and recoverable steps.

## Product Bet

The strongest SUPERIOR loop is not chat. It is object handling.

The user gives the creature an object:

- page
- article
- GitHub repo
- local JS/TS folder
- browser profile
- service URL

SUPERIOR maps the object, picks a tool surface, changes its clay part state, and returns one concrete move.

For repos, the robot should feel like it has its own:

- browser profile
- extension lab
- loopback service bench
- desktop app bench
- terminal cage
- package shelf
- docs table

Assume the app can request broad local permissions, but stage them visibly. Maximum permission should mean the robot can do real work, not that it acts invisibly.

## Repo Surfaces

Repo Reader should keep detecting:

- `desktop-exe`: Tauri, Electron, installers, bundled resources
- `browser-extension`: manifest, MV3, popup/background/page scripts
- `web-app`: Vite, Next, Remix, Svelte, Vue, frontend dev server
- `local-service`: Express, Fastify, Hono, Nest, Docker, health/routes/logs
- `cli`: bin commands, CLI folders, command docs
- `library`: package exports, examples, tests, type surfaces
- `monorepo`: apps/packages workspace, Turborepo, pnpm workspace, Nx
- `docs`: README/docs-first projects
- `unknown`: not enough signals

## Playpens

### SUPERIOR Browser

For web apps.

Loop:

```text
map app -> install -> start dev server -> open own browser -> inspect first screen
```

Needs:

- local files
- terminal
- browser control
- service control when a dev server starts

### Extension Lab

For Chrome/Edge extensions.

Loop:

```text
map manifest -> build extension -> load unpacked -> open test page -> try extension action
```

Needs:

- local files
- terminal
- browser control
- extension control

Target: controlled browser profile first, not the user's everyday profile.

### Loopback Bench

For services.

Loop:

```text
map service -> install -> start loopback -> check health -> read logs
```

Needs:

- local files
- terminal
- service control

### Desktop Bench

For exe-style apps.

Loop:

```text
map shell -> install -> run app -> watch helper process -> check package path
```

Needs:

- local files
- terminal
- service/process control

### Terminal Cage

For CLI projects.

Loop:

```text
map command -> install -> build -> run help -> save command notes
```

Needs:

- local files
- terminal

Start with help/version/dry checks before repo-specific commands.

### Package Shelf

For libraries.

Loop:

```text
map exports -> read examples -> run tests -> sketch adapter -> stow notes
```

Needs:

- local files
- terminal

### Docs Table

For docs-first repos.

Loop:

```text
open docs -> map sections -> extract commands -> mark gaps -> save notes
```

Needs:

- local files
- browser control

### Repo Map

For unclear projects and broad monorepos.

Loop:

```text
map repo -> find apps -> pick surface -> check risk -> choose playpen
```

Needs:

- repo read
- local files after clone/import

## Current Implementation

Shipped now:

- shared `RepoReaderPlayground` contract
- shared `RepoReaderSurfaceSignal` contract
- Repo Reader peeks into common repo folders: `apps`, `packages`, `extension`, `server`, `src`, `docs`, and similar paths
- daemon returns `playground`, `surfaceMap`, access needs, robot loop, setup steps, and risk notes
- Workshop skill tray shows playpen, mode, primary surface, robot role, robot loop, access needs, setup, and risks
- daemon remembers successful Repo Reader runs as local repo workspace records under `.clawdbot/repos/repo-workspaces.json`
- daemon exposes saved repo workspace records at `GET /repo-workspaces`
- shared `SuperiorBrowser*` contracts define runtime state, start/stop results, attach requests, session modes, and typed errors
- daemon owns `SUPERIOR Browser` sessions: executable detection, per-repo profile path, remote debugging port, process id, session home page, and stop behavior
- daemon serves robot profile-room pages at `GET /browser-session/:sessionId/home`
- controlled browser home pages carry short-lived attach tokens for extension auto-pairing
- extension content script auto-attaches on daemon-served browser session pages, stores the pairing token, saves the active bot identity, and updates the toolbar icon
- daemon exposes compact playpen notes at `GET /browser-runtime/events`
- playpen notes record `started`, `home_loaded`, `extension_paired`, `repo_opened`, `page_inspected`, `skill_ran`, `stopped`, and `failed`
- daemon records active browser skill runs into the playpen notes stream
- daemon inspects the active browser debug target and stores compact current page proof
- browser session state carries current URL, page title, browser kind, paired state, console error count, and network failure count
- automatic browser detection skips Chrome builds that block command-line staged extensions and falls through to Edge
- Workshop Repo Reader results show `Start Playpen` once a repo workspace record exists
- Browser Link tray shows compact `SUPERIOR Browser` state, active repo, profile folder, stop control, and playpen notes
- tests cover desktop/service monorepo and nested extension repo classification
- tests cover browser executable override, profile path containment, extension dist detection, and unknown repo rejection
- smoke confirmed Edge fallback reaches `paired` and records `extension_paired`
- smoke confirmed Article X-Ray records `skill_ran` while a playpen is active

## Next Build Slice

### 1. Browser Inspection Notes

SUPERIOR Browser now launches an isolated Chrome/Edge profile, opens the robot room plus the GitHub repo page, auto-pairs the extension, and records compact playpen notes.

Next, tighten DevTools Protocol inspection:

- stronger active-tab detection after user tab switches
- compact console/network counts
- no chat-style transcript

Keep this local and short. It is a session trail, not a chat log.

### 2. Repo Workspace Records

Local records now exist under `.clawdbot/repos/`.

Add:

- user-approved local path if cloned/imported
- last known run command
- editable notes
- known dev URL
- preferred playpen mode

Do not clone automatically. Current behavior stores the plan and starts a browser playpen only after `Start Playpen`.

### 3. Dry-Run Command Plan

Repo Reader should produce command cards but not run them yet.

Command states:

- `planned`
- `approved`
- `running`
- `passed`
- `failed`
- `blocked`

The first implementation can persist command cards and require manual run from the user.

### 4. Local Clone/Import Gate

Add a button later:

```text
Stage Repo
```

Expected behavior:

- user chooses a local folder or approves a clone destination
- daemon stores workspace record
- no commands run until approved
- repo notes appear in Continue tray

### 5. Better GitHub Read

Improve read reliability:

- use local `GITHUB_TOKEN` or `GH_TOKEN` when present
- distinguish optional scan failure from true missing README
- sample more nested `package.json` files without over-reading
- classify primary surface by runnable confidence, not just priority order

## Work Audit

What shipped:

- daemon-owned Chrome/Edge session management
- isolated profile path per repo id
- robot-owned home page with icon favicon and attach token
- extension auto-attach path for controlled profiles
- Workshop start/stop/profile controls
- playpen notes stream
- Edge fallback for Chrome installs that block staged extensions

What is weak:

- DevTools Protocol inspection is short-window proof, not a full historical browser trace
- packaged-path smoke still needs a clean-machine active playpen run after installer install

What broke or blocked:

- Chrome-branded v148 did not load command-line staged extensions; automatic detection now falls through to Edge

Do not re-decide:

- browser process ownership belongs to the daemon
- one profile per repo/playpen is mandatory
- cookies and credentials are never imported from the daily browser
- extension pairing is token-based and daemon-owned

## UI Rules

Keep this compact.

Right tray should show:

- playpen
- mode
- primary surface
- robot loop
- access needs
- setup
- risk

Avoid:

- long prose
- generic project management cards
- explaining every permission with paragraphs

The creature should visually get a gear/bench part when Repo Reader runs.

## Acceptance

- User can paste a GitHub repo and see the playpen in under a few seconds.
- Result explains the repo by behavior, not marketing copy.
- Extension repos point to Extension Lab.
- Web apps point to SUPERIOR Browser.
- Services point to Loopback Bench.
- CLIs point to Terminal Cage.
- Libraries point to Package Shelf.
- Monorepos that lack a clear runnable target point to Repo Map.
- No clone or command execution happens without a separate user-approved step.

## QA

Run:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Manual smoke:

- `https://github.com/openai/openai-node` should read as CLI/library-oriented Node/TypeScript.
- `https://github.com/facebook/react` should at least read as monorepo and pick Repo Map or a clear runnable playpen from nested signals.
- A known MV3 repo should pick Extension Lab.
- A Vite app repo should pick SUPERIOR Browser.

## Notion Sync Rule

Keep this local file as the implementation source. Notion can mirror the current plan for planning and review, but code-facing details should stay in the repo.
