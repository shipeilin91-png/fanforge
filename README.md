# FanForge

**Canon-aware AI Writing Studio for Fanfiction Creators**

FanForge is a Canon-aware AI co-writing platform for fanfiction creators. It helps writers generate more controllable stories within canon, character, and relationship boundaries by combining Canon RAG, Persona Timeline, Multi-Agent Review, Emotion Slice generation, and feedback-informed prompt optimization.

## Live Demo

Live Demo: https://fanforge-three.vercel.app

Portfolio: https://bcnjcsfiizh3.feishu.cn/wiki/MC4Bwt4lli6XnUkP18Nckjtonl5

Mainland China access note: Vercel may be unstable in mainland China; screenshots and project explanation are available in the portfolio.

## Core Highlights

- **Canon RAG with Gemini Embedding + Supabase pgvector**: saved Canon documents are chunked, embedded into 1536-dimensional vectors, retrieved by similarity, and injected into generation prompts as evidence.
- **RAG Control Layer**: Slice and Chapter generation support `none`, `auto`, and `selected` Canon modes, a `0.65` similarity threshold, selected document control, and `canonUsage` metadata for explainability.
- **Studio Context Engine**: the main writing workspace includes real toggles for Canon Context Agent, Persona Map, Relationship Map, and Style Card. Disabled context is not injected into generation requests.
- **Multi-Agent Writing Workflow**: Writer, Reviewer, and Criticizer roles separate generation, evaluation, and revision strategy to reduce single-model self-confirmation bias.
- **Persona Timeline System**: character profiles are modeled as dynamic persona timelines rather than static cards.
- **Emotion Slice Generator**: relationship moments, stage, tension, style, forbidden items, and custom intent are parameterized for high-density fanfiction fragments.
- **Feedback-informed Prompt Loop**: user feedback is stored, summarized, and used to adjust future Writer prompts.
- **BYOK Model Strategy**: FanForge Free Model supports onboarding, while advanced models can use user-provided API keys.

## Product Positioning

FanForge is not a generic AI writing tool. It is designed around fanfiction-specific constraints:

- **Canon-aware**: original documents and retrieved evidence guide generation.
- **Persona-aware**: character timelines, OOC boundaries, relationship maps, and voice samples constrain output.
- **Feedback-informed**: user issue tags and comments become prompt optimization signals.
- **Relationship-focused**: the product treats CP dynamics, emotional distance, and relationship progression as first-class writing controls.

Sudowrite helps writers write; Novelcrafter helps writers organize; FanForge helps fanfiction creators write within canon and character boundaries.

## User Problems

Fanfiction creators often face problems that generic AI writing tools do not handle well:

- AI-generated text can break character consistency and cause OOC.
- Long-form writing makes it easy to forget canon details, timeline constraints, and foreshadowing.
- Generic AI tools do not understand relationship stages, CP tension, or subtle emotional distance.
- New writers may not fully understand the original worldbuilding or character history.
- User feedback is often displayed as analytics only, instead of improving the next generation.

## Canon RAG Architecture

```text
Canon Document
→ Chunking
→ Gemini Embedding 1536-dim vector
→ Supabase pgvector
→ top-k similarity retrieval
→ Evidence filtering with 0.65 threshold
→ Prompt injection
→ Frontend evidence display
```

FanForge currently implements a portfolio-level RAG prototype. It indexes user-saved Canon documents into `user_canon_chunks`, retrieves relevant chunks through Supabase pgvector, filters weak matches, injects evidence into Writer / Chapter prompts, and displays the matched evidence on the frontend.

This is not an enterprise-grade RAG system. Future improvements include reranking, hybrid search, stronger source attribution, and stricter canon conflict detection.

## RAG Control Layer

Users can choose how Canon is used during generation:

- **none**: disable Canon for this generation.
- **auto**: retrieve the most relevant Canon evidence automatically.
- **selected**: use a specific Canon document chosen by the user.

The backend filters out evidence below `0.65` similarity and returns `canonUsage`, including mode, status, evidence count, and highest similarity. This makes each generation more explainable and avoids injecting weak or unrelated evidence.

