# SUPERIOR Alpha Verification

Last checked: 2026-06-05

## Passing Evidence

- Root typecheck passes: `corepack pnpm typecheck`
- Root tests pass: `corepack pnpm test`
- Root build passes: `corepack pnpm build`
- Godot primary engine lane is scaffolded under `superior/godot-client`.
- Godot vertical slice includes the 0.14 robot wake sequence, clay lamp reveal, concept-mapped workshop menu, Clawd Gremlin, terminal mock events, WebSocket fallback, lighter CRT pixel shader pass, and input-driven reactions.
- 0.14 clay factory export passes: `corepack pnpm assets:factory-export`.
- 0.14 clay factory quality gate passes: `corepack pnpm assets:quality-gate`.
- Godot scaffold check passes with the 0.14 quality gate first: `corepack pnpm superior:engine-check`.
- Godot 4.6.3 is installed locally through Winget and detected by the Godot client check.
- Godot engine proof recorder passes: `corepack pnpm video:godot-engine`.
- Godot proof recorder now uses Godot `--write-movie`, not desktop-region capture, so it cannot pass by recording the wrong foreground window.
- Godot production showcase recorder passes: `corepack pnpm video:showcase`.
- Production showcase uses `SUPERIOR_SHOWCASE=1` for a 22-second product-facing capture: SUPERIOR boot, spore wake, body fit, eye fit, role stamp, Chrome icon match, Article X-Ray skill proof, spore reaction, Spore Garden, Workshop reactions, generated in-engine sound effects, and physical menu/slot feedback.
- Latest 0.18 production showcase MP4: `.clawdbot/video-proof/2026-06-02T15-56-17-777Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T15-56-17-777Z.mp4`.
- Latest 0.18 production showcase poster: `.clawdbot/video-proof/2026-06-02T15-56-17-777Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T15-56-17-777Z.png`.
- Latest 0.18 production showcase contact sheet: `.clawdbot/video-proof/2026-06-02T15-56-17-777Z-godot-showcase/review-frames/contact-sheet-1s.png`.
- Latest production showcase contains `h264` video and `aac` audio streams.
- Latest 0.18 Godot proof MP4: `.clawdbot/video-proof/2026-06-02T15-50-26-913Z-godot-engine/SUPERIOR-godot-engine-2026-06-02T15-50-26-913Z.mp4`.
- Latest 0.18 Godot proof poster: `.clawdbot/video-proof/2026-06-02T15-50-26-913Z-godot-engine/SUPERIOR-godot-engine-2026-06-02T15-50-26-913Z.png`.
- Latest 0.18 Godot onboarding contact sheet: `.clawdbot/video-proof/2026-06-02T15-50-26-913Z-godot-engine/review-frames/contact-sheet-1s.png`.
- 0.18 Spore Birth planning gate passes: `node C:\Users\mzwin\.codex\skills\superior-spore-birth-gate\scripts\check_spore_birth_gate.mjs C:\Users\mzwin\Documents\Buddy\clawdbot --planning` reports `39` pass, `0` fail.
- 0.18 Spore Birth implementation gate passes: `node C:\Users\mzwin\.codex\skills\superior-spore-birth-gate\scripts\check_spore_birth_gate.mjs C:\Users\mzwin\Documents\Buddy\clawdbot --implementation` reports `66` pass, `0` fail.
- Godot Clay Quality Pass packet is the next accepted visual plan: `docs/agent-packets/godot-clay-quality-pass.md`.
- Godot Clay Quality Pass resolves the prior open design items: manual clay render method, bundled runtime font direction, and prop density budget.
- Godot Clay Quality Pass first build slice now has protected manual plates for `scene.wall`, `scene.table`, `scene.bottom-card`, and `scene.status-pill`.
- 0.14 factory report now records source kind counts: `manual: 4`, `generated-fallback: 18`.
- Godot onboarding now routes boot into a device-first ritual before Workshop: Wake Spore, Body, Eye, Role, Browser, Stamp.
- The setup scene ties the spore to local ownership, the Chrome hand icon path, and one starter skill proof before the user enters the wider home.
- Superior core contracts build and test: `corepack pnpm --filter @superior/core build` and `corepack pnpm --filter @superior/core test`.
- Superior realtime server builds: `corepack pnpm --filter @superior/server build`.
- Superior realtime server smoke accepted a `browser` signal and returned state revision `2`.
- Video proof gate is installed: `corepack pnpm video:proof`
- Video proof writes MP4 critique artifacts under `.clawdbot/video-proof/` and tracks the latest run in `.clawdbot/video-proof/latest.json`.
- Latest video proof MP4: `.clawdbot/video-proof/2026-05-30T19-15-58-664Z-workshop/SUPERIOR-workshop-2026-05-30T19-15-58-664Z.mp4`.
- Latest video proof duration: `16.12s` at `1280x720`.
- Host contract fixture passes: `corepack pnpm fixture:host-contract`
- Host contract fixture now verifies `GET /bot-presets` and `GET /setup-state`.
- Latest host contract fixture report: `.clawdbot/verification/host-contract-fixture-1780167726706.json`.
- Shared tests verify starter presets seed valid active bot identities and only include runnable skills.
- Shared tests verify `BotSpore` export keeps portable identity safe and excludes raw pairing tokens.
- Shared tests verify empty-bench creation starts from shape choices and runnable JRPG-style loadout parts.
- Host contract fixture verifies `/bot-creation-options` returns platform-agnostic shape and skill options.
- Soul asset shelf imported under `assets/bots/soul/`; Windows and Chrome static icons now use the provided Clawd/Hermes starter avatar assets.
- Native Windows toolchain/proof gate passes with the 0.9 setup surface: `corepack pnpm windows:proof`.
- Extension MV3 build passes: `corepack pnpm --filter @clawdbot/extension build`
- Extension skill fixture passes after 0.9 setup contracts: `corepack pnpm fixture:extension-skill`.
- Latest extension skill fixture report: `.clawdbot/verification/extension-skill-fixture-1780166561792.json`.
- Extension Chrome store package passes: `corepack pnpm extension:store-package`
- Extension Chrome store artifact produced: `.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip`
- Extension store validator confirms MV3, `SUPERIOR` name, version `0.8.0`, exact permissions, localhost-only host permissions, popup, worker, controlled-profile content script, and `16/32/48/128/256` icons.
- GitHub README is the public alpha hub with `ALPHA BUILD` stamp, workshop imagery, and SVG platform cards for Windows, Chrome, and macOS.
- Public GitHub repo is live: `https://github.com/Zwin-ux/superior-alpha`.
- Alpha prerelease is live with Windows MSI and Chrome MV3 ZIP: `https://github.com/Zwin-ux/superior-alpha/releases/tag/v0.8.0-alpha`.
- Chrome privacy policy URL is live: `https://github.com/Zwin-ux/superior-alpha/blob/main/docs/extension-privacy.md`.
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
- 0.19 reinstall persistence proof passes with `Loop Clawd`: install, save a known Gremlin/Moss/Pixel spore, run native repo loop, uninstall/reinstall, relaunch, confirm the same active spore loads, then restore the original bot identity.
- Latest 0.19 reinstall persistence fixture report: `.clawdbot/verification/native-loop-fixture-1780644556596.json`.
- 0.19 first-run recovery proof passes: the native Windows setup tray now distinguishes daemon offline, missing OpenAI key, missing Chrome/Edge browser, and unpaired browser hand states with short recovery actions.
- Latest 0.19 recovery sprint report: `.clawdbot/sprint-gates/2026-06-05T07-38-55-693Z-first-run-recovery-states.json`.
- Latest 0.19 recovery host-contract report: `.clawdbot/verification/host-contract-fixture-1780645193444.json`.
- 0.19 account/spore continuity proof passes: seeded Google/X/Discord account state can coexist with a separate local active spore, portable spore export stays secret-free, mobile companion exposes only safe account display state, and account sign-out does not delete the local spore.
- Latest 0.19 account/spore sprint report: `.clawdbot/sprint-gates/2026-06-06T14-32-38-492Z-account-spore-continuity.json`.
- Latest 0.19 account continuity fixture report: `.clawdbot/verification/supabase-account-continuity-fixture-1780756432099.json`.
- Latest 0.19 account continuity installed-loop fixture report: `.clawdbot/verification/native-loop-fixture-1780756452577.json`.
- Private hub package builds with public-safe validation: `corepack pnpm --filter @clawdbot/hub build`.
- Vercel protected deployment is ready: `https://hub-o0anzynn0-zwin-uxs-projects.vercel.app`.
- Vercel Authentication is enabled for production deployment URLs and all previews.
- Unauthenticated `curl -I https://hub-o0anzynn0-zwin-uxs-projects.vercel.app` returns `401 Unauthorized`.
- Public production aliases for the hub were removed after confirming they were not protected by standard deployment protection.
- Latest host fixture report: `.clawdbot/verification/host-contract-fixture-1780162930107.json`.
- Latest extension skill fixture report: `.clawdbot/verification/extension-skill-fixture-1780164331918.json`.
- Account OAuth wiring added for Supabase Google and X providers:
  - Shared contracts include `SuperiorAccountStartOAuthRequest`, `SuperiorAccountOAuthStartResult`, and provider connection metadata.
  - Supabase account Edge Function exposes `POST /account/start-oauth`.
  - Account RLS migration includes safe `account_connections` rows for `google` and `x`.
  - Account contracts retain Google, X, and email-code routes; the 0.18 Godot onboarding proof does not foreground provider setup.
