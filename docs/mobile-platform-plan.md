# SUPERIOR Mobile Platform Plan

## Role

Mobile is a companion lane, not the main Workshop.

The desktop EXE is where users build and run the robot-owned playpen. Mobile should keep the robot present when the user is away from the EXE.

## Native Direction

- iOS: Swift/SwiftUI.
- Android: Kotlin/Jetpack Compose.
- Shared behavior comes from contracts, not copied desktop UI.

Do not ship the desktop layout in a phone shell.

## First Useful Mobile Slice

After Windows native proof:

1. Bot identity viewer.
2. Equipped parts and recent proof.
3. Device pairing status.
4. Share-sheet link capture.
5. Read-only skill result history.

No local OpenAI key should live in mobile storage in the first mobile lane.

## Dimensional Asset Direction

Mobile currently risks feeling flat because the lane only describes status and history. The correction is not to copy the desktop Workshop; it is to give the companion screen one strong dimensional object.

Use `assets/bots/mobile-3d/` as the mobile asset contract:

- `generated/mobile-clawd-gremlin.glb` is the first low-poly clay bot proof.
- `asset-manifest.json` defines GLB budgets, required node names, coordinate rules, and identity mapping.
- `corepack pnpm assets:mobile-3d` generates and validates the GLB.
- Detailed pipeline: [mobile-3d-asset-pipeline.md](mobile-3d-asset-pipeline.md).

Mobile screen shape:

- top: dimensional bot identity, not a hero block
- middle: recent proof and paired device state
- bottom: share/capture actions and short skill results

Avoid:

- desktop left-menu/right-tray clones
- generic mobile dashboard cards
- flat avatar-only identity without parts
- local model key storage

## Contract Needs

Mobile should consume the daemon's read-only companion envelope first:

```text
GET /mobile-companion
```

The response is `MobileCompanionResponse` from `packages/shared`.

It includes:

- bot identity summary
- recent proof summary
- device pairing state
- share intent payload
- result detail without local desktop secrets
- mobile asset reference for the same active spore

It excludes:

- raw browser pairing tokens
- OpenAI keys and key paths
- browser profile paths
- debug ports
- page text
- local repo workspace data

Validate this boundary with `corepack pnpm fixture:mobile-companion`.

This lane should not start until the Windows native loop and extension loop are dependable.
