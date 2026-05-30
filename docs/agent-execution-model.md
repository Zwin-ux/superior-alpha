# SUPERIOR Agent Execution Model

This document is for coding agents working on SUPERIOR.

The goal is not to make agents write more. The goal is to make them make fewer bad decisions.

## North Star

SUPERIOR should feel like:

```text
build robot -> equip part -> run function -> see proof -> keep moving
```

Agents should preserve this loop. If a task does not improve this loop, it needs a clear reason.

## Current Big Goal

`0.4 Function Kernel Alpha`

Build one portable function system behind the existing app:

- contracts live in `packages/shared`
- Node daemon runs it now
- future `.NET` host can run the same behavior later
- desktop and extension call the same function shape
- Workshop shows parts and proof, not feature cards

## Agent Lanes

Use these lanes to split work. One agent can handle multiple lanes in a small sprint, but each change should still respect the lane boundary.

### 1. Contract Agent

Owns:

- shared function types
- request/result/error contracts
- fixture inputs and expected outputs
- contract tests

Primary files:

- `packages/shared/src/contracts.ts`
- `packages/shared/src/contracts.test.ts`
- future `packages/shared/src/functionContracts.ts`

Rules:

- no UI layout fields in shared function contracts
- every cross-process payload has a typed error state
- contracts must be stable enough for Node and `.NET`
- test shape, defaults, and failure cases

Done means:

- TypeScript consumers can import one function contract model.
- Unknown function ids, missing permissions, and typed errors are represented.
- Fixtures can be reused by daemon, extension, desktop, and future host tests.

### 2. Backend Function Agent

Owns:

- function catalog
- function runner
- proof event recording
- runner adapters for existing skills
- compatibility routes

Target structure:

```text
apps/daemon/src/functions/
  catalog.ts
  runner.ts
  runEventsStore.ts
  permissions.ts
  adapters/
    articleXrayRunner.ts
    pageExplainerRunner.ts
    repoReaderRunner.ts
    browserRuntimeRunner.ts
    customSkillImportRunner.ts
```

Rules:

- route handlers parse, call runner, return JSON
- runner validates id, input, permissions, config, and pairing
- existing endpoints remain but delegate into the runner
- runner emits compact proof events
- model-backed functions check config only when needed

Done means:

- `GET /functions` returns registered runnable functions.
- `POST /functions/run` can run one deterministic test skill and preserve compatibility for existing skills.
- Existing `/skills/*` routes still work.
- Recent results and proof events are stored once per run.

### 3. Desktop Function Bench Agent

Owns:

- Workshop function UI
- parts tray mapping to runnable functions
- recent proof display
- failure recovery states
- desktop/narrow layout integrity

Primary files:

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/assembly.ts`
- `apps/desktop/src/daemon.ts`
- `apps/desktop/src/components/`
- `apps/desktop/src/styles.css`

Rules:

- keep left menu, center workbench, right tray
- do not add a dashboard
- do not explain what the bot can show
- failures show one recovery action
- recent proof is compact, not a chat transcript

Done means:

- equipped parts map to function definitions
- recent function runs appear in Continue
- function errors are recoverable
- screenshots still read as a workbench game utility

### 4. Extension Function Agent

Owns:

- popup function calls
- active tab capture
- context menu calls
- pairing token use
- toolbar/right-click identity

Primary files:

- `apps/extension/src/popup.tsx`
- `apps/extension/src/background.ts`
- `apps/extension/src/botStorage.ts`
- `apps/extension/src/icon.ts`

Rules:

- extension never receives model credentials
- paired token is required for browser functions
- capture result becomes typed function input
- daemon offline, unpaired, stale token, and empty page states recover cleanly

Done means:

- extension calls the function runner contract
- existing Page Explainer and Article X-Ray paths still work through the shared function shape
- stale token blocks calls without breaking popup state
- icon remains tied to active bot identity

### 5. Contract Fixture / QA Agent

Owns:

- host-agnostic smoke suite
- release proof JSON
- browser QA screenshots
- clean-machine proof checklist

Target structure:

```text
tools/contract-fixtures/
  run-host-fixtures.mjs
  fixtures/
  reports/
```

Rules:

- fixture runner accepts a host URL
- first host is `http://127.0.0.1:5317`
- output is machine-readable JSON plus short text summary
- fixtures avoid secrets by default
- model-backed success tests run only when a key is present

Done means:

- Node daemon can be tested through the same path planned for `.NET`
- release docs can cite a fixture report
- failures point to route, contract, and expected recovery

### 6. Windows Native Agent

Active now as the platform reset lane.

Owns:

- `.NET` Windows app lane in `apps/windows`
- Windows shell/service lifecycle
- Windows credential storage
- native workbench rendering
- future `.NET` host spike

Rules:

- do not start by cloning the Tauri app
- implement native health, identity, function catalog, pairing status, and recent proof first
- pass the same fixture suite before replacing backend behavior
- native Windows behavior matters more than code parity
- use WebView2 only for isolated browser content, not as the main Workshop shell

Done means:

- native Windows app launches without Vite
- native app can read the local daemon contracts
- Tauri/Node alpha path remains usable as a harness

