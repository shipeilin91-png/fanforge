"use client";

import { ArrowRight, BarChart3, ClipboardList, GitBranch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const FEEDBACK_STORAGE_KEY = "fanforge-feedback-records";
const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

type FeedbackRecord = {
  id: string;
  createdAt: string;
  scenarioText: string;
  targetLength: string;
  styleRequirement: string;
  selectedTags: string[];
  comment: string;
  generatedPreview: string;
};

const loopSteps = [
  "生成内容",
  "用户反馈",
  "问题归因",
  "Prompt / Agent / Context 优化",
  "再次生成验证",
] as const;

function getPercent(count: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function countTag(records: FeedbackRecord[], tag: string) {
  return records.filter((record) => record.selectedTags.includes(tag)).length;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeRecords(value: unknown): FeedbackRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (
        record,
      ): record is Partial<FeedbackRecord> & { selectedTags: unknown[] } =>
        typeof record === "object" &&
        record !== null &&
        Array.isArray(record.selectedTags),
    )
    .map((record, index) => ({
      id: typeof record.id === "string" ? record.id : `local-${index}`,
      createdAt:
        typeof record.createdAt === "string"
          ? record.createdAt
          : new Date(0).toISOString(),
      scenarioText:
        typeof record.scenarioText === "string" ? record.scenarioText : "",
      targetLength:
        typeof record.targetLength === "string" ? record.targetLength : "",
      styleRequirement:
        typeof record.styleRequirement === "string"
          ? record.styleRequirement
          : "",
      selectedTags: record.selectedTags.filter(
        (tag): tag is string => typeof tag === "string",
      ),
      comment: typeof record.comment === "string" ? record.comment : "",
      generatedPreview:
        typeof record.generatedPreview === "string"
          ? record.generatedPreview
          : "",
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export default function FeedbackPage() {
  const router = useRouter();
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return;

    try {
      setRecords(normalizeRecords(JSON.parse(raw)));
    } catch {
      setRecords([]);
    }
  }, []);

  const stats = useMemo(() => {
    const total = records.length;
    const satisfied = countTag(records, "满意");
    const ooc = countTag(records, "OOC");
    const weakEmotion = countTag(records, "情绪不够");
    const styleMismatch = countTag(records, "风格不对");
    const canonConflict = countTag(records, "Canon 冲突");

    return {
      total,
      satisfied,
      ooc,
      weakEmotion,
      styleMismatch,
      canonConflict,
      metrics: [
        { label: "总反馈数", value: String(total) },
        { label: "满意率", value: getPercent(satisfied, total) },
        { label: "OOC 反馈率", value: getPercent(ooc, total) },
        { label: "情绪不足反馈率", value: getPercent(weakEmotion, total) },
        { label: "风格不匹配率", value: getPercent(styleMismatch, total) },
        { label: "Canon 冲突率", value: getPercent(canonConflict, total) },
      ],
    };
  }, [records]);

  const optimizationAdvice = useMemo(() => {
    const candidates = [
      {
        key: "满意率",
        count: stats.satisfied,
        advice: "满意率最高：建议继续扩大样本并验证更多 fandom/角色类型",
      },
      {
        key: "OOC",
        count: stats.ooc,
        advice: "OOC 反馈率最高：建议优化 Persona Context Engine",
      },
      {
        key: "情绪不够",
        count: stats.weakEmotion,
        advice: "情绪不足反馈率最高：建议优化情绪切片 Prompt",
      },
      {
        key: "Canon 冲突",
        count: stats.canonConflict,
        advice: "Canon 冲突率最高：建议增强原作理解包与检索",
      },
      {
        key: "风格不对",
        count: stats.styleMismatch,
        advice: "风格不对反馈率最高：建议细化文学气质风格卡",
      },
    ];

    const winner = candidates.reduce((best, item) =>
      item.count > best.count ? item : best,
    );

    return winner.count > 0
      ? winner.advice
      : "暂无足够反馈：建议先收集更多生成结果评价";
  }, [stats]);

  const recentRecords = records.slice(0, 5);

  function handleClearRecords() {
    window.localStorage.removeItem(FEEDBACK_STORAGE_KEY);
    setRecords([]);
  }

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
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Feedback · Quality Signals
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              反馈数据看板
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              通过用户对生成结果的反馈标签，判断 OOC、情绪张力、风格匹配和 Canon 一致性问题。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="w-fit text-xs">
              当前为本地 MVP 数据，后续可接入真实登录、数据库、埋点和 A/B Test。
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleClearRecords}
              disabled={records.length === 0}
            >
              清空本地反馈数据
            </Button>
          </div>
        </header>

        {records.length === 0 ? (
          <Card className="border-border/80 bg-card/80">
            <CardContent className="flex min-h-40 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
              暂无真实反馈记录。请先到情绪切片页面生成内容并提交反馈。
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.metrics.map((metric) => (
                <Card
                  key={metric.label}
                  className="border-border/80 bg-card/80"
                >
                  <CardHeader className="gap-3 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <CardDescription className="text-xs">
                        {metric.label}
                      </CardDescription>
                      <BarChart3 className="size-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <Card className="border-border/80 bg-card/80">
                <CardHeader className="gap-2 border-b border-border/60 pb-5">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">最近反馈</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    读取浏览器 localStorage 中最近 5 条反馈
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-5">
                  {recentRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(record.createdAt)}
                        </span>
                        {record.selectedTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {record.comment || "未填写文字反馈"}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        场景描述：{record.scenarioText || "未填写"}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        生成预览：{record.generatedPreview}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/80">
                <CardHeader className="gap-2 border-b border-border/60 pb-5">
                  <CardTitle className="text-base">下一步优化判断</CardTitle>
                  <CardDescription className="text-xs">
                    根据当前最高反馈率动态给出建议
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div className="rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                    {optimizationAdvice}
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}

        <Card className="border-border/80 bg-card/70">
          <CardHeader className="gap-2 border-b border-border/60 pb-5">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">MVP 数据闭环</CardTitle>
            </div>
            <CardDescription className="text-xs">
              用反馈持续校准 Prompt、Agent 分工和上下文工程
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-1 gap-y-3 pt-5">
            {loopSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-1">
                <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="whitespace-nowrap">{step}</span>
                </div>
                {index < loopSteps.length - 1 && (
                  <ArrowRight
                    className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