## Studio Context Engine

Studio is the main FanForge writing workspace. It includes four context controls:

- **Canon Context Agent**
- **Persona Map**
- **Relationship Map**
- **Style Card**

These are real generation controls, not static UI. When a switch is disabled, the corresponding context is not injected into the request. For example, turning off Canon Context Agent forces `canonMode = "none"`, preventing Canon RAG retrieval and evidence injection for that generation.

## Core Features

### Auth & User Workspace

- Email sign-up and login through Supabase Auth.
- User profile storage for connecting feedback, drafts, model settings, and usage data.
- Per-user data isolation through Supabase database tables and RLS-oriented design.

### Model Settings

- **FanForge Free Model** for new-user onboarding and workflow exploration.
- Daily free quota tracking, currently **30 free generations per day**.
- Advanced model configuration through BYOK.
- User model settings stored per account without exposing sensitive keys in the UI.

### Canon Library

- Save original work excerpts, worldbuilding notes, character history, and timeline references.
- Saved Canon documents can be indexed into chunks and retrieved through Canon RAG.
- Frontend generation results show matched evidence title, preview, and similarity.

### Persona Archive

- Dynamic Persona Timeline based on:
  - core personality thesis
  - life stage
  - key events
  - behavior boundaries
  - voice changes
  - foreshadowing constraints
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
- Supports Canon RAG control: no Canon, automatic retrieval, or selected document.
- Supports directional rewrite actions:
  - more restrained
  - more dialogue
  - more tension
  - closer to character
  - closer to canon
  - less psychological explanation

### Chapter Writer

- Long-form chapter drafting API.
- Uses chapter goal, plot input, style requirements, forbidden items, previous chapter summary, Canon context, Persona context, relationship context, and feedback learning context.
- Supports Canon RAG control and evidence display.
- Returns:
  - chapter draft
  - used context
  - Canon evidence
  - Persona profiles
  - foreshadowing notes
  - next chapter hooks

### Studio Workspace

- Main writing desk for FanForge.
- Supports continue writing, expand scene, generate emotional slice, save draft, and load saved drafts.
- Context Engine switches control which context sources are injected into generation.
- Integrates Canon, Persona, relationship, style, usage quota, and draft management into one workspace.

### Multi-Agent Review

- Writer generates the initial text.
- Reviewer evaluates role consistency, Canon consistency, emotional tension, style fit, and relationship progression.
- Criticizer turns review findings into revision direction.
- The workflow is designed to reduce a single model's tendency to generate and approve its own output without friction.

### Feedback Loop

- User feedback is saved into Supabase.
- Tracks issue tags such as OOC, Canon conflict, weak emotion, style mismatch, relationship progression too fast, too AI-like, and dialogue not in character.
- Writer APIs read recent feedback and build a feedback learning context.
- Future generations automatically adjust prompts based on recurring user issues.

### Admin Dashboard

- Admin access through an access-code gate.
- Displays feedback, usage, model setting overview, active users, and prompt optimization suggestions.
- Helps evaluate where the product should improve: Persona, Canon, style, tension, pacing, or prompt wording.

## Product Thinking / PM Value

FanForge focuses on fanfiction-specific constraints instead of generic writing assistance:

- avoiding OOC
- reducing canon conflicts
- controlling relationship progression
- preserving long-term character development
- making AI generation explainable through retrieved evidence

The product is structured around a core PM hypothesis: fanfiction creators do not only need "more text"; they need controllable text that respects canon, character boundaries, relationship pacing, and their own revision preferences.

## AI Workflow Architecture

```text
User Input
→ Canon Mode / Canon RAG Evidence
→ Persona Timeline / Voice Profile
→ Relationship and Style Constraints
→ Feedback Learning Context
→ Writer Agent
→ Reviewer / Criticizer
→ Output
→ User Feedback
→ Next-generation Prompt Optimization
```

FanForge treats generation as a workflow, not a one-shot text completion. Canon evidence, persona profiles, user feedback, context switches, and model settings all influence the final writing output.

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

