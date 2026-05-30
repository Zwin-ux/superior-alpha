# SUPERIOR 0.4 Functional Core Sprint

## Summary

The next big step is to turn SUPERIOR's skills into a portable function system that feels like robot equipment.

Right now the product has useful routes and working skills, but they are still shaped like separate feature endpoints. `0.4` should prove the larger product idea: people can add skills to a high-quality software robot, the robot can run those skills, and the bench physically confirms that the skill worked.

Goal:

```text
equip part -> run skill -> bot reacts -> daemon records proof -> result returns to Workshop -> same contract can be hosted by Node now and .NET later
```

This is the bridge between the current alpha and the future native Windows EXE.

## 0.4 Target

Name: `0.4 Function Kernel Alpha`

Primary success:

- Page Explainer, Article X-Ray, Repo Reader, Browser Playpen, and Custom Skill Import all register through one function catalog as skill adapters, but no single skill becomes the product center.
- Existing routes can stay for compatibility, but they delegate to the same function runner.
- The Workshop shows skills as equipped parts, physical bot reactions, and compact proof, not as scattered panels.
- A contract fixture suite can run against the current Node daemon and later against the Windows `.NET` host.

Non-goals:

- no hosted cloud runtime
- no billing
- no automatic repo command execution
- no hidden source-mapped skills in the user loadout
- no full `.NET` rewrite in this sprint

## Current Implementation Evidence

Shipped in the first 0.4 slice:

- Shared function contracts exist in `packages/shared`.
- Daemon exposes `GET /functions`, `POST /functions/run`, `GET /function-runs/recent`, and `GET /function-runs/:runId/events`.
- Article X-Ray and Page Explainer legacy routes delegate through the function runner.
- The runner records compact proof events and returns a `SuperiorBotReaction`.
- The Workshop listens for recent function runs and confirms success physically with a slot pulse plus bench stamp.
- Function runner tests prove the catalog, unknown-function error, deterministic harness run, and physical bot reaction payload.
- Extension popup actions now call `/functions/run` by skill id, with legacy endpoint fallback only for old daemon builds.
- Extension context-menu actions now run through the same function client and leave daemon proof without opening the popup.
- `tools/contract-fixtures/run-extension-skill-fixture.mjs` proves the extension-style paired skill call against any compatible host URL.
- Legacy Workshop endpoints for custom skill import and browser stop now delegate through the function runner while preserving their old response shapes.

Verification from this slice:

- `corepack pnpm typecheck` passed.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- Local smoke: `/functions` returned all six function definitions.
- Local smoke: `POST /functions/run` completed a deterministic Article X-Ray adapter and returned `botReaction.state = "success"` with `slot = "eye"`.
- Workshop smoke: after reload, the proof strip showed `Article X-Ray / X-Ray clicked`, the stage reported `reaction = "success"`, and the bench stamp rendered `Eye / X-Ray clicked`.
- Extension tests prove runner-first calls, 404-only legacy fallback, and stale-pairing recovery.
- Extension fixture command: `corepack pnpm fixture:extension-skill`; by default it cleans up its temporary pairing after writing the report.
- Daemon tests now cover custom skill import proposal and browser stop through the function runner.
- Route smoke confirmed `/custom-skills/import-proposal` and `/browser-runtime/stop` still return their legacy payloads after delegation.

## Function Kernel Model

Each function needs a manifest:

```text
id
label
slot
surface
permissions
input contract
result contract
error contract
runner kind
proof events
clay attachment
```

Runner kinds:

- `local`: deterministic local logic
- `model`: local daemon calls a model provider
- `browser`: requires paired extension/browser context
- `repo`: reads public GitHub metadata or saved repo workspace state
- `proposal`: scans local metadata but does not execute an adapter

Required proof events:

- `queued`
- `validated`
- `running`
- `model_called` when applicable
- `browser_context_received` when applicable
- `result_saved`
- `failed`

These events are verification data, not the main user experience. The UI should not show them as a chat log or timeline dashboard. It can expose compact machine notes in Continue for QA and recovery, but the bench should confirm success first.

The product should confirm success physically first:

- equipped part pulses, stamps, or clicks into place
- bot eye/lens reacts
- slot ring glows briefly
- bench surface shows a tiny stamped result mark
- recent proof is available, but secondary

## Skill Harness, Not One Skill

