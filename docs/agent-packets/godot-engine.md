# Godot Engine Packet

## Goal

Make the Godot client feel like the real SUPERIOR console: console-style boot, clay workshop menu, Clawd on the bench, runtime signals shown through physical room/bot reactions.

## Current Slice

`0.15 Spore Ownership Demo`

- `0.13` atlas is plumbing only.
- `0.14` factory assets are the runtime visual gate.
- `0.15` ownership assets are a second atlas dedicated to the Chrome hand and matched spore icon moment.
- The main proof path is `Boot.tscn -> Onboarding.tscn -> ClayWorkshop.tscn`.
- Godot MP4 proof must serve the same one-spore loop as the contract fixture: Clawd, Gremlin, Moss Green, Pixel Eye, Article X-Ray.
- The old abstract `SignalRoom` remains historical/reference only.

## Build Loop

```powershell
corepack pnpm assets:factory-export
corepack pnpm assets:quality-gate
corepack pnpm assets:ownership-export
corepack pnpm assets:ownership-quality-gate
corepack pnpm superior:engine-check
corepack pnpm --filter @superior/godot-client godot:check
corepack pnpm fixture:spore-ownership
corepack pnpm video:godot-engine
```

## Acceptance

- Boot reads like a small console startup, not a terminal.
- Poster frame shows clay workshop composition: left menu, lamp/sign, center Clawd, right tray, bottom status.
- MP4 shows the first-boot ritual: Wake Spore, Body, Eye, Role, Browser, Stamp, workshop reveal, and bot reaction.
- Left rail uses completed/current/upcoming/locked setup states instead of showing a static menu.
- Browser step uses a clean device-pairing card: Pair Browser Hand, Chrome detected, Extension ready, Icon match.
- No Godot-targeted 0.14 asset can be marked placeholder or plumbing.
- No 0.15 ownership asset can be marked fallback; the Chrome hand, toolbar slot, matched Clawd icon, cable, flash, and spore stamp must come from the ownership atlas.

## Review Decisions

- Design review: keep the workshop as the first read. HUD and terminal are secondary proof surfaces, not the frame's visual anchor.
- Design review: labels belong in Godot runtime text when they need to stay readable; clay art should carry material and silhouette, not brittle baked UI copy.
- Engineering review: video proof must use Godot `--write-movie`. Desktop-region capture is not acceptable because it can record the wrong window and still produce an MP4.
- Engineering review: preserve the 0.14 manifest IDs. Future hand-directed clay renders should replace generated PNGs behind the same asset IDs rather than changing scene code.
- Engineering review: preserve the 0.15 ownership mapping IDs. Figma component names map to asset IDs, and asset IDs map to Godot node names through `assets/bots/0.15/code-connect-map.json`.

## Next Weak Point

The 0.14 assets are procedural runtime parts. They are closer to the concept than the skeleton, but the next art pass should replace generated pieces with hand-directed clay renders while preserving the same manifest IDs and quality gate.

Next packet: [Godot Clay Quality Pass](godot-clay-quality-pass.md). It locks the design review decisions for hand-directed scene plates, larger readable status labels, runtime text ownership, interaction states, and MP4 acceptance gates.
