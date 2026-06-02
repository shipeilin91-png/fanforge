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
  forbiddenPatternHitCount: number;
  personaStageSignalCount: number;
  restraintSignalCount: number;
  canonKeywordHitCount: number;
  irrelevantCanonLeakCount: number;
  issueTotalCount: number;
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
const RESTRAINT_SIGNALS = ["停顿", "移开视线", "没有回答", "沉默", "没有说完", "短句", "克制"];
const PERSONA_STAGE_SIGNALS = ["防御期", "动摇期", "破防期", "信任恢复期", "旧伤触发期", "阵营冲突期", "关系确认前", "长线伏笔期"];
const IRRELEVANT_CANON_TERMS = ["机械城邦贸易税", "星轨学院课程表", "无关 Canon", "无关设定"];

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

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

  const expectedCanonKeywords = arrayValue(testCase.expected.expectedEvidenceKeywords);
  const expectedIncludes = [
    ...arrayValue(testCase.expected.shouldInclude),
    ...arrayValue(testCase.expected.expectedSubtextSignals),
    ...arrayValue(testCase.expected.expectedRestraintSignals),
  ];
  const forbiddenPatterns = [
    ...arrayValue(testCase.expected.forbiddenPatterns),
    ...arrayValue(testCase.expected.forbiddenFacts),
    ...arrayValue(testCase.expected.shouldAvoid),
    ...arrayValue(testCase.expected.forbiddenItems),
  ];
  const canonConflictCount = countTerms(text, CANON_CONFLICT_TERMS);
  const forbiddenPatternHitCount = countTerms(text, forbiddenPatterns);
  const irrelevantCanonLeakCount = countTerms(text, IRRELEVANT_CANON_TERMS);
  const boundaryViolationCount = isDefensiveStage(testCase)
    ? directConfessionViolationCount + forbiddenPatternHitCount
    : 0;
  const issueTotalCount =
    canonConflictCount +
    directConfessionViolationCount +
    overExplanationViolationCount +
    relationshipTooFastCount +
    boundaryViolationCount +
    forbiddenPatternHitCount +
    irrelevantCanonLeakCount;

  return {
    canonConflictCount,
    directConfessionViolationCount,
    overExplanationViolationCount,
    relationshipTooFastCount,
    boundaryViolationCount,
    subtextSignalCount: countTerms(text, SUBTEXT_SIGNALS),
    forbiddenPatternHitCount,
    personaStageSignalCount:
      countTerms(text, expectedIncludes) + countTerms(JSON.stringify(testCase.expected), PERSONA_STAGE_SIGNALS),
    restraintSignalCount: countTerms(text, RESTRAINT_SIGNALS),
    canonKeywordHitCount: countTerms(text, expectedCanonKeywords),
    irrelevantCanonLeakCount,
    issueTotalCount,
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
      canonKeywordHitCount: scores.canonKeywordHitCount,
      irrelevantCanonLeakCount: scores.irrelevantCanonLeakCount,
    };
    return metrics;
  }

  if (testCase.type === "persona") {
    const metrics: Record<string, number | string | boolean> = {
      personaConstraintHitRate: scores.boundaryViolationCount === 0 ? 1 : 0,
      oocRiskScore: Math.min(10, scores.boundaryViolationCount * 3 + scores.directConfessionViolationCount * 2),
      boundaryViolationCount: scores.boundaryViolationCount,
      voiceConsistencyScore: scores.subtextSignalCount > 0 ? 0.7 : 0.3,
      personaStageSignalCount: scores.personaStageSignalCount,
    };
    return metrics;
  }

  if (testCase.type === "emotion_slice") {
    const metrics: Record<string, number | string | boolean> = {
      relationshipStageMatchRate: scores.relationshipTooFastCount === 0 ? 1 : 0,
      subtextDensityScore: scores.subtextSignalCount,
      directConfessionViolationCount: scores.directConfessionViolationCount,
      overExplanationViolationCount: scores.overExplanationViolationCount,
      restraintSignalCount: scores.restraintSignalCount,
    };
    return metrics;
  }

  const initialDraftIssueCount = scores.issueTotalCount;
  const reviewerDetectedIssueCount = extractReviewerIssueCount(rawResponses.reviewer);
  const criticizerSuggestionCount = extractCriticizerSuggestionCount(rawResponses.criticizer);
  const coveredIssueCount = Math.min(
    initialDraftIssueCount,
    reviewerDetectedIssueCount + criticizerSuggestionCount,
  );
  const metrics: Record<string, number | string | boolean> = {
    reviewerIssueCount: reviewerDetectedIssueCount,
    criticizerSuggestionCount,
    initialIssueCount: initialDraftIssueCount,
    initialDraftIssueCount,
    reviewerDetectedIssueCount,
    postReviewIssueCount: Math.max(0, initialDraftIssueCount - coveredIssueCount),
    estimatedIssueReductionRate:
      initialDraftIssueCount > 0 ? Number((coveredIssueCount / initialDraftIssueCount).toFixed(3)) : 0,
    canonConflictCoverage: scores.canonConflictCount > 0 && reviewerDetectedIssueCount > 0,
    oocCoverage: scores.boundaryViolationCount > 0 && reviewerDetectedIssueCount > 0,
    relationshipTooFastCoverage: scores.relationshipTooFastCount > 0 && reviewerDetectedIssueCount > 0,
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
    success: results.filter((result) => result.status === "passed").length,
    partial: results.filter((result) => result.status === "partial").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: 0,
    apiCallsSucceeded: results.flatMap((result) => result.apiCalls).filter((call) => call.status === "success").length,
    apiCallsSkipped: results.flatMap((result) => result.apiCalls).filter((call) => call.status === "skipped").length,
  };
}

