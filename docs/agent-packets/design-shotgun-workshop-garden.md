# Design Shotgun: Workshop Toybox + Spore Garden Island

## Goal

Make the Workshop less button-heavy and make the Spore Garden feel like a playful 3D place the creature lives in.

## Shotgun Directions

### A. Workbench Toybox

Cut the left rail down to the few verbs that matter and move secondary interactions into physical bench props.

- Launcher rail: `HOME`, `BUILD`, `LOADOUT`, `BROWSER`.
- Right rack: only equipped, runnable parts.
- Bench toys: browser crank, repo stamp, care bell.
- Feedback: click a prop, the matching part or bot reaction moves before text updates.

### B. Spore Garden Island

Turn the Garden from a table stage into a compact clay island inspired by pet gardens.

- 3D island with pond, bridge, toy ball, fruit, race stones, signal toy, and workshop gate.
- Clickable care objects: toy, fruit, signal, gate.
- Spore wanders subtly instead of standing still.
- Garden actions use care verbs: `PLAY`, `FEED`, `SIGNAL`, `GATE`.

### C. Signal Arcade

Make the Workshop a tight arcade control panel with lamps and counters.

- Strong readability.
- Good for proof/debug.
- Rejected for this pass because it keeps the product too close to a utility panel.

## Decision

Use `A + B`.

This keeps the product useful while pushing it toward a game-feeling desktop toy. The Workshop stays a launcher and proof surface. The Garden becomes the place for playful care, race, and attachment behavior.

## Acceptance

- The Workshop has fewer persistent buttons than the old seven-button launcher.
- The user can click at least three physical props outside the menu.
- The right tray does not show future empty slots.
- The Garden reads as a 3D environment, not a settings scene.
- The Garden has visible play/care objects and click targets.
- The bot reacts before labels explain the action.
- Godot proof still returns from Garden to Workshop.
