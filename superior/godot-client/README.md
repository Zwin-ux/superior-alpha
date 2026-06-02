# SUPERIOR Godot Client

The Godot client is the main visual runtime for SUPERIOR Alpha.

Target feel:

- SNES-like pixel HUD
- Saturn/PS1 low-poly clay workshop
- boot screen before the room wakes up
- Clawd Gremlin as the user's signal creature
- Spore Garden as the post-stamp creature home
- realtime server sync animations
- event log as an in-world terminal

Open `project.godot` in Godot 4.x and run `Boot.tscn`.

The first vertical slice includes:

- `SUPERIOR .` boot screen
- robot wake first-run path
- account/model/browser/starter/skill/save onboarding
- post-stamp 3D Spore Garden with Builder, Scout, and Sentinel race proof
- pixel HUD with fake system stats
- low-poly 3D clay workshop
- Clawd Gremlin on a bench with signal-reactive parts
- terminal panel with mocked server events
- WebSocket client that uses mock events when the server is offline
- CRT shader pass with scanlines, dithering, and low-resolution pixel scaling

Input proof:

- `1` sends a browser signal and blinks Clawd.
- `2` sends a repo signal and lights the bench traces.
- `3` sends an avatar signal and snaps the bot/skill parts.

The local server defaults to:

```text
ws://127.0.0.1:7357/socket
```

Start it with:

```powershell
corepack pnpm superior:server
```
