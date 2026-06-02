# FanForge Benchmark Phase 1 Plan

FanForge Benchmark Phase 1 is an ability inventory and benchmark runner MVP design. The goal is not to produce large-scale scores yet. The goal is to identify which existing product capabilities can be tested automatically, define measurable evaluation dimensions, and prepare a small runner skeleton for future benchmark cases.

This benchmark uses synthetic cases and local/API responses. It does not represent real user data or production-quality model evaluation.

## Project Inventory

Current project root:

`/Users/shipeilin/Desktop/fanforge`

The project is a Next.js App Router application with Supabase-backed user data, API routes, and a Tailwind editorial UI.

### Current Pages

- `/` - FanForge editorial landing and auth entry.
- `/dashboard` - product overview/dashboard.
- `/studio` - main writing workspace with draft saving, generation controls, Context Engine switches, and usage display.
- `/canon` - Canon document library, document saving, Canon evidence extraction, and Canon RAG indexing trigger.
- `/persona` - Persona archive with persona timeline, relationship graph, and voice profile saving.
- `/slice` - Emotion Slice generator with Canon mode controls, directional rewrite, feedback submission, and evidence display.
- `/write` - Chapter Desk for long-form/chapter generation with Canon mode controls and evidence display.
- `/agents` - multi-agent review desk UI.
- `/feedback` - feedback board reading Supabase feedback data.
- `/settings` - model settings, FanForge Free Model, BYOK configuration, and daily free quota display.
- `/admin` - access-code protected admin dashboard.
- `/origin` - additional page currently present in `src/app`.

### Current API Routes

- `POST /api/writer`
  - Emotion Slice generation.
  - Supports `mode = "generate"` and `mode = "rewrite"`.
  - Supports FanForge Free Model, OpenAI BYOK, Canon RAG, Canon mode controls, Persona context, feedback learning context, usage quota, and structured JSON output.

- `POST /api/chapter`
  - Long-form/chapter generation.
  - Supports FanForge Free Model, OpenAI BYOK, Canon RAG, Canon mode controls, Persona context, feedback learning context, usage quota, and structured JSON output.

- `POST /api/canon/index`
  - Canon document chunking and Gemini embedding indexing into Supabase `user_canon_chunks`.

- `POST /api/canon/retrieve`
  - Canon retrieval query embedding and Supabase `match_canon_chunks` RPC lookup.

- `POST /api/reviewer`
  - Lightweight reviewer scoring and issue detection.

- `POST /api/criticizer`
  - Lightweight revision strategy and revised text output based on reviewer findings.

- `GET /api/usage`
  - Reads FanForge Free Model daily usage.

- `POST /api/admin/login`
  - Admin access-code verification.

### Supabase / Embedding / pgvector Code Present

The codebase currently references these Supabase tables and RPCs:

- `user_model_settings`
- `user_generation_usage`
- `user_canon_documents`
- `user_canon_chunks`
- `match_canon_chunks`
- `user_persona_profiles`
- `user_feedback`
- `user_drafts`
- `user_profiles`

Canon embedding uses Gemini `gemini-embedding-001` with 1536-dimensional output for compatibility with the current pgvector schema.

## Benchmarkable Surface

### APIs Suitable for Automatic Benchmark Runner Calls

- `POST /api/canon/retrieve`
  - Suitable for Canon evidence hit-rate, similarity, and retrieval filtering checks.
  - Requires authenticated user and indexed Canon chunks for meaningful results.

- `POST /api/writer`
  - Suitable for Emotion Slice, Canon RAG, Persona, rewrite, and feedback-informed generation checks.
  - Can run without login through FanForge Free Model fallback, but Canon/Persona/user feedback tests require login and seed data.

- `POST /api/chapter`
  - Suitable for chapter consistency, Canon RAG, Persona continuity, foreshadowing, and next-hook checks.
  - Can run without login through FanForge Free Model fallback, but Canon/Persona/user feedback tests require login and seed data.

- `POST /api/reviewer`
  - Suitable for deterministic-ish issue counting and reviewer score extraction.

- `POST /api/criticizer`
  - Suitable for revision strategy and final issue reduction tests when paired with reviewer output.

- `GET /api/usage`
  - Suitable for quota metadata checks, but not core writing quality benchmark.

### Modules Not Yet Fully Automatic

- Persona Timeline UI:
  - Persona profiles are saved in `user_persona_profiles` and consumed by writer/chapter APIs, but there is no dedicated persona evaluation API yet.
  - Benchmark can test Persona indirectly through `/api/writer` and `/api/chapter` outputs, or later add a persona evaluator.

- Studio workspace:
  - Studio orchestrates `/api/writer` and `/api/chapter`, saves drafts, and manages UI context switches.
  - It is better tested with browser/UI tests or by calling the underlying APIs directly.

- Canon evidence extraction on `/canon` page:
  - The page has document saving and Canon RAG indexing trigger. The extraction card behavior is frontend-heavy and not currently exposed as a separate benchmark API.

- Admin and Feedback dashboards:
  - Useful for product monitoring, not primary benchmark generation targets.

## Benchmark Dimensions

### 1. Canon Consistency Benchmark

Purpose:

Evaluate whether Canon RAG retrieves relevant evidence, filters weak evidence, injects useful context, and reduces Canon conflicts in generated text.

Recommended case shape:

- Seed Canon documents with clear hard facts.
- Run retrieval queries against indexed chunks.
- Run `/api/writer` or `/api/chapter` with `canonMode = "auto"`, `canonMode = "selected"`, and `canonMode = "none"`.
- Compare evidence metadata, generated text, and reviewer/heuristic conflict checks.

Metrics:

- `evidenceHitRate`
  - Percentage of cases where expected Canon evidence appears in `usedCanonEvidence` or retrieval results.

