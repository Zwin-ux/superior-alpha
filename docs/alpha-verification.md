# SUPERIOR Alpha Verification

Last checked: 2026-05-30

## Passing Evidence

- Root typecheck passes: `corepack pnpm typecheck`
- Root tests pass: `corepack pnpm test`
- Root build passes: `corepack pnpm build`
- Extension MV3 build passes: `corepack pnpm --filter @clawdbot/extension build`
- Windows desktop bundle passes: `corepack pnpm --filter @clawdbot/desktop tauri:build`
- NSIS installer produced: `apps/desktop/src-tauri/target/release/bundle/nsis/SUPERIOR_0.1.0_x64-setup.exe`
- MSI produced: `apps/desktop/src-tauri/target/release/bundle/msi/SUPERIOR_0.1.0_x64_en-US.msi`
- Built exe starts the local daemon when port `5317` is free.
- Tauri build bundles `resources/daemon/server.mjs` for packaged daemon startup.
- Tauri build stages `resources/node/node.exe` so the daemon does not require system Node on `PATH`.
- Tauri build stages the MV3 extension at `resources/extension/manifest.json`.
- Portable smoke copied the release exe and resources to a temp folder, stripped normal Node from `PATH`, and started bundled `resources/node/node.exe` with `resources/daemon/server.mjs`.
- Portable smoke reports `missing_config` without `.env.local`, which is the expected clean-machine state.
- Portable smoke with `CLAWDBOT_STATE_DIR` pointing at a temp state folder and a local `.env.local` reports daemon health `ready`.
- Portable smoke verifies `/health` exposes the active state directory, expected key file path, key-file presence, and OpenAI config source.
- Daemon health reports `ready` with OpenAI configured.
- Daemon stores successful browser skill runs in `recent-results.json` and serves them from `/recent-results`.
- Browser pairing lifecycle works: start, complete, run skill, reset.
- Old pairing token is rejected after reset with `401`.
- Article X-Ray runs through the local daemon when paired.
- Article X-Ray smoke records a Workshop-facing recent result row after a paired browser-style call.
- Repo Reader runs through the local daemon for a public GitHub repo link.
- Repo Reader smoke classified `openai/openai-node` as a CLI-oriented Node/TypeScript project, returned setup mode `both`, picked a local playpen, and recorded a recent result.
- Repo Reader can use local `GITHUB_TOKEN` or `GH_TOKEN` when present so the daemon can avoid low unauthenticated GitHub limits.
- Repo workspace route smoke returned a seeded saved playpen record from `/repo-workspaces`.
- SUPERIOR Browser API smoke launched a controlled browser for saved repo workspace `openai/openai-node` using isolated profile `.clawdbot/browser-profiles/openai-openai-node`.
- SUPERIOR Browser API smoke verified `/browser-runtime` reports `paired` after extension auto-attach and `closed` after `POST /browser-runtime/stop`.
- SUPERIOR Browser auto-detection skipped Chrome v148 command-line extension loading and fell through to Edge, which paired successfully.
- SUPERIOR Browser events smoke returned `started`, `repo_opened`, `home_loaded`, and `extension_paired`.
- Active playpen Article X-Ray smoke returned `article-xray-result` and recorded a `skill_ran` event.
- SUPERIOR Browser stop smoke resets unattached playpen pairing back to `unpaired`.
- Extension MV3 build includes `assets/superiorBrowserAttach.js` for robot home-page auto-pairing.
- Page Explainer returns structured OpenAI output with `gpt-4.1-mini`.
- Custom JS/TS import returns a proposal for `examples/custom-skills/synergy-feed-reader`.
- Custom JS/TS import does not equip the proposed skill.
- Desktop browser QA at `1280x720` shows the three-column Workshop layout with no console errors.
- Desktop browser QA confirms cursor-following bot eyes/lens move left, right, up, down, and reset on blur.
- Desktop browser QA confirms Options shows `Key file`, the active key path, and an `Open Folder` action.
- Desktop browser QA confirms Browser Link shows `Extension`, `MV3 build`, and an `Open Folder` action for the bundled extension.
- Desktop browser QA confirms Browser Link shows compact `SUPERIOR Browser`, `Open Profile`, and `Stop` states.
- Desktop browser QA confirms Browser Link shows compact playpen notes.
- Desktop browser QA confirms Repo Reader shows `Start Playpen` after a saved repo read and updates to active playpen state after start.
- Desktop browser QA confirms the Continue tray renders real recent skill results and hides the empty placeholder.

## Environment Gate

Windows scheduled-task registration is blocked on this machine for the current user:

```text
Access is denied.
```

This happens through both the PowerShell scheduled-task API and `schtasks`. The install script now targets the current user with a limited run level, but this machine still requires elevated permission or a policy change for scheduled-task registration.

The packaged alpha carries a private Windows Node runtime. If the app cannot find its bundled runtime, it can still fall back to `SUPERIOR_NODE_PATH` or system Node as a recovery path.

GitHub may rate-limit unauthenticated Repo Reader calls. Add `GITHUB_TOKEN` or `GH_TOKEN` to the local daemon environment when running repeated repo reads.

## Current Alpha Shape

SUPERIOR now has:

- A packaged Windows exe/installer.
- A desktop-managed local daemon boundary.
- A packaged daemon runtime with bundled Node.
- A packaged MV3 extension folder for Chrome/Edge `Load unpacked`.
- User-local packaged key/state lookup under `%APPDATA%\SUPERIOR\.clawdbot\`.
- First-run key folder visibility in the Workshop Options tray.
- A Chrome/Edge extension build.
- Pairing token protection between extension and daemon.
- A model-backed Page Explainer.
- A deterministic Article X-Ray.
- A runnable Repo Reader that classifies GitHub project surfaces, peeks into common folders, and recommends a local playpen plus learn/spin-up setup paths.
- Local repo workspace records for successful Repo Reader runs under `.clawdbot/repos/`.
- Daemon-owned SUPERIOR Browser sessions with Chrome-first detection, Edge fallback, per-repo profile folders, start/stop routes, and playpen notes.
- A daemon-owned recent results feed for completed browser skills.
- Shared clay bot identity across surfaces.
- Generated desktop and extension icons from the same clay head source.
- A Workshop custom skill tray that accepts typed paths and Tauri folder drops.
- A sample JS/TS custom skill folder for smoke tests.