`0.4` is not about making Article X-Ray or Page Explainer the headline.

Those skills are useful test adapters:

- Article X-Ray proves deterministic local skill execution.
- Page Explainer proves model-backed configuration and recoverable missing-key behavior.

The product proof is bigger:

```text
a skill exists in the catalog
-> the bot can equip it as a part
-> the runner can execute it
-> the bot physically confirms success or failure
-> the same contract can move to another host later
```

This keeps SUPERIOR aimed at high-quality software robots people can extend, not a browser-summarizer app with a mascot.

## Functional Slices

### 1. Function Catalog

Create one daemon-owned catalog from the shared skill catalog.

Minimum registered functions:

- `page-explainer`
- `article-xray`
- `repo-reader`
- `superior-browser-start`
- `superior-browser-stop`
- `custom-skill-import-proposal`

The catalog should expose:

```text
GET /functions
POST /functions/run
GET /function-runs/recent
GET /function-runs/:runId/events
```

Existing routes remain available:

- `/skills/page-explainer`
- `/skills/article-xray`
- `/skills/repo-reader`
- `/browser-runtime/start`
- `/browser-runtime/stop`
- `/custom-skills/import-proposal`

But each route should call the same internal runner as `/functions/run`.

### 2. Shared Contracts

Add shared contracts for:

- `SuperiorFunctionDefinition`
- `SuperiorFunctionRunRequest`
- `SuperiorFunctionRunResult`
- `SuperiorFunctionRunEvent`
- `SuperiorFunctionError`
- `SuperiorFunctionPermission`

Do not put UI layout fields in these contracts. They should survive the Node to `.NET` backend port.

### 3. Function Runner

Add a daemon runner that:

- validates input by function id
- checks pairing token when browser context is required
- checks OpenAI configuration only for model-backed functions
- records proof events
- saves recent result summaries
- returns typed errors

The runner should be boring and inspectable. Route handlers should parse, call runner, return JSON.

### 4. Workshop Function Bench

The Workshop should keep the game launcher structure:

- equipped function parts live in the right tray
- physical bot confirmation is the first success signal
- recent proof lives in Continue for verification
- browser/playpen controls stay compact
- function failures show one recovery action

For `0.4`, do not add a dashboard or feature grid. The user should feel like they are using parts attached to the robot.

### 5. Extension Function Calls

The extension should call functions through the same contract shape.

Required behavior:

- paired token attached to browser-required function calls
- unpaired state blocks Page Explainer and Article X-Ray
- active tab context becomes a typed input
- toolbar icon remains identity-driven

### 6. Contract Fixture Suite

Add a host-agnostic fixture suite that can target any local host URL.

First target:

```text
http://127.0.0.1:5317
```

Future target:

```text
Windows .NET host loopback URL
```

Fixture groups:

- health
- bot identity
- browser pairing
- function catalog
- skill harness success/failure using Article X-Ray as the deterministic test adapter
- Page Explainer missing-key failure
- Repo Reader classification
- custom skill import proposal
- browser runtime state

The suite should produce a compact JSON proof file for release verification.

## User-Facing Goal

The user-facing win is simple:

```text
The robot has parts.
Parts run functions.
Functions leave proof.
Proof comes back to the bench.
```

No abstract automation language. No "workflow platform" copy.

## Test Plan

Root checks:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Daemon tests:

- function catalog returns every runnable function
- function runner rejects unknown ids
- browser-required function rejects missing/stale pairing token
- model-backed function returns missing-config when no key exists
- skill harness can run a deterministic test adapter and return structured output
- Repo Reader still saves workspace records
- recent function results are written once per run

Extension tests:

- popup calls function runner with paired token
- unpaired popup shows recoverable state
- content capture produces typed function input

Desktop QA:

- equipped parts match runnable functions
- function run appears in recent proof
- failures do not become long explanatory panels
- desktop 1280x720 remains workbench-first
- narrow layout keeps bot before tray

Portability proof:

- contract fixture suite runs against Node daemon
- suite accepts host URL as input
- fixture output is saved for release notes

## Next Goal After 0.4

`0.5 Windows Native Host Spike`

Once the function kernel and fixture suite are real, start the `.NET` host without rewriting the product:

- implement health, identity, and function catalog first
- run the same fixture suite against Node and `.NET`
- only then move browser/runtime behavior

This keeps the Windows EXE path serious without derailing the current alpha.
