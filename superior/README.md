# SUPERIOR Alpha Engine

This lane is the Godot-first product runtime.

```text
superior/
  core/          shared event contracts and platform-neutral state logic
  godot-client/  main visual runtime: boot, signal room, HUD, avatar
  server/        local realtime WebSocket/SSE backend for state patches
  extension/     browser companion bridge notes
  web-admin/     optional lightweight control panel notes
```

The older `apps/` lanes are still useful proof harnesses. They are not the final visual shell.

## Commands

```powershell
corepack pnpm superior:engine-check
corepack pnpm superior:core
corepack pnpm superior:server
```

Godot is not vendored into the repo. Install Godot 4.x locally, then open `superior/godot-client/project.godot`.
