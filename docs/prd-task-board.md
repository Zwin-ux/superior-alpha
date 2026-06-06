# SUPERIOR PRD Task Board

Updated: 2026-06-06

This is the execution board for the current PRD. It is not a roadmap wishlist. Each item has a lane, a proof gate, and the next concrete action.

## Active Product Line

Current proof line:

```text
0.18 High Quality Alpha Gate
Install SUPERIOR -> wake/register spore -> choose body -> equip skill -> bind Chrome -> extension icon becomes that spore -> run skill -> spore reacts -> proof is recorded
```

Next build line:

```text
0.19 Beta Candidate Gate
Clean install -> account/spore setup -> Chrome hand bind -> skill proof -> uninstall/reinstall -> spore still loads
```

Product rule: do not widen platform features until the 0.19 loop survives a fresh install without hidden founder setup.

## P0 Tasks

| Task | Lane | Status | Gate | Next action |
| --- | --- | --- | --- | --- |
| 0.19 clean-install loop | windows | Review | `corepack pnpm windows:installed-loop-smoke` | Latest reinstall persistence proof passed; keep this gate in the beta-candidate closeout stack. |
| First-run recovery states | windows / daemon | Review | `corepack pnpm gate:sprint -- --sprint first-run-recovery-states --lane windows --lane root --command "corepack pnpm windows:host-contract-smoke"` | Recovery tray now names daemon offline, key missing, browser missing, and hand unpaired states. Latest sprint report: `.clawdbot/sprint-gates/2026-06-05T07-38-55-693Z-first-run-recovery-states.json`. |
| Account/spore setup continuity | daemon / windows | Review | `corepack pnpm gate:sprint -- --sprint account-spore-continuity --lane daemon --lane windows --lane root --command "corepack pnpm fixture:supabase-account" --command "corepack pnpm windows:installed-loop-smoke:skip-build"` | Account continuity proof now shows Google/X/Discord account state beside a local spore, no token leakage, and sign-out preserving the local spore. Latest sprint report: `.clawdbot/sprint-gates/2026-06-06T14-32-38-492Z-account-spore-continuity.json`. |
| Chrome hand bind proof | extension / daemon | Review | `corepack pnpm fixture:extension-skill` | Re-run stale-token, unpaired, and active-page proof after any daemon or extension contract change. |
| Spore survives reinstall | windows / daemon | Review | `corepack pnpm windows:installed-loop-smoke:skip-build` | Added reinstall persistence check; latest report: `.clawdbot/verification/native-loop-fixture-1780644556596.json`. |
| Release proof packet | release / docs | Review | `corepack pnpm gate:sprint -- --sprint release-proof --prompt "build current alpha release proof packet" --lane docs --lane root` | One-page packet exists at `docs/release-proof-packet.md`; artifacts rebuilt and live provider redirects passed. Latest OAuth report: `.clawdbot/verification/live-oauth-smoke-1780758866547.json`. |

## P1 Tasks

| Task | Lane | Status | Gate | Next action |
| --- | --- | --- | --- | --- |
| Godot clarity pass | godot | Review | `corepack pnpm superior:engine-check` + `corepack pnpm video:showcase` | Use the 22-second showcase test with three people; record confusion points before changing scenes. |
| Function kernel convergence | shared-contracts / daemon | In progress | `corepack pnpm fixture:host-contract` | Keep legacy skill routes delegating toward one runner shape with typed errors. |
| Pocket Walker ChatGPT port | chatgpt-app | Review | `corepack pnpm gate:chatgpt-app` | Keep it read-only and submission-safe; do not let it become a remote Workshop. |
| Chrome Web Store package refresh | extension / release | Review | `corepack pnpm extension:store-package` | Rebuild the store ZIP only after extension identity or permission changes. |
| Mobile companion contract | mobile-prep | Review | `corepack pnpm fixture:mobile-companion` | Keep mobile read-only: identity, proof, device state, share prep. No phone Workshop. |
| Mobile dimensional asset shelf | mobile-prep | Review | `corepack pnpm assets:mobile-3d` | Replace generated proof GLB with hand-reviewed sculpt only after runtime target is chosen. |

## P2 Tasks

| Task | Lane | Status | Gate | Next action |
| --- | --- | --- | --- | --- |
| Notion build board mirror | docs | Review | docs sprint gate | Notion command-center page is linked; keep it as a mirror, not the implementation source of truth. |
| Linear PRD digest | docs | Review | Linear document update | Linear digest is current through first-run recovery; keep it as the short external digest. |
| Public release wording | release / docs | Planned | docs sprint gate | Remove stale milestone names and avoid generic platform-language drift. |
| Future native mobile UI | mobile-prep | Deferred | none | Start only after Windows 0.19 loop is stable. |

## Lane Commands

Use Codex sprint gates for every prompt:

```powershell
corepack pnpm gate:sprint -- --sprint <slug> --prompt "<prompt>" --lane <lane> --lane root
```

Common lanes:

```text
godot          engine/runtime visual proof
windows        native/installer loop
daemon         local runtime boundary
extension      Chrome/Edge hand
chatgpt-app    Pocket Walker
mobile-prep    mobile assets/contracts only
docs           PRD, release, Notion/Linear mirrors
root           full workspace typecheck/test/build
```

## Done Rules

- A task is not done until its gate has a report path or artifact path.
- A UI task is not done if it creates dashboard/card clutter.
- A platform task is not done if it bypasses the local privacy boundary.
- A release task is not done if caveats are missing.
- A PRD task is not done if another agent cannot pick it up without asking what the current milestone is.

## Current Next Move

Continue with full interactive account callback validation and clean installed-app walkthrough. Reinstall persistence, first-run recovery, account/spore continuity, release proof, artifact rebuild, and first-hop Google/X/Discord redirects are in review.
