# SUPERIOR Build Plan

Current source of truth:

- Full spec: [full-product-spec.md](full-product-spec.md)
- Release ladder: [release-ladder.md](release-ladder.md)
- Verification: [alpha-verification.md](alpha-verification.md)
- Video proof gate: [video-proof-gate.md](video-proof-gate.md)
- Godot engine direction: [superior-alpha-engine.md](superior-alpha-engine.md)
- Functional core sprint: [functional-core-sprint.md](functional-core-sprint.md)
- Agent execution model: [agent-execution-model.md](agent-execution-model.md)
- Agent packets: [agent-packets.md](agent-packets.md)
- PRD task board: [prd-task-board.md](prd-task-board.md)
- Codex sprint gates: [codex-sprint-gates.md](codex-sprint-gates.md)
- Native platform reset: [native-platform-reset.md](native-platform-reset.md)
- Mobile platform plan: [mobile-platform-plan.md](mobile-platform-plan.md)
- Mobile 3D asset pipeline: [mobile-3d-asset-pipeline.md](mobile-3d-asset-pipeline.md)
- Release proof packet: [release-proof-packet.md](release-proof-packet.md)

## Current Release Focus

Current focus is `0.19 Beta Candidate Gate`:

- preserve the `0.18` spore ownership proof loop
- prove clean install, account/spore setup, Chrome hand bind, starter skill proof, uninstall/reinstall, and persisted spore identity
- keep Godot as the primary visual runtime and Windows as the install proof lane
- keep extension as the Chrome hand
- keep mobile and ChatGPT as read-only companion/route surfaces until the Windows loop is stable
- keep model credentials, pairing tokens, browser profiles, and repo workspaces local
- use GitHub Releases as the artifact shelf when a remote exists

Recommended work packet:

- `0.19 Clean Install Ownership Loop`
- Prove a fresh install can wake/register one spore, bind Chrome, run the starter skill, and reload the same spore after reinstall.
- Close with fixture reports, artifact paths, and the release proof packet.
- Current next build action: rebuild installer/extension artifacts from the latest commit, then run live Google/X/Discord OAuth smoke against the configured Supabase project.

## Phase 1: Product Frame

- Lock the primary browser use case.
- Lock the `SUPERIOR` launcher structure.
- Define the desktop, extension, and daemon responsibilities.
- Write the first-run flow and main action states.
- Decide what data is local, synced, or never stored.
- Define the bot customization model: name, body, color, eye, skills, rules, and browser link.
- Lock the desktop composition: left launcher, center creature stage, right parts tray.
- Replace explanatory copy with visible state wherever possible.

## Phase 2: Foundation

- Create shared TypeScript types in `packages/shared`.
- Establish app-to-daemon communication contracts.
- Establish shared bot identity contracts used by desktop, extension popup, floating buddy, and right-click icon.
- Establish the `Superior` skill catalog with source, status, category, attachment, and game loop metadata.
- Add a JS/TS-only custom skill import proposal contract.
- Add basic logging and recoverable error paths.
- Make browser pairing daemon-owned instead of extension-invented.
- Create a small fixture-driven demo path.
- Add contract tests for every cross-process message shape.

## Phase 3: Desktop Alpha Harness

- Build the `SUPERIOR` launcher as a fast integration harness.
- Add the left-side clay menu: Continue, New Bot, Customize Bot, Skills, Browser Link, Options, Quit.
- Build the live clay bot preview on a small workbench scene.
- Replace feature-list thinking with a skill loadout surface: fixed slots, stowed runnable parts, and short effects.
- Add the `Superior Skill Cabinet` as the source of parts, not the primary user model.
- Keep source-mapped Synergy/SUP skills hidden until a working adapter exists.
- Add creation steps: Name, Body, Color, Eye, Skills, Rules, Browser, Finish.
- Add recent activity and current status.
- Add settings for only the required daemon and extension controls.
- Verify desktop and narrow-window layouts.
- Do not treat this harness as the final Windows platform.

## Phase 3B: Native Windows App

- Build the official Windows EXE under `apps/windows`.
- Use native `.NET` Windows UI, not a localhost web surface.
- Start with health, bot identity, function catalog, browser pairing status, and recent function proof.
- Rebuild the workbench as native platform rendering.
- Add tray, installer, service lifecycle, credential storage, and clean uninstall behavior in later slices.
- Pass the host contract fixture before replacing alpha harness behavior.

## Phase 4: Browser Extension

- Build the minimum extension shell.
- Connect extension actions to shared contracts.
- Render the selected bot identity in the popup.
- Generate or select the right-click icon as a tiny clay head version of the current bot.
- Add permission copy that is specific and restrained.
- Test install, disable, and reconnect states.

## Phase 5: Daemon

- Implement the background runner.
- Add start, stop, health, and task status messages.
- Add a Windows service install path for running the daemon at login.
- Keep daemon output inspectable enough for debugging.
- Add guardrails for repeated failures.
- Add `POST /custom-skills/import-proposal` for scanning JS/TS project folders before any adapter execution.

## Phase 6: Visual And Motion Pass

- Apply the clean utility layer from `docs/clean-ui-motion-plan.md` without losing the clay launcher identity.
- Add clay button hover, active, disabled, and focus states.
- Add bot idle bounce, blink, head tilt, and body-specific motion.
- Add skill attachment pop-in behavior.
- Add stale-token shake and status-dot pulse for recoverable browser states.
- Keep the right tray mode-based: Skills, Browser Link, Custom Import, Result, Options.
- Confirm the material reads as matte clay rather than plastic, metal, or generic vector art.
- Confirm the UI does not drift into generic SaaS dashboard structure.
- Confirm desktop does not drift into a phone settings layout.
- Confirm mobile prep does not become a shrunken desktop Workshop.
- Confirm each customization choice changes a visible part of the creature.
- Confirm non-runnable future skills do not appear as selectable loadout parts.

## Phase 7: QA Pass

- Test the core loop end to end.
- Verify empty, loading, success, error, offline, and permission states.
- Review copy for filler and generic AI phrasing.
- Confirm mobile-width or narrow-window behavior where applicable.
- Verify bot identity consistency across desktop, floating buddy, extension popup, and right-click icon.