- Focused account checks pass:
  - `corepack pnpm --filter @clawdbot/shared build`
  - `corepack pnpm --filter @clawdbot/shared test`
  - `corepack pnpm --filter @clawdbot/daemon typecheck`
  - `corepack pnpm fixture:supabase-account`
  - `deno check --node-modules-dir=auto supabase/functions/account/index.ts`
- Full workspace gates pass after OAuth wiring:
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm build`
- Latest Godot engine proof after account-provider onboarding update:
  - `.clawdbot/video-proof/2026-05-31T10-08-26-589Z-godot-engine/SUPERIOR-godot-engine-2026-05-31T10-08-26-589Z.mp4`
- Extension ownership proof tightened for the investor demo loop:
  - The MV3 background worker paints the last stored bot icon first, then refreshes from `/bot-identity`.
  - If the daemon is offline, the toolbar keeps the user's last saved bot instead of reverting to the default icon.
  - Tab completion, tab activation, window focus, startup, install, popup open, pairing, and controlled-profile attach all feed the same identity sync path.
  - Runtime message `superior-sync-bot-identity` can force the exact active spore into the toolbar icon without opening the popup.
  - Store package remains permission-tight with no new Chrome permissions.
- Extension ownership checks pass:
  - `corepack pnpm --filter @clawdbot/extension typecheck`
  - `corepack pnpm --filter @clawdbot/extension test`
  - `corepack pnpm --filter @clawdbot/extension build`
  - `corepack pnpm extension:store-package`
  - Store artifact: `.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip`
- Full workspace gates pass after extension ownership proof:
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm build`
- 0.15 Spore Ownership remains the contract basis for the active 0.18 Godot ritual proof:
  - `corepack pnpm fixture:spore-ownership`
  - `corepack pnpm demo:spore-ownership`
  - Saves one active spore: `Clawd / Gremlin / Moss Green / Pixel Eye / Article X-Ray`.
  - Proves `/setup-state` sees the saved spore.
  - Proves portable spore export excludes raw pairing tokens and model secrets.
  - Proves the generated extension icon identity differs from default and carries Gremlin/Moss/Pixel/Article X-Ray details.
  - Pairs the Chrome hand with safe extension id `spore-ownership-demo-extension`.
  - Runs Article X-Ray through `/functions/run` and records a success bot reaction on the `Eye` slot.
