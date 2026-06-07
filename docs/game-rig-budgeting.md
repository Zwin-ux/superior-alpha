# Game Rig Budgeting

Game Rig treats OpenAI-backed gameplay as the expensive path and local proof as the free path.

## Default Free Allowance

- Free plan gets `900` seconds of high-quality gameplay by default.
- High-quality gameplay means `openai-default` brain mode.
- Fixture/local proof gameplay uses `local-fixture` and is unmetered.
- The daemon pauses with `paused-budget` when the free allowance is exhausted.

## Upgrade Paths

- `SUPERIOR_GAME_RIG_PLAN=pro` marks Game Rig as Pro and unmetered for the local alpha.
- `SUPERIOR_GAME_RIG_PLAN=local-host` or `SUPERIOR_GAME_RIG_LOCAL_HOSTED=1` marks local-host mode and does not consume OpenAI gameplay budget.
- Production billing should enforce this server-side from the account service; the current daemon state is an alpha guardrail, not a billing authority.

## Tunables

- `SUPERIOR_GAME_RIG_FREE_SECONDS` overrides the free allowance for tests or pricing experiments.
- The daemon clamps the free allowance between 60 seconds and 60 minutes.
- The UI copy should stay direct: "Free includes 15 minutes. Upgrade to Pro or switch to local-host mode to continue."

## Product Rule

Do not silently continue when model-backed gameplay is exhausted. Pause the brain, keep Stop visible, and let the user choose Pro or local-host mode.
