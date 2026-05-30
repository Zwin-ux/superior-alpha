# SUPERIOR Alpha Verification

Last checked: 2026-05-30

## Passing Evidence

- Root typecheck passes: `corepack pnpm typecheck`
- Root tests pass: `corepack pnpm test`
- Root build passes: `corepack pnpm build`
- Host contract fixture passes: `corepack pnpm fixture:host-contract`
- Extension MV3 build passes: `corepack pnpm --filter @clawdbot/extension build`
- Extension Chrome store package passes: `corepack pnpm extension:store-package`
- Extension Chrome store artifact produced: `.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip`
- Extension store validator confirms MV3, `SUPERIOR` name, version `0.8.0`, exact permissions, localhost-only host permissions, popup, worker, controlled-profile content script, and `16/32/48/128/256` icons.
- GitHub README is the public alpha hub with `ALPHA BUILD` stamp, workshop imagery, and SVG platform cards for Windows, Chrome, and macOS.
- Windows desktop bundle passes: `corepack pnpm --filter @clawdbot/desktop tauri:build`
- NSIS installer produced: `apps/desktop/src-tauri/target/release/bundle/nsis/SUPERIOR_0.2.0_x64-setup.exe`
- MSI produced: `apps/desktop/src-tauri/target/release/bundle/msi/SUPERIOR_0.2.0_x64_en-US.msi`
- Tauri desktop crate and package metadata compile as `0.2.0`.
- Built exe starts the local daemon when port `5317` is free.
- Tauri build bundles `resources/daemon/server.mjs` for packaged daemon startup.
- Bundled daemon smoke verified `resources/daemon/server.mjs` exposes `GET /browser-runtime/inspect`.
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
- SUPERIOR Browser inspection route smoke verified `GET /browser-runtime/inspect` returns typed `not_running` when no playpen is active.
- SUPERIOR Browser session state can carry compact inspection proof: current URL, title, browser kind, paired state, console error count, and network failure count.
- SUPERIOR Browser auto-detection skipped Chrome v148 command-line extension loading and fell through to Edge, which paired successfully.
- SUPERIOR Browser events smoke returned `started`, `repo_opened`, `home_loaded`, and `extension_paired`; `page_inspected` is now emitted when inspection changes.
- Active playpen Article X-Ray smoke returned `article-xray-result` and recorded a `skill_ran` event.
- SUPERIOR Browser stop smoke resets unattached playpen pairing back to `unpaired`.
- Extension MV3 build includes `assets/superiorBrowserAttach.js` for robot home-page auto-pairing.
- Page Explainer returns structured OpenAI output with `gpt-4.1-mini`.
- Custom JS/TS import returns a proposal for `examples/custom-skills/synergy-feed-reader`.
- Custom JS/TS import does not equip the proposed skill.
- Desktop browser QA at `1280x720` shows the three-column Workshop layout with no console errors.
- Desktop browser QA at `390x844` shows the Browser Link controls without console errors.
- Desktop browser QA confirms cursor-following bot eyes/lens move left, right, up, down, and reset on blur.
- Desktop browser QA confirms Options shows `Key file`, the active key path, and an `Open Folder` action.
- Desktop browser QA confirms Browser Link shows `Extension`, `MV3 build`, and an `Open Folder` action for the bundled extension.
- Desktop browser QA confirms Browser Link shows compact `SUPERIOR Browser`, `Open Profile`, and `Stop` states.
- Desktop browser QA confirms Browser Link has a compact inspection strip for the active playpen.
- Desktop browser QA confirms Browser Link shows compact playpen notes.
- Desktop browser QA confirms Repo Reader shows `Start Playpen` after a saved repo read and updates to active playpen state after start.
- Desktop browser QA confirms the Continue tray renders real recent skill results and hides the empty placeholder.
- Native Windows lane is scaffolded under `apps/windows` as a `.NET` WPF app source path, not a web wrapper.
- Repo-local .NET SDK installed under `.clawdbot/toolchains/dotnet`.
- Native Windows toolchain check passes: `corepack pnpm windows:check`.
- Native Windows launch smoke passes: compiled WPF EXE starts without Vite and stays alive for smoke.
- Native Windows proof gate passes: `corepack pnpm windows:proof`.
- Native Windows shell starts the local dev daemon when it is offline, then reads health, bot identity, function catalog, and recent function proof through daemon contracts.
- Native Windows shell reads saved repo workspaces, SUPERIOR Browser runtime state, and recent playpen notes through daemon contracts.
- Native Windows shell exposes native `Start Playpen` and `Stop` controls for saved repo workspaces.
- Native Windows shell exposes scheduled-task service controls for status, start, stop, install, and uninstall.
- Native Windows service lifecycle smoke passes as recoverable `needs-admin` on this machine: `corepack pnpm windows:service-smoke`.
- Elevated Windows service lifecycle smoke is admin-verified: `SUPERIOR Daemon Smoke` installed as a scheduled task, reported `Ready`, then uninstalled cleanly.
- Native Windows shell exposes a GitHub repo URL field and `Read Repo` action.
- Native Repo Loop smoke passes: `corepack pnpm windows:native-loop-smoke`.
- Native Repo Loop proof used `https://github.com/openai/openai-node`, saved workspace `openai/openai-node`, launched Edge fallback, paired through session attach, ran Article X-Ray, recorded `skill_ran`, and stopped the playpen.
- Latest native loop fixture report: `.clawdbot/verification/native-loop-fixture-1780162908113.json`.
- Native Windows publish passes: `corepack pnpm windows:publish`.
- Native Windows MSI builds: `corepack pnpm windows:msi`.
- MSI artifact produced: `.clawdbot/artifacts/windows/SUPERIOR-0.7.0-alpha-win-x64.msi`.
- Installed-loop smoke passes: `corepack pnpm windows:installed-loop-smoke`.
- Installed-loop smoke installed to `%LOCALAPPDATA%\Programs\SUPERIOR`, launched the installed WPF app, verified packaged Node, packaged daemon, and packaged extension resources, used `%APPDATA%\SUPERIOR\.clawdbot`, ran the native repo loop, then uninstalled.
- Windows beta gate passes: `corepack pnpm windows:beta-gate`.
- Latest installed-loop fixture report: `.clawdbot/verification/native-loop-fixture-1780162908113.json`.
- Private hub package builds with public-safe validation: `corepack pnpm --filter @clawdbot/hub build`.
- Vercel protected deployment is ready: `https://hub-o0anzynn0-zwin-uxs-projects.vercel.app`.
- Vercel Authentication is enabled for production deployment URLs and all previews.
- Unauthenticated `curl -I https://hub-o0anzynn0-zwin-uxs-projects.vercel.app` returns `401 Unauthorized`.
- Public production aliases for the hub were removed after confirming they were not protected by standard deployment protection.
- Latest host fixture report: `.clawdbot/verification/host-contract-fixture-1780162930107.json`.
- Latest extension skill fixture report: `.clawdbot/verification/extension-skill-fixture-1780164331918.json`.