- `averageSimilarity`
  - Average similarity score across injected evidence.

- `evidenceInjectedCount`
  - Number of evidence chunks injected into a generation prompt and returned to frontend metadata.

- `lowSimilarityFilteredCount`
  - Number of retrieved chunks below the threshold, currently `0.65`, that were excluded from final evidence.

- `canonConflictCount`
  - Count of generated statements that contradict benchmark-defined Canon facts. Phase 1 can use rule-based string checks; later phases can add reviewer-assisted checks.

### 2. Persona Timeline Benchmark

Purpose:

Evaluate whether generated text respects character stage, persona timeline constraints, OOC boundaries, and voice samples.

Recommended case shape:

- Seed Persona profiles with character name, stage, OOC boundary, common lines, forbidden lines, address habits, and tone keywords.
- Run `/api/writer` and `/api/chapter` with Persona enabled and disabled.
- Compare outputs for boundary violations and voice/style alignment.

Metrics:

- `personaConstraintHitRate`
  - Percentage of expected persona constraints reflected in output behavior, dialogue, or metadata.

- `stageConsistencyScore`
  - Score from 0-10 or rule-derived pass/fail indicating whether behavior matches the intended character stage.

- `oocRiskScore`
  - Risk score based on detected OOC behavior, direct boundary violations, or reviewer output.

- `voiceConsistencyScore`
  - Score reflecting whether dialogue follows saved voice samples, address habits, and tone keywords.

- `boundaryViolationCount`
  - Count of explicit violations such as direct confession when forbidden, sudden reconciliation, or use of forbidden lines.

### 3. Emotion Slice Benchmark

Purpose:

Evaluate whether relationship-focused short-form generation follows relationship stage, emotional tension, subtext, restraint, forbidden items, and rewrite instructions.

Recommended case shape:

- Run `/api/writer` with carefully scoped Slice cases.
- Include stage, moment, tension, styleCard, styleCustom, forbiddenItems, and expected length.
- Run rewrite mode with instructions such as "更克制", "更多对话", and "少一点心理描写".

Metrics:

- `relationshipStageMatchRate`
  - Percentage of outputs that match the requested relationship stage without jumping too far ahead.

- `emotionalTensionScore`
  - Score based on presence of tension markers: pauses, action beats, distance changes, short dialogue, and unresolved conflict.

- `subtextDensityScore`
  - Approximate score for show-don't-tell density, measured by action/dialogue markers versus explanation-heavy language.

- `directConfessionViolationCount`
  - Count of forbidden direct confession phrases or equivalent relationship-overreach moments.

- `overExplanationViolationCount`
  - Count of explicit explanatory/summary phrases that weaken subtext.

### 4. Multi-Agent Revision Benchmark

Purpose:

Evaluate whether Writer output improves after Reviewer and Criticizer stages.

Recommended case shape:

- Generate a Writer draft or use a seeded problematic text.
- Send it to `/api/reviewer`.
- Send reviewer findings to `/api/criticizer`.
- Optionally send revised text back to `/api/reviewer`.

Metrics:

- `reviewerIssueCount`
  - Number of issues returned by Reviewer.

- `criticizerSuggestionCount`
  - Number of concrete revision strategies returned by Criticizer.

- `finalIssueReductionRate`
  - `(initialIssueCount - finalIssueCount) / initialIssueCount`.

- `canonConflictReductionRate`
  - Reduction in Canon-related issues after revision.

- `oocReductionRate`
  - Reduction in OOC/persona-related issues after revision.

## Initial Case Plan

Phase 1 should not add a large benchmark set. Recommended next step:

- 2 Canon Consistency cases.
- 2 Persona Timeline cases.
- 2 Emotion Slice cases.
- 1 Multi-Agent Revision case.

Total initial cases: 7.

Phase 2 can expand toward 20-40 cases after the runner format is stable.

## Runner MVP Draft

Proposed command:

```bash
BENCHMARK_BASE_URL=http://localhost:3000 node scripts/run-fanforge-benchmark.ts
```

Future improvements may add a package script after the runner stabilizes.

Environment and options:

- `BENCHMARK_BASE_URL`
  - Base URL for local or deployed FanForge.
  - Defaults to `http://localhost:3000`.

- `FANFORGE_BENCHMARK_TOKEN`
  - Optional Supabase access token for authenticated Canon/Persona/RAG tests.
  - The runner should not print this token.

Outputs:

- `benchmark-results/fanforge-latest.json`
- `benchmark-results/fanforge-analysis.md`

Runner behavior:

- Load future benchmark cases from `docs/benchmark/fanforge-cases.json` if present.
- If cases are missing, run a tiny smoke plan or output skipped placeholders.
- If an API is unavailable, mark that case as `skipped` rather than crashing the whole benchmark.
- Do not run large API batches by default.

## Boundaries

- These are synthetic benchmark cases, not real user data.
- Scores should not be presented as product performance claims until validated with real users.
- LLM generation remains stochastic; repeated runs should be tracked separately.
- Canon RAG benchmark quality depends on seeded Canon documents and indexed chunks.
- Persona benchmark quality depends on saved Persona profiles and voice samples.
- Reviewer/Criticizer outputs are useful for product diagnostics, but they are not absolute truth.
- API key, token, and `.env*` values must never be printed or committed.

## Phase 2 Next Steps

1. Add a small `docs/benchmark/fanforge-cases.json` with 7 initial cases.
2. Add authenticated seed-data instructions for Canon and Persona benchmark runs.
3. Implement rule-based evaluators for direct confession, over-explanation, forbidden lines, and Canon fact conflicts.
4. Add optional Reviewer-assisted evaluation for OOC and relationship-stage risks.
5. Add a short benchmark report format for portfolio screenshots and PM analysis.
