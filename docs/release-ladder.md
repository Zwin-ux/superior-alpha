# SUPERIOR Release Ladder

`0.x` builds are alpha slices. `1.0` is the first official Beta.

Every release cycle must follow [platform-release-testing.md](platform-release-testing.md): contract proof, platform package proof, clean install proof, browser/skill proof, and visual QA proof.

## 0.1 Current Alpha Baseline

- Monorepo, desktop shell, daemon, extension, Repo Reader, Page Explainer, Article X-Ray, and SUPERIOR Browser playpen.
- Proof: root checks, Windows package build, browser playpen pairing, and browser skills.

## 0.2 Repo Playpen Alpha

- Harden the repo-to-browser loop.
- Add browser inspection notes: current URL, title, browser kind, extension paired state, console errors, and network failures.
- Add active-page proof from the paired extension so tab switches are reflected in the Workshop.
- Keep playpen notes compact: `started`, `home loaded`, `extension paired`, `repo opened`, `page inspected`, `skill ran`, `stopped`, `failed`.
- Proof: fresh Windows package build plus daemon route checks.

## 0.3 Clay Asset Pass

- Replace placeholder heads/icons with final alpha creature art.
- Lock the same bot identity across Workshop, browser home, extension popup, toolbar icon, and saved profile favicon.
- Goal: SUPERIOR feels owned before Beta hardening.
- Current proof:
  - 0.3 raster shelf added under `assets/bots/0.3/`.
  - Desktop mirrors 0.3 references for Vite runtime loading.
  - Workshop shell uses the key art for clay lighting/proportion reference without turning it into a static background.
  - Extension/default icon exports include `16`, `32`, `48`, `128`, and `256`.
  - Desktop and narrow screenshots are saved under `.clawdbot/qa-03-*.png`.

## 0.4 Function Kernel Alpha

- Register runnable skills through one daemon-owned function catalog.
- Route existing skill/playpen/custom-import endpoints through one internal runner without making any one skill the product center.
- Keep fixed slots: `Eye`, `Crown`, `Side`, `Badge`, `Charm`.
- Keep custom JS/TS skill import proposal-only until a local smoke run passes.
- Add host-agnostic contract fixtures so the same behavior can be proven against Node now and `.NET` later.
- Treat functions as equipped robot parts, not feature cards.
- Make successful function runs visible through physical bot confirmation before logs or notes.
- Current correction: `apps/desktop` is an alpha harness only. Platform work moves to the native Windows lane in `apps/windows`.

## 0.5 Windows Native App Alpha

- Build the `.NET` Windows EXE path without cloning the Tauri harness.
- Implement native window frame, local daemon health, bot identity render, function catalog, and recent proof first.
- Add scheduled-task service lifecycle controls: status, start, stop, install, uninstall, and `needs-admin` recovery.
- Add private Vercel hub for release proof, platform matrix, artifact index, agent packets, and caveats.
- Keep GitHub Releases as the artifact shelf; the hub indexes artifacts, it does not store robot runtime data.
- Run the same contract fixture suite against the Node daemon and the `.NET` host.
- Keep the Tauri/Node path as an integration lab until the native Windows lane passes real fixture proof.
- No localhost UI or Vite dependency is acceptable for the official EXE.

## 0.6 Native Repo Loop Alpha

- The `.NET` Windows app can accept a GitHub repo URL, run Repo Reader, save a workspace, start a robot-owned browser profile, pair through the session home path, run Article X-Ray, record `skill_ran`, and stop.
- Proof target: `https://github.com/openai/openai-node`.
- Proof command: `corepack pnpm windows:native-loop-smoke`.
- Goal: the official Windows shell can run the core robot loop without the Tauri harness.

## 0.7 Windows Beta Gate

- Build the native Windows MSI and prove the installed app loop on the current machine.
- Add native OpenAI key entry, packaged daemon runtime, packaged Node, and staged MV3 extension resources.
- Proof commands: `corepack pnpm windows:msi` and `corepack pnpm windows:installed-loop-smoke`.
- Goal: install the official Windows shell, start the packaged local brain, run the repo playpen loop, and uninstall cleanly.

## 0.8 Chrome Extension Store Gate

- Prepare the Chrome MV3 extension for a public Web Store listing.
- Lock the user-created bot into the runtime toolbar icon and popup identity through background daemon sync.
- Package `.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip` with MV3, local-only host permissions, popup, worker, controlled-profile content script, and clay icon sizes.
- Add the public privacy policy doc and listing packet for Chrome review.
- Goal: the extension feels like the user's robot in the browser, not a generic companion popup.

## 0.9 Bot Creation Alpha

- Build the first real setup flow around one active bot, not a roster.
- Add starter presets: `Clawd`, `Hermes`, and `Mote`; presets seed the current `BotIdentity` and can be renamed/customized before save.
- Add daemon setup contracts: `GET /bot-presets`, `GET /bot-creation-options`, `GET /setup-state`, and final save through `PUT /bot-identity`.
- Native Windows `New Bot` opens setup mode: `Power`, `Key`, `Browser`, `Shape`, `Skills`, `Build`, `Save`.
- User-facing onboarding starts from an empty bench, chooses shape, then fits runnable skill parts.
- Goal: waking up a small desktop creature feels like a physical setup loop, while daemon, extension, playpen, and icons still follow one active bot.

## 0.10 Godot Engine Reset

- Make Godot the primary visual runtime.
- Add `superior/core`, `superior/server`, and `superior/godot-client`.
- Prove boot screen, low-poly signal room, pixel HUD, avatar, in-world terminal, and realtime server patch flow.
- Keep WPF/Tauri as proof harnesses, not the product shell.
- Goal: SUPERIOR starts feeling like a game console OS connected to a server brain.

## 0.11 Beta Candidate

- First-run recovery, package/export QA, and fewer setup assumptions after the Godot signal room is real.
- Godot export proof must replace WPF visual proof as the main product shell gate.

## 1.0 Official Beta

- A fresh Windows install can open SUPERIOR, start a robot-owned browser, pair the extension, equip runnable skills, and show physical proof when those skills run.
- Official Beta means platform-native Windows behavior: native installer/service lifecycle, local credential storage, staged extension, and a backend host that preserves shared contracts.
