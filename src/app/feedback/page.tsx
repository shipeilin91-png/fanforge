"use client";

import { ArrowRight, BarChart3, ClipboardList, GitBranch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const rubricItems = [
  "角色一致性 / OOC",
  "Canon 一致性",
  "情绪张力",
  "风格匹配",
  "关系阶段合理性",
] as const;

const standardItems = [
  {
    title: "满意率",
    body: "用户明确标记满意的比例，用来判断当前 Prompt 与上下文组合是否值得扩大样本。",
  },
  {
    title: "OOC 反馈率",
    body: "角色不像原作或当前阶段时升高，优先回到 Persona Context Engine 排查人格边界。",
  },
  {
    title: "情绪不足反馈率",
    body: "用户认为不够酸涩、克制或有张力时升高，优先调整情绪切片 Prompt。",
  },
  {
    title: "风格不匹配率",
    body: "语言气质与预期不一致时升高，优先细化文学气质风格卡。",
  },
  {
    title: "Canon 冲突率",
    body: "设定、时间线或人物已知信息出错时升高，优先增强原作理解包与 Canon 检索。",
  },
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
        { label: "总反馈数", value: String(total), count: total },
        { label: "满意率", value: getPercent(satisfied, total), count: satisfied },
        { label: "OOC 反馈率", value: getPercent(ooc, total), count: ooc },
        { label: "情绪不足反馈率", value: getPercent(weakEmotion, total), count: weakEmotion },
        { label: "风格不匹配率", value: getPercent(styleMismatch, total), count: styleMismatch },
        { label: "Canon 冲突率", value: getPercent(canonConflict, total), count: canonConflict },
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
        advice: "Canon 冲突率最高：建议增强原作理解包与 Canon 检索",
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
      <div className="flex min-h-full items-center justify-center bg-[#f3ead7] text-sm text-[#6f6759]">
        正在检查登录状态……
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-hidden bg-[#f6efdf] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[13vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          FEEDBACK
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[500px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          INSIGHT
        </div>
        <div className="pointer-events-none absolute bottom-8 left-[28%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          QUALITY
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              FEEDBACK LOOP · QUALITY INSIGHT
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Feedback Board
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                用用户反馈和 Reviewer Rubric 判断生成质量，把 OOC、Canon、情绪张力和风格问题归因到具体模块。
              </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-[#8a7c62]/28 bg-[#fffaf0] text-[#171410] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#e7ead4]"
                    onClick={handleClearRecords}
                    disabled={records.length === 0}
                  >
                    清空本地反馈数据
                  </Button>
                </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.metrics.map((metric, index) => (
            <MetricNote
              key={metric.label}
              label={metric.label}
              value={metric.value}
              index={index}
              muted={metric.count === 0}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
            <div className="mb-5 flex items-center gap-3 border-b border-[#b9aa83]/45 pb-5">
              <ClipboardList className="size-4 text-[#53613b]" />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Reader / Editor Notes
                </p>
                <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
                  最近反馈
                </h2>
              </div>
            </div>
            {recentRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#8a7c62]/32 bg-[#fffdf7]/74 px-6 py-10 text-center text-sm leading-7 text-[#7a705e]">
                暂无反馈记录。
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentRecords.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#8a7c62]">
                        {formatTime(record.createdAt)}
                      </span>
                      {record.selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm leading-7 text-[#332d24]">
                      用户文字反馈：{record.comment || "未填写文字反馈"}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                      场景描述：{record.scenarioText || "未填写"}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                      生成预览：{record.generatedPreview}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#fbf7ed]/84 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
              Optimization Signal
            </p>
            <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
              下一步优化判断
            </h2>
            <div className="mt-5 rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-4 py-4 text-sm leading-7 text-[#5f5849]">
              {optimizationAdvice}
            </div>
          </section>
        </section>

        <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
          <div className="mb-6 flex items-center gap-3">
            <GitBranch className="size-4 text-[#53613b]" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                Feedback Loop
              </p>
              <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
                数据闭环
              </h2>
              <p className="mt-2 text-xs text-[#6f6759]">
                用反馈持续校准 Prompt、Agent 分工和上下文工程。
              </p>
            </div>
          </div>
          <div className="grid gap-0 md:grid-cols-5">
            {loopSteps.map((step, index) => (
              <div
                key={step}
                className="relative border-t border-[#8a7c62]/30 px-0 pb-5 pt-8"
              >
                <span className="absolute -top-2 left-0 size-4 rounded-full border border-[#53613b]/45 bg-[#53613b]" />
                <span className="block font-serif text-3xl leading-none text-[#171410]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-4 block pr-5 text-sm leading-6 text-[#5f5849]">
                  {step}
                </span>
                {index < loopSteps.length - 1 ? (
                  <ArrowRight className="mt-4 size-4 text-[#8a7c62] md:hidden" aria-hidden />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
            <div className="mb-5 flex items-center gap-3 border-b border-[#b9aa83]/45 pb-5">
              <BarChart3 className="size-4 text-[#53613b]" />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Evaluation Manual
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  评价标准说明
                </h2>
              </div>
            </div>
            <div className="grid gap-3">
              {standardItems.map((item, index) => (
                <div
                  key={item.title}
                  className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-3 text-sm leading-7 text-[#5f5849]"
                >
                  <span className="font-serif text-2xl leading-none text-[#53613b]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-[#171410]">{item.title}</p>
                    <p className="mt-1 text-xs leading-6 text-[#6f6759]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#fbf7ed]/84 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
              Cold Start Validation
            </p>
            <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
              AI 评价标准与冷启动验证
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#5f5849]">
              <p>
                早期没有足够用户数据时，先使用人工小样本评测 + AI Reviewer 结构化评分。
              </p>
              <p>
                用户数据积累后，再用真实反馈校准评分体系。
              </p>
              <p>
                AI Reviewer 评分不是最终真理，它用于早期发现问题方向，最终需要用用户反馈、复制率、重新生成率、二次修改率等行为数据校准。
              </p>
            </div>
            <div className="mt-6 border-t border-[#b9aa83]/45 pt-5">
              <h3 className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                Reviewer Rubric
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {rubricItems.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-[#53613b]/35 bg-[#e7ead4] px-3 py-1 text-xs text-[#3f4b2f]"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function MetricNote({
  label,
  value,
  index,
  muted,
}: {
  label: string;
  value: string;
  index: number;
  muted: boolean;
}) {
  return (
    <section
      className={cn(
        "group rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 px-5 py-5 shadow-[0_14px_38px_rgba(92,69,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]",
        muted && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-serif text-3xl leading-none text-[#53613b]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <BarChart3 className="size-4 text-[#8a7c62]" />
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.16em] text-[#8a7c62]">
        {label}
      </p>
      <p className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
        {value}
      </p>
    </section>
  );
}