function aggregateByType(results: BenchmarkResult[]) {
  const initial: Record<BenchmarkType, ReturnType<typeof createEmptyAggregate>> = {
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
    aggregate.forbiddenPatternHitCount += result.ruleBasedScores.forbiddenPatternHitCount;
    aggregate.personaStageSignalCount += result.ruleBasedScores.personaStageSignalCount;
    aggregate.restraintSignalCount += result.ruleBasedScores.restraintSignalCount;
    aggregate.canonKeywordHitCount += result.ruleBasedScores.canonKeywordHitCount;
    aggregate.irrelevantCanonLeakCount += result.ruleBasedScores.irrelevantCanonLeakCount;
    aggregate.issueTotalCount += result.ruleBasedScores.issueTotalCount;
    aggregate.reviewerDetectedIssueCount += numberMetric(result.metrics.reviewerDetectedIssueCount);
    aggregate.criticizerSuggestionCount += numberMetric(result.metrics.criticizerSuggestionCount);
    aggregate.initialDraftIssueCount += numberMetric(result.metrics.initialDraftIssueCount);
    aggregate.postReviewIssueCount += numberMetric(result.metrics.postReviewIssueCount);
    aggregate.expectedCanonKeywordCount += arrayValue(result.expected.expectedEvidenceKeywords).length;
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
    forbiddenPatternHitCount: 0,
    personaStageSignalCount: 0,
    restraintSignalCount: 0,
    canonKeywordHitCount: 0,
    irrelevantCanonLeakCount: 0,
    issueTotalCount: 0,
    reviewerDetectedIssueCount: 0,
    criticizerSuggestionCount: 0,
    initialDraftIssueCount: 0,
    postReviewIssueCount: 0,
    expectedCanonKeywordCount: 0,
  };
}

function numberMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
  const allCalls = results.flatMap((result) =>
    result.apiCalls.map((call) => ({ caseId: result.caseId, ...call })),
  );
  const successfulApis = Array.from(
    new Set(allCalls.filter((call) => call.status === "success").map((call) => call.endpoint)),
  );
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
    "验证 FanForge 在 Canon-aware、Persona-aware、Emotion Slice、Multi-Agent 审稿链路中的可控生成能力。本轮是 30 条高质量 synthetic benchmark，用于生成作品集/简历可解释的候选指标；数据来自合成测试集，不代表真实用户数据。",
    "",
    "## 2. 测试集构成",
    "",
    "30 条 synthetic benchmark case：",
    "",
    "- Canon 8",
    "- Persona 8",
    "- Emotion Slice 8",
    "- Multi-Agent 6",
    "",
    `Base URL: ${baseUrl}`,
    `Case source: ${caseSource}`,
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## 3. 自动化运行情况",
    "",
    `- Total cases: ${summary.total}`,
    `- Success: ${summary.success}`,
    `- Partial: ${summary.partial}`,
    `- Skipped: ${summary.skipped}`,
    `- Failed: ${summary.failed}`,
    `- API calls succeeded: ${summary.apiCallsSucceeded}`,
    `- API calls skipped: ${summary.apiCallsSkipped}`,
    `- Successful API endpoints: ${successfulApis.length > 0 ? successfulApis.join(", ") : "none"}`,
    "",
    skippedCalls.length > 0
      ? ["Skipped / unavailable API notes:", "", ...skippedCalls.map((note) => `- ${note}`)].join("\n")
      : "All planned API calls responded successfully.",
    "",
    "## 4. Canon Consistency 指标",
    "",
    `- canonCaseCount: ${aggregate.canon.count}`,
    `- canonKeywordHitRate: ${rate(aggregate.canon.canonKeywordHitCount, aggregate.canon.expectedCanonKeywordCount)}`,
    `- canonKeywordHitCount: ${aggregate.canon.canonKeywordHitCount}`,
    `- expectedCanonKeywordCount: ${aggregate.canon.expectedCanonKeywordCount}`,
    `- canonConflictDetectedCount: ${aggregate.canon.canonConflictCount}`,
    `- irrelevantCanonLeakCount: ${aggregate.canon.irrelevantCanonLeakCount}`,
    `- evidenceApiSuccessCount: ${apiSuccessCount(results, "canonRetrieve")}`,
    `- canonApiSkippedCount: ${apiSkippedCount(results, "canonRetrieve")}`,
    "",
    "## 5. Persona Timeline 指标",
    "",
    `- personaCaseCount: ${aggregate.persona.count}`,
    `- boundaryViolationCount: ${aggregate.persona.boundaryViolationCount}`,
    `- directConfessionViolationCount: ${aggregate.persona.directConfessionViolationCount}`,
    `- personaStageSignalCount: ${aggregate.persona.personaStageSignalCount}`,
    `- voiceConstraintObservation: ${aggregate.persona.subtextSignalCount > 0 ? "voice/subtext signals observed in static or generated text" : "no voice/subtext signal observed"}`,
    "",
    "## 6. Emotion Slice 指标",
    "",
    `- emotionCaseCount: ${aggregate.emotion_slice.count}`,
    `- relationshipTooFastCount: ${aggregate.emotion_slice.relationshipTooFastCount}`,
    `- directConfessionViolationCount: ${aggregate.emotion_slice.directConfessionViolationCount}`,
    `- overExplanationViolationCount: ${aggregate.emotion_slice.overExplanationViolationCount}`,
    `- subtextSignalCount: ${aggregate.emotion_slice.subtextSignalCount}`,
    `- restraintSignalCount: ${aggregate.emotion_slice.restraintSignalCount}`,
    "",
    "## 7. Multi-Agent Revision 指标",
    "",
    `- multiAgentCaseCount: ${aggregate.multi_agent.count}`,
    `- initialDraftIssueCount: ${aggregate.multi_agent.initialDraftIssueCount}`,
    `- reviewerDetectedIssueCount: ${aggregate.multi_agent.reviewerDetectedIssueCount}`,
    `- criticizerSuggestionCount: ${aggregate.multi_agent.criticizerSuggestionCount}`,
    `- estimatedIssueReductionRate: ${rate(aggregate.multi_agent.initialDraftIssueCount - aggregate.multi_agent.postReviewIssueCount, aggregate.multi_agent.initialDraftIssueCount)}`,
    `- canonConflictCoverage: ${aggregate.multi_agent.canonConflictCount > 0 && aggregate.multi_agent.reviewerDetectedIssueCount > 0 ? "observed" : "not observed"}`,
    `- oocCoverage: ${aggregate.multi_agent.boundaryViolationCount > 0 && aggregate.multi_agent.reviewerDetectedIssueCount > 0 ? "observed" : "not observed"}`,
    `- relationshipTooFastCoverage: ${aggregate.multi_agent.relationshipTooFastCount > 0 && aggregate.multi_agent.reviewerDetectedIssueCount > 0 ? "observed" : "not observed"}`,
    "",
    "## 8. 可用于简历/作品集的数据表达",
    "",
    "- Built a 30-case synthetic benchmark covering Canon consistency, Persona Timeline, Emotion Slice control, and Multi-Agent revision; results are synthetic and not real user data.",
    `- Rule-based evaluator detected ${aggregate.multi_agent.initialDraftIssueCount} initial issues across 6 intentionally flawed Multi-Agent drafts and estimated ${rate(aggregate.multi_agent.initialDraftIssueCount - aggregate.multi_agent.postReviewIssueCount, aggregate.multi_agent.initialDraftIssueCount)} issue coverage through Reviewer/Criticizer signals.`,
    `- Emotion Slice cases showed ${aggregate.emotion_slice.subtextSignalCount} subtext signals and ${aggregate.emotion_slice.restraintSignalCount} restraint signals while tracking direct confession, over-explanation, and relationship-overreach violations.`,
    `- Canon benchmark tracked ${aggregate.canon.canonKeywordHitCount} Canon keyword hits, ${aggregate.canon.canonConflictCount} conflict detections, and ${apiSkippedCount(results, "canonRetrieve")} retrieval skips caused by missing benchmark auth/seed data.`,
    "- Metrics are candidates for portfolio discussion; estimated values are labeled estimated and should not be presented as real production impact.",
    "",
    "## 9. 产品迭代建议",
    "",
    "- Canon retrieve / writer / chapter / reviewer / criticizer 都可以被 runner 建模为可调用 API，但 Canon RAG 和 Persona 相关 case 在真实评估时需要登录 token、已保存文档和已索引 chunks。",
    "- Canon retrieve 需要 benchmark token 或 seed canon chunks，才能从 skipped 进入真实 evidence hit rate 评估。",
    "- Persona 需要独立 evaluator API，以便更稳定地评分 Persona Timeline、角色声线和 OOC 边界。",
    "- Multi-Agent 最好补 final rewrite API 或二次 reviewer 链路，用于从 estimated issue reduction 升级为真实 before/after reduction。",
    "- Emotion Slice 可补 subtext/relationship evaluator，减少纯关键词规则的局限。",
  ].join("\n");
}

function apiSuccessCount(results: BenchmarkResult[], name: string) {
  return results.flatMap((result) => result.apiCalls).filter((call) => call.name === name && call.status === "success").length;
}

function apiSkippedCount(results: BenchmarkResult[], name: string) {
  return results.flatMap((result) => result.apiCalls).filter((call) => call.name === name && call.status === "skipped").length;
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
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
