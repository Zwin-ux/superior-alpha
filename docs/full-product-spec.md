# SUPERIOR Full Product Spec

Status: living product spec  
Updated: 2026-05-30  
Current build line: `0.2.x` alpha  
Beta target: `1.0`

## Product Promise

SUPERIOR is a local desktop creature utility.

The user installs a Windows app, builds a clay robot, gives it browser and repo skills, then lets that robot open an isolated browser profile or inspect the current page. The product should feel like a small handmade tool with a workbench, not a SaaS assistant.

The complete loop:

```text
install exe -> build robot -> pair extension -> read page or repo -> start playpen -> robot reports proof -> result lands in Workshop
```

## Product Surfaces

### Desktop Exe

The desktop app is the home base.

It owns:

- clay robot identity
- launcher menu
- skill loadout
- browser pairing state
- repo workspace records
- playpen controls
- recent skill results
- local setup recovery

The desktop screen stays simple:

```text
left: menu
center: workbench creature
right: parts tray / browser link / repo reader / options
bottom: compact runtime status
```

No dashboard. No marketing homepage. No feature-card grid.

### Local Daemon

The daemon is the local service boundary.

It owns:

- OpenAI key access
- bot identity persistence
- browser pairing token state
- deterministic skills
- Repo Reader
- SUPERIOR Browser process control
- repo workspace records
- recent result history
- custom skill import proposals

The extension never receives the OpenAI key.

### Browser Extension

The MV3 extension is the browser hand.

It owns:

- popup actions
- right-click actions
- active tab capture
- pairing token storage
- toolbar icon rendering
- controlled-profile auto-attach
- active page heartbeat inside a playpen

The popup should feel like a tiny version of the Workshop, not a separate product.

### SUPERIOR Browser

SUPERIOR Browser is a robot-owned browser playpen.

The daemon launches Chrome first when usable, Edge as fallback. Each repo gets its own browser profile under:

```text
.clawdbot/browser-profiles/<repo-id>/
```

The playpen opens:

- robot home page
- GitHub repo page
- staged SUPERIOR extension
- remote debugging port

It must not import cookies or credentials from the user's normal browser profile.

## Core Loops

### 1. Page Skill Loop

```text
open page -> invoke extension -> capture page text -> daemon validates pairing -> skill runs -> result appears in popup + Workshop
```

Alpha skills:

- `Page Explainer`: model-backed, uses supplied page text only.
- `Article X-Ray`: local deterministic extraction.

Acceptance:

- unpaired extension cannot run skills
- stale tokens recover cleanly
- missing OpenAI key blocks only model-backed skills
- empty page text returns one recoverable message
- successful runs appear in recent results

### 2. Repo Playpen Loop

```text
paste GitHub repo -> Repo Reader maps project -> saved workspace appears -> Start Playpen -> robot browser opens -> extension pairs -> notes return
```

Repo Reader classifies presentation:

- desktop exe
- browser extension
- web app
- local service
- CLI
- library
- monorepo
- docs
- unknown

Then it picks a playpen:

- `SUPERIOR Browser`
- `Extension Lab`
- `Loopback Bench`
- `Desktop Bench`
- `Terminal Cage`
- `Package Shelf`
- `Docs Table`
- `Repo Map`

Alpha acceptance:

- Repo Reader never clones or runs commands automatically.
- `Start Playpen` only appears for saved repo workspace records.
- Playpen notes prove what happened.
- Browser inspection shows current URL/title plus compact console/network counts.
- Extension active-page reports can override debug-target guessing after tab switches.

### 3. Custom Skill Loop

```text
drop JS/TS folder -> daemon scans metadata -> proposal appears -> adapter stays hidden until smoke passes
```

The first import pass reads:

- `package.json`
- scripts
- TS/JS entrypoints
- config files
- test signals
- warnings

It does not run commands. It does not equip the skill. It does not send full source contents to a model in the first pass.

### 4. Identity Loop

```text
body + pigment + eye + skills -> same robot appears everywhere
```

Required surfaces:

