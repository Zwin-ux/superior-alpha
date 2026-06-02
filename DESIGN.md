# Design System - SUPERIOR

## Product Context

- **What this is:** SUPERIOR is a creature-led signal console. The user creates one active bot, equips runnable skills as parts, then carries that same spore across Windows, Chrome, Godot, and future shells.
- **Who it is for:** people who want a local, inspectable software companion for browser work, repo reading, and tool skills without feeling like they are operating another AI dashboard.
- **Project type:** native game-like runtime plus local service, browser extension, and platform shells.
- **North star:** one spore, many shells.

The product should feel like opening a small console OS, waking a clay robot, fitting parts to it, and sending it into a browser playpen.

## Aesthetic Direction

- **Direction:** claymation console workshop.
- **Mood:** physical, handmade, readable, warm, slightly strange, and practical.
- **Primary runtime:** Godot.
- **Primary proof:** MP4 footage of boot, onboarding, parts, save, workshop, and bot reactions.

SUPERIOR should not look like a web app with a themed skin. The core screen language is a game scene with a HUD:

- clay world, bot, props, buttons, parts
- pixel HUD, labels, terminal, status, icons
- no generic SaaS cards, feature grids, glass panels, or marketing hero structure

## Visual Composition

Default workshop frame at 1280x720:

| Zone | Role | Quality bar |
| --- | --- | --- |
| Boot | console startup | seed snap, wordmark assemble, short progress pips |
| Left rail | launcher commands | vertical clay slab menu with visible hover/press states |
| Center bench | playfield | Clawd is the visual anchor; bot feedback comes before text |
| Right tray | parts and status tools | slot rows, starter plates, runnable skill parts |
| Bottom strip | compact runtime state | daemon, model, browser, account, spore status |
| Lamp/sign | identity and reveal | warm light, sign silhouette, workshop mood |

Narrow layout keeps the bot first, tray second, status third. It may stack, but it must not become a phone settings form.

## Typography

Use typography as two systems: tactile display for clay signs, crisp pixel/mono for HUD.

- **Clay display:** Cooper Black, Fraunces Black, or a custom carved-letter sprite sheet. Use only for stable marks such as `SUPERIOR`, `CLAWDBOT WORKSHOP`, and major plate labels.
- **Primary UI labels:** Atkinson Hyperlegible or a bundled equivalent. The UI must stay readable on textured surfaces.
- **Pixel HUD:** Departure Mono, Pixeloid Sans, or a bundled bitmap font. Use for pips, status lights, terminal lines, and small system labels.
- **Data/code:** JetBrains Mono.

Rules:

- Do not use `system-ui` as the design decision.
- Do not use Inter, Space Grotesk, or generic SaaS typography as the primary face.
- Do not over-texture type. If a label matters for operation, it must stay readable.
- Keep labels short: `Power`, `Key`, `Browser`, `Pick`, `Build`, `Save`, `Spore`, `Ready`, `Missing`, `Paired`, `Failed`.

## Color

Colors should feel like clay pigments, not neon UI.

| Token | Hex | Use |
| --- | --- | --- |
| Boot Black | `#080706` | startup void, deep shadows |
| Clay Ink | `#24170f` | carved text, dark UI text |
| Workshop Wall | `#2f7c82` | teal clay wall, large background |
| Table Brick | `#8a3f29` | workbench plane and grounded props |
| Clay Tan | `#c39762` | rail, tray, panels |
| Sun Gold | `#d8a84a` | menu slabs, selected parts, warm highlights |
| Chalk Paper | `#f1ddac` | bottom card, note paper, small labels |
| Moss Green | `#6f8d4b` | Clawd default body pigment |
| Lavender | `#a78bb8` | Mote/Orb pigment and soft accent |
| Lens Blue | `#83d7f2` | eye glow, small information light only |
| Status Green | `#67b957` | ready |
| Warning Amber | `#d0a03c` | unpaired, missing setup |
| Failure Red | `#b9543f` | failed state |

Rules:

- The body color tints the clay material, not just a glow.
- Glow is reserved for eyes, lens pieces, lamp light, and tiny status accents.
- Avoid purple-blue AI gradients.
- Backgrounds should have warm local light and clay shadows, not abstract decoration.

## Materials

Clay material needs:

- soft matte surface
- uneven edges
- shallow dents
- subtle fingerprints
- warm occlusion shadows
- slight asymmetry

Pixel material needs:

- crisp edges
- limited colors
- no smeared text
- readable contrast
- restraint: pixel is the HUD language, not every object

Rejected:

- melted props
- illegible generated text
- random texture noise
- glossy metal
- overly smooth AI-rendered mascot shapes

## Bot And Spore

