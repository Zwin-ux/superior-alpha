# SUPERIOR Platform Release Testing

SUPERIOR should not ship the same app shell everywhere. Each platform gets the best native surface for that platform, while the robot identity, skill contracts, local privacy model, and backend behavior stay portable.

## Platform Rule

Shared:

- bot identity contracts
- skill request/result/error contracts
- local privacy boundaries
- browser pairing protocol
- repo workspace records
- clay asset source files and generated icon language

Native per platform:

- app shell
- installer/update flow
- service lifecycle
- credential storage
- notifications/tray/menu behavior
- browser integration details
- visual polish for that surface

Do not make platform ports by cloning UI. Port the backend contract and rebuild the surface.

## Backend Portability Model

Treat the backend as a small local product kernel with replaceable hosts.

```text
SUPERIOR Core Contracts
  packages/shared
  bot identity, skills, requests, results, errors

SUPERIOR Core Services
  identity store
  browser pairing
  repo workspace store
  skill runner
  model provider adapter
  browser playpen coordinator

Platform Host
  Windows .NET host
  Node dev daemon
  future macOS host
  future Linux host

Platform Surface
  Windows EXE
  Chrome/Edge extension
  web preview
  CLI/dev tools
```

The host may change language. The contracts may not drift.

### Porting Backend Services

Each backend capability should have four layers:

- `contract`: typed request/result/error shape in `packages/shared`
- `core behavior`: deterministic logic that can be tested without UI
- `host adapter`: Node, .NET, or future native process bindings
- `surface adapter`: desktop, extension, browser home, CLI, or web UI call site

When porting from Node to .NET, do not port route code line-by-line. Port the contract and behavior:

- route names stay stable
- JSON shapes stay stable
- pairing token behavior stays stable
- local file locations are mapped through a platform path adapter
- model provider remains behind a provider adapter
- browser launch remains behind a browser runtime adapter

### Backend Compatibility Bar

Before replacing or adding a host, run the same contract fixture suite against both hosts.

Required compatibility fixtures:

- `GET /health`
- `GET/PUT /bot-identity`
- browser pairing start, complete, reset
- Page Explainer request with missing key and with configured key
- Article X-Ray request with paired and unpaired tokens
- Repo Reader classification for desktop, extension, web app, service, CLI, library, monorepo, docs, unknown
- SUPERIOR Browser start, inspect, event log, stop
- custom JS/TS skill import proposal

## Platform Test Cycles

Every platform release uses the same cycle:

```text
contract -> unit -> integration -> package -> clean install -> dogfood -> release note
```

Each cycle must produce proof in `docs/alpha-verification.md` or the current release verification doc.

### 1. Windows EXE

Primary target for Beta.

Build direction:

- official shell is `.NET` native under `apps/windows`
- current Tauri shell is alpha/dev harness only
- Windows app owns native window, tray, installer, local storage, and service controls
- native workbench rendering is preferred; do not use a localhost UI as the product shell
- WebView2 is allowed only for isolated future surfaces that genuinely need browser content, not for the main Workshop

Test cycle:

- Contract: shared request/result fixtures pass against the active Windows host.
- Unit: identity, pairing, repo workspace, browser detection, service config, path mapping.
- Integration: EXE starts without Vite, host reports health, bot identity persists, extension folder is staged.
- Package: installer/MSI/portable artifact builds on a clean Windows runner.
- Clean install: no system Node, no repo checkout, no localhost UI knowledge, missing key state is recoverable.
- Browser loop: pair extension, start isolated profile, run Article X-Ray and Page Explainer, stop playpen.
- OS behavior: tray/menu works, service install/uninstall works, app quits without orphaned processes.
- Visual QA: 1280x720, 390x844, high DPI, reduced motion, native clay bench visible.

Release gate:

- fresh Windows install can run the full robot-owned browser loop
- local OpenAI key never reaches extension storage
- uninstall removes service registration and leaves user data only when expected
- release proof labels the tested shell as `Native Windows EXE`, not `Tauri alpha harness`

### 2. Chrome/Edge Extension

Extension is the browser hand, not the backend.

Test cycle:

