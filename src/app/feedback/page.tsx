import { ArrowRight, BarChart3, ClipboardList, GitBranch } from "lucide-react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const metrics = [
  { label: "总生成次数", value: "128" },
  { label: "满意率", value: "72%" },
  { label: "OOC 反馈率", value: "18%" },
  { label: "情绪不足反馈率", value: "24%" },
  { label: "风格不匹配率", value: "15%" },
  { label: "Canon 冲突率", value: "11%" },
] as const;

const recentFeedback = [
  {
    tag: "OOC",
    text: "角色突然主动告白，和前面冷处理的关系阶段不一致。",
    issue: "人格边界偏移",
    module: "Persona Context Engine",
  },
  {
    tag: "情绪不够",
    text: "场景有了，但两个人之间的拉扯感还不够强。",
    issue: "情绪张力不足",
    module: "情绪切片 Prompt",
  },
  {
    tag: "风格不对",
    text: "想要疏离克制，但输出有点甜宠口吻。",
    issue: "文学气质偏移",
    module: "文学气质风格卡",
  },
  {
    tag: "Canon 冲突",
    text: "这里提到的家族设定和原作时间线对不上。",
    issue: "原作检索缺失",
    module: "原作理解包与检索",
  },
  {
    tag: "想要更克制",
    text: "结尾解释太直白，最好落在动作或物象上。",
    issue: "表达收束过满",
    module: "Writer / Criticizer Agent",
  },
] as const;

const optimizationRules = [
  "如果 OOC 反馈高：优化 Persona Context Engine",
  "如果情绪不足高：优化情绪切片 Prompt",
  "如果 Canon 冲突高：增强原作理解包与检索",
  "如果风格不匹配高：细化文学气质风格卡",
] as const;

const loopSteps = [
  "生成内容",
  "用户反馈",
  "问题归因",
  "Prompt / Agent / Context 优化",
  "再次生成验证",
] as const;

export default function FeedbackPage() {
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
          <Badge variant="outline" className="w-fit text-xs">
            当前页面为 MVP Demo 数据，后续可接入真实登录、数据库和埋点系统。
          </Badge>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/80 bg-card/80">
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
                标签与文字反馈共同用于问题归因
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-5">
              {recentFeedback.map((item, index) => (
                <div
                  key={`${item.tag}-${index}`}
                  className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.tag}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.issue}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {item.text}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    建议优化模块：{item.module}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">下一步优化判断</CardTitle>
              <CardDescription className="text-xs">
                将反馈标签映射到产品模块
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-5">
              {optimizationRules.map((rule) => (
                <div
                  key={rule}
                  className="rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-3 text-xs leading-relaxed text-muted-foreground"
                >
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

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
