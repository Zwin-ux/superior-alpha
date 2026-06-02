# Spore Ownership Demo Packet

## Goal

Make the 0.15 proof undeniable:

```text
SUPERIOR boot -> Wake Spore -> choose body -> fit X-Ray Eye -> choose Builder role -> bind Chrome -> extension icon becomes Clawd -> stamp registry -> run skill -> Clawd reacts
```

This is the fundable wedge. Do not add more platforms, skills, starters, cloud behavior, or repo automation until this loop reads cleanly in an MP4.

## Locked Demo State

- One active bot: `Clawd`
- Shape: `Gremlin`
- Pigment: `Moss Green`
- Eye: `Pixel`
- Equipped skill: `Article X-Ray`
- Slot: `Eye`
- Browser hand: Chrome/Edge MV3 extension
- Runtime proof: daemon function run with success bot reaction

## Build Loop

```powershell
corepack pnpm assets:ownership-export
corepack pnpm assets:ownership-quality-gate
corepack pnpm fixture:spore-ownership
corepack pnpm video:godot-engine
```

Use the combined gate when closing the slice:

```powershell
corepack pnpm demo:spore-ownership
```

## Acceptance

- The fixture saves exactly one active spore and reads it back through `/setup-state`.
- The portable spore export contains appearance and skill data, but no raw pairing token or model secret.
- The icon proof differs from the default icon and contains the Gremlin/Moss/Pixel/Article X-Ray identity.
- Browser pairing reaches `paired`.
- Article X-Ray runs through `/functions/run` using the paired token.
- The result includes a success bot reaction on the `Eye` slot.
- Recent function proof shows the same reaction.
- The MP4 starts with the Godot boot, shows registration, shape, loadout, a visible Chrome hand icon match, save, then drops into the workshop.
- The onboarding reads like first device setup, not a settings dashboard: Wake, Body, Eye, Role, Browser, Stamp.
- The Chrome hand/icon moment reads without zoom: generic extension bead, cable pulse, matched Clawd toolbar icon, and spore stamp are all visible at 1280x720.
- The 0.15 ownership assets are manual-approved in `assets/bots/0.15`; no ownership asset may pass as generated fallback.

## Figma And Handoff

- Figma spec: `https://www.figma.com/design/8C6EiZivpUIxyLw0b6YT9R`
- Runtime atlas: `assets/bots/0.15/sheet/superior-spore-ownership-atlas.png`
- Godot atlas: `superior/godot-client/assets/clay/superior-spore-ownership-atlas.png`
- Code Connect-ready map: `assets/bots/0.15/code-connect-map.json`

## Cut List

- Do not build a multi-bot roster.
- Do not add more skills to the demo.
- Do not promote mobile, Mac, or hosted runtime as proof.
- Do not show internal Figma, Notion, or hub pages in the investor demo.
- Do not ship placeholder clay art as final proof.

## Next Weak Point

The ownership moment has dedicated plates now. The next weakness is final art fidelity: replace the hand-directed procedural plates with painted/sculpted clay renders behind the same 0.15 asset IDs, without changing the Godot node contract.
