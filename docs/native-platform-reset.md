# SUPERIOR Native Platform Reset

## Decision

SUPERIOR is not a web app.

The Tauri/React app in `apps/desktop` is an alpha harness for proving contracts, extension pairing, daemon behavior, and visual direction. It should stay useful, but it is not the final Windows product shell.

The official Windows EXE lane is `apps/windows`.

## Platform Ownership

- `apps/windows`: native `.NET` Windows EXE, flagship surface.
- `apps/desktop`: Tauri alpha harness and integration lab.
- `apps/extension`: Chrome/Edge browser hand.
- `apps/mobile`: later native mobile companion lane.
- `apps/daemon`: current Node local brain.
- future `.NET` host: possible replacement brain after contract fixture parity.
- web surfaces: preview, docs, demos, and asset review only.

## Windows Native First Slice

Build the native Windows lane in this order:

1. Native window frame.
2. Daemon health.
3. Bot identity render.
4. Function catalog and recent proof.
5. Browser pairing status and token flow.
6. Native workbench/loadout interactions.
7. Service lifecycle, tray, installer, credential storage.

Do not start by cloning the Tauri UI. Use the current harness only as behavior reference.

## Contract Rule

The native app must consume the same local contracts:

- `/health`
- `/bot-identity`
- `/functions`
- `/function-runs/recent`
- `/browser-link/start`
- `/browser-runtime`

The fixture suite under `tools/contract-fixtures` is the proof path for Node now and future native hosts later.

## Toolchain

The repo uses a local .NET 8 SDK under `.clawdbot/toolchains/dotnet` for non-admin Windows native builds.

```powershell
corepack pnpm windows:install-sdk
corepack pnpm windows:check
```

`windows:check` compiles the native WPF EXE lane without requiring global `dotnet` on `PATH`.
