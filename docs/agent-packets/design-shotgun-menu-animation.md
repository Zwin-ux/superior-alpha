# Design Shotgun: Menu And Animation Pass

## Context

The current SUPERIOR showcase proves the flow, but the menus still need to read as toy-console hardware instead of flat labels. This pass improves the setup rail, parts tray, and Workshop menu feedback without widening scope.

## Variants Considered

### A. Toy Console Plates

Left rail steps are physical stamped plates with small hardware lights. Completed steps turn green, the current step pulses amber, and upcoming steps stay dim. Tray slots use the same light language.

Decision: **chosen**. It improves clarity and feels native to the clay/pixel device metaphor.

### B. Bench Carousel

Menu choices rotate around the spore as clay tokens. Stronger character-creation fantasy, but it risks crowding the center stage and stealing focus from Clawd.

Decision: hold for a later full onboarding redesign.

### C. Operator Panel

Menus become a compact industrial control surface with switches and meters. Clear, but too utilitarian for the Pokemon/Tamagotchi birth moment.

Decision: not for the main first-run flow.

## Implementation Notes

- Setup rail: remove `OK`/`LK` debug language; use numbered labels plus state lights.
- Parts tray: add slot LEDs and state tint for ready/equipped/stowed.
- Workshop: animate launcher slab focus and tray slot reactions when browser/repo/agent signals fire.
- Motion stays small: pulse, press, pop, glow. No page-slide wizard feel.

## Gate

The 18-second showcase should show:

- setup rail current step glowing without reading tiny copy
- tray slots lighting when equipped
- browser icon match still visible as the ownership beat
- Workshop menu/tray reacting to signal events
