# Codex Sprint Gates

Every coding prompt should leave a small proof trail. The goal is not more process; the goal is fewer unsafe handoffs, fewer stale assumptions, and a clean way to resume work.

Generated reports live under:

```text
.clawdbot/sprint-gates/
```

That folder is ignored by git. Commit source changes, not local run logs.

## Prompt Gate

Before writing code:

- Name the sprint and target lanes.
- Read the relevant product principles before UI or product changes.
- Identify the user-facing outcome.
- Identify the local safety boundary: secrets, browser tokens, repo files, daemon state, and external services.
- Check the dirty worktree and do not revert unrelated changes.

## Lane Gates

Use the smallest lane set that covers the prompt.

```text
docs              docs/spec/copy only
tooling           gate runner or repo tooling
chatgpt-app       SUPERIOR Pocket Walker ChatGPT app
shared-contracts  packages/shared contracts and tests
daemon            local daemon routes, stores, and runners
extension         Chrome/Edge MV3 extension
desktop           Tauri alpha harness
godot             primary Godot product runtime
mobile-prep       mobile contract and asset prep, not mobile Workshop
windows           native Windows proof lane
root              full workspace typecheck/test/build
```

## Verification Gate

Run the gate runner with the lanes touched by the prompt:

```powershell
corepack pnpm gate:sprint -- --sprint chatgpt-pocket-walker --prompt "harden ChatGPT app" --lane chatgpt-app --lane root
```

For docs-only prompts:

```powershell
corepack pnpm gate:sprint -- --sprint release-notes --prompt "update alpha notes" --lane docs --no-commands
```

For custom proof:

```powershell
corepack pnpm gate:sprint -- --sprint extension-proof --lane extension --command "corepack pnpm extension:store-package"
```

## Closeout Gate

At the end of a prompt:

- Report the sprint log path.
- Report the exact commands that passed or failed.
- Note any manual gates that still need human or browser review.
- Keep summaries short and tied to proof.

## Review Rules

- A platform port is not done until it has a route back to the local SUPERIOR runtime or a clear reason it is read-only.
- A UI sprint is not done until desktop and narrow layouts are considered.
- A contract sprint is not done until typed error states and fixture coverage exist.
- A release sprint is not done until artifacts, caveats, and proof paths are logged.
- A ChatGPT app sprint is not done until tool annotations, output schemas, CSP, and data boundaries are checked.
