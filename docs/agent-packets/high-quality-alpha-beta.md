# High Quality Alpha/Beta Gate Packet

## Goal

Turn SUPERIOR from impressive footage into a working high-quality alpha that can become Beta.

The fundable proof loop is:

```text
Install SUPERIOR -> wake/register spore -> choose body -> equip skill -> bind Chrome -> extension icon becomes that spore -> run skill -> spore reacts -> proof is recorded
```

This is the product. Everything else is a future platform lane until this loop works cleanly for a fresh user.

## Office-Hours Diagnosis

### Premises

1. The narrow wedge is spore ownership, not "multi-platform AI companion" yet.
2. The strongest demo is the Chrome hand/icon moment plus one useful skill reaction.
3. A high-quality alpha must install, run, pair, and record proof without the founder narrating hidden setup.
4. The current Godot work proves direction, but the runtime still needs production-grade art plates, readable type, and tighter onboarding beats.
5. Beta should not mean feature breadth. Beta means the creature identity and local service loop survive installation.

### What To Cut Until Alpha Gate Passes

- Multi-spore roster.
- More avatar races beyond Builder, Scout, Sentinel.
- More skills beyond the starter proof set.
- Mobile and Mac product polish.
- Hosted robot runtime.
- Repo command runner.
- Broad cloud account features beyond safe spore identity.
- More dashboards, hubs, or planning surfaces.

## Recommended Path

### Approach A: Installed Ownership Alpha

Summary: Make the current Godot/Windows/Chrome/daemon path installable and critique-worthy.

Effort: `M`

Risk: `Medium`

Pros:

- Uses the strongest existing proof.
- Creates an investor demo with a clear emotional hook.
- Forces packaging, pairing, key/model, and runtime gaps into the open.

Cons:

- Does not satisfy the full platform fantasy yet.
- Requires visual discipline: weak art breaks the demo even if code works.

Reuses:

- Godot scenes and MP4 recorder.
- Spore ownership fixture.
- Extension dynamic icon sync.
- Local daemon/function runner.
- Existing Windows packaging work.

### Approach B: Platform Breadth Alpha

Summary: Push Windows, Chrome, Mac, mobile, hub, account, and skill lanes forward in parallel.

Effort: `XL`

Risk: `High`

Pros:

- Looks bigger on a roadmap.
- Surfaces platform issues earlier.

Cons:

- Dilutes the only fundable loop.
- Produces more skeletons and fewer undeniable moments.
- Makes QA and art quality nearly impossible to hold.

Reuses:

- Existing platform matrix and release ladder.

### Approach C: Pure Art Showcase

Summary: Pause service/extension hardening and make the Godot footage look premium first.

Effort: `M`

Risk: `Medium`

Pros:

- Improves first impression quickly.
- Makes the pitch asset easier to critique.

Cons:

- Can become a trailer for software that does not work.
- Does not prove extension ownership or daemon/service reliability.

Reuses:

- Asset factory.
- Godot showcase recorder.

## Decision

Use **Approach A: Installed Ownership Alpha**.

The demo should feel cinematic, but the product must actually run. The beta path is not "make more scenes." It is "make the spore ownership loop installable, repeatable, and beautiful enough that the user understands it without explanation."

## 0.18 High Quality Alpha Gate

### Build Target

```text
Installed app -> Godot onboarding -> spore saved -> Chrome bound -> extension icon matched -> starter skill runs -> spore reacts -> MP4 proof
```

### 0.18 Status - 2026-06-02

The Godot runtime ritual is now recorded and gate-checked:

```text
SUPERIOR boot -> Wake -> Body -> Eye -> Browser -> ICON MATCH -> Skill Ran -> Spore Reacts -> MP4 proof
```

Validated commands:

```powershell
corepack pnpm superior:engine-check
corepack pnpm --filter @superior/godot-client godot:check
corepack pnpm assets:ownership-quality-gate
corepack pnpm fixture:spore-ownership
corepack pnpm video:showcase
corepack pnpm video:godot-engine
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Gate results:

- Planning gate: `39` pass, `0` fail.
- Implementation gate: `66` pass, `0` fail.
- Spore ownership fixture: `.clawdbot/verification/spore-ownership-fixture-1780407320488.json`.
- Showcase MP4: `.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T14-18-28-354Z.mp4`.
- Showcase poster: `.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T14-18-28-354Z.png`.
- Showcase contact sheet: `.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/review-frames/contact-sheet-1s.png`.
- Godot engineering proof MP4: `.clawdbot/video-proof/2026-06-02T14-17-37-454Z-godot-engine/SUPERIOR-godot-engine-2026-06-02T14-17-37-454Z.mp4`.
- Godot engineering proof contact sheet: `.clawdbot/video-proof/2026-06-02T14-17-37-454Z-godot-engine/review-frames/contact-sheet-1s.png`.

Current caveats:

- This pass proves Godot runtime onboarding and local contract behavior. It is not a fresh Windows installer proof.
- `fixture:spore-ownership` requires the local daemon at `http://127.0.0.1:5317`; start `corepack pnpm --filter @clawdbot/daemon dev` first in dev environments.
- The Browser dock is visually tight near the spore in the proof frame, but `ICON MATCH`, `SKILL RAN`, and the spore reaction remain readable in the MP4, poster, and contact sheet.

