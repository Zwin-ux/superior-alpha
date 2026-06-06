# SUPERIOR ChatGPT App Port

## Decision

The ChatGPT app is a platform port, not a replacement for the desktop app.

The effective angle is `SUPERIOR Pocket Walker`: a compact ChatGPT companion that carries the bot's safe identity, loadout, proof hints, and dock-back route while preserving the local-first runtime boundary.

## Why This Fits ChatGPT

ChatGPT is good at intent, explanation, triage, and handoff. SUPERIOR is good at local execution, browser pairing, page skills, repo playpens, and visible creature feedback.

The shape should be a pocket companion device: the user carries a tiny version of the bot, checks what it has equipped, sees proof it has picked up, then docks it back into the real Workshop for privileged actions.

The port should connect those strengths:

- ChatGPT asks what the user wants to inspect or run.
- The app shows bot identity, equipped parts, proof history, device readiness, and safe dock-back routes.
- The user returns to the installed app or extension for privileged local execution.
- Future mobile can consume the same companion contract.

## Scope

In scope:

- read-only companion snapshot
- alpha proof and readiness summary
- platform route recommendation
- ChatGPT widget that looks like a pocket companion cartridge
- submission JSON for review prep

Out of scope:

- running Article X-Ray from ChatGPT
- sending local page text to ChatGPT
- browser pairing from ChatGPT
- storing model keys
- exposing raw local daemon state
- cloning the Workshop UI
- simulating a full game loop inside ChatGPT
- running local skills, pairing browsers, opening profiles, or collecting secrets

## Tool Surface

- `superior_get_companion`: read the safe pocket companion envelope or return an offline-safe snapshot.
- `superior_plan_handoff`: recommend the best SUPERIOR shell for a user intent.
- `superior_render_field_desk`: render the Pocket Walker widget using the same safe companion data.

All three tools are read-only, non-destructive, and closed-world. They do not run local skills, pair browsers, open profiles, collect secrets, save bot identity, mutate local/external state, or send raw page text, repo files, pairing tokens, cookies, API keys, or OS credentials into ChatGPT.

## Validation

Required for this port:

```powershell
corepack pnpm --filter @clawdbot/chatgpt-app build
corepack pnpm --filter @clawdbot/chatgpt-app test
corepack pnpm --filter @clawdbot/chatgpt-app start
```

Submission prep file:

```text
apps/chatgpt-app/chatgpt-app-submission.json
```
