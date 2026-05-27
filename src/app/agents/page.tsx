"use client";

import { ArrowRight } from "lucide-react";

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
};

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

function AgentStatusBadge({
  status,
  variant = "outline",
}: {
  status: string;
  variant?: "default" | "secondary" | "outline";
}) {
  return (
    <Badge variant={variant} className="text-[10px] tracking-wide uppercase">
      {status}
    </Badge>
  );
}

export default function AgentsPage() {
  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Multi-Agent · Review Desk
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              多 Agent 审稿台
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              Writer、Reviewer、Criticizer
              分工完成生成、审稿与修订，避免单一 AI 自写自评。
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">审稿流程（静态演示）</p>
          <Card className="border-border/80 bg-card/60 py-4">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-3 px-6">
              {pipeline.map((step, index) => (
                <div key={step} className="flex items-center gap-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground/90",
                      index === 0 && "border-foreground/15 bg-muted/50",
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
          <Card className="flex flex-col border-border/80 bg-card/80">
            <CardHeader className="border-border/60 gap-3 border-b pb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Writer Agent</CardTitle>
                  <CardDescription className="text-xs">
                    关系情绪切片 · 初稿生成
                  </CardDescription>
                </div>
                <AgentStatusBadge status="Generated" variant="secondary" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 pt-5">
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
            </CardContent>
          </Card>

          <Card className="flex flex-col border-border/80 bg-card/80">
            <CardHeader className="border-border/60 gap-3 border-b pb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Reviewer Agent</CardTitle>
                  <CardDescription className="text-xs">
                    一致性评分 · 维度审稿
                  </CardDescription>
                </div>
                <AgentStatusBadge status="Reviewed" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5 pt-5">
              {reviewScores.map((item) => (
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
              <div className="mt-auto rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                综合建议：保留距离感与物象收束，弱化解释性旁白后可进入修订。
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col border-border/80 bg-card/80">
            <CardHeader className="border-border/60 gap-3 border-b pb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Criticizer Agent</CardTitle>
                  <CardDescription className="text-xs">
                    批评 · 策略 · 修订稿
                  </CardDescription>
                </div>
                <AgentStatusBadge status="Revised" variant="secondary" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-5">
              <Tabs defaultValue="criticism" className="flex flex-1 flex-col">
                <TabsList className="grid h-auto w-full grid-cols-3 bg-muted/50 p-1">
                  <TabsTrigger value="criticism" className="px-1 py-2 text-xs">
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
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {criticizer.criticism.map((line, i) => (
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
                </TabsContent>
                <TabsContent
                  value="strategy"
                  className="mt-4 flex-1 outline-none"
                >
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {criticizer.strategy.map((line, i) => (
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
                    {criticizer.revised.split("\n\n").map((para, i) => (
                      <p key={i} className="mb-4 last:mb-0">
                        {para}
                      </p>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-col gap-4 border-t border-border/60 pt-8">
          <p className="text-xs text-muted-foreground">
            当前为静态演示链路；真实环境将按项目设定与人格约束自动串联三个 Agent。
          </p>
          <Button size="lg" variant="outline" className="h-11 max-w-xs" disabled>
            重新运行审稿（即将推出）
          </Button>
        </footer>
      </div>
    </div>
  );
}
