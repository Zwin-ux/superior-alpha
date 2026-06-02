# SUPERIOR Production Showcase

The showcase clip is the critique and pitch artifact. It is product footage from Godot, not a debug proof and not a web promo wrapper.

## Command

```powershell
corepack pnpm video:showcase
```

This records the Godot runtime for about 22 seconds with `SUPERIOR_SHOWCASE=1`, including generated in-engine sound effects, and writes:

- `.clawdbot/video-proof/<run>/SUPERIOR-godot-showcase-<timestamp>.mp4`
- `.clawdbot/video-proof/<run>/SUPERIOR-godot-showcase-<timestamp>.png`
- `.clawdbot/video-proof/<run>/review-frames/contact-sheet-1s.png`
- `.clawdbot/video-proof/<run>/manifest.json`
- `.clawdbot/video-proof/latest-showcase.json`

## Showcase Beat Map

| Time | Beat | Required Read |
| --- | --- | --- |
| 0-2s | Console boot | SUPERIOR wakes like a small device, not a terminal. |
| 2-4s | Wake spore | The bench is empty, then the creature wakes under the lamp. |
| 4-6s | Body fit | Clawd becomes a clay body, not a settings record. |
| 6-8s | Eye + role | X-Ray and Builder read as fitted parts with snap sounds. |
| 8-10s | Browser hand | Chrome icon becomes the same Clawd spore with a pairing pulse. |
| 10-12s | Skill proof | Article X-Ray runs, the eye pulses, and the spore reacts before text confirms it. |
| 12-14s | Spore stamped | Ownership is sealed with a stamp thump before entering the home. |
| 14-18s | Spore Garden | Care and loadout read as a creature home with toy-like chirps. |
| 18-22s | Workshop | Browser/repo/agent signals cause physical reactions and matching SFX. |

## Latest 0.18 Artifact

- MP4: `.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T14-18-28-354Z.mp4`
- Poster: `.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T14-18-28-354Z.png`
- Contact sheet: `.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/review-frames/contact-sheet-1s.png`
- Engineering proof: `.clawdbot/video-proof/2026-06-02T14-17-37-454Z-godot-engine/SUPERIOR-godot-engine-2026-06-02T14-17-37-454Z.mp4`

QA read: the loop is understandable without narration: SUPERIOR boots, Clawd wakes, the body and eye attach, Chrome matches the spore icon, Article X-Ray runs, the spore reacts, and the home opens. The Browser dock is visually close to the spore in the proof frame, but the ownership read is still clear at 1280x720 and in the contact sheet.

## Acceptance

- No keyboard/debug instructions in the showcase labels.
- No visible `MOCK` language in the product log.
- MP4 contains a video stream and an audio stream.
- Sound effects support the physical action: click, snap, bind pulse, stamp, chirp, signal.
- Setup and Workshop menus use physical plate feedback: state lights, pressed active plates, and tray slot glow.
- The poster frame shows the ownership moment or a strong product state.
- The contact sheet shows boot, wake, body, eye, role, Chrome icon match, Article X-Ray `SKILL RAN`, garden, and workshop.
- The clip opens at 1280x720 and runs about 22 seconds.

Use `corepack pnpm video:godot-engine` for engineering proof. Use `corepack pnpm video:showcase` when the user needs something to critique, share, or pitch.
