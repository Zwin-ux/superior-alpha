# Design Shotgun: Spore Onboarding

Date: 2026-05-31
Skill: `gstack-design-shotgun`
Target: Godot first-run setup, from boot to Workshop.

## Current Read

The current Godot proof is functional, but it still reads like a finished registry screen. The stronger product moment is earlier: the user opens SUPERIOR for the first time, wakes a spore, gives it a body, fits an eye, binds the Chrome hand, and sees the extension icon become that exact creature.

The next visual pass should not widen the app. It should make the first-run ritual undeniable.

## Shotgun Directions

### A. Console Birth

SUPERIOR opens like a handheld console or iPhone first boot: black screen, soft boot mark, lamp click, empty workbench. Controls are hidden until the spore wakes.

- First look: sleeping clay lump under one lamp.
- Left rail appears only after the lamp turns on.
- Each step is one physical change on the bench.
- Chrome hand appears late as a device-pairing plate, like AirPods or Joy-Cons.
- Best for: clarity, emotional hook, premium first impression.
- Risk: too restrained if the body/part animations are weak.

### B. Starter Lab

The setup behaves like choosing a Pokemon starter crossed with a Skyrim character table. The bench has three starter silhouettes, the user rotates through bodies, and the selected spore receives modules one by one.

- First look: three covered clay starters on small plates.
- Body choice is the centerpiece, not a small selector.
- Eye and role attach as visible machine modules.
- The right tray is a lab parts rack with only currently available pieces.
- Best for: customization appeal and replay value.
- Risk: can become busy if all starters remain visible for too long.

### C. Registry Machine

The setup is a tactile registration ceremony. The spore is born, then a physical certificate tracks its model, role, eye, browser hand, and status. The final stamp is the payoff.

- First look: empty certificate slot and sleeping spore.
- Every completed step burns/stamps a new line into the card.
- Browser hand proof is shown as an icon copy stamp: Clawd icon -> Chrome slot -> certificate seal.
- Best for: ownership proof and investor demo clarity.
- Risk: if the certificate dominates, the spore stops feeling alive.

### D. Toy Dock

The whole screen is a device dock. SUPERIOR feels like opening a strange toy console: side rails are hardware, slots are ports, and the spore connects parts like cartridges.

- First look: console frame around the workbench.
- Left progress rail is physical hardware with numbered LEDs.
- Browser hand is a plug-in module that clicks into the side of the spore.
- Bottom LEDs feel like real console hardware.
- Best for: platform identity and multi-shell story.
- Risk: less warm than the clay workshop if it gets too mechanical.

## Recommended Merge

Use **A as the pacing**, **B for the body/eye interaction**, and **C for the ownership proof**.

Do not merge all four aesthetics. The next build should feel like:

```text
Console first boot -> sleeping spore -> starter/body choice -> module fit -> Chrome icon copy -> registry stamp -> Workshop
```

That is the narrowest high-quality direction. It keeps the emotional first-boot feeling while preserving the concrete proof that the extension icon belongs to the creature.

## Plan Design Review

Initial rating: **7/10**.

The direction is strong, but the original packet still left too much room for another all-at-once setup screen. A 10/10 plan needs exact reveal rules, per-step composition targets, readable text limits, interaction states, and MP4 failure conditions.

Dimension ratings before fixes:

- Narrative pacing: **8/10**. The sequence is right, but the plan needs a rule that only one setup decision appears at a time.
- Visual hierarchy: **7/10**. The spore is named as the center, but rail, tray, and registry card could still compete too early.
- Physical interaction: **7/10**. Good verbs exist, but each step needs a required motion beat.
- Ownership proof: **8/10**. The Chrome icon match is the strongest moment, but it needs a downscaled still-frame gate.
- Readability: **6/10**. The plan says readable, but it does not cap label count, font size, or low-contrast text.
- Asset specificity: **6/10**. It names atlas plates, but does not yet reject placeholder-looking plates in the MP4.
- Verification: **7/10**. It requires a proof video, but not enough frame-level pass/fail checks.

After the fixes below, the implementation target is **9/10**. The remaining gap is final hand-directed clay art; this pass can prove staging and ownership without pretending the current generated plates are final art.

## Next Build Packet

Name: `0.16 Spore Birth Onboarding`

Goal: replace the current all-at-once registry screen with a staged onboarding scene.

Core rule:

```text
One decision on screen at a time. The spore changes first; labels confirm second.
```

Sequence:

1. `Boot Mark`
   - black screen
   - tiny SUPERIOR seed mark
   - short pulse, no `BOOTING` label
   - no rail, tray, status LEDs, browser card, or registry card yet

2. `Wake`
   - lamp clicks on
   - sleeping clay lump visible
   - copy: `SIGNAL FOUND`
   - left rail shows `01 WAKE` current, all others dim
   - right tray remains closed or shadowed
   - success beat: eyes open before the text changes

3. `Body`
   - center bench switches to starter table
   - choices: `Orb`, `Scanner`, `Gremlin`, `Sentinel`, `Clawdbot`
   - selected body gets a clay wobble and platform shadow
   - only three body plates may be fully visible at once; other bodies cycle or sit dimmed
   - success beat: selected body drops onto pedestal, then rail stamps `02 BODY`

