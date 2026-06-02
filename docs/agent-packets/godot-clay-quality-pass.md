# Godot Clay Quality Pass Packet

## Goal

Move the Godot client from "working clay plumbing" to a critique-worthy clay workshop scene.

Target proof:

```text
SUPERIOR robot wake -> lamp reveal -> hand-directed clay workshop -> Clawd on bench -> readable status -> physical signal reactions
```

This packet is the next design plan after the current 0.14/0.15 proof. The existing runtime proves the engine spine. The next pass must prove taste.

## Design Review Score

Initial design completeness: `6.5/10`.

Why: the composition is correct and the Godot proof is real, but the art is still procedural, status text is too small, depth is thin, and the scene still reads partly like a stage mockup instead of a handmade object.

A 10/10 plan defines:

- exact first, second, third visual reads
- hand-directed replacement assets by manifest ID
- readable runtime label sizes and contrast
- physical interaction states for success and failure
- foreground/background props that create depth without clutter
- poster and MP4 gates that reject "technically works, visually weak"

Target after this packet: `9/10`. Remaining gap after that should be final art polish, not structural confusion.

## What Already Exists

- `DESIGN.md` is the binding design system.
- `assets/bots/0.14/` has the current factory, atlas, contact sheet, composition proof, and quality report.
- `superior/godot-client/assets/clay/superior-clay-factory-atlas.*` is the Godot runtime atlas.
- Current Godot scene already has the correct major zones: left rail, center bench, lamp/sign, right tray, bottom status.
- Video proof uses Godot `--write-movie`, which is the correct proof path.
- Current manifest IDs should be preserved so art can be replaced without rewriting scene code.

## Not In Scope

- New backend, account, model, extension, or daemon routes.
- More onboarding steps.
- New skill behavior.
- Figma redesign from scratch.
- Replacing Godot as runtime.
- A full final brand pass across every platform.

This pass is visual quality and readability inside the Godot runtime only.

## Visual Hierarchy

The scene must read in this order:

1. `Clawd on the bench`
2. `Current action or reaction`
3. `System status`

If a screenshot reads as "HUD and terminal first", the pass fails.

Frame structure:

```text
TOP      lamp + SUPERIOR sign, warm identity
LEFT     launcher rail, quiet until selected
CENTER   Clawd, bench, action stamp, skill part reaction
RIGHT    clay parts tray, only runnable slots
BOTTOM   larger status pills + compact spore card
```

The terminal/log is proof evidence only. It must not dominate the frame.

## Hand-Directed Asset Requirements

Replace procedural-looking plates with hand-directed clay renders while preserving manifest IDs.

Engineering constraint: do not place hand-directed source art in a path that the generator overwrites. The current factory script writes generated PNGs into `approved-runtime/generated/`, so manual art needs its own protected lane.

Use this source layout:

```text
assets/bots/0.14/
  source/manual/              hand-directed PNGs, never overwritten
  source/reference/           concept/reference material
  approved-runtime/manual/    copied approved manual runtime PNGs
  approved-runtime/generated/ procedural fallback PNGs
  sheet/                      contact sheet, atlas, quality report
```

Generator rule:

```text
if source/manual/<asset-id>.png exists:
  validate dimensions and use it
  copy to approved-runtime/manual/<asset-id>.png
  mark sourceKind = "manual"
else:
  generate fallback
  write to approved-runtime/generated/<asset-id>.png
  mark sourceKind = "generated-fallback"
```

The quality gate can pass with generated fallback only for assets not in the current slice. The four first-slice assets below must be manual before this pass is accepted:

- `scene.status-pill`
- `scene.bottom-card`
- `scene.wall`
- `scene.table`

### Required Scene Plates

| Manifest ID | Direction | Acceptance |
| --- | --- | --- |
| `scene.wall` | teal clay wall with visible handmade surface and depth shadows | reads like a wall plate, not a flat texture fill |
| `scene.table` | brick clay workbench with front lip and contact wear | grounds bot and props; no empty flat band |
| `scene.left-rail` | asymmetrical launcher slab with dents and edge thickness | buttons feel embedded into a physical object |
| `scene.right-tray` | pressed equipment tray with bevel and inner shadow | slot rows feel recessed |
| `scene.bottom-card` | paper-clay card with clean blank label area | runtime text fits without clipping |
| `scene.sign` | clay sign base without brittle baked UI copy beyond stable mark | sign is readable and dimensional |
| `scene.status-pill` | larger dark clay pill with clear light position | state readable at 1280x720 |

