# SUPERIOR Mobile

This is the mobile lane for SUPERIOR.

Mobile should not be a shrunken desktop Workshop. It should be a companion surface for the user's robot:

- bot identity and equipped parts
- recent function proof
- account/device pairing later
- captured links or share-sheet inputs later
- compact skill results, not a full desktop bench

## Direction

Build mobile as native platform software when this lane becomes active:

- iOS: Swift/SwiftUI first-class app.
- Android: Kotlin/Jetpack Compose first-class app.
- Shared behavior comes from contracts and fixtures, not copied UI.

If a cross-platform mobile shell is used for an early proof, it must still obey native platform interaction patterns and cannot become the final design by default.

## Not Active Yet

The current hard gate is Windows native EXE plus Chrome/Edge extension. Mobile starts after the Windows loop proves install, local service, extension pairing, and function proof.

## Active Prep: Dimensional Bot Asset

The mobile lane is not active, but its first asset contract now exists so future mobile screens do not ship as flat status cards.

- Asset shelf: `assets/bots/mobile-3d/`
- First GLB: `assets/bots/mobile-3d/generated/mobile-clawd-gremlin.glb`
- Gate: `corepack pnpm assets:mobile-3d`

Use this asset for a compact identity/proof companion surface. Do not use it to recreate the desktop launcher on a phone.