1. Open the live site: https://fanforge-three.vercel.app
2. Register or log in with email.
3. Go to Settings and select **FanForge Free Model**.
4. Go to Canon and save a short canon/worldbuilding excerpt.
5. Index the Canon document so it can be retrieved as evidence.
6. Go to Persona and create a character profile with voice samples.
7. Go to Slice and generate an emotional relationship moment.
8. Try Canon mode: no Canon, automatic Canon, or selected Canon document.
9. Use directional rewrite actions such as "more restrained", "more dialogue", or "closer to canon".
10. Submit feedback with issue tags.
11. Open Feedback Board to see quality data.
12. Open Studio to test Context Engine switches and save a draft.

## Tech Stack

- Next.js
- React
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase pgvector
- Gemini Embedding API
- Vercel
- Prompt Engineering
- Multi-Agent Prompt Workflow
- BYOK model routing
- Structured JSON generation responses

## Technical Implementation

- **Next.js App Router** for page and API route structure.
- **Supabase Auth / Database** for user accounts, drafts, Canon documents, Persona profiles, feedback, usage quota, and model settings.
- **Supabase pgvector** for Canon evidence retrieval.
- **Gemini Embedding API** for 1536-dimensional Canon chunk embeddings.
- **Vercel Deployment** for the live online MVP.
- **React Flow** for persona graph visualization.
- **API Routes** for Writer, Chapter, Canon indexing, Canon retrieval, Usage, and Admin access.
- **Structured JSON output** for generation responses.
- **RLS-oriented user data isolation** for user-owned records.

## Current Status

- Live MVP deployed on Vercel.
- Canon RAG prototype implemented.
- RAG control layer implemented for Slice and Chapter writing.
- Studio Context Engine implemented.
- Feedback loop implemented and injected into future prompts.
- Supabase Auth / Database, admin dashboard, daily free quota, BYOK model settings, and draft saving are implemented.
- Next step: real user testing with fanfiction creators and improving Persona Timeline / Canon conflict detection.

## Benchmark Results

- Synthetic benchmark validates the Multi-Agent revision and quality-control workflow.
- Rule-based issues reduced by 81%.
- Relationship-too-fast and character-boundary violations reduced by 100%.
- Over-explanation reduced by 80%.
- Canon conflicts reduced by 33%.
- These results come from synthetic benchmark cases and do not represent real user data.

## Current Boundaries

FanForge is an online MVP, not a fully commercialized product.

Current limitations:

- API Key encryption and production-grade secret handling still need to be hardened.
- Payment and subscription systems are not implemented yet.
- Canon RAG is a working prototype, but reranking, hybrid search, and deeper conflict detection are still planned.
- Benchmark results are based on synthetic cases for portfolio validation, not live-user production data.
- Mobile and PWA experience needs more polish.
- FanForge Free Model is designed for onboarding and workflow validation.
- Admin analytics should be upgraded to a server-side service-role API for production use.

## Roadmap

- Canon RAG reranking and hybrid retrieval
- More complete OOC checker
- Canon conflict detection before generation
- Version history for drafts
- Mobile / PWA support
- Production payment and quota system
- Encrypted API Key storage
- More fine-grained character voice training and dialogue style control
- More detailed Agent trace for Writer / Reviewer / Criticizer

## My Role

I owned the product work from 0 to 1: user problem breakdown, competitive analysis, product positioning, MVP scope, information architecture, interaction flows, AI generation workflow design, prompt constraints, feedback-loop design, and implementation collaboration with AI coding tools across frontend and backend.

From a product management perspective, FanForge demonstrates how a writing product can move beyond generic AI text generation and become a context-aware, evidence-aware, feedback-informed creation workflow.

## Resume Keywords

AI Product Management / AIGC / AI Agent / Prompt Engineering / RAG / Supabase / pgvector / Gemini Embedding / Vercel / BYOK / User Feedback Loop / Canon-aware Generation / Persona-aware Writing / Multi-Agent Workflow
