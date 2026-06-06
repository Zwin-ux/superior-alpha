# SUPERIOR Mobile 3D Asset Shelf

This shelf prepares dimensional bot assets for the future mobile companion lane.

Mobile should not copy the desktop Workshop. The first mobile asset target is a small, inspectable clay bot that can sit in a native companion screen beside recent proof, device state, and share-sheet captures.

## Current Runtime Contract

- Shipping format: GLB, glTF 2.0 binary.
- First generated asset: `generated/mobile-clawd-gremlin.glb`.
- Identity target: `Clawd / Gremlin / Moss Green / Pixel Eye / Article X-Ray`.
- Source of truth: `asset-manifest.json`.
- Quality report: `generated/mobile-3d-quality-report.json`.

## Commands

```powershell
corepack pnpm assets:mobile-3d-generate
corepack pnpm assets:mobile-3d-validate
corepack pnpm assets:mobile-3d
```

## Design Rules

- Keep the bot dimensional and tactile, not a flat sticker.
- Preserve one-spore-many-shells identity: mobile reads the same `BotIdentity`, not a mobile-only mascot.
- Keep asset names stable so native mobile code can bind parts without guessing.
- Use matte clay materials with warm shadows and no metallic or hologram treatment.
- Keep file size and triangle count low enough for a companion surface.

## Mobile Use

Use the GLB as a future native/mobile preview asset for:

- bot identity viewer
- equipped part preview
- recent proof confirmation
- pairing/device state
- share-sheet capture feedback

Do not use this shelf to build a phone-sized desktop Workshop.