- desktop workbench
- extension popup
- toolbar icon
- right-click icon
- robot browser home
- profile favicon
- future floating buddy

If the user builds `Gremlin + Moss Green + Pixel Eye`, every surface should look like the same small green clay gremlin.

## Data Boundaries

Local by default:

- OpenAI key
- pairing tokens
- bot identity
- recent results
- repo workspace records
- browser profiles
- custom skill scan proposals

Allowed to leave the machine only through explicit skill behavior:

- page text sent to OpenAI for Page Explainer
- public GitHub repo metadata fetched by Repo Reader

Never sent to the extension:

- OpenAI key
- daemon environment
- local repo file contents outside approved scan contracts

Never imported into playpen:

- daily browser cookies
- daily browser credentials
- personal browser profile state

## Release Path

### 0.2.x Repo Playpen Alpha

Goal: prove the robot-owned browser loop.

Must prove:

- daemon launches isolated browser profile
- extension auto-pairs inside profile
- current page proof reaches Workshop
- Article X-Ray and Page Explainer run from paired profile
- stop closes tracked process
- stale token blocks skill calls

### 0.3 Clay Asset Pass

Goal: make the product feel owned.

Must ship:

- final alpha clay head set
- toolbar/right-click icon set from identity
- robot home favicon consistency
- stronger workbench composition
- button and skill attachment motion polish
- no placeholder mascot feel

### 0.4 Skill Loadout Alpha

Goal: make skills feel like equipment.

Must ship:

- fixed slot loadout polish
- stowed parts case
- equipped attachments rendered consistently
- custom JS/TS proposal review
- first local smoke-run adapter gate
- source-mapped skills hidden until runnable

### 0.5 Beta Candidate

Goal: remove hidden setup knowledge.

Must ship:

- first-run key setup recovery
- install/uninstall smoke
- clean-machine missing-config path
- extension load instructions or installer handoff
- packaged playpen smoke
- clear reset controls

### 1.0 Official Beta

Goal: a fresh user can install and prove the product.

Beta proof:

```text
fresh Windows install -> open SUPERIOR -> pair extension -> read repo -> start playpen -> extension auto-pairs -> run Article X-Ray + Page Explainer -> stop playpen
```

Beta is not stable launch. It is the first version worth handing to outside users.

## Verification Matrix

Every release needs proof in `docs/alpha-verification.md` or its replacement.

Root gates:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @clawdbot/desktop tauri:build
```

Runtime gates:

- `/health` reports ready or missing-config clearly
- `/browser-runtime` reports active session state
- `/browser-runtime/events` returns compact notes
- `/browser-runtime/inspect` returns typed state
- active page heartbeat updates current page proof
- `/browser-runtime/stop` closes tracked browser

UI gates:

- desktop `1280x720`
- narrow layout around `390x844`
- Browser Link tray
- Skills tray
- Repo Reader result
- extension popup
- no console errors outside normal dev messages

Packaging gates:

- NSIS artifact exists
- MSI artifact exists
- bundled daemon starts
- bundled Node is used when system Node is unavailable
- staged MV3 extension exists

## Product Tone

Use short tool labels:

- `Start Playpen`
- `Stop`
- `Open Profile`
- `Article X-Ray`
- `Read Repo`
- `Scan Folder`
- `Pair`
- `Reset`

Avoid:

- "unlock"
- "seamless"
- "empower"
- "AI companion"
- "revolutionary"
- "workflow automation platform"

The bot should teach through state, attachments, icons, status lights, and notes.

## Non-Goals Before Beta

- hosted cloud runtime
- account system
- billing
- marketplace
- Firefox packaging
- arbitrary command execution
- automatic repo cloning
- multi-user collaboration
- generic landing page
- public skill sharing

## Next Strongest Build Slice

Finish `0.2.x` with active-page proof:

- extension reports active tab URL/title to daemon after controlled-profile pairing
- daemon stores it as the latest inspection
- Workshop shows it in the Browser Link tray
- playpen notes include `Page focused` or `Page inspected`
- tests cover no-playpen and stale-token rejection

Then move to `0.3` asset pass.
