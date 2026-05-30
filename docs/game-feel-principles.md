# SUPERIOR Game-Feel Principles

SUPERIOR should be built like a small desktop game utility. The app shell is the launcher, the clay bot is the avatar, and the browser playpen is the level.

The goal is not to add game decoration. The goal is to make every action readable through feedback.

## Fantasy

You build a clay robot, equip it with parts, then send it into its own browser to inspect the internet and play with projects.

The robot is the user's avatar in the SUPERIOR environment. It should feel owned, local, and reactive.

## Player Verbs

- Build the bot.
- Equip parts.
- Read a repo.
- Start a playpen.
- Watch status change.
- Run a skill.
- Collect a result.
- Stop or reset the session.

If a feature does not map to one of these verbs, it probably belongs behind a tray, log, or later milestone.

## Core Loop

```text
Choose repo or page
-> equip the right robot parts
-> start the robot-owned playpen
-> run a skill
-> see the bot/parts/status react
-> collect a short note or result
-> choose the next move
```

This is the alpha loop. Do not obscure it with extra panels, marketing copy, or dashboard summaries.

## Valve-Feeling Rules

Use `Source utility` clarity:

- Controls look like tools.
- Runtime state is visible.
- Object names are plain.
- Debug/status output is compact and useful.
- The user can tell what changed after every action.

Use `Portal toy-lab` personality:

- The bot reacts before the UI explains.
- Parts attach like physical objects.
- Buttons depress, squish, or stamp.
- Success feels like a small machine working.
- Failure feels recoverable, not catastrophic.

Avoid:

- Text explaining that something is playful.
- Hype copy.
- Fake complexity.
- Permanent tutorials.
- Large panels covering the bot stage.

## Playfield And HUD

Treat the center workbench as the playfield. Protect it.

- Persistent UI belongs on the left menu, right tray, or bottom strip.
- The center should keep the bot readable.
- Long repo details, logs, and import proposals live in the right tray.
- The bottom strip is runtime state only.
- Transient feedback can appear near the bot, then disappear.

The DOM is the HUD. The clay bot stage is the game scene. Do not force text-heavy UI into canvas or decorative art.

## Feedback Budget

Every major action needs one visual feedback hook:

- `Customize`: bot silhouette, pigment, or eye changes instantly.
- `Equip`: part pops onto the head.
- `Start Playpen`: browser status changes and session note appears.
- `Extension paired`: icon/status light changes.
- `Skill ran`: the equipped attachment pulses, the eye reacts, and the bench gets a tiny stamped mark before any note appears.
- `Failure`: status light changes, one recovery action is visible.

Do not add five animations where one readable state change works.

## Input Model

Think in actions, not buttons:

- `confirm`: primary selected menu/action.
- `cancel`: close tray, stop transient view, or return to previous state.
- `equip`: select a part for a fixed slot.
- `inspect`: read repo/page state.
- `launch`: start a playpen.
- `stop`: stop daemon/browser work.
- `reset`: clear pairing/session state.

Physical inputs can change later. The action names should stay stable.

## Progression

Progression should be practical, not grindy:

- A saved repo becomes a workspace record.
- A successful playpen stores a short session note.
- A verified skill becomes available in the loadout.
- A custom skill stays hidden until its adapter passes a smoke run.
- The robot icon follows the user's identity across surfaces.

This is enough progression for alpha. Avoid badges, XP, level bars, or fake reward systems until the core loop is dependable.

## QA Checklist

Before shipping a slice, verify:

- The bot changes before copy explains the change.
- The center stage still reads as the primary focus.
- The right tray does not become a generic settings panel.
- The user can recover from offline daemon, missing key, unpaired extension, empty page text, and closed browser.
- A screenshot reads like a game launcher/tool, not an AI dashboard.
- The latest successful action is visible without opening logs.
