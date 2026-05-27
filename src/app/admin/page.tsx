"use client";

import { BarChart3, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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

const ADMIN_AUTH_STORAGE_KEY = "fanforge-admin-auth";
const ADMIN_PASSWORD = "fanforge-admin";

const operationMetrics = [
  { label: "本周生成次数", value: "486" },
  { label: "反馈提交率", value: "38%" },
  { label: "满意率", value: "72%" },
  { label: "重新生成率", value: "29%" },
  { label: "复制率", value: "41%" },
  { label: "多 Agent 审稿使用率", value: "34%" },
] as const;

const feedbackDistribution = [
  { label: "OOC", value: "24%" },
  { label: "Canon 冲突", value: "18%" },
  { label: "情绪不足", value: "27%" },
  { label: "风格不匹配", value: "15%" },
  { label: "关系推进过快", value: "16%" },
] as const;

const funnelSteps = [
  { label: "登录", value: "100%" },
  { label: "Canon 文档", value: "68%" },
  { label: "人格图", value: "54%" },
  { label: "生成内容", value: "47%" },
  { label: "多 Agent 审稿", value: "31%" },
  { label: "提交反馈", value: "18%" },
  { label: "复制/保存", value: "13%" },
] as const;

const optimizationRules = [
  "OOC 高 → 优化 Persona Context Engine",
  "Canon 冲突高 → 优化 Canon Evidence / RAG",
  "情绪不足高 → 优化 Writer Prompt",
  "风格不匹配高 → 优化 Style Card",
] as const;

function parsePercent(value: string) {
  return Number(value.replace("%", "")) || 0;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    setIsAuthed(window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true");
    setIsCheckingAuth(false);
  }, []);

  const maxFeedbackValue = useMemo(
    () =>
      Math.max(
        ...feedbackDistribution.map((item) => parsePercent(item.value)),
        1,
      ),
    [],
  );

  function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.trim() !== ADMIN_PASSWORD) {
      setError("管理员口令错误。");
      return;
    }

    window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
    setError(null);
    setIsAuthed(true);
  }

  function handleLogout() {
    window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    setPassword("");
    setError(null);
    setIsAuthed(false);
  }

  if (isCheckingAuth) {
    return (
      <div className="dark flex min-h-full items-center justify-center bg-background text-sm text-muted-foreground">
        正在检查管理员权限……
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <main className="dark flex min-h-full items-center justify-center bg-background px-6 py-12 text-foreground">
        <div className="flex w-full max-w-md flex-col gap-6">
          <header className="flex flex-col gap-2 text-center">
            <span className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Admin · Private Analytics
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              FanForge Admin Analytics
            </h1>
          </header>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <LockKeyhole className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">管理员登录</CardTitle>
              </div>
              <CardDescription className="text-xs">
                MVP 阶段使用本地口令进入后台。
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form className="flex flex-col gap-4" onSubmit={handleAdminLogin}>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="管理员口令"
                  className="bg-background/40"
                />
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button type="submit" className="h-10 w-full">
                  进入后台
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="dark min-h-full bg-background text-foreground">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
                Admin · Analytics
              </span>
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                  FanForge Admin Analytics
                </h1>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                  管理员专用后台，用于观察生成链路、反馈分布和后续优化优先级。
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-9 w-fit"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 size-4" />
              退出后台
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operationMetrics.map((metric) => (
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

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">问题反馈分布</CardTitle>
              <CardDescription className="text-xs">
                用于判断主要质量问题集中在哪里
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-5">
              {feedbackDistribution.map((item) => {
                const value = parsePercent(item.value);
                const width = `${Math.round((value / maxFeedbackValue) * 100)}%`;

                return (
                  <div key={item.label} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground/90">
                        {item.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.value}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                      <div
                        className="h-full rounded-full bg-foreground/35"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">生成链路漏斗</CardTitle>
              <CardDescription className="text-xs">
                登录 → Canon 文档 → 人格图 → 生成内容 → 多 Agent 审稿 → 提交反馈 → 复制/保存
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-5">
              {funnelSteps.map((step, index) => (
                <div
                  key={step.label}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border/50 bg-muted/15 px-3 py-2"
                >
                  <span className="font-mono text-xs text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-foreground/90">
                    {step.label}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {step.value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.8fr]">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">问题归因与优化建议</CardTitle>
              </div>
              <CardDescription className="text-xs">
                根据反馈类型映射到可优化的产品模块
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
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

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <CardTitle className="text-base">数据来源说明</CardTitle>
              <CardDescription className="text-xs">
                当前页面为管理员端能力演示
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                当前 MVP 使用 localStorage / mock 数据模拟；正式上线后应接入数据库、用户系统、埋点和管理员权限。
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
