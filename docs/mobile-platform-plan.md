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

## Contract Needs

Mobile should eventually consume a mobile-safe contract layer:

- bot identity summary
- recent proof summary
- device pairing state
- share intent payload
- result detail without local desktop secrets

This lane should not start until the Windows native loop and extension loop are dependable.
