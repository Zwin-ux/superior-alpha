# Clean UI And Motion Plan

## Direction

SUPERIOR needs two layers working together:

- Clay art gives the product memory.
- Clean utility structure makes it usable every day.

Use Coinbase-style restraint as the UI lesson: clear account/status hierarchy, confident spacing, direct controls, and very few decorative surfaces. Do not copy Coinbase visually. Keep SUPERIOR clay, warm, and game-like.

Use small motion as feedback. Treat animation like the physical behavior of clay parts, not a showpiece.

## Product Rule

Every screen should answer three questions quickly:

1. What is my bot wearing?
2. Is the local browser link ready?
3. What can I run right now?

If a panel does not help answer one of those, it should be hidden, moved lower, or collapsed.

## Clean Utility Layer

### Hierarchy

Primary:

- Bot stage
- Loadout slots
- Browser/daemon/OpenAI status
- Current action result

Secondary:

- Parts case
- Custom import proposal
- Recent activity
- Source cabinet notes

Tertiary:

- Docs-style descriptions
- Roadmap skills
- Long result text
- Service implementation details

### Layout Rules

- Desktop keeps the three-zone launcher: menu, bot stage, utility tray.
- The right tray should act like an equipment/status column, not a dashboard.
- Only one active work surface appears in the tray at a time.
- Status should sit close to the action it affects.
- Results should replace or sit above recent activity, not compete with it.
- Mobile stacks: menu, bot, active tray, then secondary lists.

### Copy Rules

Good:

- `Browser paired.`
- `Token rejected.`
- `Proposal only.`
- `OpenAI key missing.`
- `X-Ray ready.`

Bad:

- `Use our AI-powered assistant to unlock seamless productivity.`
- `This workflow enables deeper insight across arbitrary web surfaces.`
- `Configure your personalized browser intelligence system.`

## Motion Budget

Motion should be small, useful, and repeated consistently.

| Event | Motion | Duration | Purpose |
| --- | --- | --- | --- |
| Menu hover | y +1, slight vertical stretch | 140ms | Button is soft clay |
| Menu press | y +5, shadow collapse | 140ms | Button depresses |
| Skill equip | part scale .86 -> 1.06 -> 1 | 220ms | Part pops onto bot |
| Pointer near bot | eyes/lens offset within 8px x 6px | 180ms | Creature notices the user |
| Pairing starts | token stamp fades in | 180ms | Local token is ready |
| Pairing succeeds | status dot pulse once | 260ms | Browser is linked |
| Stale token | panel shakes 3 times | 120ms each | Reset required |
| Import scan | button depress + proposal drops 8px | 180ms | Scan completed |
| Result ready | bot blink + badge pulse once | 260ms | Action finished |

Do not add idle animation to every panel. The bot can idle; the UI should stay still.

## Animation Implementation

Use CSS for current v1 motion:

- `transform`
- `opacity`
- `box-shadow`
- `filter` only for tiny glows

The main desktop bot can use a small React pointer listener to write CSS variables for eye position. Keep the behavior bounded and reusable across dot, pixel, glow, and scanner-lens eyes.

Avoid adding Lottie or a motion runtime until there are hand-authored animation assets worth shipping. If Lottie is added later, reserve it for:

- first-run bot assembly
- rare skill unlock animation
- onboarding vignette

Do not use Lottie for ordinary button, status, or panel transitions.

## Icon And Favicon Rules

The extension icon is not a logo after setup. It is the user bot.

Required surfaces:

- Chrome install icon: static Gremlin default PNGs
- Extension toolbar icon: live `BotIdentity` render
- Context menu action identity: same live toolbar icon
- Desktop browser-tab favicon: same `BotIdentity` SVG path

Icon priorities:

1. Readable eyes at 16px.
2. Strong body silhouette.
3. Pigment color.
4. One or two skill attachments max.
5. Clay highlights and dents only if they survive small size.

## Near-Term UI Pass

### Pass 1: Status Cleanup

- Make one compact status strip canonical across desktop and popup.
- Use `ready`, `warning`, `blocked`, `offline` language consistently.
- Add stale-token state in popup.
- Disable only actions affected by the failing status.

### Pass 2: Active Tray Modes

Right tray should switch between:

- `Skills`
- `Browser Link`
- `Custom Import`
- `Result`
- `Options`

Do not show every subsystem at once.

### Pass 3: Result Surface

Workshop should show recent browser results as compact rows:

- source title
- skill used
- quality/status
- timestamp
- reopen action

The popup should show only the most useful result summary.

### Pass 4: Motion Polish

- Centralize timing tokens in CSS.
- Add attachment pop animation.
- Add status dot pulse for state changes.
- Add stale-token shake.
- Add reduced-motion fallbacks.

### Pass 5: Asset Polish

- Use `assets/bots/clawdbot-clay-asset-sheet.png` as the visual target.
- Improve Canvas icon renderer with better gremlin gear and skill part scaling.
- Add optional generated PNG exports for each default body/color/eye combination later.

## Acceptance Criteria

- The app still feels like a clay launcher, not a finance app.
- The UI reads cleaner and calmer.
- Primary actions are easier to find.
- Motion makes state changes more understandable.
- No new generic SaaS panels, badges, or feature cards.
- No animation dependency is added for small interactions.
