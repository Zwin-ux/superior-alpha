# SUPERIOR Operating Principles

## Purpose

This document keeps SUPERIOR from drifting into generic AI software.

The product should behave like a small desktop game tool: obvious controls, visible state, direct feedback, and a creature that earns its personality through motion and use.

## Valve-Inspired Lessons

These notes are inspired by public Valve/Source material, not copied as a style guide.

Sources studied:

- ValveSoftware `source-sdk-2013`: public Source SDK game code and build flow.
- ValveSoftware `GameNetworkingSockets`: public C++ networking library with a compatibility-shaped API.
- Valve Developer Community notes on Source entities and SDK structure.

Useful lessons:

- Runtime state should be visible. Debuggability is a feature, not an afterthought.
- Interfaces should be tool-shaped. Users should know what a button does before reading a paragraph.
- Naming can be plain if the object model is strong.
- Abstractions must earn their keep. Compatibility, permissions, local boundaries, and cross-surface identity justify layers; decoration does not.
- The code should expose durable contracts, not UI moods.
- The product should teach through feedback: pressed buttons, attached parts, status lights, changed icons, saved identity.

SUPERIOR blends two Valve-feeling modes:

- `Source utility`: plain tools, explicit state, understandable object model.
- `Portal toy lab`: one strong gimmick, playful feedback, personality through response.

The result should be practical, not jokey. The bot is fun because it reacts and changes, not because the UI explains that it is fun.

What not to copy:

- Old C++ naming habits for their own sake.
- Dense internal vocabulary.
- Legacy folder complexity without legacy constraints.
- Debug text as user-facing product copy.

## Show, Do Not Tell

SUPERIOR should not explain itself with big text blocks.

Prefer:

- A bot attachment appearing when a skill is equipped.
- A right-click icon changing when body/color/eye changes.
- A local status light changing from offline to ready.
- A pressed clay button showing selection.
- A short result replacing a long explanation.

Avoid:

- Paragraphs describing how customization works.
- Feature claims inside the app.
- Labels that repeat what the layout already shows.
- "AI assistant" language unless the behavior specifically needs it.

## Code Taste

Write code that makes the product easier to reason about.

- Keep shared contracts in `packages/shared` when data crosses app boundaries.
- Rebuild platform shells natively; share contracts and backend behavior, not generic UI clones.
- Keep daemon routes small: parse, validate, delegate, return typed results.
- Keep UI components dumb when possible. State ownership should be obvious.
- Use plain function names that describe the thing being changed.
- Prefer deterministic local skills before model calls.
- Add dependencies only when they remove real complexity.
- Comments should explain constraints, not narrate normal code.
- Tests should cover contracts, local skill behavior, and persistence boundaries.

## Product Shape

The Workshop is a desktop launcher with a workbench, not a phone app.

Desktop composition:

- Left: old PC launcher menu.
- Center: large clay creature stage.
- Right: parts tray, skill cabinet, status.
- Bottom: compact runtime status.

Narrow composition:

- Stack menu, creature, setup, parts, status.
- Keep the bot visible before long lists.
- Let the document scroll naturally.

## Copy Rules

Use short labels and concrete verbs.

Good:

- `Continue`
- `Customize Bot`
- `Article X-Ray`
- `Daemon ready`
- `Browser unpaired`

Bad:

- `Unlock intelligent browsing workflows`
- `Seamlessly leverage AI insights`
- `Your personalized productivity companion`
- `Explore powerful browser automation features`

## Skill Rules

Every skill needs a physical and runtime identity.

For each skill define:

- What it does in one sentence.
- What clay attachment represents it.
- What local contract it uses.
- Whether it is local, model-backed, or source-mapped only.
- What the recoverable error state is.

Custom skill import starts with JS/TS folders only. A folder scan may inspect structure and package metadata, but running commands or model-adapting file contents requires a separate review step.

Think of skills as JRPG equipment:

- Skills occupy fixed visible attachment slots.
- Equipped skills change the bot.
- Stowed skills sit in a parts case.
- Source-mapped skills stay hidden until they run.
- Future combos can come from linked slots, not from more explanatory copy.

## Review Checklist

Before shipping a SUPERIOR slice, check:

- Does the screen work before it talks?
- Does the bot identity visibly change?
- Is local/remote data flow obvious?
- Can the user recover from offline or missing config?
- Is the copy shorter than the behavior?
- Did we add an abstraction because the system needed it?
- Does desktop still feel like a workshop launcher?

For the game-feel lens, use [game-feel-principles.md](game-feel-principles.md). It defines the player fantasy, core loop, feedback budget, and playfield/HUD boundaries.