- 0.15 Spore Ownership Art Spec exists in Figma: `https://www.figma.com/design/8C6EiZivpUIxyLw0b6YT9R`.
- 0.15 ownership atlas lane is added:
  - `corepack pnpm assets:ownership-export`
  - `corepack pnpm assets:ownership-quality-gate`
  - Contact sheet: `assets/bots/0.15/sheet/superior-spore-ownership-contact-sheet.png`
  - Runtime atlas: `assets/bots/0.15/sheet/superior-spore-ownership-atlas.png`
  - Godot atlas: `superior/godot-client/assets/clay/superior-spore-ownership-atlas.png`
  - Code Connect-ready map: `assets/bots/0.15/code-connect-map.json`
  - True Figma Code Connect mapping is blocked until the Figma workspace has a Developer seat on an Organization or Enterprise plan.
- Godot onboarding now puts Browser after the spore has body, eye, and role, so the Chrome hand copies an already-built Clawd instead of showing a text-only browser check.
- The 0.18 onboarding MP4 shows a visible Chrome hand dock: generic extension bead -> matched Clawd toolbar icon -> `ICON MATCH` -> Article X-Ray `SKILL RAN` -> spore reaction -> registry stamp.
- Godot onboarding now reads as a first-boot ritual instead of a settings dashboard:
  - `Wake Spore -> Body -> Eye -> Role -> Browser -> Stamp -> Workshop`.
  - Left rail uses completed/current/upcoming/locked setup states.
  - Center stage starts dim, wakes the spore under the lamp, then attaches modules as the setup advances.
  - Browser hand is a device-pairing dock with Chrome detected, extension ready, icon match, and bind-to-spore feedback.
  - Bottom hardware status indicators stay quiet until Browser and Stamp, then progress toward Browser Linked and Workshop Open.
