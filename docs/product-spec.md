# SUPERIOR Product Spec

Note: [full-product-spec.md](full-product-spec.md) is the canonical product and release spec. [superior-alpha-prd.md](superior-alpha-prd.md) preserves the current alpha PRD.

## Product Thesis

SUPERIOR is a desktop clay creature utility you launch as an exe, pair with your browser, and use to explain or inspect the internet.

The product should feel like a handmade desktop creature living inside an old PC game launcher. The core experience is not an AI dashboard. It is a tactile workshop where the user creates a small bot, gives it skills, links it to the browser, and uses it from page context.

## Product Soul

SUPERIOR should feel:

- Handmade, tactile, and slightly imperfect
- Useful before it is clever
- Toy-like without becoming childish
- Cozy without becoming decorative
- Clear enough to use every day

The aesthetic is claymation robot plus cozy game launcher plus desktop utility.

## Superior Skill Cabinet

SUPERIOR is the product and the broader skill cabinet. It lets useful behavior from other projects become clay attachments instead of separate tools.

Source projects:

- Synergy / ScriptLens: transcript analysis, article extraction, local writing-pattern detection, and page monitoring.
- SUP Playable Core: prediction pulse, IN/HOLD/OUT read loops, market lane scouting, crew signals, and reward feedback.

The clay creature is the visible buddy. SUPERIOR is the product shell and capability shelf around it.

## Target User

Define the primary user in practical terms:

- They read messy pages, feeds, repos, listings, and job posts.
- They want quick explanation, scanning, and pattern detection without opening a generic chat product.
- They value a tool that feels owned, local, and personal.
- The keeper moment is seeing their custom clay bot appear in the launcher, floating buddy, extension popup, and right-click icon.

## Core Experience

Describe the smallest product experience that feels complete:

1. User opens `SUPERIOR`.
2. User creates or continues a clay bot.
3. User chooses body, color, eye, skills, rules, and browser link.
4. The bot updates live as a small handmade clay head.
5. User invokes SUPERIOR from the browser.
6. SUPERIOR explains, scans, or summarizes the current page with a concise result.
7. The same bot identity appears consistently across desktop, browser popup, floating buddy, and right-click icon.

## Launcher

The first screen is a simple game-style launcher, not a homepage.

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

Working title: `SUPERIOR`.

The bot sits on a small clay table or workbench. Menu buttons sit on the left as chunky clay slabs with carved text. Hovering squishes a button slightly. Clicking depresses it like a physical toy control.

## Creation Flow

Keep setup copy simple:

```text
CREATE BOT

Name
Body
Color
Eye
Skills
Rules
Browser
Finish
```

The flow should rely on visuals and motion, not exaggerated copy.

## Bot Bodies

### Core

Round clay head, friendly shape, uneven surface, soft dot eyes.

Animation: slow bounce, blink, small head tilt.

### Scanner

One large clay lens pressed into the head. The lens may glow, but the body stays matte and tactile.

Animation: soft lens sweep with handmade head wobble.

### Sentinel

Rounded clay helmet shape with a stamped shield mark.

Animation: shield ring appears like a clay stamp or restrained glow.

### Gremlin

Small scrappy clay head with uneven antenna, a little gear stuck on the side, and slight asymmetry.

Animation: antenna wiggle, tiny eye dart, small bounce.

### Orb

Smooth clay sphere with a subtle glow inside.

Animation: slow breathing glow and soft hover.

## Skills As Attachments

Skills should appear as clay pieces stuck onto the bot:

- Feed X-Ray -> clay lens ring
- Repo Reader -> tiny clay gear
- Dark Pattern Scanner -> clay shield badge
- Job Scanner -> clay badge or stamp
- Page Explainer -> tiny clay paper tab
- Article X-Ray -> pressed clay lens ring
- Transcript Lens -> tiny caption reel
- AI Pattern Detector -> stamped checker badge
- Change Sentinel -> clay alarm bead
- Prediction Pulse -> Sun Gold pulse coin
- Market Lane Scout -> clay lane flag
- Crew Signal -> tiny crew radio

This makes customization feel physical and visible instead of abstract.

## Skills As Loadout

The skills UI is a core product surface.

It should feel like preparing a party member before a run:

- The bot has limited attachment slots.
- Skills are clay parts that can be equipped or stowed.
- Equipped skills visibly change the bot.
- Source-mapped skills stay hidden until they actually run.
- Later combos should come from linked slots, not from more menu copy.

The loadout should answer three questions without a paragraph:

- What can this bot do?
- Where is that ability attached?
- Is it runnable now?

Suggested slot model:

```text
Eye    Article X-Ray
Crown  empty
Side   empty
Badge  Page Explainer
Charm  empty
```

Good effect copy:

```text
Explains the page.
Cleans article text.
Marks pattern risk.
Watches for changes.
Reads the lane.
```

## Product Principles

- Make the interface feel like a tool, not a pitch.
- Keep the first screen functional.
- Show behavior through changed state, not explanatory copy.
- Prefer one strong interaction over a spread of weak features.
- Use copy that is direct, specific, and human.
- Avoid generic AI assistant framing unless the behavior demands it.
- Keep the bot visually consistent across every surface.
- Make customization visible, not buried in settings.
- Treat the bot, parts tray, right-click icon, and status lights as product explanation.
- Avoid chrome cyberpunk, shiny AI dashboard styling, and generic vector mascots.
- Hide non-runnable future skills from the loadout instead of teasing them as disabled cards.

## Product Posture

SUPERIOR should feel more like a small game utility than a productivity app.

The screen should prove what is happening:

- A selected body changes the creature silhouette.
- A selected pigment changes the clay material.
- A selected eye changes expression.
- A selected skill appears as a stuck-on part.
- A browser link state changes the status strip and requires daemon-owned pairing.
- The extension icon becomes the same creature.

If a feature needs a paragraph to feel useful, the interaction is probably too abstract.

## V1 Scope

### Must Have

- Clear first-run path
- SUPERIOR launcher
- Live clay bot preview
- Body, color, eye, and skill customization
- Skills represented as visible clay attachments
- Fixed skill slots: Eye, Crown, Side, Badge, Charm
- One primary browser action
- Extension popup using the same bot identity
- Right-click icon rendered as the user's tiny clay bot head
- Visible status and recent activity
- Safe defaults for background behavior
- Daemon-owned browser pairing token
- Settings that expose only decisions users actually need

### Should Have

- Lightweight local history
- Manual retry or rerun
- Basic error state with recovery action
- Shared types between desktop, extension, and daemon
- Small animation pass for idle, hover, click, blink, and attach states
- JS/TS custom skill folder import proposal, hidden until adapter approval

### Not V1

- Large dashboard surfaces
- Vague analytics panels
- Feature-card onboarding
- Multiple personas before the core bot behavior is proven
- Generic SaaS homepage layout
- Purple AI gradients, floating mockups, or decorative stats cards
- Perfect sci-fi holograms
- Arbitrary-language custom skill import before the JS/TS path is proven

## Locked Decisions

- Primary early jobs: explain pages, X-Ray articles, and map GitHub repos into playpens.
- Daemon runs locally and is started by the desktop app when needed.
- Extension observes active page context only after pairing and never receives the OpenAI key.
- Local identity, tokens, repo records, browser profiles, and custom skill proposals stay local.
- Playfulness belongs in the bot, clay parts, pressed controls, notes, and icon consistency.
- The tiny icon is generated from shared bot identity: body, pigment, eye, and equipped slots.
