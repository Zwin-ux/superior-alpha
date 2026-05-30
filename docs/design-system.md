# SUPERIOR Design System

## Direction

SUPERIOR should feel like a claymation desktop game launcher, inspired by old PC game menus like FATE and the arcade clarity of SUP. Avoid SaaS dashboard styling. Use soft clay-like shapes, warm shadows, matte textures, rounded uneven forms, chunky buttons, subtle squash/stretch animation, and a cozy workshop scene.

The bot should look like a small handmade clay robot head. Its body, color, eye, and skills should update live and appear consistently in the launcher, floating buddy, extension popup, and right-click icon.

## Aesthetic Commitments

Use:

- Soft rounded shapes
- Visible handmade imperfections
- Subtle fingerprints and smudges
- Matte clay texture
- Chunky clay buttons
- Warm shadows
- Simple expressive eyes
- Small accessory pieces
- Pressed-in menu panels
- Handmade icon forms

Avoid:

- Chrome cyberpunk
- Shiny AI dashboards
- Generic vector mascots
- Purple AI gradients
- Hard metallic transitions
- Perfect sci-fi holograms
- Generic hero, subcopy, dual CTA, floating mockup, feature-card layouts

## Visual Principles

- Function first screen: no decorative landing page.
- Simple launcher structure before dashboard complexity.
- Clear hierarchy through spacing, contrast, and alignment.
- Use clean utility hierarchy under the clay art direction: status, current action, and runnable controls should be obvious at a glance.
- Product identity should appear through material, shape, motion, and consistency.
- Effects should feel physical: pressed, squished, stamped, stuck on, or gently glowing.
- Keep the interface toy-like but not childish.

## Layout

- Use `SUPERIOR` as the primary launcher frame.
- Put the main menu on the left.
- Put the clay bot on a small table or workbench as the main focal point.
- Put customization controls in a parts tray, not inside a phone-like settings panel.
- Keep the center workbench reserved for the creature and a compact identity plate.
- Avoid nested cards.
- Use pressed-in clay panels only where containment helps scanning.
- Preserve strong rhythm between menu buttons, bot preview, and status output.
- Desktop should feel like a compact launcher. Narrow layouts should stack menu, bot, then controls without losing the bot identity.

## Launcher Menu

```text
SUPERIOR

Continue
New Bot
Customize Bot
Skills
Browser Link
Options
Quit
```

Menu buttons should look like soft clay slabs with carved text. Hover states slightly squish. Active states depress into the surface.

## Typography

- Interface text should be compact and legible.
- Use one display style sparingly for `SUPERIOR` and major mode labels.
- Avoid oversized marketing headlines inside the app.
- Keep button labels short and action-specific.
- Carved labels should remain readable. Do not over-texture type.

## Color

Colors should feel like clay pigments, not neon light. The color tints the clay material; glow is reserved for eyes, lenses, and small status accents.

Suggested pigment names:

- Sky Blue
- Moss Green
- Brick Red
- Sun Gold
- Lavender
- Chalk White
- Charcoal

Core tokens:

- `background`
- `surface`
- `surface-raised`
- `text-primary`
- `text-muted`
- `border`
- `accent`
- `accent-contrast`
- `danger`
- `warning`
- `success`

Use one memorable accent per bot. Status colors should stay readable and functional.

## Bot Components

### Body

- `Core`: round clay head, soft dot eyes, friendly silhouette.
- `Scanner`: large clay lens pressed into the head.
- `Sentinel`: rounded helmet shape with stamped shield mark.
- `Gremlin`: scrappy asymmetrical head, uneven antenna, tiny side gear.
- `Orb`: smooth clay sphere with subtle internal glow.

### Eye

Eyes are the main expressive accent. They can glow lightly, blink organically, and change shape by body type. They should not become aggressive neon UI.

Desktop bot eyes should follow the cursor with a small bounded offset, then settle back when the pointer leaves or the window loses focus. This should feel like a Spore-style toy reacting to the user, not like a precision tracking HUD.

### Skills

Skills attach as clay pieces:

- Feed X-Ray -> lens ring
- Repo Reader -> tiny gear
- Dark Pattern Scanner -> shield badge
- Job Scanner -> badge or stamp
- Page Explainer -> paper tab
- Article X-Ray -> pressed lens ring
- Transcript Lens -> caption reel
- AI Pattern Detector -> checker badge
- Change Sentinel -> alarm bead
- Prediction Pulse -> pulse coin
- Market Lane Scout -> lane flag
- Crew Signal -> crew radio

Skill pieces should look physically stuck onto the head.

## Loadout UI

The skills interface should feel like setting up a JRPG character, not browsing feature cards.

Use:

- Slots
- Equipped parts
- Stowed parts
- Short effect labels
- Visible attachment changes

Avoid:

- Feature grids
- Integration cards
- Long skill descriptions in the primary UI
- Abstract capability lists
- Blueprint or locked-looking parts for skills that cannot run yet

Recommended slots:

- `Eye`
- `Crown`
- `Side`
- `Badge`
- `Charm`

The right-side panel should feel like a parts case or equipment rack. The center workbench should stay focused on the bot.

Source-mapped skills from Synergy/SUP are not user-facing loadout items until they actually run. Keep that roadmap in docs and internal catalogs, not as locked clutter in the workshop.

## Interaction

- Buttons need hover, active, focus, disabled, and loading states.
- Background tasks need visible status.
- Errors should explain what happened and offer one recovery path.
- Motion should feel slightly imperfect.
- Motion should stay small and functional. Do not animate every surface.
- Use squash/stretch on hover and click.
- Use tiny wobble when the bot moves.
- Add slight delay on head turns.
- Add small cursor-follow eye motion on the main desktop bot.
- Blink timing should feel organic.
- Skill pieces should pop into place like clay magnets.

Detailed interaction and motion rules live in [clean-ui-motion-plan.md](clean-ui-motion-plan.md).

## Copy Rules

- Say what the product is doing.
- Cut vague claims.
- Avoid startup filler.
- Use direct verbs for actions.
- Keep setup labels simple: `Name`, `Body`, `Color`, `Eye`, `Skills`, `Rules`, `Browser`, `Finish`.
- Do not use visible text to explain visual customization that the bot can show itself.
- Prefer labels that behave like game menu commands or tool labels.

## Show-First UI

The visual state should carry the product:

- Bot body changes are silhouette changes.
- Color changes are material changes.
- Eye changes are expression changes.
- Skill changes are attachment changes.
- Browser pairing changes are status-light changes.

Avoid turning the Workshop into a form. If controls begin to read as a settings app, move them into a tray, rack, shelf, or stamped tool surface.