## Environment Gate

Windows scheduled-task registration is blocked on this machine for the current user:

```text
Access is denied.
```

This happens through both the PowerShell scheduled-task API and `schtasks`. The install script now targets the current user with a limited run level, but this machine still requires elevated permission or a policy change for scheduled-task registration.

The packaged alpha carries a private Windows Node runtime. If the app cannot find its bundled runtime, it can still fall back to `SUPERIOR_NODE_PATH` or system Node as a recovery path.

GitHub may rate-limit unauthenticated Repo Reader calls. Add `GITHUB_TOKEN` or `GH_TOKEN` to the local daemon environment when running repeated repo reads.

The Chrome Web Store privacy policy source exists at `docs/extension-privacy.md`, but the final public GitHub URL cannot return `200` until this repo has a configured remote/public docs location. GitHub Releases artifact links are also blocked until that remote exists.

## Current Alpha Shape

SUPERIOR now has:

- A packaged Windows exe/installer.
- A native Windows source lane under `apps/windows` for the official EXE path.
- A repeatable native proof gate that builds the WPF app, smoke-launches the EXE, and runs host contract fixtures.
- Native Windows scheduled-task service controls and a smoke path that reports policy blocks as `needs-admin`; elevated admin smoke verifies install/uninstall works.
- A native repo loop path in the `.NET` app: repo URL input, Repo Reader, saved workspace state, playpen start/stop, and proof notes.
- A native MSI path with packaged Node, daemon, and MV3 extension resources.
- Native OpenAI key controls that save the daemon-readable key file under `%APPDATA%\SUPERIOR\.clawdbot\.env.local`.
- A static private Vercel hub under `apps/hub` for release proof, platform status, artifact links, caveats, and agent packets.
- A GitHub-first public hub in `README.md` with visual alpha positioning and platform status.
- A desktop-managed local daemon boundary.
- A packaged daemon runtime with bundled Node.
- A packaged MV3 extension folder for Chrome/Edge `Load unpacked`.
- User-local packaged key/state lookup under `%APPDATA%\SUPERIOR\.clawdbot\`.
- First-run key folder visibility in the Workshop Options tray.
- A Chrome/Edge extension build.
- A Chrome Web Store package artifact for `0.8.0`.
- A Chrome Web Store listing packet and privacy policy source doc.
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