### Required Props

Add or improve props only where they create depth:

- left foreground cup or clay lump
- right foreground tool
- rear shelf with two simple blocks
- one plant silhouette or wall strip
- table contact shadow under bot and tray

Props must not compete with Clawd. If a prop draws first attention, remove it.

### Bot And Parts

Clawd remains the hero.

Required replacements:

- `bot.clawd.body`: stronger gremlin silhouette, visible clay dents, asymmetric antenna, less perfect circle
- `bot.clawd.eye.pixel`: brighter but smaller; eyes must remain crisp
- `bot.clawd.skill.eye`: lens ring reads as attached clay, not a flat icon
- `bot.clawd.skill.badge`: badge reads as paper-clay part
- `bot.clawd.skill.side`: side gear reads as physical part attached to body

## Runtime Text Rules

Do not bake changing labels into images.

Runtime labels own:

- bot name
- body/color/eye
- status pill text
- tray slot state
- event/log text
- save stamp

Minimum readable target at 1280x720:

| Text | Target |
| --- | --- |
| Primary spore name | 28-34 px equivalent |
| Tray slot label | 16-18 px equivalent |
| Status pill label | 14-16 px equivalent |
| Terminal/log line | 14 px equivalent |
| Top HUD micro text | 12-14 px equivalent, optional |

Status pills should be widened before the labels are shrunk. Never fix crowding by making critical state unreadable.

Font decision: bundle runtime fonts in Godot instead of relying on system fonts.

- Clay display: keep the current pixel-clay mark for stable signage until final custom lettering lands.
- Runtime UI/HUD: add one bundled readable pixel/mono font under `superior/godot-client/assets/fonts/`.
- Fallback: Godot default may run only if the font asset is missing, and the check script should warn or fail when the font is absent after this pass.

The first implementation can use one bundled font for all runtime labels. Do not add a font menu or typography abstraction.

## Interaction State Coverage

| Feature | Empty | Loading | Success | Failure | Partial |
| --- | --- | --- | --- | --- | --- |
| Boot | seed in black void | pips fill | lamp reveal | amber pip stalls | one pip dim |
| Onboarding bench | clay seed/lump | bench glow | body appears | red status tick | selected plate pending |
| Skill slots | recessed empty slot | part trembles | part snaps and pulses | part rejects with shake | disabled slot dim |
| Status pills | dark pill, dim light | pulsing amber | green light + label | red light + one recovery label | amber light |
| Workshop signal | idle bot | tray light warms | bot/part reacts first | bot flinch + red light | event logs but no part pulse |

Every success must be visible before the log text changes.

## User Journey

| Step | User Does | User Should Feel | Required Visual |
| --- | --- | --- | --- |
| Boot | opens SUPERIOR | a small machine wakes up | seed snap, pips, restrained sound-like motion |
| Onboard | sees empty bench | this is something I build | empty clay seed centered on bench |
| Pick | chooses starter | the creature becomes mine | body appears immediately |
| Equip | fits runnable skills | parts matter | visible part snaps onto Clawd |
| Save | saves spore | identity is real now | stamp, bot squash, status light |
| Workshop | lands in runtime | ready to use | Clawd and status are clear at a glance |

## AI Slop Risk

Current risk: medium.

The layout is specific, but generated/procedural clay can still read as mush. The next pass must avoid:

- random noise texture instead of purposeful clay marks
- illegible pixel text
- glossy lighting
- perfect rounded blobs
- decorative props with no depth job
- over-dark CRT pass hiding weak art

Rule: if removing scanlines makes the art look weak, the art is not ready.

## Responsive And Accessibility

Godot proof is desktop-first, but the design must not assume desktop forever.

Minimum expectations:

- 1280x720 poster gate
- narrow crop/readability check for future handheld/mobile shell
- keyboard actions stay stable: confirm, cancel, equip, inspect, launch, stop
- critical state uses shape/light/text, not color alone
- status labels remain readable without relying on glow

Keyboard proof must remain simple:

```text
Enter / Space = confirm or advance
Esc           = skip to workshop
1 / 2 / 3     = starter pick or signal reaction, depending on scene
```

Do not add pointer-only interactions in this pass.

## Acceptance Gates

Commands:

```powershell
corepack pnpm assets:factory-export
corepack pnpm assets:quality-gate
corepack pnpm superior:engine-check
corepack pnpm --filter @superior/godot-client godot:check
corepack pnpm video:godot-engine
```

