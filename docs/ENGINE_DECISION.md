# Engine Decision: Godot For Superior Alpha

Superior is a signal-analysis console with a game-like runtime, not a normal app shell. The client needs a boot sequence, pixel HUD, low-poly 3D room, avatar, terminal, realtime sync feedback, and exports across desktop, mobile, and web.

## Decision

Use **Godot 4.x** as the primary visual runtime.

Godot gives Superior the right center of gravity:

- open-source and MIT licensed
- strong 2D and 3D in one editor
- fast iteration for UI, scenes, shaders, and animation
- exports to Windows, macOS, Linux, Android, iOS, and WebAssembly/HTML5
- good fit for SNES/Saturn/PS1-inspired console interfaces
- small enough for an alpha team to reason about without building an engine

## Compared Options

### Defold

Defold is lightweight and production-proven for 2D, but Superior needs a hybrid 2D HUD plus 3D signal room. Godot has the stronger built-in editor and 3D workflow for this product.

### GDevelop

GDevelop is approachable, but it is too no-code/game-template oriented for a custom realtime console OS. Superior needs typed contracts, custom shaders, extension/server sync, and platform-specific polish.

### Bevy

Bevy is technically attractive and Rust-native, but it would slow the alpha. Superior needs quick art/layout iteration and designer-friendly scene work now. Bevy can be revisited later for specific systems, not the first visual runtime.

### libGDX

libGDX is durable, but Java/Kotlin plus manual tooling is not the right path for this product's fast visual iteration. Godot gives a more direct scene, shader, and export workflow.

### Flame

Flame is good for Flutter-based 2D games. Superior needs a low-poly 3D room and desktop-console feel. Flutter would pull the product back toward app UI habits.

### Tauri

Tauri remains useful as a harness, but it is not the product engine. Superior should not be a web app with game styling. Godot gives the visual runtime, camera, shader, and export model the product needs.

## Current Vertical Slice

The first Godot slice must stay small:

- boot screen: `SUPERIOR .`
- pixel HUD with fake stats
- low-poly 3D signal room
- terminal panel with mocked incoming server events
- WebSocket client that falls back to mock events if the server is offline
- CRT/pass shader for scanlines, dithering, and low-resolution pixel scaling

The next gate is a playable Godot MP4, not another dashboard screenshot.
