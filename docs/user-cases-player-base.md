# SUPERIOR User Cases And Player Base

## Core Player

SUPERIOR is for people who collect useful software and want a local companion that can understand it fast.

Primary users:

- builders who jump between GitHub repos
- browser power users who want page skills without a hosted account
- indie developers who need quick project orientation
- tool collectors who want local automation they can trust
- curious users who like game-like feedback more than dashboards

The user is not looking for a chatbot page. They are handing the creature objects: a page, an article, a repo, a folder, a browser profile. The creature reads the object, changes parts, and returns a concrete next move.

## Repo Reader Loop

The strongest early loop:

```text
paste GitHub repo -> bot maps project -> bot identifies presentation -> bot chooses playpen -> user runs or learns it
```

Repo Reader should classify how a project presents:

- `desktop-exe`: Tauri, Electron, installers, app resources
- `browser-extension`: MV3 manifest, extension popup, background worker
- `web-app`: Vite, Next, Remix, frontend dev server
- `local-service`: server entrypoint, health route, Docker/service scripts
- `cli`: bin command or command package
- `library`: package surface without a runtime app
- `monorepo`: apps/packages workspace
- `docs`: documentation-first project

Then it decides the robot mode:

- `learn`: read docs, map entrypoints, identify stack and risks
- `spin-up`: install, run dev/build/test, inspect the runtime
- `both`: learn enough to run safely, then spin up the app or service

## Repo Playpens

SUPERIOR should not treat every repo like the same folder scan. A GitHub project is a thing with a preferred surface.

The robot should pick a local playpen:

- `SUPERIOR Browser`: for web apps. Start the dev server, open the app in a controlled browser profile, watch console/network, and use page skills on the running screen.
- `Extension Lab`: for Chrome/Edge extensions. Build the extension, load it unpacked into a controlled browser profile, test popup/background/page actions, and keep it away from the user's everyday browser profile.
- `Loopback Bench`: for services. Start on localhost, inspect health/routes/logs, and return short runtime notes.
- `Desktop Bench`: for exe-style apps. Run the desktop shell, watch bundled resources and helper processes, then verify package paths.
- `Terminal Cage`: for CLI projects. Build or link the command, run help/version/dry checks, and save command notes.
- `Package Shelf`: for libraries. Read exports, examples, and tests before proposing an adapter.
- `Docs Table`: for docs-first repos. Turn docs into concrete setup notes or commands.
- `Repo Map`: for unclear or broad monorepos. Map folders first, then switch to the right playpen.

Assume the installed app can request broad local permissions, but keep the loop visible and staged. The user should feel like the creature has a workbench, browser, and terminal of its own, not like it is secretly acting in the background.

## Why This Works

The product fantasy is not that SUPERIOR knows everything. It is that SUPERIOR is good at picking up a digital object and figuring out how to play with it.

For GitHub repos, that means:

- what is this project?
- how does it present to a user?
- what environment does it need?
- what should be checked before changing it?
- where should the bot attach itself: browser, desktop app, service, CLI, or docs?
- what playpen should the robot use first?

## Skill Direction

Each skill should become a small service the creature can use:

- `Article X-Ray`: read page text
- `Page Explainer`: explain supplied page text
- `Repo Reader`: classify and stage GitHub projects
- `Custom Part`: scan local JS/TS folders for adapter proposals

Later skills should reuse this pattern instead of becoming a feature grid. The user gives SUPERIOR an object. SUPERIOR maps it, shows the right attachment, and returns a short next move.
