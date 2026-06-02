import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

type BenchmarkType = "canon" | "persona" | "emotion_slice" | "multi_agent";
type HttpMethod = "GET" | "POST";

type ApiPlan = {
  name: string;
  endpoint: string;
  method?: HttpMethod;
  requiresAuth?: boolean;
  body?: Record<string, unknown>;
  bodyFrom?: "writerDraft" | "reviewer";
};

type BenchmarkCase = {
  id: string;
  type: BenchmarkType;
  title: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  apiPlan?: ApiPlan[];
};

type CaseFile = {
  version?: string;
  description?: string;
  cases?: BenchmarkCase[];
};

type RuleBasedScores = {
  canonConflictCount: number;
  directConfessionViolationCount: number;
  overExplanationViolationCount: number;
  relationshipTooFastCount: number;
  boundaryViolationCount: number;
  subtextSignalCount: number;
};

type ApiCallResult = {
  name: string;
  endpoint: string;
  status: "success" | "skipped";
  statusCode?: number;
  error?: string;
  notes: string[];
};

type BenchmarkResult = {
  caseId: string;
  type: BenchmarkType;
  title: string;
  status: "passed" | "partial" | "skipped";
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  apiCalls: ApiCallResult[];
  rawResponses: Record<string, unknown>;
  ruleBasedScores: RuleBasedScores;
  metrics: Record<string, number | string | boolean>;
  notes: string[];
  createdAt: string;
};

const DEFAULT_BASE_URL = "http://localhost:3000";
const CASE_FILE = "docs/benchmark/fanforge-cases.json";
const RESULTS_DIR = "benchmark-results";
const JSON_OUTPUT = `${RESULTS_DIR}/fanforge-latest.json`;
const ANALYSIS_OUTPUT = `${RESULTS_DIR}/fanforge-analysis.md`;
const CASES_OUTPUT = `${RESULTS_DIR}/fanforge-cases.md`;

const CANON_CONFLICT_TERMS = ["从未离开王都", "轻松佩戴银质纹章"];
const DIRECT_CONFESSION_TERMS = ["我爱你", "我喜欢你", "我不能没有你", "我害怕失去你"];
const OVER_EXPLANATION_TERMS = ["他意识到", "他终于明白", "他的内心", "他想起自己其实"];
const RELATIONSHIP_TOO_FAST_TERMS = ["确认关系", "从此在一起", "吻了上去", "紧紧拥抱"];
const SUBTEXT_SIGNALS = ["停顿", "移开视线", "替他包扎", "把伞推过去", "没有回答", "沉默", "没有说完"];

const smokeCases: BenchmarkCase[] = [
  {
    id: "emotion-slice-smoke",
    type: "emotion_slice",
    title: "Emotion Slice writer API availability",
    input: {
      textToEvaluate: "他在雨里停顿了一下，没有回答，只把伞推过去。",
    },
    expected: {
      notes: "Smoke case used only when docs/benchmark/fanforge-cases.json is missing.",
    },
    apiPlan: [
      {
        name: "writer",
        endpoint: "/api/writer",
        method: "POST",
        body: {
          characterNames: "陆沉 × 林晚",
          relationshipTypeFinal: "旧友重逢",
          momentFinal: "雨夜里两人被迫躲在同一处屋檐下",
          stageFinal: "分离五年后重逢",
          tensionFinal: "表面克制，底下有旧情未了",
          expectedLength: "300",
          canonMode: "none",
        },
      },
    ],
  },
];

function getBaseUrl() {
  return process.env.BENCHMARK_BASE_URL || DEFAULT_BASE_URL;
}

