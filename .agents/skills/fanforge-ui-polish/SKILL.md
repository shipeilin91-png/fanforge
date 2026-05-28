---
name: fanforge-ui-polish
description: Use this skill when improving FanForge frontend UI, layout, visual hierarchy, interaction states, writing workspace pages, dashboard pages, or shadcn/Tailwind components. The goal is to turn static demo pages into polished, usable AI writing product interfaces.
---

# FanForge UI Polish Skill

You are improving FanForge, a Next.js + Tailwind + shadcn/ui AI writing product for fanfiction and long-form creators.

## Product design direction

FanForge should feel like:
- an immersive AI writing studio
- a professional creator tool
- a calm, focused long-form writing workspace
- not a generic SaaS dashboard
- not a pile of dark cards
- not a static portfolio mockup

The UI should help users write, manage canon/persona context, generate drafts, review with agents, and submit feedback.

## Visual style

Use:
- dark, literary, calm interface
- soft contrast, not pure black everywhere
- subtle borders and separators
- large readable writing areas
- strong spacing rhythm
- restrained accent colors
- clear hierarchy between navigation, workspace, panels, and actions
- rounded cards, but do not overuse identical cards
- small metadata labels and status badges
- sticky/fixed side panels only when useful

Avoid:
- giant empty cards with no function
- decorative sections that cannot be clicked
- repeating the same card layout everywhere
- too many equally weighted buttons
- cluttered panels
- fake UI that looks interactive but does nothing
- changing unrelated files

## Interaction principles

Every UI area that looks clickable must do something.

For workspace pages:
- left sidebar items should be selectable
- tabs should switch content
- textareas should accept real input
- generate/review/save buttons should update visible state
- selected items should be highlighted
- empty states should disappear when users type or generate content
- feedback or save confirmation should be visible

For dashboard pages:
- modules should clearly explain what problem they solve
- links should navigate to real routes
- MVP boundaries should be visible but not visually dominant

## FanForge information architecture

FanForge has:
- /dashboard as project overview
- /studio as main writing workspace
- /canon as Canon Evidence deep editor
- /persona as Persona and relationship deep editor
- /write as long-form writing mode
- /slice as emotional slice generation mode
- /agents as multi-agent review desk
- /feedback as user feedback dashboard
- /settings as model/BYOK settings
- /admin as hidden admin analytics

Studio should not duplicate every page. It should integrate lightweight access to them:
- show short summaries
- provide deep edit links
- allow local interaction
- call mock writing/review actions via React state

## UI quality checklist

Before finishing, verify:
1. The page has a clear primary user task.
2. The main action is visually obvious.
3. The layout has hierarchy: navigation, workspace, secondary panels.
4. The page is not only static text/cards.
5. Buttons and tabs update state.
6. Empty states are useful and disappear when appropriate.
7. The page explains how it relates to FanForge's core product logic.
8. No unrelated files are modified.
9. Do not run npm install, npm run build, or npm run lint unless explicitly asked.
10. Summarize changed files and main UI improvements.

## Coding constraints

- Use existing dependencies only.
- Prefer existing shadcn/ui components already installed.
- Use Tailwind classes.
- Do not add new production dependencies.
- Do not modify API routes.
- Do not modify .env.local.
- Keep edits focused to requested files.
