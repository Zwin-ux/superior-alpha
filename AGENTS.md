# SUPERIOR Agent Rules

These rules apply inside `C:\Users\mzwin\Documents\Buddy\clawdbot`.

## Product Truth

SUPERIOR is a creature-led signal console and local robot environment. It is not an AI SaaS dashboard.

- Read `DESIGN.md` before making any visual, Figma, Godot, WPF, extension popup, or hub UI decision.
- Godot is the primary product runtime for the boot, onboarding, clay workshop, avatar, and engine MP4 proof.
- Figma is the planning and handoff layer, not the runtime.
- `apps/desktop` is a Tauri/React alpha harness only.
- `apps/windows` is the native Windows product lane.
- `apps/extension` is the Chrome browser hand.
- `apps/hub` is a project/status hub, not the consumer product shell.
- `packages/shared` and `superior/core` are the contract authority.

Do not turn Figma frames into a generic web app unless the user explicitly asks for a web preview.

## Figma Workflow

When implementing from Figma:

1. Read the exact node context first. Use Figma design context, metadata, and screenshots before coding.
2. Treat generated React/Tailwind output as reference only. Map it into the target platform: Godot, WPF, extension, harness, or hub.
3. Preserve the intended composition, hierarchy, interaction states, and motion. Do not copy visual noise.
4. Validate against a screenshot or MP4 proof when the runtime surface changes.

When creating or updating Figma specs:

- Use Figma as a control surface for screen sequence, spacing, state, motion, and handoff notes.
- Use pages like `00 North Star`, `01 Flow`, `02 Screen Frames`, `03 State Sheet`, `04 Tokens`, `05 Godot Handoff`, and `07 Asset Generator Sheet`.
- Every important frame should answer: where the user looks first, what changed physically, how success reads without paragraphs, how failure reads without paragraphs, and what the MP4 must prove.
- For an existing Figma file, search the design system before adding new components or tokens.

## Visual System

The core rule is:

```text
clay = world + bot + props + parts
pixel = HUD + labels + terminal + status + icons
AI mush = rejected
```

Use the concept composition as the default workshop silhouette:

- left clay launcher rail
- center bench, lamp, sign, and creature
- right clay parts tray
- bottom status pills and compact bot card

Buttons are clay slabs. Skills are equipment parts. Status is lights, stamps, pips, and physical reactions. The bot should explain success or failure before text does.

Avoid:

- SaaS hero layouts, feature grids, floating dashboard cards, glassmorphism, generic gradients
- long onboarding copy
- settings-form customization as the primary experience
- fake future skill cards in the loadout
- replacing bot feedback with paragraphs

## Asset Rules

Runtime art must move through the asset factory:

- `assets/bots/0.13/` for the Godot atlas plumbing lane
- `assets/bots/0.14/` for the clay factory quality gate
- `superior/godot-client/assets/clay/` for exported runtime atlas files

Do not paste one-off runtime PNGs into Godot without a manifest entry, approval state, and quality gate. Labels that change with state should be rendered by the runtime, not baked into images. Stable marks and decorative texture may be baked.

Generated art can be used as rough source, but runtime art must be sliced, named, approved, and validated. Placeholder assets are plumbing, not final quality.

## Platform Mapping

- Godot scenes/scripts/shaders live in `superior/godot-client`.
- Shared types and cross-boundary contracts live in `packages/shared` and `superior/core`.
- Daemon routes should parse, validate, delegate, and return typed results.
- Extension code must never receive OpenAI keys, account secrets, local pairing secrets beyond its own token, or private repo workspace state.
- Hub/cloud surfaces may show safe release proof and account/spore metadata only.

## Interaction And Motion

Prefer physical state changes:

- boot seed snap, restrained pulse, lamp flicker
- button press depression
- part snap and squash
- stamp confirmation
- tray light pulse
- bot blink, wobble, and small reaction

Keep motion short and readable. Use 12fps-ish holds where it helps claymation feel. Do not add continuous busy motion. Reduced-motion must keep state changes visible.

## Copy

Use short, concrete labels:

`Power`, `Key`, `Browser`, `Pick`, `Build`, `Save`, `Spore`, `Start`, `Stop`, `Ready`, `Missing`, `Paired`, `Failed`.

Do not use startup filler or AI-market language. Avoid words like `seamless`, `empower`, `leverage`, `revolutionary`, and generic model-copy unless quoting an external source.

## QA And Proof

After meaningful contract or runtime changes, run the relevant gates from this repo root:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

For Godot engine work:

```powershell
corepack pnpm superior:engine-check
corepack pnpm --filter @superior/godot-client godot:check
corepack pnpm video:godot-engine
```

For asset factory work:

```powershell
corepack pnpm assets:factory-sheet
corepack pnpm assets:factory-export
corepack pnpm assets:quality-gate
```

Any engine-facing sprint should produce an MP4 proof path and caveats in `docs/alpha-verification.md`.