function getAuthToken() {
  return process.env.FANFORGE_BENCHMARK_TOKEN || "";
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function countTerms(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function getTextForEvaluation(testCase: BenchmarkCase, rawResponses: Record<string, unknown>) {
  const explicitText =
    stringValue(testCase.input.textToEvaluate) || stringValue(testCase.input.writerDraft);
  if (explicitText) return explicitText;

  const writer = rawResponses.writer;
  if (writer && typeof writer === "object") {
    const record = writer as Record<string, unknown>;
    return stringValue(record.text) || stringValue(record.draft);
  }

  const criticizer = rawResponses.criticizer;
  if (criticizer && typeof criticizer === "object") {
    return stringValue((criticizer as Record<string, unknown>).revisedText);
  }

  return "";
}

function isEarlyRelationshipStage(testCase: BenchmarkCase) {
  const combined = [
    stringValue(testCase.input.stage),
    stringValue(testCase.input.tension),
    stringValue(testCase.input.relationshipType),
    stringValue(testCase.expected.notes),
  ].join(" ");

  return /试探期|敌对合作期|防御期|疏离克制|不能直接|禁止/.test(combined);
}

function isDefensiveStage(testCase: BenchmarkCase) {
  const combined = [
    stringValue(testCase.input.stage),
    stringValue(testCase.expected.notes),
    testCase.title,
  ].join(" ");

  return /防御期|不能直接示弱|防御型人格/.test(combined);
}

function evaluateRules(testCase: BenchmarkCase, rawResponses: Record<string, unknown>): RuleBasedScores {
  const text = getTextForEvaluation(testCase, rawResponses);
  const directConfessionViolationCount = countTerms(text, DIRECT_CONFESSION_TERMS);
  const overExplanationViolationCount = countTerms(text, OVER_EXPLANATION_TERMS);
  const relationshipTooFastCount = isEarlyRelationshipStage(testCase)
    ? countTerms(text, RELATIONSHIP_TOO_FAST_TERMS)
    : 0;

  return {
    canonConflictCount: countTerms(text, CANON_CONFLICT_TERMS),
    directConfessionViolationCount,
    overExplanationViolationCount,
    relationshipTooFastCount,
    boundaryViolationCount: isDefensiveStage(testCase) ? directConfessionViolationCount : 0,
    subtextSignalCount: countTerms(text, SUBTEXT_SIGNALS),
  };
}

function createMetrics(
  testCase: BenchmarkCase,
  scores: RuleBasedScores,
  rawResponses: Record<string, unknown>,
): Record<string, number | string | boolean> {
  const canonRetrieve = rawResponses.canonRetrieve;
  const canonResults =
    canonRetrieve && typeof canonRetrieve === "object"
      ? (canonRetrieve as { results?: Array<{ similarity?: number }> }).results || []
      : [];
  const similarities = canonResults
    .map((result) => result.similarity)
    .filter((similarity): similarity is number => typeof similarity === "number");
  const lowSimilarityFilteredCount = similarities.filter((similarity) => similarity < 0.65).length;
  const averageSimilarity =
    similarities.length > 0
      ? Number((similarities.reduce((sum, value) => sum + value, 0) / similarities.length).toFixed(3))
      : 0;

  if (testCase.type === "canon") {
    const metrics: Record<string, number | string | boolean> = {
      evidenceInjectedCount: similarities.filter((similarity) => similarity >= 0.65).length,
      averageSimilarity,
      lowSimilarityFilteredCount,
      canonConflictCount: scores.canonConflictCount,
    };
    return metrics;
  }

  if (testCase.type === "persona") {
    const metrics: Record<string, number | string | boolean> = {
      personaConstraintHitRate: scores.boundaryViolationCount === 0 ? 1 : 0,
      oocRiskScore: Math.min(10, scores.boundaryViolationCount * 3 + scores.directConfessionViolationCount * 2),
      boundaryViolationCount: scores.boundaryViolationCount,
      voiceConsistencyScore: scores.subtextSignalCount > 0 ? 0.7 : 0.3,
    };
    return metrics;
  }

  if (testCase.type === "emotion_slice") {
    const metrics: Record<string, number | string | boolean> = {
      relationshipStageMatchRate: scores.relationshipTooFastCount === 0 ? 1 : 0,
      subtextDensityScore: scores.subtextSignalCount,
      directConfessionViolationCount: scores.directConfessionViolationCount,
      overExplanationViolationCount: scores.overExplanationViolationCount,
    };
    return metrics;
  }

  const metrics: Record<string, number | string | boolean> = {
    reviewerIssueCount: extractReviewerIssueCount(rawResponses.reviewer),
    criticizerSuggestionCount: extractCriticizerSuggestionCount(rawResponses.criticizer),
    initialIssueCount:
      scores.canonConflictCount +
      scores.directConfessionViolationCount +
      scores.overExplanationViolationCount +
      scores.relationshipTooFastCount +
      scores.boundaryViolationCount,
    staticIssueReductionCandidate: Boolean(rawResponses.criticizer),
  };
  return metrics;
}

function extractReviewerIssueCount(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  const issues = (value as { issues?: unknown }).issues;
  return Array.isArray(issues) ? issues.length : 0;
}

function extractCriticizerSuggestionCount(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  const suggestions = (value as { revisionStrategy?: unknown }).revisionStrategy;
  return Array.isArray(suggestions) ? suggestions.length : 0;
}

function summarizeResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.length > 500 ? `${value.slice(0, 500)}...` : value];
      }
      return [key, value];
    }),
  );
}