SUPERIOR has one active spore in alpha.

Starter seeds:

- `Clawd`: gremlin, Moss Green, pixel eyes, builder role.
- `Hermes`: scanner, Sky Blue, lens eye, courier role.
- `Mote`: orb, Lavender, glow eye, simple helper role.

The onboarding mental model:

```text
empty bench -> choose shape -> fit skills -> save spore -> drop into workshop
```

Do not lead with a roster, profile form, or account dashboard. The user is making a creature.

## 0.18 Spore Ownership Ritual

The high-quality alpha is one ritual, not a feature tour:

```text
Install SUPERIOR -> hatch one spore -> bind Chrome -> icon becomes that spore -> run starter skill -> spore reacts
```

This sequence must read like opening a new handheld console or pairing a toy device. The user should feel that a small creature has been registered into their system.

### Scene Beats

| Beat | Primary Read | Physical Change | Required Copy |
| --- | --- | --- | --- |
| Install/Open | a small device starts | black boot, seed tick, lamp power | `SUPERIOR` |
| Hatch | empty bench becomes alive | lamp clicks on, eyes open, dust moves | `SIGNAL FOUND` |
| Choose Body | starter creature choice | three large clay silhouettes, chosen shape drops to pedestal | `BODY` |
| Equip Skill | ability becomes a part | X-Ray eye/part snaps onto the spore | `FIT EYE` |
| Bind Chrome | browser hand pairs | cable/hand pulse travels from spore to Chrome slot | `BIND` |
| Icon Match | ownership proof | generic icon is replaced by the exact spore head | `ICON MATCH` |
| Run Skill | utility proof | skill part pulses, spore blinks/squashes, success light turns green | `SKILL RAN` |

### Hierarchy

Every frame must read in this order:

1. **Spore state:** asleep, waking, built, bound, reacting.
2. **Current device action:** body pick, part fit, browser bind, skill run.
3. **System confirmation:** LEDs, stamp, tiny status label.

If the tray, terminal, or status text becomes the first read, the frame fails.

### Layout Rule

Use the same console-stage grammar through the full loop:

```text
LEFT   progress rail with numbered stamped steps
CENTER emotional bench and spore
RIGHT  active module tray or Chrome hand dock
BOTTOM hardware LEDs and registry card
```

Do not reveal all controls at once. Each beat earns the next visible control. The right side changes from starter tray to skill tray to Chrome dock; it does not become a persistent settings form.

### Chrome Ownership Moment

This is the money shot.

At 1280x720 and in the MP4 contact sheet, the viewer must see:

- the built spore on the bench
- a Chrome/browser slot or toolbar target
- a generic extension bead before binding
- a visible pulse/cable/hand from spore to browser
- the toolbar icon becoming the same spore head
- a green or gold confirmation light

No paragraph may explain this. The icon match must be visible as an object change.

### Starter Skill Moment

The first skill proof should be one clear fitted part, not a menu of abilities.

Default alpha proof:

| Skill | Slot | Visual Proof | Success Reaction |
| --- | --- | --- | --- |
| Article X-Ray | Eye | clay lens ring/pixel eye fitted to spore | eye pulse, blink, green LED, tiny snap sound |

The log may update after the reaction. It must not be the primary confirmation.

### Motion

Motion should feel like stop-motion hardware:

| Action | Motion | Timing |
| --- | --- | --- |
| Boot seed | tick, tiny rotate, snap into mark | 900-1400ms |
| Lamp click | hard click, warm spill, one flicker | 300-600ms |
| Body pick | silhouette lifts, selected body drops with squash | 250-450ms |
| Skill fit | part slides in, overshoots, pops into slot | 180-280ms |
| Browser bind | pulse travels across cable/hand in two beats | 500-800ms |
| Icon match | generic bead compresses, spore icon stamps in | 350-550ms |
| Skill ran | part glows, spore reacts, LED flips green | 300-600ms |

Avoid wizard page slides. Beat changes are machine actions: click, press, stamp, snap, pulse.

### Quality Bar

The 0.18 MP4 passes only if a stranger can answer:

- "I made a little robot."
- "It became my Chrome extension icon."
- "It did something when I ran the skill."

If they describe it as settings, onboarding, dashboard, or AI assistant setup, the design has failed.

## Skills

Skills are JRPG equipment, not feature cards.

Fixed visible slots:

- `Eye`
- `Crown`
- `Side`
- `Badge`
- `Charm`

Rules:

- Only runnable skills appear as equipable parts.
- Future skills stay hidden until they run.
- Each skill must have a physical part and a short effect.
- Success should pulse the equipped part, blink the bot, or stamp the bench before a note appears.

Initial physical mapping:

