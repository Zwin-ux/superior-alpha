# Mobile Companion Packet

## Goal

Prepare mobile as a companion surface after the Windows loop is dependable.

## Next Move

Define mobile-safe contracts and keep one dimensional bot asset ready:

- `GET /mobile-companion`
- `MobileCompanionResponse` in `packages/shared`
- bot identity summary
- equipped parts
- recent proof
- device pairing state
- share-sheet intent contract
- mobile GLB asset reference

## Proof

```powershell
corepack pnpm typecheck
corepack pnpm assets:mobile-3d
corepack pnpm fixture:host-contract
corepack pnpm fixture:mobile-companion
```

## Caveat

Do not clone the desktop workbench onto a phone. Mobile is companion status and capture, not the main robot bench.

The first 3D asset shelf is `assets/bots/mobile-3d/`. It exists to fix flatness with one dimensional bot object, not to start a separate mobile mascot.
