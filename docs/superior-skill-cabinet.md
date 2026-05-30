# Superior Skill Cabinet

`SUPERIOR` is the product and skill cabinet: a place to port useful behaviors from other local projects and present them as clay attachments.

The clay creature is the visible buddy. SUPERIOR is the broader library of powers it can carry.

## Source Projects

### Synergy / ScriptLens

Useful behaviors to port:

- Transcript-first YouTube analysis
- Defuddle-style article extraction with fallback checks
- Local AI-like writing-pattern heuristics
- Inline result cards and advanced workspace modes
- Page monitor/change sentinel contracts
- Honest source-quality labels

SUPERIOR translation:

- `Article X-Ray`: clean article/page extraction with coverage checks.
- `Transcript Lens`: transcript acquisition and source-quality labels for video pages.
- `AI Pattern Detector`: local writing-pattern scoring as a clay checker badge.
- `Change Sentinel`: page watch, snapshot diff, and change alerts.

### SUP Playable Core

Useful behaviors to port:

- IN/HOLD/OUT decision loop
- Pulse resolution and read grades
- Lane states: SAFE, HOT, RISK
- Crowd/crew signal feedback
- Streaks, rewards, drops, and collection shelf
- Bot hints after the user commits to a choice

SUPERIOR translation:

- `Prediction Pulse`: decision reads with IN/HOLD/OUT resolution.
- `Market Lane Scout`: reads lanes, crowd pressure, and risk modifiers.
- `Crew Signal`: shows what the crowd/crew did and whether the user read it cleanly.

## Popular Skill Shelf

These are natural SUPERIOR skills:

- `Feed X-Ray`: find signal and repeated patterns in feeds.
- `Repo Reader`: runnable first pass. Reads a GitHub repo link, identifies how the project presents, and picks a local playpen for learning or spin-up.
- `Dark Pattern Scanner`: flag manipulative signup, checkout, and cancellation flows.
- `Job Scanner`: read job posts for fit, red flags, and application angle.
- `Price Watch`: monitor product or ticket pages for meaningful changes.
- `Citation Checker`: check whether claims are backed by visible sources.
- `Deal Scout`: summarize offers, catch traps, and compare actual value.

## Product Rule

Every skill needs a physical clay attachment and a simple game loop:

```text
See the page -> attach the clay piece -> run the skill -> get a readable result -> earn or save something
```

The skill shelf should feel like a box of toy parts, not an enterprise integration directory.

User-facing loadouts only show runnable skills. Source-mapped Synergy/SUP ports stay in this cabinet as internal roadmap notes until their adapters actually run.

Custom imports start with JS/TS project folders. The first pass proposes a slot, effect, attachment, entrypoint, and smoke command from package metadata and source paths; it does not run the tool or equip it.

## Repo Reader Rule

Repo Reader should answer:

- Does this repo present as an exe, extension, web app, service, CLI, library, docs repo, or monorepo?
- Should SUPERIOR learn it first, spin it up, or do both?
- Which playpen should the robot use: SUPERIOR Browser, Extension Lab, Loopback Bench, Desktop Bench, Terminal Cage, Package Shelf, Docs Table, or Repo Map?
- What commands or environment gates should run first?
- Where can the bot attach itself later: browser, desktop app, local service, command, or docs?

This is the background fun: the creature gets a repo link and starts treating the project like a small object it can inspect and play with.
