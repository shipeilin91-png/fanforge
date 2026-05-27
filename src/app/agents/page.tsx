"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const pipeline = [
  "用户需求",
  "Writer 生成",
  "Reviewer 审稿",
  "Criticizer 修订",
] as const;

const STAGE_DELAY_MS = 800;
const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

type WorkflowPhase = "idle" | "writer" | "reviewer" | "criticizer" | "done";

type AgentStatus =
  | "Waiting"
  | "Generating"
  | "Reviewing"
  | "Revising"
  | "Done";

type ReviewerIssue = {
  type: string;
  quote: string;
  reason: string;
  suggestion: string;
};

type ReviewerResult = {
  scores: {
    ooc: number;
    canon: number;
    relationshipStage: number;
    emotionalTension: number;
  };
  riskLevel: string;
  issues: ReviewerIssue[];
  summary: string;
};

type CriticizerResult = {
  coreCritique: string;
  revisionStrategy: string[];
  revisedText: string;
  editorNote: string;
};

const writerFragment = `雨线把巷口的路灯揉成一团湿冷的光。她站在檐下，袖口还留着没干透的水痕；他停在两步之外，像刻意把距离维持在一个「不会被误读」的长度。

谁也没有先开口。风从两人之间穿过，带走一句险些成形的话。她只把视线落在对方指节上——那里有一道旧伤，颜色已经很淡，却仍能叫人想起某次来不及阻止的离开。

他侧了侧身，把伞沿往她那边倾了半寸，动作轻得像怕惊动什么。雨声盖住了呼吸里多出来的那一点停顿；克制比告白更接近他们此刻的关系。`;

const reviewScores = [
  {
    label: "OOC",
    score: 8.6,
    note: "人物反应偏内敛，未出现性格突变式对白。",
  },
  {
    label: "Canon",
    score: 9.1,
    note: "未触碰原作硬设定红线；雨夜与旧伤意象可回溯。",
  },
  {
    label: "关系阶段",
    score: 8.4,
    note: "「分离后重逢」的试探感成立，距离感控制得当。",
  },
  {
    label: "情绪张力",
    score: 9.0,
    note: "克制与酸涩并存，未滑向直白抒情。",
  },
] as const;

const staticReviewSummary =
  "综合建议：保留距离感与物象收束，弱化解释性旁白后可进入修订。";

const criticizer = {
  criticism: [
    "第二段「像刻意把距离维持」略近解释性，可改为更可感的动作描写。",
    "伞沿倾斜的动机足够，但缺少一个「几乎发生却未发生」的微动作回扣前文旧伤。",
    "结尾「克制比告白更接近」偏总结句，建议删掉或改为物象收束。",
  ],
  strategy: [
    "删去一句直陈关系判断的旁白，把判断交给读者。",
    "在伞倾半寸之后，加一处极短的失手/停顿（如指节收紧又松开）。",
    "末句改以雨声或光斑收束，避免抽象概念词落尾。",
  ],
  revised: `雨线把巷口的路灯揉成一团湿冷的光。她站在檐下，袖口还留着没干透的水痕；他停在两步之外，肩线绷得很直，像一堵不愿再塌的墙。

风从两人之间穿过。她看向他的指节——旧伤淡得几乎看不见，指腹却在伞柄上收紧了一瞬，又慢慢松开。他什么都没说，只把伞沿往她那边倾了半寸；水痕顺着伞骨滑下去，滴在两人脚边同一块湿砖上。

雨声很大。她伸手去接斜过来的雨，指尖擦过他袖口，又很快收回。`,
  editorNote: "修订重点是删除解释性旁白，让关系判断落到动作和物象上。",
};

function getWriterStatus(phase: WorkflowPhase): AgentStatus {
  if (phase === "idle") return "Waiting";
  if (phase === "writer") return "Generating";
  return "Done";
}

function getReviewerStatus(phase: WorkflowPhase): AgentStatus {
  if (phase === "idle" || phase === "writer") return "Waiting";
  if (phase === "reviewer") return "Reviewing";
  return "Done";
}

