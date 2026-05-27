import { KeyRound, LockKeyhole, Server, ShieldCheck } from "lucide-react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const billingModes = [
  {
    title: "平台额度",
    description: "由 FanForge 统一承担模型调用成本，适合普通用户",
    icon: Server,
  },
  {
    title: "用户自带 Key",
    description:
      "用户填写自己的 OpenAI / Claude / DeepSeek API Key，适合高级创作者",
    icon: KeyRound,
  },
] as const;

const providers = ["OpenAI", "Claude", "DeepSeek"] as const;

const models = ["GPT-5.5", "GPT-4.1 mini", "Claude Sonnet", "DeepSeek Chat"];

const securityTips = [
  "生产环境不应把用户 Key 存在前端",
  "应使用服务端加密存储或由用户本地会话临时保存",
  "MVP 阶段仅展示 BYOK 产品逻辑",
];

export default function SettingsPage() {
  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Model Settings
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              模型设置
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              选择模型供应商、计费方式和 API Key 管理策略。
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-3 border-b border-border/60 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">当前登录状态</CardTitle>
                  <CardDescription className="text-xs">
                    MVP 演示身份
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Demo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="rounded-lg border border-border/60 bg-muted/15 px-4 py-4">
                <p className="text-sm font-medium text-foreground">
                  演示用户
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  未接真实登录系统
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">计费方式</CardTitle>
              <CardDescription className="text-xs">
                后续可按用户层级切换额度策略
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
              {billingModes.map((mode) => {
                const Icon = mode.icon;

                return (
                  <div
                    key={mode.title}
                    className="rounded-lg border border-border/60 bg-muted/15 px-4 py-4"
                  >
                    <Icon
                      className="mb-3 size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-foreground">
                      {mode.title}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">模型供应商</CardTitle>
              <CardDescription className="text-xs">
                预留多供应商路由
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-5">
              {providers.map((provider) => (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-muted/15 px-3 py-2"
                >
                  <span className="text-sm text-foreground">{provider}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    可选
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">模型选择</CardTitle>
              <CardDescription className="text-xs">
                不同任务可绑定不同模型
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-5">
              {models.map((model) => (
                <div
                  key={model}
                  className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-sm text-foreground/90"
                >
                  {model}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">API Key</CardTitle>
              <CardDescription className="text-xs">
                仅展示输入体验，不会保存
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-5">
              <Input
                type="password"
                placeholder="sk-... / claude-... / deepseek-..."
                aria-label="API Key"
                className="bg-background/50"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                当前输入框只用于展示 BYOK 产品逻辑，不写入环境变量，也不会提交到服务端保存。
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="gap-2 border-b border-border/60 pb-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">安全提示</CardTitle>
            </div>
            <CardDescription className="text-xs">
              BYOK 设计必须优先处理密钥存储边界
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-3">
            {securityTips.map((tip) => (
              <div
                key={tip}
                className="flex gap-3 rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-3"
              >
                <LockKeyhole
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tip}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