Visual gates:

- poster frame shows no text clipping
- bottom status labels are readable at normal screenshot size
- Clawd is the first read
- workshop fills the frame without large dead black side margins
- right tray labels are readable
- save stamp and signal reactions are visible without reading terminal logs
- MP4 shows boot, onboarding, skill fit, save, workshop drop, and three signal reactions

Quality gate should fail if:

- any Godot-mapped runtime asset is placeholder/plumbing
- any first-slice manual-required asset falls back to generated output
- required composition zones are missing
- status text is below the readable target
- poster frame is black, wrong-window, or abstract room
- the latest MP4 path is not recorded in `docs/alpha-verification.md`

## Engineering Review

Scope decision: reduce the next implementation to a manual asset override pipeline plus the first four manual scene assets, bundled font, and status-label layout. Do not replace every prop and bot part in one pass.

### Architecture

Use the existing manifest/atlas contract. Do not introduce a second Godot asset loader.

```text
manual PNG source
  -> factory resolver
  -> approved-runtime/manual or generated fallback
  -> atlas + atlas JSON
  -> Godot ImageTexture regions
  -> ClayWorkshop / Onboarding runtime labels
  -> MP4 proof
```

Why: this keeps scene code stable and lets art improve behind existing manifest IDs.

### Code Quality

Required code changes:

- change `generate-clay-factory-assets.mjs` so generated fallbacks cannot overwrite manual art
- add `sourceKind` to atlas JSON entries: `manual` or `generated-fallback`
- make `assets:quality-gate` fail when first-slice assets are not manual
- add a single bundled font path to Godot and use it for runtime labels
- increase status pill panel/label dimensions in `ClayWorkshop`

Do not add:

- new rendering framework
- new dependency for image generation
- separate atlas per scene
- broad scene refactor

### Test Coverage Diagram

```text
ASSET FACTORY
  resolveAsset(assetId)
    -> [TEST] manual file exists: copies manual, sourceKind=manual
    -> [TEST] no manual file: generates fallback, sourceKind=generated-fallback
    -> [TEST] manual dimensions wrong: quality gate fails
    -> [TEST] first-slice asset fallback: quality gate fails

GODOT CHECK
  check-project.mjs
    -> [TEST] font asset exists
    -> [TEST] workshop script references bundled font helper or font path
    -> [TEST] first-slice sourceKind values are manual in atlas JSON

VIDEO PROOF
  record-godot-engine.mjs
    -> [EXISTING] write-movie creates MP4
    -> [TEST] manifest points latest proof to MP4/poster
    -> [MANUAL QA] poster text readable and no clipping
```

### Failure Modes

| Failure | User Sees | Guard |
| --- | --- | --- |
| manual art overwritten by generator | art quality regresses silently | manual source and approved manual paths are separate from generated fallback |
| manual PNG wrong size | clipped atlas or stretched panel | quality gate checks exact expected dimensions |
| bundled font missing | text shifts or becomes unreadable | `superior:engine-check` fails before MP4 proof |
| status labels still too small | bottom strip looks broken in poster | visual gate requires readable normal-size poster |
| prop pass adds clutter | Clawd loses first read | prop budget stays capped and props are added after status/table/wall |

### Performance

No runtime performance issue expected. Atlas size stays one 2048x2048 PNG for this pass. If manual assets push atlas above 2048, reject and resize/crop source assets instead of increasing atlas size.

### Parallelization

| Lane | Modules touched | Depends on |
| --- | --- | --- |
| Asset resolver | `assets/bots/0.14/scripts`, `assets/bots/0.14/source`, `assets/bots/0.14/sheet` | none |
| Godot text/font layout | `superior/godot-client/scripts`, `superior/godot-client/assets/fonts`, `superior/godot-client/tools` | none |
| Manual art production | `assets/bots/0.14/source/manual` | asset dimensions from manifest |
| Proof/docs | `tools/video-proof`, `docs` | asset resolver + Godot layout |

Run asset resolver and Godot text/font layout in parallel if using separate worktrees. Manual art can proceed in parallel after dimensions are confirmed. Proof/docs runs last.

## Plan Review Passes