### 7. Docs / Release Agent

Owns:

- keeping source-of-truth docs aligned
- recording verification proof
- removing stale milestone language
- capturing caveats

Primary files:

- `docs/full-product-spec.md`
- `docs/build-plan.md`
- `docs/release-ladder.md`
- `docs/alpha-verification.md`
- `docs/platform-release-testing.md`

Rules:

- docs should describe decisions, not vibes
- stale milestone names must be updated
- proof belongs in verification docs
- do not add generic startup copy

Done means:

- another agent can resume without asking what the sprint is
- release proof is findable

## Backend Setup For Agents

Backend agents should work in this order:

```text
shared contracts
-> daemon catalog
-> daemon runner
-> adapter one function
-> compatibility route
-> proof events
-> fixture
```

Recommended first implementation order:

1. Add shared function contracts.
2. Add daemon function catalog with static definitions.
3. Add runner shell with `unknown_function`, `missing_permission`, and `missing_config` errors.
4. Add one deterministic test skill adapter first; Article X-Ray behavior can supply the test logic, but it is not the product focus.
5. Add one model-backed adapter second because it proves config handling and recoverable missing-key behavior.
6. Add recent function run events.
7. Add fixture runner for health, function catalog, unknown id, deterministic skill run, and missing-key model path.

Do not start with Repo Reader or browser runtime. They are larger and easier to get wrong before the runner shape is proven.

## Frontend Setup For Agents

Frontend agents should work in this order:

```text
read function catalog
-> map runnable functions to parts
-> call function runner
-> show proof
-> preserve compatibility controls
```

Desktop target:

- Continue tray shows latest function proof.
- Skills tray shows equipped function parts.
- Browser Link tray still controls pairing/playpen.
- Custom import tray remains proposal-only.

Extension target:

- popup calls `/functions/run` through skill ids
- context-menu actions call the same function client instead of only opening the popup
- existing skill endpoints remain fallback until function runner is proven
- popup copy stays short: `Explain`, `X-Ray`, `Pair`, `Offline`, `Missing key`

## Integration Rules

- A backend change is not done until a frontend or fixture can call it.
- A frontend change is not done if it invents a shape outside shared contracts.
- A function is not runnable if it has no typed error state.
- A result is not product-ready if it does not leave recent proof.
- A platform port is not real until it passes the same host fixtures.

## Human Satisfaction Bar

For this product, the user should feel:

- the robot is doing work, not the app showing a form
- failures are local and recoverable
- the app is safe with secrets
- each platform feels intentional
- proof is visible without reading logs

Agents should optimize for that feeling through behavior, not copy.

## Questions Agents Should Ask Humans

Ask only when the answer changes the product.

Good questions:

- Which function should be the first proof of a new system?
- Is this a user-facing part or an internal capability?
- Should this run automatically, or only after the user starts a playpen?
- What should the bot visibly do when this succeeds?
- What is the acceptable recovery path when this fails?

Bad questions:

- Where is the type?
- Which package manager?
- Should we add a card?
- Should we keep the generic dashboard layout?
- Do you want tests?

## 0.4 Recommended First Work Packet

Title: `Function Kernel: Skill Harness Proof`

Build:

- shared function contracts
- daemon function catalog
- daemon runner shell
- deterministic test skill adapter using Article X-Ray behavior
- `/functions` and `/functions/run`
- existing `/skills/article-xray` delegates to runner
- remaining legacy Workshop endpoints should delegate as their adapters become stable
- physical bot confirmation state for successful run
- recent proof event for verification
- fixture runner proves health, catalog, unknown id, and deterministic skill run

Acceptance:

- root checks pass
- the deterministic test skill works through old and new route
- unknown function returns typed error
- the Workshop shows a physical bot confirmation when the skill succeeds
- recent proof records one completed function run
- fixture report is written under `.clawdbot/verification/`

This packet proves the real product idea: skills are addable robot capabilities, and successful skill runs are visible through the bot.

## Human Decisions For 0.4

Default decisions are listed so implementation can continue if the human is not available.

### Decision 1: First Visible Proof

Recommended default: `Skill Harness first`.

Why:

- proves the addable-skill system
- deterministic
- does not require OpenAI key
- can use Article X-Ray as an internal test adapter
- avoids making one browser skill feel like the product

Alternative:

- `Page Explainer first` if the goal is to prove model-backed behavior immediately.

### Decision 2: Proof Display

Recommended default: `physical bot confirmation first`.

Use visible bench feedback:

```text
part pulse
eye/lens blink
slot stamp
bench result mark
```

Machine notes still exist in Continue for verification, but they are secondary.

Avoid:

- chat transcripts
- verbose logs
- timeline dashboards
- generic automation history panels

### Decision 3: Function Run Trigger

Recommended default: `explicit user action`.

Functions should run when the user clicks a part/action or starts a playpen. No background autonomy until the playpen has been explicitly started.

### Decision 4: Portability Priority

Chosen correction: `fixture and .NET lane in parallel`.

The Node daemon already has a stable function fixture path. The native Windows app lane starts now, but it must consume contracts instead of copying the Tauri shell.
