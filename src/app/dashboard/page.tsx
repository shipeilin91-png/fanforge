"use client";

import {
  ArrowRight,
  BookOpenText,
  Database,
  Feather,
  GitBranch,
  MessageSquareText,
  PenLine,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const demoPath = [
  { label: "登录", href: "/" },
  { label: "Canon 证据", href: "/canon" },
  { label: "人格建模", href: "/persona" },
  { label: "创作室", href: "/studio" },
  { label: "情绪切片 / 章节写作", href: "/slice" },
  { label: "多 Agent 审稿", href: "/agents" },
  { label: "反馈看板", href: "/feedback" },
] as const;

const modules: {
  title: string;
  description: string;
  status: string;
  href: string;
  icon: LucideIcon;
  featured?: boolean;
}[] = [
  {
    title: "创作室",
    description:
      "主工作台。把大纲、素材、Canon、角色人格和正文编辑放在同一个创作现场。",
    status: "Studio",
    href: "/studio",
    icon: Feather,
    featured: true,
  },
  {
    title: "Canon 证据",
    description: "原作证据与 RAG 预留，用硬设定约束生成和审稿。",
    status: "Evidence",
    href: "/canon",
    icon: Database,
  },
  {
    title: "角色人格",
    description: "Persona Context，沉淀人格内核、关系阶段和 OOC 边界。",
    status: "Persona",
    href: "/persona",
    icon: GitBranch,
  },
  {
    title: "情绪切片",
    description: "生成高密度短文关系瞬间，适合快速试风格和试张力。",
    status: "Slice",
    href: "/slice",
    icon: PenLine,
  },
  {
    title: "章节写作",
    description: "长文与章节模式，围绕连载节奏、伏笔和上下文一致性展开。",
    status: "Longform",
    href: "/write",
    icon: BookOpenText,
  },
  {
    title: "多 Agent",
    description: "Reviewer / Criticizer 分工检查 OOC、Canon、情绪和风格。",
    status: "Review",
    href: "/agents",
    icon: Users,
  },
  {
    title: "反馈",
    description: "用户反馈闭环，把创作者判断沉淀成可迭代的产品信号。",
    status: "Loop",
    href: "/feedback",
    icon: MessageSquareText,
  },
  {
    title: "模型设置",
    description: "BYOK 与多模型策略预留，区分平台额度和用户自带 Key。",
    status: "BYOK",
    href: "/settings",
    icon: Settings,
  },
];

const differentiators = [
  "普通 AI 写作容易 OOC",
  "新手缺少原作理解",
  "长线设定与伏笔容易遗忘",
  "单一 AI 自写自评不可靠",
  "缺少用户反馈闭环",
] as const;

const mvpBoundaries = [
  "当前是作品集 MVP，重点展示产品思路、信息架构和关键交互链路。",
  "部分能力为 mock / fallback，真实数据库、正式 RAG、正式登录和真实多模型调用是后续迭代。",
  "Writer、Reviewer、Criticizer 的协作逻辑已可演示，但生产级任务编排仍需工程化。",
] as const;

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
      <div className="flex min-h-full items-center justify-center bg-[#f3ead7] text-sm text-[#6f6759]">
        正在检查登录状态……
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-hidden bg-[#f4ecd9] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-5 pb-16 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute left-[-7vw] top-24 hidden text-[18vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CANON
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[520px] hidden text-[15vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] lg:block">
          PERSONA
        </div>
        <div className="pointer-events-none absolute bottom-8 left-[30%] hidden text-[13vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          AGENT
        </div>

        <section className="relative grid min-h-[calc(100vh-76px)] items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-20">
          <div className="max-w-5xl">
            <div className="mb-8 inline-flex items-center gap-3 border border-[#2d281f]/20 bg-[#fffaf0]/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              FAN FICTION · CANON-AWARE AI WRITING
            </div>
            <h1 className="font-serif text-[clamp(5rem,18vw,17rem)] font-semibold leading-[0.78] tracking-[-0.04em] text-[#171410]">
              FanForge
            </h1>
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1fr]">
              <p className="max-w-xl font-serif text-[clamp(2rem,4vw,4.5rem)] leading-[0.95] tracking-[-0.025em] text-[#1e1a14]">
                面向同人创作者的原著一致性 AI 共写平台
              </p>
              <div className="flex max-w-xl flex-col justify-end gap-6">
                <p className="text-base leading-8 text-[#5f5849] sm:text-lg">
                  从 Canon 证据、角色人格到多 Agent
                  审稿，把长文本创作中的一致性问题产品化。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/studio"
                    className="group inline-flex items-center gap-2 bg-[#171410] px-5 py-3 text-sm font-medium text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f] hover:shadow-[0_14px_32px_rgba(54,62,38,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
                  >
                    进入创作室
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="#demo-path"
                    className="inline-flex items-center gap-2 border border-[#171410]/25 bg-[#fff8ea]/55 px-5 py-3 text-sm font-medium text-[#171410] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/60 hover:bg-[#eef0df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
                  >
                    查看演示路径
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="relative border border-[#171410]/20 bg-[#efe2c7]/70 p-6 shadow-[0_20px_60px_rgba(49,39,24,0.08)]">
            <div className="absolute -right-4 -top-4 size-24 bg-[#53613b] opacity-90" />
            <div className="relative flex min-h-[360px] flex-col justify-between border border-[#171410]/15 bg-[#f8f0df] p-6">
              <div>
                <Badge
                  variant="outline"
                  className="border-[#53613b]/40 bg-[#e7ead4] text-[#3f4b2f]"
                >
                  Portfolio MVP
                </Badge>
                <p className="mt-8 font-serif text-4xl leading-none text-[#171410]">
                  Canon stays.
                  <br />
                  Characters stay.
                  <br />
                  Tension moves.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-10">
                {["Canon", "Persona", "Agent"].map((item) => (
                  <div
                    key={item}
                    className="border border-[#171410]/15 bg-[#f4ecd9] px-3 py-3 text-center text-xs font-medium text-[#5f5849]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section
          id="demo-path"
          className="relative scroll-mt-20 border-y border-[#171410]/15 py-12"
        >
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-[#6f6759]">推荐演示路径</p>
              <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410] md:text-6xl">
                From evidence to review
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#6f6759]">
              像编辑流程一样展示 FanForge：先建立证据，再塑造人格，最后进入写作与审稿闭环。
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-7">
            {demoPath.map((step, index) => (
              <Link
                key={step.label}
                href={step.href}
                className="group relative border-t border-[#171410]/25 px-0 pb-5 pt-8 transition-colors hover:border-[#53613b]"
              >
                <span className="absolute -top-2 left-0 size-4 rounded-full border border-[#171410]/30 bg-[#f4ecd9] transition-all duration-200 group-hover:scale-125 group-hover:border-[#53613b] group-hover:bg-[#53613b]" />
                <span className="block font-serif text-2xl leading-none text-[#171410]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-4 block pr-5 text-sm leading-6 text-[#5f5849] transition-colors group-hover:text-[#28331f]">
                  {step.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-[#6f6759]">核心模块入口</p>
              <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] md:text-7xl">
                The writing house
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-[#6f6759]">
              每个入口都对应长文本同人创作中的一个风险点：原作一致性、人格边界、情绪张力、审稿可靠性和反馈闭环。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className={cn(
                    "group flex min-h-64 flex-col justify-between border border-[#171410]/20 bg-[#fbf5e8] p-5 text-[#171410] shadow-[0_8px_28px_rgba(49,39,24,0.045)] transition-all duration-200 hover:-translate-y-1 hover:border-[#53613b]/70 hover:bg-[#fff9ed] hover:shadow-[0_18px_44px_rgba(49,39,24,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]",
                    module.featured && "md:col-span-2 xl:col-span-2 xl:row-span-2",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-10 items-center justify-center border border-[#171410]/15 bg-[#f0e4cc] transition-colors group-hover:border-[#53613b]/45 group-hover:bg-[#e5ead4]">
                      <Icon className="size-4 text-[#53613b]" />
                    </span>
                    <Badge
                      variant="outline"
                      className="border-[#171410]/20 bg-transparent text-[#6f6759]"
                    >
                      {module.status}
                    </Badge>
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "font-serif text-4xl leading-none tracking-[-0.02em]",
                        module.featured && "text-6xl md:text-7xl",
                      )}
                    >
                      {module.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-5 max-w-md text-sm leading-7 text-[#625b4c]",
                        module.featured && "text-base leading-8",
                      )}
                    >
                      {module.description}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#28331f]">
                      打开模块
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 border-t border-[#171410]/15 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <p className="text-sm text-[#6f6759]">差异化模块</p>
            <h2 className="mt-2 max-w-xl font-serif text-5xl leading-[0.95] tracking-[-0.025em] md:text-7xl">
              为什么不是普通 AI 写作工具
            </h2>
          </div>
          <div className="divide-y divide-[#171410]/15 border-y border-[#171410]/15">
            {differentiators.map((item, index) => (
              <div
                key={item}
                className="grid gap-4 py-6 sm:grid-cols-[96px_minmax(0,1fr)]"
              >
                <span className="font-serif text-4xl leading-none text-[#53613b]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xl font-medium text-[#171410]">{item}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6f6759]">
                    FanForge 把这个问题拆进 Canon、Persona、Context Engine、Agent
                    Review 和 Feedback Loop，而不是只给一个空白 prompt 框。
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border border-[#171410]/12 bg-[#ede2cb]/65 p-6 md:p-8">
          <div className="absolute bottom-0 right-0 h-24 w-64 bg-[#53613b]/20" />
          <div className="relative grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center border border-[#171410]/15 bg-[#f8f0df]">
                <ShieldAlert className="size-4 text-[#53613b]" />
              </span>
              <div>
                <p className="text-sm text-[#6f6759]">MVP 边界</p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em]">
                  Work in progress, shown clearly
                </h2>
              </div>
            </div>
            <div className="grid gap-3">
              {mvpBoundaries.map((item, index) => (
                <div
                  key={item}
                  className="grid gap-3 border-b border-[#171410]/12 pb-3 text-sm leading-7 text-[#5f5849] last:border-b-0 last:pb-0 sm:grid-cols-[48px_minmax(0,1fr)]"
                >
                  <span className="font-serif text-2xl leading-none text-[#8a7c62]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-12 md:grid-cols-[1fr_auto] md:items-center">
          <p className="max-w-2xl font-serif text-3xl leading-tight tracking-[-0.02em] text-[#171410] md:text-5xl">
            Start with evidence. Keep the character intact. Let the draft breathe.
          </p>
          <Link
            href="/studio"
            className="inline-flex w-fit items-center gap-2 bg-[#28331f] px-5 py-3 text-sm font-medium text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#171410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
          >
            进入创作室
            <Sparkles className="size-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
