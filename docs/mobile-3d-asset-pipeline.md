# SUPERIOR Mobile 3D Asset Pipeline

## Decision

Mobile gets a dimensional companion object, not a flat card stack and not a shrunken desktop Workshop.

The first mobile visual proof is a small GLB clay bot that carries the same active spore identity across desktop, extension, and future mobile shells.

## Product Shape

Mobile is a companion surface:

- bot identity
- equipped parts
- recent proof
- device/pairing state
- share-sheet capture
- short skill result history

Mobile is not:

- a desktop launcher clone
- a phone settings app
- a second mascot
- a place to store model keys, raw pairing tokens, browser profile state, repo data, or page text

## Visual Direction

Use one strong object on a restrained native screen:

- a low-poly matte clay bot with visible body, eye, and equipped part identity
- warm clay pigment, soft contact shadow, and uneven handmade silhouette
- compact OS-like proof/status around the object
- native mobile controls for share/capture/device state

Avoid:

- flat circular avatar-only identity
- generic mobile dashboard cards
- neon AI gradients
- desktop left rail/right tray on a phone
- long onboarding copy

## Asset Contract

Source shelf:

```text
assets/bots/mobile-3d/
  README.md
  asset-manifest.json
  generated/
    mobile-clawd-gremlin.glb
    mobile-3d-quality-report.json
    mobile-3d-validation-report.json
  scripts/
    generate-mobile-clay-models.mjs
    validate-mobile-3d-assets.mjs
```

Runtime format:

- GLB, glTF 2.0 binary
- self-contained for alpha; no external texture paths
- `+Y` up, `+Z` front
- origin at bot center
- stable named nodes for body, eyes, antenna, and equipped parts

Current required nodes:

- `Body_Gremlin`
- `Eye_Left_Pixel`
- `Eye_Right_Pixel`
- `Antenna_Left`
- `Antenna_Right`
- `Skill_ArticleXray_Lens`
- `Skill_RepoReader_Gear`

Current budget:

- target GLB size: 90 KB
- max GLB size: 180 KB
- max triangles: 1800
- max materials: 8
- max nodes: 16
- alpha texture max: 512 px, when textures are introduced

Current generated proof:

- `mobile-clawd-gremlin.glb`
- 492 triangles
- 19064 bytes

## Pipeline

1. Generate or import a clean GLB into `assets/bots/mobile-3d/generated/`.
2. Keep asset identity mapped in `asset-manifest.json`.
3. Run `corepack pnpm assets:mobile-3d`.
4. Review `generated/mobile-3d-validation-report.json`.
5. If using Blender later, normalize transforms before export and keep the same named nodes.
6. Do not compensate for bad asset scale, pivots, or names in runtime code.

## Commands

```powershell
corepack pnpm assets:mobile-3d-generate
corepack pnpm assets:mobile-3d-validate
corepack pnpm assets:mobile-3d
```

## Acceptance

- The GLB validates as glTF 2.0 binary.
- The model stays under budget.
- Required nodes are present.
- Materials are matte and non-metallic.
- No external texture URI is present.
- The asset reads as Clawd/Gremlin/Moss/Pixel with equipped proof parts.
- `GET /mobile-companion` returns the asset reference without local secrets, proven by `corepack pnpm fixture:mobile-companion`.
- Mobile docs still state that the lane is companion-only.

## Future Hand-Sculpt Pass

When a proper Blender asset replaces the generated contract model:

- keep `mobile-clawd-gremlin.glb` as the first runtime filename unless the manifest changes intentionally
- use meshopt only after runtime decode support is proven
- add KTX2 only when the native/mobile renderer supports it
- keep material count low by reusing clay pigment materials
- add LOD only if the companion scene grows beyond one hero object

## Autoplan Review

CEO review: hold alpha scope. The mobile GLB pipeline improves the one-spore identity, but building a mobile app before the installed Windows and extension loop is dependable would dilute the alpha.

Design review: pass with one constraint. The object must carry identity through body, eye, pigment, and equipped parts. It should sit inside a restrained native companion screen, not inside a copied desktop layout.

Engineering review: pass for prep only. A dependency-free GLB generator and validator are acceptable because they create a contract and gate without choosing a mobile runtime too early.

DevEx review: pass. `corepack pnpm assets:mobile-3d` gives future agents one command, one manifest, and one validation report instead of a vague asset direction.

Decision: keep the mobile 3D pipeline in `0.18-prep`, not as an alpha blocker.
