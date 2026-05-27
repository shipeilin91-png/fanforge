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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    title: "Keyword/BM25 Search",
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
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Canon Evidence · Retrieval Engine
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              Canon Evidence Engine
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              上传或粘贴原作文档，提取世界观规则、时间线、角色经历和伏笔证据，用于降低 Canon 冲突。
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            当前为 MVP Demo，不接真实向量数据库、文件解析或 AI。
          </Badge>
        </header>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="gap-2 border-b border-border/60 pb-5">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">原作文档输入区</CardTitle>
            </div>
            <CardDescription className="text-xs">
              粘贴片段或选择文件后，点击按钮生成 mock Canon 证据。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            <Textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="粘贴原作片段 / 世界观设定 / 角色资料"
              className="min-h-36 resize-y bg-background/40 text-sm leading-relaxed"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                type="file"
                accept=".txt,.md"
                aria-label="上传 .txt 或 .md 原作文档"
                className="bg-background/40"
              />
              <Button className="h-10" onClick={handleExtractEvidence}>
                提取 Canon 证据
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">RAG 检索策略</CardTitle>
              </div>
              <CardDescription className="text-xs">
                用混合检索把 Canon 证据送入 Writer / Reviewer 上下文
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-2">
              {retrievalStrategies.map((strategy) => (
                <div
                  key={strategy.title}
                  className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {strategy.title}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {strategy.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">Canon 冲突判断标准</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Reviewer Canon Check 的基础分类
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-5">
              {conflictRules.map((rule, index) => (
                <div
                  key={rule}
                  className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-sm text-foreground/90"
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/80 bg-card/70">
          <CardHeader className="gap-2 border-b border-border/60 pb-5">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">如何进入生成链路</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Canon 证据作为上下文约束进入写作与审稿
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-1 gap-y-3 pt-5">
            {generationFlow.map((step, index) => (
              <div key={step} className="flex items-center gap-1">
                <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="whitespace-nowrap">{step}</span>
                </div>
                {index < generationFlow.length - 1 && (
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

function EvidenceColumn({
  title,
  description,
  items,
}: {
  title: EvidenceType;
  description: string;
  items: CanonEvidence[];
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="gap-2 border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={title === "Hard Canon" ? "destructive" : "secondary"}>
            {items.length}
          </Badge>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-5">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            点击「提取 Canon 证据」后展示 mock 证据卡片。
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.type}-${item.title}`}
              className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    item.type === "Hard Canon" ? "destructive" : "outline"
                  }
                  className="text-[10px]"
                >
                  {item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.source}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                证据：{item.evidence}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                用途：{item.usage}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
