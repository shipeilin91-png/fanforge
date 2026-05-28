"use client";

import {
  ArrowRight,
  Database,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EvidenceType = "Hard Canon" | "Soft Canon";

type CanonEvidence = {
  type: EvidenceType;
  title: string;
  source: string;
  evidence: string;
  usage: string;
};

const mockEvidence: CanonEvidence[] = [
  {
    type: "Hard Canon",
    title: "时间线锚点",
    source: "第三卷 · 灰港篇",
    evidence: "主角流亡第三年才第一次回到旧都，此前不能公开进入王城。",
    usage: "Writer 生成回归戏时必须避开提前返城；Reviewer 检查时间线冲突。",
  },
  {
    type: "Hard Canon",
    title: "身份与称号",
    source: "角色资料 · 王室档案",
    evidence: "流亡期公开身份为账房陆沉，王子身份只被极少数旧臣知晓。",
    usage: "限制对白中的称呼，避免路人或新角色直接叫出真实身份。",
  },
  {
    type: "Hard Canon",
    title: "世界观规则",
    source: "设定集 · 誓印规则",
    evidence: "誓印必须双片合一才能调动禁卫府武装，半片只能证明血统。",
    usage: "防止凭空召唤军队或跳过政治代价的剧情推进。",
  },
  {
    type: "Soft Canon",
    title: "角色说话方式",
    source: "对话片段 · 雨夜重逢",
    evidence: "主角倾向用克制、带刺的短句掩饰关心，很少直接解释情绪。",
    usage: "作为 Writer 风格约束，减少直白心理描写和过度告白。",
  },
  {
    type: "Soft Canon",
    title: "常用意象",
    source: "章节摘录 · 灰港夜雨",
    evidence: "雨声、旧伤、袖口水痕经常承担关系未解情绪的暗示功能。",
    usage: "为情绪切片提供可复用物象，保持同人文本的原作氛围。",
  },
  {
    type: "Soft Canon",
    title: "关系互动模式",
    source: "人物关系线 · 旧友",
    evidence: "两人常以试探和让步推进关系，真正的关心通常落在动作而非对白。",
    usage: "Reviewer 可用来判断关系阶段是否过快或互动是否 OOC。",
  },
];

const retrievalStrategies = [
  {
    title: "Dense Vector Search",
    description: "语义相似检索，用于召回与当前创作场景情绪、关系和事件相近的证据。",
  },
  {
    title: "Keyword / BM25 Search",
    description: "保留人名、地名、道具、称号等精确设定，避免语义检索漏掉硬约束。",
  },
  {
    title: "Hybrid Retrieval",
    description: "融合语义和关键词召回，让软氛围与硬设定同时进入候选证据池。",
  },
  {
    title: "Reranker",
    description: "根据当前创作场景重排证据，优先保留最能约束本轮生成的片段。",
  },
  {
    title: "Context Compression",
    description: "只保留与任务相关的证据片段，压缩上下文长度并减少噪声。",
  },
] as const;

const generationFlow = [
  "原作文档",
  "Canon Evidence",
  "Writer Prompt",
  "Reviewer Canon Check",
  "用户反馈",
] as const;

const conflictRules = [
  "时间线冲突",
  "世界观规则冲突",
  "角色已知信息冲突",
  "关系阶段冲突",
  "设定凭空添加",
] as const;

export default function CanonPage() {
  const [sourceText, setSourceText] = useState("");
  const [evidence, setEvidence] = useState<CanonEvidence[]>([]);

  function handleExtractEvidence() {
    setEvidence(mockEvidence);
  }

  const hardCanon = evidence.filter((item) => item.type === "Hard Canon");
  const softCanon = evidence.filter((item) => item.type === "Soft Canon");

  return (
    <div className="min-h-full overflow-hidden bg-[#f4ecd9] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-10 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[16vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CANON
        </div>
        <div className="pointer-events-none absolute right-[-9vw] top-[430px] hidden text-[13vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          EVIDENCE
        </div>
        <div className="pointer-events-none absolute bottom-12 left-[24%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          ARCHIVE
        </div>

        <header className="relative border-b border-[#171410]/15 pb-8">
          <div className="max-w-5xl">
            <div className="mb-7 inline-flex border border-[#2d281f]/20 bg-[#fffaf0]/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              CANON EVIDENCE · RAG READY
            </div>
            <h1 className="font-serif text-[clamp(4rem,11vw,11rem)] font-semibold leading-[0.82] tracking-[-0.045em] text-[#171410]">
              Canon Evidence Engine
            </h1>
            <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1fr]">
              <p className="max-w-xl font-serif text-[clamp(1.85rem,3.2vw,4rem)] leading-[0.96] tracking-[-0.025em] text-[#211d17]">
                上传或粘贴原作文档，提取原作硬设定、时间线、角色经历和风格证据。
              </p>
              <div className="flex max-w-2xl flex-col justify-end gap-4">
                <p className="text-sm leading-7 text-[#5f5849] sm:text-base">
                  Canon 证据页是深度编辑页，Studio 会轻量调用这里的 Hard /
                  Soft Canon 作为 Context Engine 输入。
                </p>
                <Badge
                  variant="outline"
                  className="w-fit border-[#171410]/20 bg-[#fbf5e8] text-xs text-[#6f6759]"
                >
                  MVP Demo，不接真实向量数据库、文件解析或 AI。
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <section className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#171410]/15 bg-[#efe2c7]/72 p-4 shadow-[0_20px_60px_rgba(49,39,24,0.06)]">
            <div className="border border-[#171410]/12 bg-[#fbf5e8]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#171410]/12 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center border border-[#171410]/15 bg-[#f0e4cc]">
                    <FileText className="size-4 text-[#53613b]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[#171410]">
                      原作文档输入区
                    </h2>
                    <p className="text-xs leading-relaxed text-[#6f6759]">
                      档案录入台：粘贴片段或选择文件后，点击按钮生成 mock Canon 证据。
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                >
                  Archive Intake
                </Badge>
              </div>

              <div className="flex flex-col gap-5 p-5">
                <Textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="粘贴原作片段 / 世界观设定 / 角色资料"
                  className="min-h-52 resize-y border-[#171410]/15 bg-[#fffaf0] px-5 py-5 font-serif text-[15px] leading-8 text-[#211d17] shadow-inner shadow-[#4d3f24]/5 placeholder:text-[#9a8f78] focus-visible:ring-[#53613b]"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <Input
                    type="file"
                    accept=".txt,.md"
                    aria-label="上传 .txt 或 .md 原作文档"
                    className="border-[#171410]/15 bg-[#f8f0df] text-[#5f5849] file:text-[#171410]"
                  />
                  <Button
                    className="h-10 bg-[#171410] px-5 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                    onClick={handleExtractEvidence}
                  >
                    提取 Canon 证据
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <aside className="border border-[#171410]/15 bg-[#fbf5e8]/82 p-5 shadow-[0_18px_50px_rgba(49,39,24,0.05)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center border border-[#171410]/15 bg-[#f0e4cc]">
                <ShieldCheck className="size-4 text-[#53613b]" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Reviewer Standard
                </p>
                <h2 className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                  Canon 冲突判断标准
                </h2>
              </div>
            </div>
            <div className="mt-6 divide-y divide-[#171410]/12 border-y border-[#171410]/12">
              {conflictRules.map((rule, index) => (
                <div
                  key={rule}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-4 text-sm text-[#332d24]"
                >
                  <span className="font-serif text-2xl leading-none text-[#53613b]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EvidenceColumn
            title="Hard Canon"
            description="不可违反的硬设定，例如时间线、身份、世界观规则、已知信息。"
            items={hardCanon}
          />
          <EvidenceColumn
            title="Soft Canon"
            description="风格/氛围参考，例如角色说话方式、常用意象、关系互动模式。"
            items={softCanon}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#171410]/15 bg-[#fbf5e8]/82 p-5 shadow-[0_18px_50px_rgba(49,39,24,0.05)]">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center border border-[#171410]/15 bg-[#f0e4cc]">
                  <Search className="size-4 text-[#53613b]" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Retrieval Method
                  </p>
                  <h2 className="font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                    RAG 检索策略
                  </h2>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-[#171410]/20 bg-[#f8f0df] text-xs text-[#6f6759]"
              >
                Writer / Reviewer Context
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {retrievalStrategies.map((strategy, index) => (
                <div
                  key={strategy.title}
                  className="group border border-[#171410]/12 bg-[#f8f0df] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#fff8ea]"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-serif text-3xl leading-none text-[#53613b]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#171410]">
                        {strategy.title}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#171410]/15 bg-[#efe2c7]/65 p-5 shadow-[0_18px_50px_rgba(49,39,24,0.04)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center border border-[#171410]/15 bg-[#f8f0df]">
                <Database className="size-4 text-[#53613b]" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Generation Chain
                </p>
                <h2 className="font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  如何进入生成链路
                </h2>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-0 border-y border-[#171410]/12">
              {generationFlow.map((step, index) => (
                <div
                  key={step}
                  className="group flex items-center justify-between gap-3 border-b border-[#171410]/12 py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-2xl leading-none text-[#53613b]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#332d24]">{step}</span>
                  </div>
                  {index < generationFlow.length - 1 ? (
                    <ArrowRight className="size-4 text-[#8a7c62]" aria-hidden />
                  ) : (
                    <span className="size-2 rounded-full bg-[#53613b]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function EvidenceColumn({
  title,
  description,
  items,
}: {
  title: EvidenceType;
  description: string;
  items: CanonEvidence[];
}) {
  const isHard = title === "Hard Canon";

  return (
    <section
      className={cn(
        "border p-5 shadow-[0_18px_50px_rgba(49,39,24,0.05)]",
        isHard
          ? "border-[#7f3326]/25 bg-[#f2dfd3]"
          : "border-[#53613b]/22 bg-[#fbf5e8]/85",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#171410]/12 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
            {isHard ? "Non-negotiable rule" : "Atmosphere reference"}
          </p>
          <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#6f6759]">
            {description}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-[#171410]/20 bg-[#f8f0df] text-[#171410]",
            isHard && "border-[#7f3326]/30 bg-[#edd1c5] text-[#7f3326]",
          )}
        >
          {items.length}
        </Badge>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="border border-dashed border-[#171410]/20 bg-[#f8f0df]/65 px-4 py-10 text-center text-sm leading-7 text-[#7a705e]">
            点击「提取 Canon 证据」后展示 mock 证据卡片。
          </div>
        ) : (
          items.map((item) => (
            <article
              key={`${item.type}-${item.title}`}
              className={cn(
                "group border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5",
                isHard
                  ? "border-[#7f3326]/25 bg-[#fff4ed] hover:border-[#7f3326]/45"
                  : "border-[#53613b]/18 bg-[#fffaf0] hover:border-[#53613b]/45",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    isHard
                      ? "border-[#7f3326]/35 bg-[#edd1c5] text-[#7f3326]"
                      : "border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
                  )}
                >
                  {item.type}
                </Badge>
                <span className="text-xs text-[#7a705e]">{item.source}</span>
              </div>
              <p className="font-serif text-2xl leading-none tracking-[-0.015em] text-[#171410]">
                {item.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#5f5849]">
                <span className="font-medium text-[#332d24]">证据：</span>
                {item.evidence}
              </p>
              <p className="mt-2 text-sm leading-7 text-[#5f5849]">
                <span className="font-medium text-[#332d24]">用途：</span>
                {item.usage}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