- Latest 0.18 spore ownership fixture report: `.clawdbot/verification/spore-ownership-fixture-1780407320488.json`.
- Latest 0.18 Godot proof MP4: `.clawdbot/video-proof/2026-06-02T15-50-26-913Z-godot-engine/SUPERIOR-godot-engine-2026-06-02T15-50-26-913Z.mp4`.
- Latest 0.18 Godot proof poster: `.clawdbot/video-proof/2026-06-02T15-50-26-913Z-godot-engine/SUPERIOR-godot-engine-2026-06-02T15-50-26-913Z.png`.
- Latest 0.18 Godot proof contact sheet: `.clawdbot/video-proof/2026-06-02T15-50-26-913Z-godot-engine/review-frames/contact-sheet-1s.png`.
- Mobile dimensional asset prep is now gated without widening the alpha surface:
  - `corepack pnpm assets:mobile-3d`
  - First GLB: `assets/bots/mobile-3d/generated/mobile-clawd-gremlin.glb`
  - Validation report: `assets/bots/mobile-3d/generated/mobile-3d-validation-report.json`
  - Latest result: 492 triangles, 19064 bytes.
- Mobile companion contract prep is now gated without starting mobile app build-out:
  - `GET /mobile-companion`
  - Shared response: `MobileCompanionResponse`
  - Host fixture check confirms the route omits raw pairing tokens, model keys, browser profile paths, debug ports, and page text.
  - Dedicated mobile companion fixture starts an isolated daemon, runs an Article X-Ray proof with sentinel page text and URL query data, then proves the mobile companion response does not expose that raw desktop/browser material.
  - Latest host fixture report: `.clawdbot/verification/host-contract-fixture-1780640308079.json`.
  - Latest mobile companion fixture report: `.clawdbot/verification/mobile-companion-fixture-1780640212004.json`.

## Environment Gate

Windows scheduled-task registration is blocked on this machine for the current user:

```text
Access is denied.
```

This happens through both the PowerShell scheduled-task API and `schtasks`. The install script now targets the current user with a limited run level, but this machine still requires elevated permission or a policy change for scheduled-task registration.

The packaged alpha carries a private Windows Node runtime. If the app cannot find its bundled runtime, it can still fall back to `SUPERIOR_NODE_PATH` or system Node as a recovery path.

GitHub may rate-limit unauthenticated Repo Reader calls. Add `GITHUB_TOKEN` or `GH_TOKEN` to the local daemon environment when running repeated repo reads.

The Chrome Web Store privacy policy source exists at `docs/extension-privacy.md` and now has a public GitHub URL. Chrome Developer Dashboard upload and review remain manual.

The spore ownership fixture needs the local daemon listening at `http://127.0.0.1:5317`. In dev, start it with `corepack pnpm --filter @clawdbot/daemon dev` before running `corepack pnpm fixture:spore-ownership`; the 0.18 verification pass failed once with `fetch failed` until the daemon was started, then passed.

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
