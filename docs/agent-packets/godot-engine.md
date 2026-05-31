# Godot Engine Packet

## Goal

Make the Godot client feel like the real SUPERIOR console: console-style boot, clay workshop menu, Clawd on the bench, runtime signals shown through physical room/bot reactions.

## Current Slice

`0.14 Clay Factory Quality Gate + Boot/Menu Rebuild`

- `0.13` atlas is plumbing only.
- `0.14` factory assets are the runtime visual gate.
- The main proof path is `Boot.tscn -> ClayWorkshop.tscn`.
- The old abstract `SignalRoom` remains historical/reference only.

## Build Loop

```powershell
corepack pnpm assets:factory-export
corepack pnpm assets:quality-gate
corepack pnpm superior:engine-check
corepack pnpm --filter @superior/godot-client godot:check
corepack pnpm video:godot-engine
```

## Acceptance

- Boot reads like a small console startup, not a terminal.
- Poster frame shows clay workshop composition: left menu, lamp/sign, center Clawd, right tray, bottom status.
- MP4 shows the lamp/workshop reveal and three reactions: browser, repo, Clawd snap.
- No Godot-targeted 0.14 asset can be marked placeholder or plumbing.

## Review Decisions

- Design review: keep the workshop as the first read. HUD and terminal are secondary proof surfaces, not the frame's visual anchor.
- Design review: labels belong in Godot runtime text when they need to stay readable; clay art should carry material and silhouette, not brittle baked UI copy.
- Engineering review: video proof must use Godot `--write-movie`. Desktop-region capture is not acceptable because it can record the wrong window and still produce an MP4.
- Engineering review: preserve the 0.14 manifest IDs. Future hand-directed clay renders should replace generated PNGs behind the same asset IDs rather than changing scene code.

## Next Weak Point

The 0.14 assets are procedural runtime parts. They are closer to the concept than the skeleton, but the next art pass should replace generated pieces with hand-directed clay renders while preserving the same manifest IDs and quality gate.