- Contract: extension requests use shared payload shapes and pairing token header.
- Unit: storage, icon generation, capture extraction, unpaired failure paths.
- MV3 build: manifest validates, background worker loads, content scripts load.
- Controlled profile: staged extension auto-pairs from robot home.
- Skill smoke: Page Explainer and Article X-Ray run from a paired tab.
- Icon proof: toolbar icon and popup identity match active bot identity without requiring the popup to open first.
- Store proof: package ZIP validates MV3, exact permissions, local-only host permissions, popup, worker, content script, and icon sizes.
- Browser matrix: Chrome current, Edge current, blocked Chrome extension loading fallback.

Release gate:

- extension cannot run skills without pairing
- extension never stores OpenAI key
- extension recovers from daemon offline and stale token
- public Chrome Web Store packet includes a reachable privacy policy and specific permission rationale

### 3. Web App / Preview Surface

The web app is not the main product. Use it for demos, account/help surfaces, shared previews, or asset review.

Current hub surface is `apps/hub`, a private Vercel coordination hub for release proof, artifact links, platform status, and agent packets. It must not contain local runtime data.

Test cycle:

- Contract: reads shared bot identity and public-safe result shapes only.
- Unit: pure UI state, asset loading, responsive layout.
- Integration: demo data loads without local secrets.
- Visual QA: desktop, tablet, mobile.
- Privacy proof: no local key, token, or private repo data appears in web payloads.

Release gate:

- web surface can explain the product visually without pretending to be the installed app
- no cloud dependency is required for local-first EXE flows
- protected hub pages contain only public-safe release data

### 4. Local Service / Backend Host

The backend host is the portable product kernel.

Test cycle:

- Contract: route fixture suite passes.
- Unit: stores, provider adapters, skill runners, path adapters.
- Integration: host starts on loopback, handles missing config, writes state to platform-local folder.
- Security: rejects stale pairing tokens, invented tokens, and extension requests without pairing.
- Portability: same fixture suite runs against Node alpha host and future .NET host.
- Observability: health, events, active browser state, recent results, and typed errors are inspectable.

Release gate:

- host can be replaced without changing extension request shapes or desktop skill result shapes
- secrets stay in host-owned local storage

### 5. CLI / Dev Tooling

CLI is for development, smoke, and power users. It should not become the main UX.

Test cycle:

- Contract: CLI calls the same local host routes.
- Unit: argument parsing and exit codes.
- Integration: health, repo reader, skill smoke, browser runtime smoke.
- CI: headless smoke runs without a GUI where possible.

Release gate:

- useful for debugging without bypassing privacy or pairing boundaries

### 6. macOS App

Not Beta target. Design as a native app when the Windows loop is strong.

Build direction:

- native shell should be Swift/AppKit or SwiftUI
- shared contracts stay JSON-compatible
- service lifecycle maps to LaunchAgent or app-managed helper
- browser playpen uses installed Chrome/Edge/Safari-compatible strategy only after proof

Test cycle:

- same contract fixture suite
- app bundle/notarization proof
- keychain credential storage
- LaunchAgent/helper lifecycle
- browser profile isolation
- visual QA for macOS window behavior

Release gate:

- not a Windows clone
- native install/recovery behavior is understandable to macOS users

### 7. Linux App

Later target. Ship only if the local loop has demand.

Build direction:

- pragmatic native package first
- preserve backend contracts
- service lifecycle maps to systemd user service where appropriate

Test cycle:

- same contract fixture suite
- AppImage/deb/rpm smoke based on chosen package
- X11/Wayland browser launch smoke
- user service install/uninstall smoke

Release gate:

- no hidden root-level setup for the default user path

## Release Rings

Use four rings for every platform:

- `dev`: local workspace, fast checks, can be messy
- `alpha`: packaged artifact, known setup assumptions, proof required
- `beta`: clean install, no hidden setup knowledge, outside users
- `release`: updater, rollback, crash reporting, support docs

SUPERIOR `1.0` means official Beta, not stable launch.

## Required Proof Per Release

Each release entry must record:

- artifact name and version
- commit SHA
- platform and OS version
- install method
- backend host used
- contract fixture result
- package/build result
- clean-machine result
- browser pairing result
- skill smoke result
- visual QA screenshots
- known caveats

Do not call a platform ready because the UI builds. It is ready when the robot loop works on that platform.
