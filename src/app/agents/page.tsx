"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const pipeline = ["用户需求", "Writer 生成", "Reviewer 审稿", "Criticizer 修订"] as const;

const STAGE_DELAY_MS = 800;
const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

type WorkflowPhase = "idle" | "writer" | "reviewer" | "criticizer" | "done";
type AgentStatus = "Waiting" | "Generating" | "Reviewing" | "Revising" | "Done";

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

谁也没有先开口。风从两人之间穿过，带走一句险些成形的话。她只把视线落在对方指节上，那里有一道旧伤，颜色已经很淡，却仍能叫人想起某次来不及阻止的离开。

他侧了侧身，把伞沿往她那边倾了半寸，动作轻得像怕惊动什么。雨声盖住了呼吸里多出来的那一点停顿；克制比告白更接近他们此刻的关系。`;

const reviewScores = [
  {
    label: "OOC / 角色一致性",
    score: 8.6,
    note: "人物反应偏内敛，未出现性格突变式对白。",
  },
  {
    label: "Canon / 原作一致性",
    score: 9.1,
    note: "未触碰原作硬设定红线；雨夜与旧伤意象可回溯。",
  },
  {
    label: "关系阶段合理性",
    score: 8.4,
    note: "「分离后重逢」的试探感成立，距离感控制得当。",
  },
  {
    label: "情绪张力",
    score: 9.0,
    note: "克制与酸涩并存，未滑向直白抒情。",
  },
  {
    label: "风格匹配",
    score: 8.8,
    note: "意象、节奏和留白基本贴合疏离克制风格卡。",
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

风从两人之间穿过。她看向他的指节，旧伤淡得几乎看不见，指腹却在伞柄上收紧了一瞬，又慢慢松开。他什么都没说，只把伞沿往她那边倾了半寸；水痕顺着伞骨滑下去，滴在两人脚边同一块湿砖上。

雨声很大。她伸手去接斜过来的雨，指尖擦过他袖口，又很快收回。`,
  editorNote: "修订重点是删除解释性旁白，让关系判断落到动作和物象上。",
};

const agentRoles = [
  {
    title: "Writer",
    label: "生成初稿",
    body: "根据 Context Engine 生成初稿。",
  },
  {
    title: "Reviewer",
    label: "结构化评分",
    body: "检查角色一致性、Canon、情绪张力和风格匹配。",
  },
  {
    title: "Criticizer",
    label: "修订策略",
    body: "根据 Reviewer 结果提出修订策略。",
  },
] as const;

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
  if (phase === "idle" || phase === "writer" || phase === "reviewer") return "Waiting";
  if (phase === "criticizer") return "Revising";
  return "Done";
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score * 10));
  return (
    <div className="h-1.5 w-full overflow-hidden bg-[#e7dcc4]">
      <div className="h-full bg-[#53613b] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const styles = {
    Waiting: "border-[#171410]/20 bg-[#fbf5e8] text-[#6f6759]",
    Generating: "border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
    Reviewing: "border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
    Revising: "border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
    Done: "border-[#8a7c62]/30 bg-[#efe2c7] text-[#6f5f3f]",
  };

  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", styles[status])}>
      {status}
    </Badge>
  );
}

function AgentPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center border border-dashed border-[#171410]/20 bg-[#f8f0df]/70 px-4 py-8 text-center text-sm leading-7 text-[#7a705e]">
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
  const [reviewerResult, setReviewerResult] = useState<ReviewerResult | null>(null);
  const [reviewerError, setReviewerError] = useState<string | null>(null);
  const [criticizerResult, setCriticizerResult] = useState<CriticizerResult | null>(null);
  const [criticizerError, setCriticizerError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const timeoutsRef = useRef<number[]>([]);

  const writerStatus = getWriterStatus(phase);
  const reviewerStatus = getReviewerStatus(phase);
  const criticizerStatus = getCriticizerStatus(phase);
  const showWriterContent = phase === "reviewer" || phase === "criticizer" || phase === "done";
  const showReviewerContent = phase === "criticizer" || phase === "done";
  const showCriticizerContent = phase === "done";
  const activePipelineIndex = getPipelineStepIndex(phase);
  const reviewerScores = reviewerResult
    ? [
        {
          label: "OOC / 角色一致性",
          score: reviewerResult.scores.ooc,
          note: "人物行为与性格约束的一致性评分。",
        },
        {
          label: "Canon / 原作一致性",
          score: reviewerResult.scores.canon,
          note: "原作设定与硬性约束风险评分。",
        },
        {
          label: "关系阶段合理性",
          score: reviewerResult.scores.relationshipStage,
          note: "当前关系推进是否符合阶段刻度。",
        },
        {
          label: "情绪张力",
          score: reviewerResult.scores.emotionalTension,
          note: "情绪浓度、留白与克制感评分。",
        },
        {
          label: "风格匹配",
          score:
            (reviewerResult.scores.ooc +
              reviewerResult.scores.canon +
              reviewerResult.scores.relationshipStage +
              reviewerResult.scores.emotionalTension) /
            4,
          note: "结合前四项推导的风格稳定度。",
        },
      ]
    : reviewScores;
  const criticizerCriticism = criticizerResult ? [criticizerResult.coreCritique] : criticizer.criticism;
  const criticizerStrategy = criticizerResult?.revisionStrategy ?? criticizer.strategy;
  const criticizerRevisedText = criticizerResult?.revisedText ?? criticizer.revised;
  const criticizerEditorNote = criticizerResult?.editorNote ?? criticizer.editorNote;

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

      if (!response.ok) throw new Error("Reviewer API request failed");

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

      if (!response.ok) throw new Error("Criticizer API request failed");

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
      <div className="flex min-h-full items-center justify-center bg-[#f3ead7] text-sm text-[#6f6759]">
        正在检查登录状态……
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-hidden bg-[#f4ecd9] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-10 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[15vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          REVIEW
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[500px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          AGENT
        </div>
        <div className="pointer-events-none absolute bottom-8 left-[28%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          CRITIQUE
        </div>

        <header className="relative border-b border-[#171410]/15 pb-8">
          <div className="max-w-5xl">
            <div className="mb-7 inline-flex border border-[#2d281f]/20 bg-[#fffaf0]/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              MULTI-AGENT REVIEW · EDITORIAL DESK
            </div>
            <h1 className="font-serif text-[clamp(4.7rem,13vw,12rem)] font-semibold leading-[0.82] tracking-[-0.045em] text-[#171410]">
              Review Desk
            </h1>
            <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1fr]">
              <p className="max-w-2xl font-serif text-[clamp(1.85rem,3.2vw,4rem)] leading-[0.96] tracking-[-0.025em] text-[#211d17]">
                把 Writer 生成、Reviewer 审核和 Criticizer 修订拆成可解释的多 Agent 审稿流程。
              </p>
              <div className="flex max-w-2xl flex-col justify-end gap-4">
                <p className="text-sm leading-7 text-[#5f5849] sm:text-base">
                  Agents 页面是多 Agent 审稿详情页，Studio 可以轻量调用 Reviewer 检查。
                </p>
                <p className="text-sm leading-7 text-[#5f5849]">
                  多 Agent 审稿不是让 AI 自写自评，而是把生成、评分和修订拆成不同职责，降低 OOC、Canon 冲突和风格漂移。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="h-11 bg-[#171410] px-6 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                    onClick={handleStartReview}
                    disabled={isRunning}
                  >
                    {isRunning ? "审稿进行中..." : "开始多 Agent 审稿"}
                  </Button>
                  <Badge variant="outline" className="border-[#53613b]/35 bg-[#e7ead4] px-3 py-2 text-[#3f4b2f]">
                    mock / fallback chain
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {agentRoles.map((agent) => (
            <div
              key={agent.title}
              className="border border-[#171410]/12 bg-[#fbf5e8] px-4 py-4 shadow-[0_12px_34px_rgba(49,39,24,0.04)]"
            >
              <p className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                {agent.title}
              </p>
              <p className="mt-2 text-sm font-medium text-[#53613b]">{agent.label}</p>
              <p className="mt-2 text-xs leading-6 text-[#6f6759]">{agent.body}</p>
            </div>
          ))}
        </section>

        <section className="border-y border-[#171410]/15 py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                Editorial Pipeline
              </p>
              <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
                审稿流程线
              </h2>
            </div>
            <p className="text-xs text-[#6f6759]">半动态演示 · 每阶段约 {STAGE_DELAY_MS}ms</p>
          </div>
          <div className="grid gap-0 md:grid-cols-4">
            {pipeline.map((step, index) => (
              <div
                key={step}
                className={cn(
                  "relative border-t border-[#171410]/25 px-0 pb-5 pt-8 transition-colors",
                  index <= activePipelineIndex && "border-[#53613b]",
                )}
              >
                <span
                  className={cn(
                    "absolute -top-2 left-0 size-4 rounded-full border border-[#171410]/30 bg-[#f4ecd9] transition-all duration-200",
                    index <= activePipelineIndex && "scale-125 border-[#53613b] bg-[#53613b]",
                  )}
                />
                <span className="block font-serif text-3xl leading-none text-[#171410]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-4 block pr-5 text-sm leading-6 text-[#5f5849]">{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <AgentPanel
            title="Writer Agent"
            subtitle="生成初稿"
            status={writerStatus}
            active={phase === "writer"}
          >
            {phase === "writer" ? (
              <AgentPlaceholder message="Writer 正在根据 Context Engine 生成关系情绪切片初稿…" />
            ) : showWriterContent ? (
              <>
                <DraftPaper text={writerFragment} />
                <p className="text-xs leading-relaxed text-[#6f6759]">
                  输入摘要：CP · 雨夜重逢 · 分离后重逢 · 克制 · 疏离克制
                </p>
              </>
            ) : (
              <AgentPlaceholder message="等待开始 · Writer 将首先生成初稿" />
            )}
          </AgentPanel>

          <AgentPanel
            title="Reviewer Agent"
            subtitle="结构化评分"
            status={reviewerStatus}
            active={phase === "reviewer"}
          >
            {phase === "reviewer" ? (
              <AgentPlaceholder message="Reviewer 正在对照 Canon 与人格约束审稿…" />
            ) : showReviewerContent ? (
              <>
                {reviewerError ? (
                  <div className="border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-2 text-xs text-[#7f3326]">
                    {reviewerError}
                  </div>
                ) : null}
                {reviewerScores.map((item) => (
                  <div key={item.label} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#171410]">{item.label}</span>
                      <span className="font-serif text-2xl leading-none text-[#53613b]">
                        {item.score.toFixed(1)}
                      </span>
                    </div>
                    <ScoreBar score={item.score} />
                    <p className="text-xs leading-relaxed text-[#6f6759]">{item.note}</p>
                  </div>
                ))}
                {reviewerResult ? (
                  <div className="border border-[#171410]/12 bg-[#f8f0df] px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#171410]">Issues</span>
                      <Badge variant="outline" className="border-[#53613b]/35 text-[10px] text-[#3f4b2f]">
                        {reviewerResult.riskLevel}
                      </Badge>
                    </div>
                    <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[#6f6759]">
                      {reviewerResult.issues.map((issue, i) => (
                        <li key={`${issue.type}-${i}`}>
                          <span className="font-medium text-[#332d24]">{issue.type}：</span>
                          {issue.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="border border-dashed border-[#53613b]/30 bg-[#f8f0df] px-3 py-3 text-xs leading-relaxed text-[#5f5849]">
                  {reviewerResult?.summary ?? staticReviewSummary}
                </div>
              </>
            ) : (
              <AgentPlaceholder message="等待 Writer 完成 · 随后进入审稿" />
            )}
          </AgentPanel>

          <AgentPanel
            title="Criticizer Agent"
            subtitle="修改策略和修订稿"
            status={criticizerStatus}
            active={phase === "criticizer"}
          >
            {phase === "criticizer" ? (
              <AgentPlaceholder message="Criticizer 正在整理批评意见并输出修订稿…" />
            ) : showCriticizerContent ? (
              <Tabs defaultValue="criticism" className="flex flex-1 flex-col">
                <TabsList className="grid h-auto w-full grid-cols-3 border border-[#171410]/15 bg-[#f4ecd9] p-1">
                  <TabsTrigger value="criticism" className="px-1 py-2 text-xs">
                    核心批评
                  </TabsTrigger>
                  <TabsTrigger value="strategy" className="px-1 py-2 text-xs">
                    修改策略
                  </TabsTrigger>
                  <TabsTrigger value="revised" className="px-1 py-2 text-xs">
                    修订文本
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="criticism" className="mt-4 flex-1 outline-none">
                  {criticizerError ? (
                    <div className="mb-3 border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-2 text-xs text-[#7f3326]">
                      {criticizerError}
                    </div>
                  ) : null}
                  <NumberedList items={criticizerCriticism} />
                  {criticizerEditorNote ? (
                    <EditorNote note={criticizerEditorNote} />
                  ) : null}
                </TabsContent>
                <TabsContent value="strategy" className="mt-4 flex-1 outline-none">
                  <NumberedList items={criticizerStrategy} />
                </TabsContent>
                <TabsContent value="revised" className="mt-4 flex-1 outline-none">
                  <DraftPaper text={criticizerRevisedText} />
                  {criticizerEditorNote ? <EditorNote note={criticizerEditorNote} /> : null}
                </TabsContent>
              </Tabs>
            ) : (
              <AgentPlaceholder message="等待 Reviewer 完成 · 随后进入修订" />
            )}
          </AgentPanel>
        </section>

        <footer className="border-t border-[#171410]/15 pt-8">
          <p className="text-xs leading-7 text-[#6f6759]">
            {phase === "done"
              ? "本轮审稿已完成。可再次点击顶部按钮重新模拟三 Agent 串联流程。当前为 mock / fallback 审稿链路，后续可接入真实多模型和更细粒度 Agent trace。"
              : "点击「开始多 Agent 审稿」后，Writer → Reviewer → Criticizer 将依次进入工作状态。"}
          </p>
        </footer>
      </main>
    </div>
  );
}

function AgentPanel({
  title,
  subtitle,
  status,
  active,
  children,
}: {
  title: string;
  subtitle: string;
  status: AgentStatus;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[560px] flex-col border border-[#171410]/15 bg-[#fbf5e8]/82 p-5 shadow-[0_18px_50px_rgba(49,39,24,0.05)] transition-all duration-200",
        active && "border-[#53613b]/60 bg-[#fff8ea]",
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#171410]/12 pb-5">
        <div>
          <p className="font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
            {title}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#8a7c62]">
            {subtitle}
          </p>
        </div>
        <AgentStatusBadge status={status} />
      </div>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </section>
  );
}

function DraftPaper({ text }: { text: string }) {
  return (
    <div className="border border-[#171410]/15 bg-[#fffaf0] px-4 py-4 font-serif text-[15px] leading-8 text-[#211d17] shadow-[0_12px_30px_rgba(49,39,24,0.05)]">
      {text.split("\n\n").map((para, i) => (
        <p key={i} className="mb-4 last:mb-0">
          {para}
        </p>
      ))}
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-relaxed text-[#5f5849]">
      {items.map((line, i) => (
        <li key={i} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 border border-[#171410]/12 bg-[#f8f0df] px-3 py-3">
          <span className="font-serif text-2xl leading-none text-[#53613b]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function EditorNote({ note }: { note: string }) {
  return (
    <div className="mt-3 border border-dashed border-[#53613b]/30 bg-[#f8f0df] px-3 py-3 text-xs leading-relaxed text-[#5f5849]">
      <span className="font-medium text-[#171410]">编辑说明：</span>
      {note}
    </div>
  );
}