| Pass | Rating | Fix Added |
| --- | --- | --- |
| Information architecture | 8/10 | locked first/second/third reads and zone hierarchy |
| Interaction states | 8/10 | added state table for boot, bench, slots, status, signals |
| User journey | 8/10 | added emotional arc from boot to workshop |
| AI slop risk | 7/10 | added concrete rejection list and scanline test |
| Design system alignment | 9/10 | binds pass to `DESIGN.md` and 0.14 manifest IDs |
| Responsive/accessibility | 7/10 | added desktop gate plus future narrow/readability checks |
| Unresolved decisions | 8/10 | deferred only final art style tooling |
| Engineering architecture | 9/10 | locked manual override pipeline behind existing atlas contract |
| Engineering tests | 8/10 | added resolver, quality gate, font, and proof coverage diagram |

## Unresolved Decisions

| Decision | Recommendation | If Deferred |
| --- | --- | --- |
| Final clay render method | resolved: protected manual PNG override lane behind existing manifest IDs | n/a |
| Font asset for runtime labels | resolved: one bundled readable pixel/mono font first | n/a |
| Prop density | resolved: cap props to listed depth props and ship after status/table/wall | n/a |

## Next Build Slice

1. Done: add manual asset resolver support to `generate-clay-factory-assets.mjs`.
2. Done: add first-slice manual PNGs for `scene.status-pill`, `scene.bottom-card`, `scene.wall`, and `scene.table`.
3. Done: increase Godot status pill sizing and label placement.
4. Next: add bundled runtime font under `superior/godot-client/assets/fonts/`.
5. Next: add checks for font presence after the font is bundled.
6. Next: compare poster against `assets/bots/soul/clawdbot-workshop-target.png`.
7. Next: replace `bot.clawd.body`, three skill parts, and depth props.

The fastest quality win is status readability plus table/wall depth. Do that before adding more props.

Latest implementation evidence:

- `corepack pnpm assets:factory-seed-manual`
- `corepack pnpm assets:factory-export`
- `corepack pnpm assets:quality-gate`
- `corepack pnpm superior:engine-check`
- `corepack pnpm video:godot-engine`

Latest MP4 proof:

```text
.clawdbot/video-proof/2026-05-31T09-51-02-649Z-godot-engine/SUPERIOR-godot-engine-2026-05-31T09-51-02-649Z.mp4
```

## Onboarding Design Review

Live critique result: the previous onboarding looked like a setup checklist around an empty bench. It did not make the player feel like they were registering a unique robot that would become their Chrome hand and cross-platform spore identity.

Fix applied:

- Boot now drops into a distinct `ROBOT REGISTRY` scene before the Workshop.
- Left rail starts with `REGISTER`, then `MODEL`, `BROWSER`, `STARTER`, `LOADOUT`, `SAVE`.
- Center stage shows a `SPORE REGISTRY` plate with handle, email code, icon, and local pairing state.
- Browser step now says `CHROME HAND` and `ICON UNIQUE SPORE`, tying the extension icon to the bot identity.
- Right tray is now `SPORE KIT`, keeping the character-creation feeling instead of generic setup controls.

Design score after this pass: `7.5/10`.

Why not higher yet: the registry is now conceptually right, but it still uses simple flat runtime labels and a reused card asset. The next pass should make the registry plate feel more like a stamped MMO character sheet or console save cartridge.

## Completion Summary

```text
Step 0 Scope Challenge: scope reduced to manual override pipeline + first four manual assets
Architecture Review: 1 issue found and resolved - generator overwrite risk
Code Quality Review: 1 issue found and resolved - avoid second asset loader
Test Review: coverage diagram produced, 5 checks required
Performance Review: 1 constraint added - keep atlas at 2048 unless deliberately reviewed
NOT in scope: written
What already exists: written
Failure modes: 5 listed, 0 silent unguarded critical gaps after plan changes
Parallelization: 4 lanes, 3 parallel-capable, proof/docs sequential last
Lake Score: complete option chosen for asset safety and proof gates
```

## Review Cycle Result

Same-cycle review applied:

- `plan-design-review`: resolved the visual misses into first/second/third reads, manual scene assets, larger status labels, and prop caps.
- `plan-eng-review`: locked the implementation shape around the existing atlas manifest, not a second renderer or broad scene rewrite.
- `document-release`: linked this packet from the Godot engine packet, packet index, and alpha verification notes.
- `ship` readiness: not committed or pushed from this cycle because the worktree contains broader active engine and asset changes.

Fresh gate result:

```powershell
corepack pnpm superior:engine-check
```

Result: passes. It runs the 0.14 clay factory quality gate and the Godot client scaffold check.

Additional release hygiene:

- `git diff --check` reports no whitespace errors; only Git CRLF conversion warnings.
- New packet/docs checked for non-ASCII characters; none found.
