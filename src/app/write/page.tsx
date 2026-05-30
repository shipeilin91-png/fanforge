"use client";

import { BookOpenText, Layers, PenLine, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const writingModes = ["单章续写", "长篇大纲", "场景扩写", "结局改写"] as const;
const wordCounts = ["1000 字", "2000 字", "3000 字", "自定义"] as const;

const contextItems = [
  {
    title: "Canon Evidence",
    enabled: true,
    constraint: "约束世界观与时间线",
    writerImpact: "限制章节中的事件顺序、称呼、能力使用和设定新增，降低 Canon 冲突。",
  },
  {
    title: "Persona Map",
    enabled: true,
    constraint: "约束角色人格与 OOC 边界",
    writerImpact: "约束角色在冲突中的反应方式，避免突然告白、突然崩坏或动机断裂。",
  },
  {
    title: "Relationship Map",
    enabled: true,
    constraint: "约束关系阶段与未解冲突",
    writerImpact: "决定互动距离、冲突升级节奏和章节结尾可留下的关系钩子。",
  },
  {
    title: "Style Card",
    enabled: true,
    constraint: "影响语言肌理、意象和节奏",
    writerImpact: "影响叙述节奏、环境描写比例和情绪表达方式，让长文风格保持一致。",
  },
  {
    title: "User Intent",
    enabled: true,
    constraint: "用户输入的剧情目标",
    writerImpact: "把本章目标转成 Writer Agent 的章节结构规划，而不是只生成短片段。",
  },
] as const;

type ChapterResult = {
  draft: string;
  usedContext: string[];
  foreshadowingNotes: string[];
  nextChapterHooks: string[];
  usage?: UsageInfo;
  usedCanonDocuments?: string[];
  usedCanonEvidence?: CanonEvidence[];
  usedPersonaProfiles?: string[];
};

type CanonEvidence = {
  title: string;
  contentPreview: string;
  similarity: number;
};

type UsageInfo = {
  limit: number;
  used: number;
  remaining: number;
};

function parseTargetLength(input: string, fallback = 1000) {
  const matched = input.match(/\d+/);
  return matched ? Number(matched[0]) : fallback;
}

function getLengthRange(targetLength: number) {
  const ratio = targetLength <= 300 ? 0.2 : 0.15;

  return {
    min: Math.floor(targetLength * (1 - ratio)),
    max: Math.ceil(targetLength * (1 + ratio)),
  };
}

export default function WritePage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mode, setMode] = useState<(typeof writingModes)[number]>("单章续写");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterGoal, setChapterGoal] = useState("");
  const [plotInput, setPlotInput] = useState("");
  const [wordCount, setWordCount] = useState<(typeof wordCounts)[number]>("2000 字");
  const [customWordCount, setCustomWordCount] = useState("");
  const [styleRequest, setStyleRequest] = useState("");
  const [forbiddenItems, setForbiddenItems] = useState("");
  const [result, setResult] = useState<ChapterResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);

  useEffect(() => {
    setIsCheckingAuth(false);
  }, []);

  function getExpectedLength() {
    return wordCount === "自定义" ? customWordCount.trim() || "2000 字" : wordCount;
  }
  const targetLength = parseTargetLength(getExpectedLength(), 1000);
  const currentLength = result?.draft.length ?? 0;
  const targetRange = getLengthRange(targetLength);

  async function handleGenerateDraft() {
    if (isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionData.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const response = await fetch("/api/chapter", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode,
          chapterTitle: chapterTitle.trim() || "未命名章节",
          chapterGoal,
          plotInput,
          expectedLength: getExpectedLength(),
          styleRequirement: styleRequest,
          forbiddenItems,
          canonContext: contextItems[0].writerImpact,
          personaContext: contextItems[1].writerImpact,
          relationshipContext: contextItems[2].writerImpact,
          previousChapterSummary: plotInput.trim()
            ? `上一段剧情输入：${plotInput.trim()}`
            : "上一章留下未解释的旧物和未完成的对话。",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;

        throw new Error(
          response.status === 429
            ? "今日免费生成额度已用完，请前往模型设置切换高级模型，或明天再试。"
            : payload?.error || payload?.message || `HTTP ${response.status}`,
        );
      }

      const chapterData = (await response.json()) as ChapterResult;
      setResult(chapterData);
      if (chapterData.usage) setUsageInfo(chapterData.usage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "章节生成失败，请稍后重试。";
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
    }
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
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[14vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CHAPTER
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[520px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          DRAFT
        </div>
        <div className="pointer-events-none absolute bottom-8 left-[28%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          LONGFORM
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              LONGFORM WRITING · CHAPTER DRAFT
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Chapter Desk
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                面向长文、章节续写和连载创作，组织原作、角色、关系和风格上下文。
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.06)]">
            <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
              <div className="border-b border-[#b9aa83]/45 px-5 py-4">
                <div className="flex items-center gap-2">
                  <PenLine className="size-4 text-[#53613b]" />
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Chapter Plan Manuscript
                  </p>
                </div>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  章节计划手稿
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                  先组织章节目标和上下文，再生成草稿。
                </p>
              </div>
              <div className="flex flex-col gap-5 p-5">
                <ParamSelect
                  label="创作模式"
                  value={mode}
                  values={writingModes}
                  onChange={(value) => setMode(value as (typeof writingModes)[number])}
                />

                <div className="flex flex-col gap-2">
                  <FieldLabel>章节标题</FieldLabel>
                  <Input
                    value={chapterTitle}
                    onChange={(event) => setChapterTitle(event.target.value)}
                    placeholder="例如：第二章 雨夜重逢"
                    className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <TextAreaField
                  label="本章目标"
                  value={chapterGoal}
                  onChange={setChapterGoal}
                  placeholder="例如：让主角在婚礼现场确认旧友是否已经认出自己的真实身份。"
                  minHeight="min-h-24"
                />

                <TextAreaField
                  label="剧情输入"
                  value={plotInput}
                  onChange={setPlotInput}
                  placeholder="例如：主角在流亡三年后回到帝都，但必须隐藏身份参加旧友的婚礼……"
                  minHeight="min-h-36"
                />

                <div className="flex flex-col gap-2">
                  <FieldLabel>期望字数</FieldLabel>
                  <Select
                    value={wordCount}
                    onValueChange={(value) => setWordCount(value as (typeof wordCounts)[number])}
                  >
                    <SelectTrigger className="w-full rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]">
                      <SelectValue placeholder="选择期望字数" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {wordCounts.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {wordCount === "自定义" ? (
                    <Input
                      value={customWordCount}
                      onChange={(event) => setCustomWordCount(event.target.value)}
                      placeholder="例如：4500 字"
                      className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]"
                    />
                  ) : null}
                </div>

                <TextAreaField
                  label="文风要求"
                  value={styleRequest}
                  onChange={setStyleRequest}
                  placeholder="例如：叙事克制，少解释心理，多用环境和动作推进关系。"
                  minHeight="min-h-24"
                />

                <TextAreaField
                  label="禁止项"
                  value={forbiddenItems}
                  onChange={setForbiddenItems}
                  placeholder="例如：不要公开暴露身份；不要直接告白；不要新增未解释的魔法能力。"
                  minHeight="min-h-24"
                />

                <Button
                  className="h-11 w-full rounded-xl bg-[#171410] text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                >
                  {isGenerating ? "生成中..." : "生成章节草稿"}
                </Button>
                {usageInfo ? (
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs leading-relaxed",
                      usageInfo.remaining <= 2
                        ? "border-[#9a7f45]/35 bg-[#efe2c7] text-[#6f5f3f]"
                        : "border-[#53613b]/28 bg-[#e7ead4] text-[#3f4b2f]",
                    )}
                  >
                    {usageInfo.remaining <= 2
                      ? `今日免费额度仅剩 ${usageInfo.remaining} 次，可切换高级模型 BYOK。`
                      : `今日免费额度：剩余 ${usageInfo.remaining} / ${usageInfo.limit}`}
                  </div>
                ) : null}
                {errorMsg ? <p className="text-sm text-[#7f3326]">{errorMsg}</p> : null}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#b9aa83]/45 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-[#53613b]" />
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                      Context Index Cards
                    </p>
                  </div>
                  <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                    Context Engine
                  </h2>
                </div>
                <Badge variant="outline" className="rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]">
                  已启用
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {contextItems.map((item, index) => (
                  <div
                    key={item.title}
                    className="group rounded-xl border border-[#7b8359]/22 bg-[#fffdf7] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="font-serif text-3xl leading-none text-[#53613b]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#171410]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-[#6f6759]">
                            {item.constraint}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                      >
                        {item.enabled ? "已启用" : "未启用"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
              <div className="mb-5 flex items-center gap-2 border-b border-[#b9aa83]/45 pb-5">
                <BookOpenText className="size-4 text-[#53613b]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Chapter Draft Paper
                  </p>
                  <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
                    章节生成结果
                  </h2>
                  <p className="mt-3 text-xs text-[#6f6759]">
                    目标字数：{targetLength} / 当前字数：{currentLength}
                    {result && currentLength < targetRange.min
                      ? " · 当前结果低于目标字数，可点击继续写或扩写。"
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                {result ? (
                  <>
                    <div className="rounded-xl border border-[#8a7c62]/28 bg-[#fffdf7] px-6 py-6 font-serif text-[16px] leading-9 text-[#211d17] shadow-[0_16px_40px_rgba(92,69,42,0.06)]">
                      {result.draft.split("\n\n").map((paragraph) => (
                        <p key={paragraph} className="mb-5 whitespace-pre-line last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    <ResultList title="使用到的上下文" items={result.usedContext} />
                    {result.usedCanonDocuments?.length ? (
                      <ResultList
                        title="使用到的 Canon 文档"
                        items={result.usedCanonDocuments}
                      />
                    ) : null}
                    {result.usedCanonEvidence?.length ? (
                      <CanonEvidenceList evidence={result.usedCanonEvidence} />
                    ) : null}
                    {result.usedPersonaProfiles?.length ? (
                      <ResultList
                        title="使用到的角色档案"
                        items={result.usedPersonaProfiles}
                      />
                    ) : null}
                    <ResultList title="伏笔提示" items={result.foreshadowingNotes} />
                    <ResultList title="下一章钩子" items={result.nextChapterHooks} />
                  </>
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[#8a7c62]/32 bg-[#fffdf7]/74 px-4 py-8 text-center text-sm leading-7 text-[#7a705e]">
                    尚未生成章节草稿。
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6f6759]">
      {children}
    </span>
  );
}

function ParamSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${minHeight} resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]`}
      />
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[#8a7c62]/24 bg-[#fffaf0] px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-[#53613b]" />
        <h3 className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={item}
            className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#5f5849]"
          >
            <span className="font-serif text-2xl leading-none text-[#53613b]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CanonEvidenceList({ evidence }: { evidence: CanonEvidence[] }) {
  return (
    <div className="rounded-xl border border-[#53613b]/24 bg-[#f7f8ef] px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-[#53613b]" />
        <h3 className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
          本次命中的 Canon 证据
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {evidence.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            className="rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#5f5849]"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-[#171410]">{item.title}</span>
              <span className="rounded-full border border-[#53613b]/24 bg-[#e7ead4] px-2 py-0.5 text-[11px] text-[#3f4b2f]">
                相似度：{Math.round(item.similarity * 100)}%
              </span>
            </div>
            <p>{item.contentPreview}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