function getCriticizerStatus(phase: WorkflowPhase): AgentStatus {
  if (phase === "idle" || phase === "writer" || phase === "reviewer") {
    return "Waiting";
  }
  if (phase === "criticizer") return "Revising";
  return "Done";
}

function statusBadgeVariant(
  status: AgentStatus,
): "default" | "secondary" | "outline" {
  if (status === "Waiting") return "outline";
  if (status === "Done") return "secondary";
  return "default";
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score * 10));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
      <div
        className="h-full rounded-full bg-foreground/35 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <Badge
      variant={statusBadgeVariant(status)}
      className="text-[10px] tracking-wide uppercase"
    >
      {status}
    </Badge>
  );
}

function AgentPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function getPipelineStepIndex(phase: WorkflowPhase): number {
  if (phase === "idle") return 0;
  if (phase === "writer") return 1;
  if (phase === "reviewer") return 2;
  if (phase === "criticizer" || phase === "done") return 3;
  return 0;
}

export default function AgentsPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<WorkflowPhase>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [reviewerResult, setReviewerResult] = useState<ReviewerResult | null>(
    null,
  );
  const [reviewerError, setReviewerError] = useState<string | null>(null);
  const [criticizerResult, setCriticizerResult] =
    useState<CriticizerResult | null>(null);
  const [criticizerError, setCriticizerError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const timeoutsRef = useRef<number[]>([]);

  const writerStatus = getWriterStatus(phase);
  const reviewerStatus = getReviewerStatus(phase);
  const criticizerStatus = getCriticizerStatus(phase);

  const showWriterContent =
    phase === "reviewer" || phase === "criticizer" || phase === "done";
  const showReviewerContent = phase === "criticizer" || phase === "done";
  const showCriticizerContent = phase === "done";

  const activePipelineIndex = getPipelineStepIndex(phase);
  const reviewerScores = reviewerResult
    ? [
        {
          label: "OOC",
          score: reviewerResult.scores.ooc,
          note: "人物行为与性格约束的一致性评分。",
        },
        {
          label: "Canon",
          score: reviewerResult.scores.canon,
          note: "原作设定与硬性约束风险评分。",
        },
        {
          label: "关系阶段",
          score: reviewerResult.scores.relationshipStage,
          note: "当前关系推进是否符合阶段刻度。",
        },
        {
          label: "情绪张力",
          score: reviewerResult.scores.emotionalTension,
          note: "情绪浓度、留白与克制感评分。",
        },
      ]
    : reviewScores;
  const criticizerCriticism = criticizerResult
    ? [criticizerResult.coreCritique]
    : criticizer.criticism;
  const criticizerStrategy =
    criticizerResult?.revisionStrategy ?? criticizer.strategy;
  const criticizerRevisedText =
    criticizerResult?.revisedText ?? criticizer.revised;
  const criticizerEditorNote =
    criticizerResult?.editorNote ?? criticizer.editorNote;

  function clearScheduledTimeouts() {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }

  function schedule(fn: () => void, delay: number) {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  }

  async function fetchReviewerResult() {
    try {
      const response = await fetch("/api/reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writerText: writerFragment,
          relationshipType: "CP",
          stage: "分离后重逢",
          tension: "克制",
          styleCard: "疏离克制",
        }),
      });

      if (!response.ok) {
        throw new Error("Reviewer API request failed");
      }

      const result = (await response.json()) as ReviewerResult;
      setReviewerResult(result);
      void fetchCriticizerResult(result);
    } catch {
      setReviewerError("Reviewer API 请求失败，已保留静态审稿结果。");
    }
  }

  async function fetchCriticizerResult(result: ReviewerResult) {
    try {
      const response = await fetch("/api/criticizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writerText: writerFragment,
          reviewerSummary: result.summary,
          issues: result.issues,
          scores: result.scores,
          stage: "分离后重逢",
          tension: "克制",
          styleCard: "疏离克制",
        }),
      });

      if (!response.ok) {
        throw new Error("Criticizer API request failed");
      }

      const criticizerResponse = (await response.json()) as CriticizerResult;
      setCriticizerResult(criticizerResponse);
    } catch {
      setCriticizerError("Criticizer API 请求失败，已保留静态修订结果。");
    }
  }

  function handleStartReview() {
    if (isRunning) return;

    clearScheduledTimeouts();
    setReviewerResult(null);
    setReviewerError(null);
    setCriticizerResult(null);
    setCriticizerError(null);
    setIsRunning(true);
    setPhase("writer");
    void fetchReviewerResult();

    schedule(() => setPhase("reviewer"), STAGE_DELAY_MS);
    schedule(() => setPhase("criticizer"), STAGE_DELAY_MS * 2);
    schedule(() => {
      setPhase("done");
      setIsRunning(false);
    }, STAGE_DELAY_MS * 3);
  }

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    return () => clearScheduledTimeouts();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="dark flex min-h-full items-center justify-center bg-background text-sm text-muted-foreground">
        正在检查登录状态……
      </div>
    );
  }

  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Multi-Agent · Review Desk
          </span>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                多 Agent 审稿台
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                Writer、Reviewer、Criticizer
                分工完成生成、审稿与修订，避免单一 AI 自写自评。
              </p>
            </div>
            <Button
              size="lg"
              className="h-11 shrink-0 px-6"
              onClick={handleStartReview}
              disabled={isRunning}
            >
              {isRunning ? "审稿进行中..." : "开始多 Agent 审稿"}
            </Button>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            审稿流程（半动态演示 · 每阶段约 {STAGE_DELAY_MS}ms）
          </p>
          <Card className="border-border/80 bg-card/60 py-4">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-3 px-6">
              {pipeline.map((step, index) => (
                <div key={step} className="flex items-center gap-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground/90 transition-colors",
                      index <= activePipelineIndex &&
                        "border-foreground/15 bg-muted/50",
                    )}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="whitespace-nowrap">{step}</span>
                  </div>
                  {index < pipeline.length - 1 && (
                    <ArrowRight
                      className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-5">
          <Card
            className={cn(
              "flex flex-col border-border/80 bg-card/80 transition-shadow",
              phase === "writer" && "ring-1 ring-foreground/15",
            )}
          >
            <CardHeader className="border-border/60 gap-3 border-b pb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Writer Agent</CardTitle>
                  <CardDescription className="text-xs">
                    关系情绪切片 · 初稿生成
                  </CardDescription>
                </div>
                <AgentStatusBadge status={writerStatus} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 pt-5">
              {phase === "writer" ? (
                <AgentPlaceholder message="Writer 正在生成关系情绪切片初稿…" />
              ) : showWriterContent ? (
                <>
                  <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-4 text-sm leading-8 text-foreground/90">
                    {writerFragment.split("\n\n").map((para, i) => (
                      <p key={i} className="mb-4 last:mb-0">
                        {para}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    输入摘要：CP · 雨夜重逢 · 分离后重逢 · 克制 · 疏离克制
                  </p>
                </>
              ) : (
                <AgentPlaceholder message="等待开始 · Writer 将首先生成初稿" />
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "flex flex-col border-border/80 bg-card/80 transition-shadow",
              phase === "reviewer" && "ring-1 ring-foreground/15",
            )}
          >
            <CardHeader className="border-border/60 gap-3 border-b pb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Reviewer Agent</CardTitle>
                  <CardDescription className="text-xs">
                    一致性评分 · 维度审稿
                  </CardDescription>
                </div>
                <AgentStatusBadge status={reviewerStatus} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5 pt-5">
              {phase === "reviewer" ? (
                <AgentPlaceholder message="Reviewer 正在对照 Canon 与人格约束审稿…" />
              ) : showReviewerContent ? (
                <>
                  {reviewerError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {reviewerError}
                    </div>
                  ) : null}
                  {reviewerScores.map((item) => (
                    <div key={item.label} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="font-mono text-sm text-muted-foreground">
                          {item.score.toFixed(1)}
                        </span>
                      </div>
                      <ScoreBar score={item.score} />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.note}
                      </p>
                    </div>
                  ))}
                  {reviewerResult ? (
                    <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/15 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground">
                          Issues
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {reviewerResult.riskLevel}
                        </Badge>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                        {reviewerResult.issues.map((issue, i) => (
                          <li key={`${issue.type}-${i}`}>
                            <span className="text-foreground/80">
                              {issue.type}：
                            </span>
                            {issue.suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="mt-auto rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                    {reviewerResult?.summary ?? staticReviewSummary}
                  </div>
                </>
              ) : (
                <AgentPlaceholder message="等待 Writer 完成 · 随后进入审稿" />
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "flex flex-col border-border/80 bg-card/80 transition-shadow",
              phase === "criticizer" && "ring-1 ring-foreground/15",
            )}
          >
            <CardHeader className="border-border/60 gap-3 border-b pb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Criticizer Agent</CardTitle>
                  <CardDescription className="text-xs">
                    批评 · 策略 · 修订稿
                  </CardDescription>
                </div>
                <AgentStatusBadge status={criticizerStatus} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-5">
              {phase === "criticizer" ? (
                <AgentPlaceholder message="Criticizer 正在整理批评意见并输出修订稿…" />
              ) : showCriticizerContent ? (
                <Tabs defaultValue="criticism" className="flex flex-1 flex-col">
                  <TabsList className="grid h-auto w-full grid-cols-3 bg-muted/50 p-1">
                    <TabsTrigger
                      value="criticism"
                      className="px-1 py-2 text-xs"
                    >
                      核心批评
                    </TabsTrigger>
                    <TabsTrigger value="strategy" className="px-1 py-2 text-xs">
                      修改策略
                    </TabsTrigger>
                    <TabsTrigger value="revised" className="px-1 py-2 text-xs">
                      修订版片段
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="criticism"
                    className="mt-4 flex-1 outline-none"
                  >
                    {criticizerError ? (
                      <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {criticizerError}
                      </div>
                    ) : null}
                    <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {criticizerCriticism.map((line, i) => (
                        <li
                          key={i}
                          className="flex gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2"
                        >
                          <span className="font-mono text-xs text-muted-foreground/70">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    {criticizerEditorNote ? (
                      <div className="mt-3 rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        编辑说明：{criticizerEditorNote}
                      </div>
                    ) : null}
                  </TabsContent>
                  <TabsContent
                    value="strategy"
                    className="mt-4 flex-1 outline-none"
                  >
                    <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {criticizerStrategy.map((line, i) => (
                        <li
                          key={i}
                          className="flex gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2"
                        >
                          <span className="font-mono text-xs text-muted-foreground/70">
                            →
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                  <TabsContent
                    value="revised"
                    className="mt-4 flex-1 outline-none"
                  >
                    <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-4 text-sm leading-8 text-foreground/90">
                      {criticizerRevisedText
                        .split("\n\n")
                        .map((para, i) => (
                          <p key={i} className="mb-4 last:mb-0">
                            {para}
                          </p>
                        ))}
                    </div>
                    {criticizerEditorNote ? (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        编辑说明：{criticizerEditorNote}
                      </p>
                    ) : null}
                  </TabsContent>
                </Tabs>
              ) : (
                <AgentPlaceholder message="等待 Reviewer 完成 · 随后进入修订" />
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="border-t border-border/60 pt-8">
          <p className="text-xs text-muted-foreground">
            {phase === "done"
              ? "本轮审稿已完成。可再次点击顶部按钮重新模拟三 Agent 串联流程（仍非真实模型调用）。"
              : "点击「开始多 Agent 审稿」后，Writer → Reviewer → Criticizer 将依次进入工作状态。"}
          </p>
        </footer>
      </div>
    </div>
  );
}
