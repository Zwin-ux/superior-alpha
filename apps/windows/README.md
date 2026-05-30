# SUPERIOR Windows

This is the native Windows lane for SUPERIOR.

The current `apps/desktop` Tauri/React app is an alpha harness for proving contracts, extension pairing, daemon behavior, and visual direction. It is not the final product shell.

The official Windows EXE path lives here and must be built as native Windows software:

- native window and app lifecycle
- local service control
- platform-local storage
- tray and installer behavior
- native clay workbench rendering
- shared daemon contracts instead of copied UI state

## Current Slice

The first slice is a WPF `.NET` shell scaffold:

- starts without Vite
- starts the local daemon during dev when the daemon is offline
- talks to the local daemon over `http://127.0.0.1:5317`
- reads health, bot identity, function catalog, and recent function proof
- renders a native clay bot bench with WPF drawing APIs
- exposes Browser Pair, Refresh, Start Playpen, and Stop controls
- reads saved repo workspaces, SUPERIOR Browser state, and recent playpen notes

Use the repo-local SDK install when a global .NET install is missing or when you want the reproducible project toolchain:

```powershell
corepack pnpm windows:install-sdk
```

Then run the toolchain check:

```powershell
corepack pnpm windows:check
```

Run the native proof gate before treating Windows work as good:

```powershell
corepack pnpm windows:proof
```

That builds the WPF app, smoke-launches the EXE without Vite, and runs the host contract fixture against the local daemon boundary.

## Rule

Do not clone the Tauri app into this folder. Port behavior through contracts and rebuild the Windows surface for the platform.