| Skill | Slot | Part |
| --- | --- | --- |
| Article X-Ray | Eye | clay lens ring |
| Page Explainer | Badge | paper-clay explain tab |
| Repo Reader | Side | clay gear |

## Layout And Spacing

- **Base unit:** 8px.
- **Micro offsets:** 2px and 4px for handmade imperfection.
- **Desktop frame:** design around 1280x720 first.
- **Safe margins:** 32px on desktop, 16px on narrow screens.
- **Workbench stage:** preserve center as the playfield. Do not cover it with logs.
- **Tray density:** compact rows, large enough to read, never a grid of generic cards.
- **Radius:** clay forms can be rounded and uneven; UI containment should still feel controlled.

Use alignment strongly. Handmade does not mean sloppy.

## Motion

Motion should feel like claymation and machine feedback.

| Action | Motion | Timing |
| --- | --- | --- |
| Boot seed | rotate, snap, pulse | 2-4 seconds total boot |
| Lamp reveal | flicker, warm spread | 300-700ms |
| Step change | press, stamp, light tick | 150-300ms |
| Shape pick | empty bench receives body | 250-450ms |
| Skill equip | part pops onto slot | 180-280ms |
| Save spore | stamp, bot squash, status light | 300-600ms |
| Failure | red/amber light, small shake | 150-300ms |

Avoid:

- page-slide wizard transitions
- constant floaty animation
- cinematic camera sweeps
- text-heavy loading screens

Reduced-motion should keep state changes visible through color, position, and status.

## Platform Rules

### Godot Client

Godot owns the consumer runtime:

- boot
- onboarding
- clay workshop
- avatar reactions
- CRT/pixel pass
- MP4 proof

Use the asset atlas and scene layers. Do not rebuild Godot screens as generic dashboard UI.

### Windows App

Windows is a native product lane for install, tray, service control, and local runtime proof. It should inherit the same spore identity and clay workshop language.

### Chrome Extension

The extension is the browser hand. It should:

- show the active bot identity
- use the runtime toolbar icon generated from the spore
- never store OpenAI keys
- only capture page context when the user runs a skill or the controlled playpen does

### Hub/Web

The hub is a proof and coordination surface. It can be cleaner and flatter, but it must not become the product shell.

## Asset Factory

Runtime art must pass through the factory lanes:

- `assets/bots/0.13/` for atlas plumbing
- `assets/bots/0.14/` for runtime quality gate
- `superior/godot-client/assets/clay/` for exported Godot atlas files

Required quality proof:

- contact sheet
- atlas
- atlas JSON
- quality report
- composition proof
- MP4 or poster frame

No Godot-mapped placeholder should be counted as final art. Any generated art that reads as mush is source reference only, not approved runtime art.

## Copy

Write like a console, a game launcher, or a small tool.

Good:

- `Read Repo`
- `Start Playpen`
- `Save Spore`
- `Browser paired`
- `Model missing`
- `Skill ran`

Bad:

- `Unlock intelligent browser workflows`
- `Seamlessly leverage AI-powered insights`
- `Your productivity companion`
- `Explore powerful automation features`

If the bot, part, light, or stamp can show the state, do not explain it with a paragraph.

## Quality Gates

Before shipping visual work:

- A still frame must read as SUPERIOR without explanation.
- The center creature must be the focal point.
- The right tray must read as parts/equipment, not settings.
- The boot must feel like a small console waking up, not a terminal dump.
- Status must be visible in lights, stamps, or bot reaction.
- Text must be readable at 1280x720 and narrow layouts.
- An MP4 proof must show the intended loop for engine-facing work.

Core commands:

```powershell
corepack pnpm assets:quality-gate
corepack pnpm superior:engine-check
corepack pnpm --filter @superior/godot-client godot:check
corepack pnpm video:godot-engine
```

For shared contracts and platform code:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-05-30 | Godot is the primary product runtime | The product needs a game-console OS feel, boot sequence, scene composition, animation, shaders, and MP4 proof across platforms. |
| 2026-05-30 | Clay world plus pixel HUD | Clay gives the bot/world physical soul; pixel gives status and system feedback clarity. |
| 2026-05-30 | One active spore in alpha | Keeps identity consistent across Windows, Chrome, Godot, and future shells before multi-bot complexity. |
| 2026-05-30 | Skills are equipment slots | Makes abilities visible through parts and reactions instead of feature cards. |
| 2026-05-30 | Asset factory gates runtime art | Prevents generated placeholder art from becoming the product quality bar. |
| 2026-06-01 | 0.18 alpha is the spore ownership ritual | The fundable product proof is install, hatch, Chrome icon match, starter skill, and physical spore reaction. |
