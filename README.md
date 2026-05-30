# FanForge

**Canon-aware AI Writing Studio for Fanfiction Creators**

FanForge is an AI co-writing platform for fanfiction creators. It helps writers generate more controllable stories within canon and character boundaries through a Canon Library, Persona Archive, relationship-focused Emotion Slice generation, Chapter Writing, Multi-Agent Review, and feedback-informed prompt optimization.

## Live Demo

Live Demo: https://fanforge-three.vercel.app

## Product Positioning

FanForge is not a generic AI writing tool. It is designed around the specific writing problems of fanfiction: canon consistency, character boundaries, relationship stages, and emotional tension.

FanForge is:

- **Canon-aware**: generation can reference saved canon documents and avoid hard-setting conflicts.
- **Persona-aware**: character profiles, OOC boundaries, relationship maps, and voice samples guide generation.
- **Feedback-informed**: user feedback is stored, analyzed, and injected into future prompts.
- **Relationship-focused**: the core writing experience is optimized for CP dynamics, emotional slices, and long-form continuity.

## User Problems

Fanfiction creators often face problems that generic AI writing tools do not handle well:

- AI-generated text easily breaks character consistency and causes OOC.
- Long-form writing makes it easy to forget canon details, timeline constraints, and foreshadowing.
- Generic AI tools do not understand relationship stages, CP tension, or subtle emotional distance.
- New writers may not fully understand the original worldbuilding or character history.
- User feedback is usually displayed as analytics only, instead of improving the next generation.

## Core Features

### Auth & User Workspace

- Email sign-up and login through Supabase Auth.
- User profile storage for connecting feedback, drafts, model settings, and usage data.
- Per-user data isolation through Supabase database tables and RLS-oriented design.

### Model Settings

- **FanForge Free Model** for new-user onboarding and flow validation.
- Advanced model configuration through BYOK.
- Daily free quota tracking for generation usage.
- Model settings stored per user without exposing sensitive keys in the UI.

### Canon Library

- Save original work excerpts, worldbuilding notes, character history, or timeline references.
- Recent Canon documents are automatically injected into Writer and Chapter generation.
- Canon context acts as a hidden constraint to reduce setting conflicts.

### Persona Archive

- Character persona timeline tree.
- Relationship graph for character dynamics.
- OOC boundaries and writing taboos.
- Character voice samples:
  - common lines
  - forbidden lines
  - address habits
  - tone keywords

### Emotion Slice Generator

- Generates high-density relationship / CP emotional moments.
- Supports relationship type, relationship stage, emotional tension, style card, forbidden items, custom input, and expected length.
- Supports directional rewrite chips:
  - more restrained
  - more dialogue
  - more tension
  - closer to character
  - closer to canon
  - less psychological explanation

### Chapter Writer

- Long-form chapter drafting API.
- Uses chapter goal, plot input, style requirements, forbidden items, previous chapter summary, Canon context, Persona context, and relationship context.
- Returns:
  - chapter draft
  - used context
  - foreshadowing notes
  - next chapter hooks

### Studio Workspace

- Main writing desk for FanForge.
- Supports continue writing, expand scene, generate emotional slice, save draft, and load saved drafts.
- Integrates Canon, Persona, relationship, style, and feedback signals into one writing workspace.

### Feedback Loop

- User feedback is saved into Supabase.
- Tracks issue tags such as OOC, Canon conflict, weak emotion, style mismatch, relationship progression too fast, too AI-like, and dialogue not in character.
- Writer APIs read recent feedback and build a feedback learning context.
- Future generations automatically adjust prompts based on recurring user issues.

### Admin Dashboard

- Admin access through an access-code gate.
- Displays real feedback, usage, model setting overview, active users, and prompt optimization suggestions.
- Helps evaluate where the product should improve: Persona, Canon, style, tension, pacing, or prompt wording.

## Product Differentiation

Sudowrite is more focused on general fiction writing flow. Novelcrafter is more focused on long-form structure and story organization.

FanForge focuses on the specific needs of fanfiction creators:

- canon consistency
- character persona boundaries
- CP / relationship emotional tension
- feedback-informed generation

**Sudowrite helps writers write; Novelcrafter helps writers organize; FanForge helps fanfiction creators write within canon and character boundaries.**

## AI Workflow Architecture

```text
User Input
→ Canon Context
→ Persona Context
→ Feedback Learning Context
→ Writer Agent
→ Reviewer / Constraints
→ Output
→ User Feedback
→ Next-generation Prompt Optimization
```

FanForge treats generation as a workflow, not a one-shot text completion. Canon documents, persona profiles, user feedback, and model settings all influence the final writing output.

## Data Feedback Loop

1. User generates a slice or chapter.
2. User submits satisfaction rating, issue tags, and optional comments.
3. Feedback is stored in Supabase.
4. Feedback Board calculates OOC rate, Canon conflict rate, weak emotion rate, style mismatch rate, and other quality signals.
5. Admin Dashboard shows aggregate product-level issues.
6. Writer APIs read recent feedback and summarize recurring problems.
7. The next generation receives an additional feedback learning context.
8. Prompts automatically adjust to reduce repeated issues.

## Demo Path

A recommended path for reviewers:

1. Open the live demo: https://fanforge-three.vercel.app
2. Register or log in with email.
3. Go to Settings and select **FanForge Free Model**.
4. Go to Canon and save a short canon/worldbuilding excerpt.
5. Go to Persona and create a character profile with voice samples.
6. Go to Slice and generate an emotional relationship moment.
7. Use directional rewrite actions such as “more restrained”, “more dialogue”, or “closer to canon”.
8. Submit feedback with issue tags.
9. Open Feedback Board to see quality data.
10. Open Studio to save and load a draft.

## Technical Implementation

- **Next.js App Router**
- **React**
- **Tailwind CSS**
- **Supabase Auth**
- **Supabase Database**
- **Vercel Deployment**
- **React Flow** for persona graph visualization
- **API Routes** for Writer, Chapter, Usage, Feedback-informed generation, and Admin access
- **LLM API / BYOK** model selection logic
- **Structured JSON output** for generation responses
- **RLS-oriented user data isolation**

## Current Boundaries

FanForge is an online MVP, not a fully commercialized product.

Current limitations:

- API Key encryption and production-grade secret handling still need to be hardened.
- Payment and subscription systems are not implemented yet.
- Formal Canon RAG / vector retrieval is still planned.
- Mobile and PWA experience needs more polish.
- FanForge Free Model is currently designed for onboarding and workflow validation.
- Admin analytics should be upgraded to a server-side service-role API for production use.

## Roadmap

- Canon RAG / vector retrieval
- More complete OOC checker
- Version history for drafts
- Mobile / PWA support
- Production payment and quota system
- Encrypted API Key storage
- More fine-grained character voice training and dialogue style control
- More detailed Agent trace for Writer / Reviewer / Criticizer

## My Role

I owned the product work from 0 to 1: user problem breakdown, competitive analysis, product positioning, MVP scope, information architecture, interaction flows, AI generation workflow design, prompt constraints, feedback-loop design, and implementation collaboration with AI coding tools across frontend and backend.

From a product management perspective, FanForge demonstrates how a writing product can move beyond generic AI text generation and become a context-aware, feedback-informed creation workflow.

## Resume Keywords

AI Product Management / AIGC / AI Agent / Prompt Engineering / Supabase / Vercel / BYOK / User Feedback Loop / Canon-aware Generation / Persona-aware Writing