async function loadCases() {
  if (!existsSync(CASE_FILE)) {
    return {
      source: "smoke",
      cases: smokeCases,
      note: `${CASE_FILE} not found. Running smoke skeleton only.`,
    };
  }

  const raw = await readFile(CASE_FILE, "utf8");
  const parsed = JSON.parse(raw) as CaseFile | BenchmarkCase[];
  const cases = Array.isArray(parsed) ? parsed : parsed.cases;

  return {
    source: CASE_FILE,
    cases: Array.isArray(cases) ? cases : [],
    note: `Loaded cases from ${CASE_FILE}.`,
  };
}

function createRequestBody(plan: ApiPlan, testCase: BenchmarkCase, rawResponses: Record<string, unknown>) {
  const base = { ...(plan.body || {}) };

  if (plan.bodyFrom === "writerDraft") {
    return {
      ...base,
      writerText: stringValue(testCase.input.writerDraft),
    };
  }

  if (plan.bodyFrom === "reviewer") {
    const reviewer = rawResponses.reviewer;
    const reviewerRecord =
      reviewer && typeof reviewer === "object" ? (reviewer as Record<string, unknown>) : {};

    return {
      ...base,
      writerText: stringValue(testCase.input.writerDraft),
      reviewerSummary: stringValue(reviewerRecord.summary),
      issues: reviewerRecord.issues || [],
      scores: reviewerRecord.scores || {},
    };
  }

  return base;
}

