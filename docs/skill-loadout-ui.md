# Skill Loadout UI

## Direction

Skills are not feature cards.

Skills are equipment.

The user should feel like they are setting up a small JRPG character before sending it into the browser. The bot is the character. Skills are clay parts socketed onto the head. Browser pages are encounters.

## References To Learn From

Use these as design lessons, not visual copies:

- Source-style tools: plain entity names, visible inputs/outputs, inspectable state.
- Portal-style toy lab: one clear gimmick, taught through interaction and feedback.
- JRPG equipment menus: limited slots, visible equipped state, fast comparison, clear affordances.
- Materia-like systems: abilities become physical items with slot rules and possible links.

## Core Loadout Model

Each skill needs:

- `id`
- `name`
- `part`
- `slot`
- `type`
- `state`
- `effect`
- `source`

Recommended slots:

- `Eye`
- `Crown`
- `Side`
- `Badge`
- `Charm`

Recommended skill types:

- `Read`
- `Extract`
- `Detect`
- `Watch`
- `Predict`
- `Work`

Recommended states:

- `Runnable`
- `Stowed`
- `Hidden`

## UI Shape

Desktop skill screen:

```text
SUPERIOR

[bot stage]

LOADOUT
Eye      [Article X-Ray]
Crown    [empty]
Side     [empty]
Badge    [Page Explainer]
Charm    [empty]

PARTS CASE
[skill] [skill] [skill]
```

The user should not read a paragraph to understand a skill. They should see:

- What slot it goes into.
- What part appears on the bot.
- What it does in one short line.
- Whether it is usable now.

Only runnable skills appear in the user-facing loadout. Source-mapped Synergy/SUP skills stay in the internal roadmap until they have a working local or daemon adapter.

## Skill Copy

Use short effect text.

Good:

- `Explains the page.`
- `Cleans article text.`
- `Finds transcript clues.`
- `Marks pattern risk.`
- `Watches for changes.`
- `Reads the lane.`

Bad:

- `Leverage AI-powered insight generation.`
- `Unlock a seamless browsing intelligence workflow.`
- `Analyze and summarize content across the web.`
- `Enhance productivity with personalized agents.`

## Feedback Rules

Every loadout action should produce visible feedback:

- Equip: part pops onto the bot.
- Unequip: part drops into the tray.
- Hidden future part: no loadout affordance until it runs.
- Error: part shakes and returns to previous slot.
- Saved: icon and favicon update.

## Slot Rules

Start simple.

- Each slot can hold one skill.
- Core skills may be pinned.
- Source-mapped skills are hidden from the loadout until implemented.
- Later, linked slots can create combos.

Examples:

- `Article X-Ray + Page Explainer`: clean first, explain second.
- `Transcript Lens + AI Pattern Detector`: read transcript, mark pattern risk.
- `Prediction Pulse + Market Lane Scout`: read lane, choose IN/HOLD/OUT.

## Custom Skill Import

The future custom skill path should feel like adding a part to the workshop, not installing an enterprise integration.

Planned flow:

1. User drops a local JS/TS project folder into the parts tray.
2. Daemon scans package metadata, TypeScript config, JS/TS entrypoints, scripts, and tests.
3. AI proposes a small adapter: trigger, inputs, output shape, slot, icon part, smoke command, and safety notes.
4. User reviews the proposed adapter.
5. The skill appears in the loadout only after the adapter passes a local smoke run.

V1 custom import target:

- Accept: folders with `package.json`, `tsconfig.json`, or `.js/.jsx/.ts/.tsx/.mjs/.cjs` source.
- Reject: loose docs, Python projects, binaries, and random asset folders.
- Do not run scripts during scan.
- Do not show the custom part in the loadout until the adapter is approved and runnable.

## What This Prevents

This model prevents the UI from becoming:

- A generic feature grid.
- A settings form.
- A SaaS integrations page.
- A long list of tools with descriptions.

It also gives SUPERIOR a reason to be a creature: the bot visibly wears what it can do.
