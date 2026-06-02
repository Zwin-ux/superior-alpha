# Windows Expansion Packet

External planning:

- Notion: [SUPERIOR Windows Expansion Map](https://www.notion.so/3719316183be81cba673eb666725bd2b)
- Linear: [SUPERIOR Windows Quality Expansion](https://linear.app/reflexfasdf/project/superior-windows-quality-expansion-f01cf1ce07d9)

## Goal

Make Windows the proof platform for SUPERIOR: install/open the app, wake the robot, choose a starter spore, connect model and browser hand, equip runnable skills, save, enter the Clay Workshop, then prove browser/repo work through physical bot reactions and MP4 footage.

## Current Issues

- REF-205: robot wake onboarding spine
- REF-206: model setup station
- REF-207: installed app starts packaged local brain
- REF-208: browser hand pairing station
- REF-209: starter spore selection
- REF-210: physical skill slots
- REF-211: repo playpen from official shell
- REF-212: placeholder clay factory asset replacement
- REF-213: MP4 proof gate
- REF-214: beta clean-machine checklist
- REF-215: Chrome alpha runtime bot identity sync

## Next Best Sprint

Start with REF-205, REF-209, and REF-210 together. That builds the visible product spine: empty bench, starter spore, physical skills, save, and workshop drop. Then connect model/browser setup with REF-206 and REF-208.

## Proof Required

- MP4 showing robot wake, starter spore, skill equip, save, and workshop drop
- root checks: `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`
- Godot checks: `corepack pnpm superior:engine-check`, `corepack pnpm --filter @superior/godot-client godot:check`
- installed loop proof once packaging work resumes
