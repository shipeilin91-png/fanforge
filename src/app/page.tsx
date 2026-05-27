import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  GitBranch,
  Layers,
  PenLine,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features: {
  title: string;
  description: string;
  label: string;
  icon: LucideIcon;
  href?: string;
}[] = [
  {
    title: "原作理解包",
    description:
      "帮助新手快速理解原作世界观、主线故事和 Canon 硬设定，让每一次续写都站在可靠的语境之上。",
    label: "Canon",
    icon: BookOpen,
    href: "/origin",
  },
  {
    title: "角色人格思维导图",
    description:
      "把角色拆成核心人格内核、人生阶段、关键事件与伏笔暗线，形成可检索、可引用的写作参照。",
    label: "Character",
    icon: GitBranch,
    href: "/persona",
  },
  {
    title: "关系情绪切片生成器",
    description:
      "根据关系瞬间、情绪张力、文学气质和禁止项，生成高张力片段，供你挑选、拼接与润色。",
    label: "Scene",
    icon: PenLine,
    href: "/slice",
  },
  {
    title: "多 Agent 审稿台",
    description:
      "Writer、Reviewer、Criticizer 分工完成生成、审稿与修订，让同人创作兼顾灵感与一致性。",
    label: "Review",
    icon: Users,
    href: "/agents",
  },
];

const demoSteps = [
  "原作理解",
  "角色人格建模",
  "情绪切片生成",
  "多 Agent 审稿",
  "模型设置",
] as const;

const painPoints = [
  "普通 AI 写作容易 OOC",
  "长线设定容易遗忘",
  "新手缺少原作理解",
  "单一 AI 自写自评不可靠",
] as const;

const solutions = [
  "Canon 基础库",
  "人格时间树",
  "情绪切片参数化生成",
  "Writer / Reviewer / Criticizer 多 Agent 协作",
] as const;

const featureCardClassName =
  "group cursor-pointer border-border/80 bg-card/80 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card hover:shadow-md hover:ring-1 hover:ring-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function Home() {
  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-12 px-10 py-14 lg:gap-16 lg:px-14 lg:py-20">
        <header className="flex flex-col gap-5 border-b border-border/60 pb-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Fan Fiction · AI Co-writing
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
              FanForge
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              面向同人创作者的原著一致性 AI 共写平台
            </p>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground/90">
            从理解原作到塑造角色、生成情绪切片，再到多 Agent
            审稿——在同一工作流里完成设定沉淀与正文打磨。
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button size="lg" className="h-11 px-6">
              开始创建项目
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6">
              查看 Demo 流程
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            const card = (
              <Card
                className={featureCardClassName}
                {...(!feature.href && { tabIndex: 0, role: "button" })}
              >
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/40 transition-colors group-hover:border-foreground/20 group-hover:bg-muted/60">
                      <Icon className="size-4.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {feature.label}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-medium tracking-tight transition-colors group-hover:text-foreground">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );

            if (feature.href) {
              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {card}
                </Link>
              );
            }

            return <div key={feature.title}>{card}</div>;
          })}
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium tracking-wide text-foreground">
              工作流总览
            </h2>
            <p className="text-sm text-muted-foreground">
              从理解原作到模型策略的完整产品闭环
            </p>
          </div>
          <Card className="border-border/80 bg-card/60 py-5">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-3 px-6">
              {demoSteps.map((step, index) => (
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
                  {index < demoSteps.length - 1 && (
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

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-border/80 bg-card/70">
            <CardHeader className="gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/30">
                  <ShieldAlert className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-medium">
                    为什么不是普通 AI 写作工具
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    同人创作的难点不只是写得像，而是长期保持设定、人格和关系推进一致。
                  </CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {painPoints.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span className="mr-2 font-mono text-xs text-muted-foreground/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card/70">
            <CardHeader className="gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/30">
                  <Layers className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-medium">
                    FanForge 的解决方式
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    把灵感生成拆成可审稿、可约束、可复用的产品工作流，而不是一次性续写。
                  </CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {solutions.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-sm text-foreground/90"
                  >
                    <span className="mr-2 font-mono text-xs text-muted-foreground/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>
        </section>
      </div>
    </div>
  );
}
