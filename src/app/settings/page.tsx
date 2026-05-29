"use client";

import { KeyRound, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const billingModes = [
  {
    title: "平台额度",
    description: "由 FanForge 统一承担模型调用成本，适合普通用户。",
    detail: "低门槛、少配置，适合先体验 Studio、Slice、Reviewer 等核心创作链路。",
    icon: Server,
  },
  {
    title: "用户自带 Key",
    description: "用户填写自己的 OpenAI / Claude / DeepSeek API Key，适合高级创作者。",
    detail: "更适合高频长文、指定模型和自控成本的创作者工作流。",
    icon: KeyRound,
  },
] as const;

const providers = ["OpenAI", "Claude", "DeepSeek"] as const;

const models = ["GPT-5.5", "GPT-4.1 mini", "Claude Sonnet", "DeepSeek Chat"] as const;

const securityTips = [
  "API Key 输入框只展示 BYOK 产品逻辑，不会真正保存用户 Key。",
  "生产环境需要服务端加密存储，或在受控场景中使用临时会话存储。",
  "不要把用户 Key 写入前端代码、环境变量提交记录或浏览器持久化明文。",
] as const;

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

export default function SettingsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [billingMode, setBillingMode] =
    useState<(typeof billingModes)[number]["title"]>("平台额度");
  const [provider, setProvider] = useState<(typeof providers)[number]>("OpenAI");
  const [model, setModel] = useState<(typeof models)[number]>("GPT-5.5");
  const [apiKey, setApiKey] = useState("");

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
    <div className="min-h-full overflow-hidden bg-[#f6efdf] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[15vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          MODEL
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[470px] hidden text-[13vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          BYOK
        </div>
        <div className="pointer-events-none absolute bottom-8 left-[30%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          COST
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              MODEL SETTINGS · BYOK STRATEGY
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Model Settings
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                选择模型供应商、计费方式和 API Key 管理策略，平衡创作体验、模型成本和用户门槛。
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
            <div className="mb-5 border-b border-[#b9aa83]/45 pb-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                Account State
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                当前登录状态
              </h2>
            </div>
            <div className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-4 py-4">
              <p className="text-sm font-semibold text-[#171410]">创作者账户</p>
              <p className="mt-1 text-xs text-[#6f6759]">
                已进入创作工作区。
              </p>
            </div>
          </section>

          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.06)]">
            <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
              <div className="border-b border-[#b9aa83]/45 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Billing Mode
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  计费方式
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                  平台额度适合普通用户，用户自带 Key 适合高级创作者。
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                {billingModes.map((mode) => {
                  const Icon = mode.icon;
                  const selected = billingMode === mode.title;

                  return (
                    <button
                      key={mode.title}
                      type="button"
                      onClick={() => setBillingMode(mode.title)}
                      className={cn(
                        "group rounded-xl border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]",
                        selected
                          ? "border-[#53613b]/60 bg-[#e7ead4]"
                          : "border-[#8a7c62]/24 bg-[#fffdf7]",
                      )}
                    >
                      <Icon className="mb-4 size-5 text-[#53613b]" aria-hidden />
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                          {mode.title}
                        </p>
                        {selected ? (
                          <Badge
                            variant="outline"
                            className="rounded-xl border-[#53613b]/35 bg-[#fffaf0] text-[10px] text-[#3f4b2f]"
                          >
                            当前
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5f5849]">
                        {mode.description}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-[#6f6759]">
                        {mode.detail}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SettingsManual
            title="模型供应商"
            label="Provider Route"
            description="预留多供应商路由。"
          >
            <div className="flex flex-col gap-2">
              {providers.map((item) => (
                <OptionButton
                  key={item}
                  selected={provider === item}
                  onClick={() => setProvider(item)}
                  label={item}
                />
              ))}
            </div>
          </SettingsManual>

          <SettingsManual
            title="模型选择"
            label="Model Policy"
            description="不同任务后续可绑定不同模型。"
          >
            <div className="flex flex-col gap-2">
              {models.map((item) => (
                <OptionButton
                  key={item}
                  selected={model === item}
                  onClick={() => setModel(item)}
                  label={item}
                />
              ))}
            </div>
          </SettingsManual>

          <SettingsManual
            title="API Key"
            label="BYOK Input"
            description="仅展示输入体验，不保存、不提交、不写入环境变量。"
          >
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-... / claude-... / deepseek-..."
              aria-label="API Key"
              className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17] placeholder:text-[#9a8f78]"
            />
            <p className="mt-3 text-xs leading-relaxed text-[#6f6759]">
              输入仅用于当前页面展示，不写入环境变量，也不会提交保存。
            </p>
            {apiKey ? (
              <p className="mt-2 text-xs text-[#3f4b2f]">
                已输入 {apiKey.length} 个字符，仅保存在当前组件状态中。
              </p>
            ) : null}
          </SettingsManual>
        </section>

        <section className="grid gap-6">
          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
            <div className="mb-5 flex items-center gap-3 border-b border-[#b9aa83]/45 pb-5">
              <ShieldCheck className="size-4 text-[#53613b]" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Product Risk Note
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  安全提示
                </h2>
                <p className="mt-2 text-xs text-[#6f6759]">
                  BYOK 设计必须优先处理密钥存储边界。
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {securityTips.map((tip, index) => (
                <div
                  key={tip}
                  className="rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <LockKeyhole
                      className="mt-0.5 size-4 shrink-0 text-[#53613b]"
                      aria-hidden
                    />
                    <div>
                      <span className="font-serif text-2xl leading-none text-[#53613b]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-2 text-xs leading-relaxed text-[#5f5849]">
                        {tip}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </section>
      </main>
    </div>
  );
}

function SettingsManual({
  title,
  label,
  description,
  children,
}: {
  title: string;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
      <div className="mb-5 border-b border-[#b9aa83]/45 pb-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
          {label}
        </p>
        <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
          {title}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]",
        selected
          ? "border-[#53613b]/60 bg-[#e7ead4] text-[#171410]"
          : "border-[#8a7c62]/24 bg-[#fffdf7] text-[#332d24]",
      )}
    >
      <span>{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "rounded-xl border-[#8a7c62]/24 bg-transparent text-[10px] text-[#6f6759]",
          selected && "border-[#53613b]/35 text-[#3f4b2f]",
        )}
      >
        {selected ? "当前" : "可选"}
      </Badge>
    </button>
  );
}
