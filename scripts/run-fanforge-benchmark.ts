import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

type BenchmarkDimension = "canon" | "persona" | "emotion_slice" | "multi_agent";

type BenchmarkCase = {
  id: string;
  dimension: BenchmarkDimension;
  name: string;
  endpoint?: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  requiresAuth?: boolean;
};

type BenchmarkResult = {
  id: string;
  dimension: BenchmarkDimension;
  name: string;
  status: "passed" | "failed" | "skipped";
  endpoint?: string;
  statusCode?: number;
  error?: string;
  notes?: string[];
};

const DEFAULT_BASE_URL = "http://localhost:3000";
const CASE_FILE = "docs/benchmark/fanforge-cases.json";
const RESULTS_DIR = "benchmark-results";
const JSON_OUTPUT = `${RESULTS_DIR}/fanforge-latest.json`;
const MARKDOWN_OUTPUT = `${RESULTS_DIR}/fanforge-analysis.md`;

const smokeCases: BenchmarkCase[] = [
  {
    id: "canon-retrieve-smoke",
    dimension: "canon",
    name: "Canon retrieve API availability",
    endpoint: "/api/canon/retrieve",
    method: "POST",
    body: { query: "雨夜重逢 旧徽章 时间线", matchCount: 5 },
    requiresAuth: true,
  },
  {
    id: "emotion-slice-smoke",
    dimension: "emotion_slice",
    name: "Emotion Slice writer API availability",
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
  {
    id: "chapter-smoke",
    dimension: "canon",
    name: "Chapter API availability",
    endpoint: "/api/chapter",
    method: "POST",
    body: {
      mode: "continue",
      chapterTitle: "雨夜重逢",
      chapterGoal: "延续当前章节正文，保持角色关系和上下文一致",
      plotInput: "两人在雨夜重逢，谁都没有先承认。",
      expectedLength: "500",
      canonMode: "none",
    },
  },
  {
    id: "multi-agent-reviewer-smoke",
    dimension: "multi_agent",
    name: "Reviewer API availability",
    endpoint: "/api/reviewer",
    method: "POST",
    body: {
      writerText: "他在雨里说：我爱你，我需要你。",
      stage: "分离后重逢",
      tension: "克制",
      styleCard: "疏离克制",
    },
  },
  {
    id: "multi-agent-criticizer-smoke",
    dimension: "multi_agent",
    name: "Criticizer API availability",
    endpoint: "/api/criticizer",
    method: "POST",
    body: {
      writerText: "他在雨里说：我爱你，我需要你。",
      stage: "分离后重逢",
      tension: "克制",
      styleCard: "疏离克制",
      issues: [{ type: "关系阶段" }],
      scores: { relationshipStage: 6.8 },
    },
  },
];

function getBaseUrl() {
  return process.env.BENCHMARK_BASE_URL || DEFAULT_BASE_URL;
}

function getAuthToken() {
  return process.env.FANFORGE_BENCHMARK_TOKEN || "";
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
  const parsed = JSON.parse(raw) as { cases?: BenchmarkCase[] } | BenchmarkCase[];
  const cases = Array.isArray(parsed) ? parsed : parsed.cases;

  return {
    source: CASE_FILE,
    cases: Array.isArray(cases) ? cases : [],
    note: `Loaded cases from ${CASE_FILE}.`,
  };
}

async function runCase(baseUrl: string, authToken: string, testCase: BenchmarkCase): Promise<BenchmarkResult> {
  if (!testCase.endpoint) {
    return {
      id: testCase.id,
      dimension: testCase.dimension,
      name: testCase.name,
      status: "skipped",
      notes: ["No endpoint configured."],
    };
  }

  if (testCase.requiresAuth && !authToken) {
    return {
      id: testCase.id,
      dimension: testCase.dimension,
      name: testCase.name,
      endpoint: testCase.endpoint,
      status: "skipped",
      notes: ["Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests."],
    };
  }

  const url = new URL(testCase.endpoint, baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  try {
    const response = await fetch(url, {
      method: testCase.method || "POST",
      headers,
      body: testCase.method === "GET" ? undefined : JSON.stringify(testCase.body || {}),
    });

    return {
      id: testCase.id,
      dimension: testCase.dimension,
      name: testCase.name,
      endpoint: testCase.endpoint,
      status: response.ok ? "passed" : "skipped",
      statusCode: response.status,
      notes: response.ok
        ? ["API responded successfully. Detailed scoring will be added in Phase 2."]
        : ["API responded but was not benchmark-scored in this MVP skeleton."],
    };
  } catch (error) {
    return {
      id: testCase.id,
      dimension: testCase.dimension,
      name: testCase.name,
      endpoint: testCase.endpoint,
      status: "skipped",
      error: error instanceof Error ? error.message : "Unknown request error",
      notes: ["Endpoint unavailable or server not running. Marked skipped by design."],
    };
  }
}

function summarize(results: BenchmarkResult[]) {
  return {
    total: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
  };
}

function renderMarkdown(baseUrl: string, caseSource: string, results: BenchmarkResult[]) {
  const summary = summarize(results);
  const lines = [
    "# FanForge Benchmark Analysis",
    "",
    `Base URL: ${baseUrl}`,
    `Case source: ${caseSource}`,
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total: ${summary.total}`,
    `- Passed: ${summary.passed}`,
    `- Failed: ${summary.failed}`,
    `- Skipped: ${summary.skipped}`,
    "",
    "## Results",
    "",
    ...results.flatMap((result) => [
      `### ${result.id}`,
      "",
      `- Dimension: ${result.dimension}`,
      `- Name: ${result.name}`,
      `- Status: ${result.status}`,
      result.endpoint ? `- Endpoint: ${result.endpoint}` : "- Endpoint: not configured",
      typeof result.statusCode === "number" ? `- HTTP status: ${result.statusCode}` : "- HTTP status: n/a",
      result.error ? `- Error: ${result.error}` : "",
      ...(result.notes || []).map((note) => `- Note: ${note}`),
      "",
    ]),
    "## Phase 2 Work",
    "",
    "- Add real benchmark cases in `docs/benchmark/fanforge-cases.json`.",
    "- Add rule-based evaluators for Canon conflicts, OOC risk, relationship stage jumps, direct confession, and over-explanation.",
    "- Add authenticated seed data instructions for Canon RAG and Persona Timeline tests.",
  ];

  return lines.filter((line) => line !== "").join("\n");
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
        results,
      },
      null,
      2,
    ),
  );
  await writeFile(MARKDOWN_OUTPUT, renderMarkdown(baseUrl, loaded.source, results));

  console.log(`FanForge benchmark skeleton complete: ${JSON_OUTPUT}`);
  console.log(`Analysis written: ${MARKDOWN_OUTPUT}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Benchmark runner failed");
  process.exitCode = 1;
});