4. `Eye`
   - tray shows eye modules only
   - selected eye slides onto face
   - eye blinks once after attach
   - no role, browser, or skill copy visible yet
   - success beat: X-Ray ring snaps on, pixel eyes blink, tray slot glows

5. `Role`
   - role is a badge/stamp, not a paragraph
   - choices: `Companion`, `Scout`, `Builder`, `Sentinel`, `Archivist`
   - selected role changes the badge plate and bot idle pose
   - each role gets one short verb phrase, maximum 18 characters
   - success beat: badge presses into side of body, rail stamps `04 ROLE`

6. `Browser`
   - clean pairing card
   - states: `Chrome detected`, `Extension ready`, `Icon match`
   - animation: cable pulse from spore to Chrome slot, then Clawd icon appears in the toolbar slot
   - generic browser card is not acceptable; it must read as device pairing
   - success beat: default icon disappears, Clawd icon appears, bottom browser LED turns green

7. `Stamp`
   - physical card:
     - `Name: CLAWD`
     - `Model: Gremlin`
     - `Eye: X-Ray`
     - `Role: Builder`
     - `Tool: Browser Hand`
     - `Status: Awake`
   - rubber stamp animation: `SPORE STAMPED`
   - bot squash/pop reaction
   - card may not appear before this step except as a blank slot
   - success beat: stamp lands, ink plate shakes, spore reacts, `Enter Workshop` appears

8. `Workshop`
   - lamp widens
   - left setup rail becomes launcher rail
   - right setup tray becomes parts tray
   - matched Chrome icon remains visible for at least the first second of the transition

## Quality Gate

This pass is not done unless a still frame at 640px wide makes these visible without explanation:

- The spore is alive and centered.
- The current setup step is obvious.
- Completed steps look stamped.
- The Browser step shows Chrome pairing, not a generic card.
- The icon match is visible as Clawd's face inside the Chrome slot.
- The final card reads as ownership, not settings.

Frame gates:

| Frame | Must Show | Must Not Show |
| --- | --- | --- |
| Boot | seed mark, dark field, short pulse | rail, tray, registry, browser card |
| Wake | lamp cone, sleeping/waking spore, `SIGNAL FOUND` | body choices, role choices, browser states |
| Body | starter plates, selected body on pedestal | certificate details, browser pairing |
| Eye | eye module sliding to face, eye slot glow | role descriptions, future skill slots |
| Role | role badge/stamp, selected role plate | browser card, OAuth/provider icons |
| Browser | Chrome pairing card, cable pulse, icon copy | long setup explanation, terminal log |
| Stamp | physical registry card, rubber stamp, spore reaction | unfilled hidden states, generic save form |
| Workshop | launcher rail, parts tray, live spore | setup-only labels dominating the room |

Motion gates:

- Boot seed pulse must finish within 2-4 seconds.
- Step advance must use a press, stamp, lamp tick, or part snap. A page-slide transition fails.
- Spore must blink or bob in every post-wake step.
- Browser binding must have three readable beats: default icon, transfer pulse, matched Clawd icon.
- Save must show physical impact before any status text changes.

Readability gates:

- Primary step label minimum: 28px equivalent at 1280x720.
- Secondary labels minimum: 16px equivalent at 1280x720.
- No more than six visible operational labels in the center stage at once.
- No important text over heavy clay noise.
- Pixel font is allowed for HUD/status only; certificate fields must stay readable.

Asset gates:

- `ownership.chrome-toolbar.slot`, `ownership.chrome-icon.default`, `ownership.chrome-icon.clawd`, `ownership.chrome-cable`, and `ownership.spore-stamp` must come from approved 0.15 ownership assets.
- Placeholder rectangles may remain only for invisible hit areas or debug fallback.
- If the Chrome icon match looks like a generic green blob at 640px wide, the pass fails.
- If the spore body does not read as clay/plasticine in the poster frame, the pass fails even if the flow works.

MP4 gate:

The proof video must show the entire ritual in this order:

```text
Boot mark -> Wake -> Body pick -> Eye fit -> Role stamp -> Browser bind -> Spore stamped -> Workshop reveal
```

Reject the MP4 if:

- it starts on the final registry screen,
- it skips the Browser icon-copy moment,
- the current step cannot be identified without reading all labels,
- all controls are visible from the first post-boot frame,
- the poster frame is black, abstract, or dominated by text.

## Cut List

Do not add:

- account provider icons before the ritual works
- OAuth/provider buttons as the first visual impression
- all role details at once
- a terminal panel in onboarding
- a dashboard-style model selector
- visible future skills that do not run
- more copy explaining why this is useful

Account handling for this pass:

- The account can be implied as `Registry` or `Spore ID`.
- Do not lead with Google/X/email buttons until the birth ritual works.
- If account UI must appear, show it as one small stamped registry plate after `Wake`, not as a login wall.

## Implementation Notes

- Keep Godot scene ownership in `Onboarding.tscn` / `onboarding_controller.gd`.
- Preserve current fixture strings required by `superior/godot-client/tools/check-project.mjs`, but move legacy labels off the main visual path where possible.
- Use atlas plates for Chrome hand and spore stamp. If an ownership asset is missing, fail the quality gate.
- The MP4 should prove the ritual, not just the final screen.
- Add stable capture timestamps or automated key presses so `video:godot-engine` records the reveal beats, not only the final state.
- Prefer fewer nodes per step over toggling everything visible; hidden controls should not occupy the first-read hierarchy.
