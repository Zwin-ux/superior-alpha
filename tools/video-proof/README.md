# SUPERIOR Video Proof

Use this gate when a slice changes feel, motion, setup, function proof, or the creature loop.

```powershell
corepack pnpm video:proof
```

The command records the local Workshop harness, captures a poster frame, converts the run to MP4, and writes:

- `.clawdbot/video-proof/<run>/SUPERIOR-workshop-<timestamp>.mp4`
- `.clawdbot/video-proof/<run>/SUPERIOR-workshop-<timestamp>.png`
- `.clawdbot/video-proof/<run>/manifest.json`
- `.clawdbot/video-proof/latest.json`

The MP4 is the critique artifact. If a release has meaningful UI or function behavior, do not call it done until there is a fresh MP4 attached to the verification notes.

For the Godot engine lane:

```powershell
corepack pnpm video:godot-engine
```

This launches `superior/godot-client/project.godot`, captures the Godot window region, and writes:

- `.clawdbot/video-proof/<run>/SUPERIOR-godot-engine-<timestamp>.mp4`
- `.clawdbot/video-proof/<run>/SUPERIOR-godot-engine-<timestamp>.png`
- `.clawdbot/video-proof/<run>/manifest.json`
- `.clawdbot/video-proof/latest-godot.json`

For a production-style 20 second showcase:

```powershell
corepack pnpm video:showcase
```

This uses the same Godot movie writer, but sets `SUPERIOR_SHOWCASE=1` so the runtime hides debug labels, removes mock-language from visible product logs, and follows the pitch beat map documented in `docs/production-showcase.md`. It writes the latest manifest to:

- `.clawdbot/video-proof/latest-showcase.json`

## Notes

- The first recorder target is the alpha Workshop harness because it is fast and deterministic.
- Godot capture uses an OpenGL launch path because Vulkan window-title capture records black frames through `gdigrab` on this machine.
- The artifact folder is intentionally ignored by git.
