# SUPERIOR Alpha Engine Direction

SUPERIOR is now a multi-platform signal-analysis console built around a Godot visual runtime.

This is not a normal SaaS app, not a generic dashboard, and not a web UI wearing game art. The product should feel like a game console OS connected to a server brain.

## Primary Engine

Godot is the primary visual runtime because it is open-source, MIT-licensed, supports strong 2D and 3D, and exports to Windows, macOS, Linux, Android, iOS, and WebAssembly/HTML5.

The target interface language is:

- SNES-like pixel HUD
- Saturn/PS1 low-poly 3D signal room
- boot screen before the room wakes up
- agent/avatar as the user identity
- server sync animations
- event log as an in-world terminal
- realtime state patches from the server

## 0.14 Visual Gate

The current engine target is the clay workshop, not the old abstract signal room. The proof scene should read like the soul image: left clay launcher rail, center Clawd bench, right parts tray, warm lamp/sign, bottom status pills, and physical bot reactions.

The boot should feel like a small console startup, closer to GBA/GameCube timing than a terminal: black screen, clay seed snap, `SUPERIOR` mark, progress pips, lamp reveal.

The asset rule is now strict:

```text
0.13 = plumbing placeholders
0.14 = runtime clay factory gate
```

Run `corepack pnpm assets:factory-export` and `corepack pnpm assets:quality-gate` before treating any Godot visual pass as shippable.

The proof rule is strict too: Godot MP4s must be captured through `--write-movie`. Window or desktop capture can record the wrong foreground app and is not acceptable as release evidence.

## Repository Lane

```text
superior/
  core/          shared event contracts, server sync types, platform-neutral logic
  godot-client/  main visual runtime
  server/        realtime WebSocket/SSE backend
  extension/     browser companion bridge notes
  web-admin/     optional lightweight control panel notes
```

The older `apps/` lanes remain alpha proof surfaces. They are not the final visual shell.

## Runtime Loop

```text
boot console
-> connect to local server
-> receive state patch
-> animate signal room
-> browser extension forwards a signal
-> server broadcasts patch
-> avatar and in-world terminal react
```

The first proof is not a full product. It is the engine spine: Godot room, local server, contracts, and visible signal feedback.

Engine comparison and lock-in rationale live in [ENGINE_DECISION.md](ENGINE_DECISION.md).

## Product Rules

- Do not build dashboard cards.
- Do not use glassmorphism.
- Do not center the product around chat.
- Do not explain behavior with marketing copy.
- Make server state visible through room lights, terminal lines, avatar motion, and HUD changes.
- Keep web-admin optional and lightweight; it is not the product shell.