async function callApi(
  baseUrl: string,
  authToken: string,
  plan: ApiPlan,
  testCase: BenchmarkCase,
  rawResponses: Record<string, unknown>,
): Promise<ApiCallResult> {
  if (plan.requiresAuth && !authToken) {
    return {
      name: plan.name,
      endpoint: plan.endpoint,
      status: "skipped",
      notes: ["Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests."],
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  try {
    const response = await fetch(new URL(plan.endpoint, baseUrl), {
      method: plan.method || "POST",
      headers,
      body:
        plan.method === "GET"
          ? undefined
          : JSON.stringify(createRequestBody(plan, testCase, rawResponses)),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (response.ok) {
      rawResponses[plan.name] = summarizeResponse(payload);
      return {
        name: plan.name,
        endpoint: plan.endpoint,
        status: "success",
        statusCode: response.status,
        notes: ["API responded successfully."],
      };
    }

    rawResponses[plan.name] = summarizeResponse(payload);
    return {
      name: plan.name,
      endpoint: plan.endpoint,
      status: "skipped",
      statusCode: response.status,
      error:
        payload && typeof payload === "object"
          ? stringValue((payload as Record<string, unknown>).error, "API returned non-2xx status.")
          : "API returned non-2xx status.",
      notes: ["API call skipped for scoring after non-2xx response."],
    };
  } catch (error) {
    return {
      name: plan.name,
      endpoint: plan.endpoint,
      status: "skipped",
      error: error instanceof Error ? error.message : "Unknown request error",
      notes: ["Endpoint unavailable, timed out, or local server is not running."],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCase(baseUrl: string, authToken: string, testCase: BenchmarkCase): Promise<BenchmarkResult> {
  const rawResponses: Record<string, unknown> = {};
  const apiCalls: ApiCallResult[] = [];

  for (const plan of testCase.apiPlan || []) {
    apiCalls.push(await callApi(baseUrl, authToken, plan, testCase, rawResponses));
  }

  const ruleBasedScores = evaluateRules(testCase, rawResponses);
  const metrics = createMetrics(testCase, ruleBasedScores, rawResponses);
  const successfulApiCalls = apiCalls.filter((call) => call.status === "success").length;
  const notes = [
    successfulApiCalls > 0
      ? `${successfulApiCalls} API call(s) succeeded.`
      : "No API calls succeeded; rule-based evaluator still ran on static case text when available.",
  ];

  return {
    caseId: testCase.id,
    type: testCase.type,
    title: testCase.title,
    status: successfulApiCalls > 0 ? "partial" : "skipped",
    input: testCase.input,
    expected: testCase.expected,
    apiCalls,
    rawResponses,
    ruleBasedScores,
    metrics,
    notes,
    createdAt: new Date().toISOString(),
  };
}

function summarize(results: BenchmarkResult[]) {
  return {
    total: results.length,
    partial: results.filter((result) => result.status === "partial").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    apiCallsSucceeded: results.flatMap((result) => result.apiCalls).filter((call) => call.status === "success").length,
    apiCallsSkipped: results.flatMap((result) => result.apiCalls).filter((call) => call.status === "skipped").length,
  };
}

function aggregateByType(results: BenchmarkResult[]) {
  const initial: Record<BenchmarkType, { count: number; canonConflictCount: number; directConfessionViolationCount: number; overExplanationViolationCount: number; relationshipTooFastCount: number; boundaryViolationCount: number; subtextSignalCount: number }> = {
    canon: createEmptyAggregate(),
    persona: createEmptyAggregate(),
    emotion_slice: createEmptyAggregate(),
    multi_agent: createEmptyAggregate(),
  };

  for (const result of results) {
    const aggregate = initial[result.type];
    aggregate.count += 1;
    aggregate.canonConflictCount += result.ruleBasedScores.canonConflictCount;
    aggregate.directConfessionViolationCount += result.ruleBasedScores.directConfessionViolationCount;
    aggregate.overExplanationViolationCount += result.ruleBasedScores.overExplanationViolationCount;
    aggregate.relationshipTooFastCount += result.ruleBasedScores.relationshipTooFastCount;
    aggregate.boundaryViolationCount += result.ruleBasedScores.boundaryViolationCount;
    aggregate.subtextSignalCount += result.ruleBasedScores.subtextSignalCount;
  }

  return initial;
}

function createEmptyAggregate() {
  return {
    count: 0,
    canonConflictCount: 0,
    directConfessionViolationCount: 0,
    overExplanationViolationCount: 0,
    relationshipTooFastCount: 0,
    boundaryViolationCount: 0,
    subtextSignalCount: 0,
  };
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function renderCasesMarkdown(results: BenchmarkResult[]) {
  const lines = ["# FanForge Benchmark Cases", ""];

  for (const result of results) {
    lines.push(
      `## ${result.caseId}: ${result.title}`,
      "",
      `- Type: ${result.type}`,
      `- Status: ${result.status}`,
      "",
      "### Input",
      "",
      "```json",
      formatJson(result.input),
      "```",
      "",
      "### Expected",
      "",
      "```json",
      formatJson(result.expected),
      "```",
      "",
      "### API Calls",
      "",
      ...result.apiCalls.map((call) =>
        `- ${call.name} ${call.endpoint}: ${call.status}${call.statusCode ? ` (${call.statusCode})` : ""}${call.error ? ` - ${call.error}` : ""}`,
      ),
      "",
      "### Raw Response Summary",
      "",
      "```json",
      formatJson(result.rawResponses),
      "```",
      "",
      "### Rule-based Evaluation",
      "",
      "```json",
      formatJson(result.ruleBasedScores),
      "```",
      "",
      "### Metrics",
      "",
      "```json",
      formatJson(result.metrics),
      "```",
      "",
      "### Notes",
      "",
      ...result.notes.map((note) => `- ${note}`),
      "",
    );
  }

  return lines.join("\n");
}

function renderAnalysisMarkdown(baseUrl: string, caseSource: string, results: BenchmarkResult[]) {
  const summary = summarize(results);
  const aggregate = aggregateByType(results);
  const skippedCalls = results.flatMap((result) =>
    result.apiCalls
      .filter((call) => call.status === "skipped")
      .map((call) => `${result.caseId} / ${call.name}: ${call.error || call.notes.join(" ")}`),
  );

  return [
    "# FanForge Benchmark Analysis",
    "",
    "## 1. 测试目标",
    "",
    "验证 FanForge 在 Canon-aware、Persona-aware、Emotion Slice、Multi-Agent 审稿链路中的可控生成能力。本轮是 Phase 2 MVP，小样本 synthetic benchmark，用于验证 runner、case schema、API 调用和 rule-based evaluator，不代表最终产品指标。",
    "",
    "## 2. 测试集构成",
    "",
    "7 条 synthetic benchmark case：",
    "",
    "- Canon 2",
    "- Persona 2",
    "- Emotion Slice 2",
    "- Multi-Agent 1",
    "",
    `Base URL: ${baseUrl}`,
    `Case source: ${caseSource}`,
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## 3. 当前可自动化程度",
    "",
    `- Total cases: ${summary.total}`,
    `- Cases with successful API calls: ${summary.partial}`,
    `- Cases fully skipped at API layer: ${summary.skipped}`,
    `- API calls succeeded: ${summary.apiCallsSucceeded}`,
    `- API calls skipped: ${summary.apiCallsSkipped}`,
    "",
    skippedCalls.length > 0
      ? ["Skipped / unavailable API notes:", "", ...skippedCalls.map((note) => `- ${note}`)].join("\n")
      : "All planned API calls responded successfully.",
    "",
    "## 4. 指标结果",
    "",
    "### Canon",
    "",
    formatAggregate(aggregate.canon),
    "",
    "### Persona",
    "",
    formatAggregate(aggregate.persona),
    "",
    "### Emotion Slice",
    "",
    formatAggregate(aggregate.emotion_slice),
    "",
    "### Multi-Agent",
    "",
    formatAggregate(aggregate.multi_agent),
    "",
    "## 5. 初步产品结论",
    "",
    "- Canon retrieve / writer / chapter / reviewer / criticizer 都可以被 runner 建模为可调用 API，但 Canon RAG 和 Persona 相关 case 在真实评估时需要登录 token、已保存文档和已索引 chunks。",
    "- Rule-based evaluator 已能识别 Canon 冲突、直接告白、过度心理解释、关系推进过快、防御期边界违反和潜台词信号。",
    "- Persona Timeline 目前仍主要通过 writer/chapter 的上下文注入间接测试；后续如果要更稳，需要独立 Persona evaluator API。",
    "- Multi-Agent 本轮可检查低质量 draft 是否被 Reviewer / Criticizer 接住，但最终 issue reduction 仍需要二次 reviewer 或更完整对照链路。",
    "",
    "## 6. 可用于简历/作品集的指标候选",
    "",
    "以下只适合作为小样本 synthetic benchmark 的候选指标，不应直接夸大为真实用户效果：",
    "",
    "- Canon evidence hit rate / low-similarity filtering behavior",
    "- Canon conflict count",
    "- OOC / boundary violation count",
    "- Direct confession and relationship-too-fast violation count",
    "- Over-explanation violation count",
    "- Subtext signal count",
    "- Reviewer issue count and Criticizer suggestion count",
    "",
    "## 7. 下一步",
    "",
    "Phase 3 扩展到最终 30 条高质量 case：Canon 8、Persona 8、Emotion Slice 8、Multi-Agent 6。Phase 3 才用于生成更适合简历展示的稳定指标。",
  ].join("\n");
}

function formatAggregate(value: ReturnType<typeof createEmptyAggregate>) {
  return [
    `- Cases: ${value.count}`,
    `- Canon conflict count: ${value.canonConflictCount}`,
    `- Direct confession violations: ${value.directConfessionViolationCount}`,
    `- Over-explanation violations: ${value.overExplanationViolationCount}`,
    `- Relationship too fast count: ${value.relationshipTooFastCount}`,
    `- Boundary violation count: ${value.boundaryViolationCount}`,
    `- Subtext signal count: ${value.subtextSignalCount}`,
  ].join("\n");
}

async function main() {
  const baseUrl = getBaseUrl();
  const authToken = getAuthToken();
  const loaded = await loadCases();
  const results: BenchmarkResult[] = [];

  for (const testCase of loaded.cases) {
    results.push(await runCase(baseUrl, authToken, testCase));
  }

  await mkdir(RESULTS_DIR, { recursive: true });
  await writeFile(
    JSON_OUTPUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        caseSource: loaded.source,
        note: loaded.note,
        summary: summarize(results),
        aggregateByType: aggregateByType(results),
        results,
      },
      null,
      2,
    ),
  );
  await writeFile(CASES_OUTPUT, renderCasesMarkdown(results));
  await writeFile(ANALYSIS_OUTPUT, renderAnalysisMarkdown(baseUrl, loaded.source, results));

  console.log(`FanForge benchmark complete: ${JSON_OUTPUT}`);
  console.log(`Cases report written: ${CASES_OUTPUT}`);
  console.log(`Analysis written: ${ANALYSIS_OUTPUT}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Benchmark runner failed");
  process.exitCode = 1;
});