### Design Consultation Direction

The loop is a first-device ritual:

```text
Open device -> wake creature -> fit part -> bind browser hand -> stamp ownership -> prove utility
```

Design rules:

- The user never sees all controls at once.
- The center spore is always the first read.
- The right panel changes by beat: starter tray, skill tray, Chrome hand dock, proof tray.
- Success is shown by physical changes before text: lamp, part snap, icon stamp, LED flip, bot reaction.
- The Chrome icon match is the money shot and must be visible in the MP4 contact sheet.
- Copy stays one to three words: `SIGNAL FOUND`, `FIT EYE`, `BIND`, `ICON MATCH`, `SKILL RAN`.

Preview artifact: `docs/design-consultation-spore-ownership.html`.

### Required Product Reads

1. **Device first boot:** SUPERIOR opens like a small console device.
2. **Creature birth:** the empty bench becomes a living spore.
3. **Ownership:** the Chrome toolbar icon visibly becomes the same spore.
4. **Function proof:** a real starter skill succeeds and the spore reacts before logs update.
5. **Portability promise:** the same spore identity is shown as a safe export, not as a marketing claim.

### Required Engineering Gates

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm superior:engine-check
corepack pnpm assets:factory-export
corepack pnpm assets:quality-gate
corepack pnpm assets:ownership-export
corepack pnpm assets:ownership-quality-gate
corepack pnpm fixture:spore-ownership
corepack pnpm fixture:extension-skill
corepack pnpm video:showcase
```

If Windows packaging commands are available in the environment, add:

```powershell
corepack pnpm windows:proof
corepack pnpm windows:msi
corepack pnpm windows:installed-loop-smoke
```

### Required Visual Gates

- MP4 begins with a clean boot, not a debug screen.
- First 3 seconds explain the device mood without text paragraphs.
- Body selection reads like choosing a starter creature.
- Skill equip reads as a physical part snapping on.
- Chrome icon match is visible at 1280x720 and in the contact sheet.
- Status LEDs are readable without zoom.
- No generic dashboard cards, no SaaS panels, no fake feature grids.

### Required Service Gates

- Daemon starts from packaged/dev path without manual terminal setup.
- Missing model/key state is recoverable and visible.
- Pairing token cannot be reused after reset.
- Extension never receives OpenAI keys.
- Skill run creates recent proof and a bot reaction.
- Stopping/restarting does not corrupt the active spore.

## 0.19 Beta Candidate Gate

The 0.19 gate starts only after 0.18 passes.

Target:

```text
Clean install -> account/spore setup -> Chrome hand bind -> skill proof -> uninstall/reinstall -> spore still loads
```

Add:

- Clean-machine install script.
- Signed or clearly labeled unsigned installer path.
- First-run model setup with Local Ollama and OpenAI BYOK states.
- Crash/recovery states for daemon, browser, and extension.
- One-page GitHub release proof with MP4, MSI/ZIP artifacts, caveats, and test commands.

Do not add:

- New social features.
- New marketplace.
- Multi-bot roster.
- Hosted skill execution.

## 1.0 Official Beta Gate

Beta means a stranger can do this without help:

1. Download/install SUPERIOR.
2. Register or use local-only setup.
3. Hatch one spore.
4. Bind Chrome.
5. See the toolbar icon become that spore.
6. Run the starter browser skill.
7. See the spore react.
8. Reopen the app and see the same spore still alive.

## Assignment

The next real-world action is not more ideation. Show the current 22-second showcase MP4 to three people without explaining it first:

```text
.clawdbot/video-proof/2026-06-02T14-18-28-354Z-godot-showcase/SUPERIOR-godot-showcase-2026-06-02T14-18-28-354Z.mp4
```

Ask only:

1. What do you think this lets you do?
2. What moment did you remember?
3. Where did you get confused?

If they do not mention "my little bot became the Chrome icon" or "the creature did something when the skill ran," the alpha is not clear enough yet.
