"use client";

import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  ChevronRight,
  Database,
  FolderKanban,
  GitBranch,
  PenLine,
  Settings,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const demoPath = [
  "登录",
  "原作理解",
  "Canon 证据",
  "人格建模",
  "情绪切片",
  "多 Agent 审稿",
  "反馈看板",
] as const;

const modules: {
  title: string;
  description: string;
  status: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    title: "原作理解包",
    description: "帮助新手快速补齐世界观、主线时间线和 Canon 硬设定。",
    status: "MVP Demo",
    href: "/origin",
    icon: BookOpen,
  },
  {
    title: "创作室",
    description: "统一管理大纲、素材、文档和正文写作，是 FanForge 的主创作工作台。",
    status: "Studio / Context Engine / MVP Demo",
    href: "/studio",
    icon: FolderKanban,
  },
  {
    title: "Canon 证据引擎",
    description: "从原作文档中抽取硬设定和风格证据，为生成与审稿提供约束。",
    status: "RAG 预留",
    href: "/canon",
    icon: Database,
  },
  {
    title: "角色人格思维导图",
    description: "把角色人格、人生阶段、关系模式和 OOC 边界结构化沉淀。",
    status: "可交互",
    href: "/persona",
    icon: GitBranch,
  },
  {
    title: "关系情绪切片生成器",
    description: "用关系阶段、情绪张力和风格卡生成可反馈的高张力片段。",
    status: "真实模型 / Demo 回退",
    href: "/slice",
    icon: PenLine,
  },
  {
    title: "章节写作",
    description: "用于长文、章节续写和连载规划，区别于情绪切片的短片段生成。",
    status: "Context Engine / 长文模式 / MVP Demo",
    href: "/write",
    icon: BookOpenText,
  },
  {
    title: "多 Agent 审稿台",
    description: "Writer、Reviewer、Criticizer 分工完成生成、审稿与修订。",
    status: "Mock API",
    href: "/agents",
    icon: Users,
  },
  {
    title: "反馈数据看板",
    description: "读取本地反馈记录，动态判断 OOC、情绪、风格和 Canon 问题。",
    status: "反馈闭环",
    href: "/feedback",
    icon: ShieldAlert,
  },
  {
    title: "模型设置",
    description: "展示平台额度、用户自带 Key 和多模型供应商的产品策略。",
    status: "BYOK 预留",
    href: "/settings",
    icon: Settings,
  },
];

const differentiators = [
  "普通 AI 写作容易 OOC",
  "新手缺少原作理解",
  "长线设定容易遗忘",
  "单一 AI 自写自评不可靠",
  "缺少用户反馈闭环",
] as const;

const mvpBoundaries = [
  "当前是作品集 MVP，用于展示产品思路、信息架构和关键交互链路。",
  "部分 AI 能力使用 mock API，重点呈现 Writer / Reviewer / Criticizer 的协作逻辑。",
  "真实模型、数据库、向量检索、正式登录属于后续迭代。",
  "后台数据分析属于管理员端能力，不展示在普通用户工作台中。",
] as const;

const moduleCardClassName =
  "group h-full cursor-pointer border-border/80 bg-card/80 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card hover:shadow-md hover:ring-1 hover:ring-foreground/10";

export default function DashboardPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

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
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-10 px-10 py-14 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Dashboard · Portfolio Demo
          </span>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              FanForge 创作工作台
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              从原作理解、Canon 证据、角色人格，到情绪切片与多 Agent
              审稿的一站式同人 AI 共写流程。
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium tracking-wide text-foreground">
              推荐演示路径
            </h2>
            <p className="text-xs text-muted-foreground">
              面试或作品集讲解时，可以按这条路径展示完整产品闭环。
            </p>
          </div>
          <Card className="border-border/80 bg-card/70 py-5">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-3 px-6">
              {demoPath.map((step, index) => (
                <div key={step} className="flex items-center gap-1">
                  <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="whitespace-nowrap">{step}</span>
                  </div>
                  {index < demoPath.length - 1 && (
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

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium tracking-wide text-foreground">
              核心模块入口
            </h2>
            <p className="text-xs text-muted-foreground">
              每个模块对应一个同人创作中的具体风险点或效率瓶颈。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className={moduleCardClassName}>
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
                            {module.status}
                          </Badge>
                          <ChevronRight className="size-4 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </div>
                      </div>
                      <CardTitle className="text-lg font-medium tracking-tight">
                        {module.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
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
                    为什么 FanForge 不是普通 AI 写作工具
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    FanForge 把同人创作拆成可检索、可约束、可审稿、可反馈的产品链路。
                  </CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {differentiators.map((item, index) => (
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
                  <Settings className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-medium">
                    当前 MVP 边界
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    这里明确区分已实现 Demo、mock 能力和后续工程化迭代范围。
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {mvpBoundaries.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-sm leading-relaxed text-foreground/90"
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
      </main>
    </div>
  );
}
