"use client";

import { KeyRound, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const usageModes = [
  {
    title: "FanForge Free Model",
    provider: "fanforge_free",
    model: "fanforge-free",
    description: "免费体验模型，无需 API Key。",
    detail: "适合新用户试用情绪切片、章节草稿和多 Agent 审稿，实时额度见免费模型卡片。",
    icon: Server,
  },
  {
    title: "高级模型 BYOK",
    provider: "byok",
    model: "byok",
    description: "OpenAI / Gemini / Claude / DeepSeek 需要用户自带 API Key。",
    detail: "适合高频长文、指定模型和自控成本的创作者工作流。",
    icon: KeyRound,
  },
] as const;

const modelProviders = [
  {
    label: "FanForge Free Model",
    provider: "fanforge_free",
    models: [{ label: "FanForge Free Model", value: "fanforge-free" }],
    meta: "无需 Key",
  },
  {
    label: "OpenAI GPT",
    provider: "openai",
    models: [
      { label: "GPT-5.5", value: "gpt-5.5" },
      { label: "GPT-4.1 mini", value: "gpt-4.1-mini" },
    ],
    meta: "需要 API Key",
  },
  {
    label: "Google Gemini",
    provider: "gemini",
    models: [
      { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
      { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    ],
    meta: "需要 API Key",
  },
  {
    label: "Claude",
    provider: "claude",
    models: [{ label: "Claude Sonnet", value: "claude-sonnet" }],
    meta: "需要 API Key",
  },
  {
    label: "DeepSeek",
    provider: "deepseek",
    models: [{ label: "DeepSeek Chat", value: "deepseek-chat" }],
    meta: "需要 API Key",
  },
] as const;

type Provider = (typeof modelProviders)[number]["provider"];

const securityTips = [
  "免费模型无需配置 API Key。",
  "高级模型使用用户自带 API Key。",
  "不要把用户 Key 写入环境变量或 localStorage。",
] as const;

type UsageSummary = {
  loggedIn: boolean;
  limit: number;
  sliceUsed: number;
  chapterUsed: number;
  totalUsed: number;
  remaining: number;
};

export default function SettingsPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("fanforge_free");
  const [model, setModel] = useState("fanforge-free");
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState("");
  const [savedProvider, setSavedProvider] = useState<Provider | null>(null);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);

  async function refreshUsage(accessToken?: string | null) {
    setIsUsageLoading(true);
    setUsageError(null);

    try {
      const headers: Record<string, string> = {};

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/usage", { headers });
      const payload = (await response.json().catch(() => null)) as
        | (UsageSummary & { error?: string })
        | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error || "无法读取今日免费额度");
      }

      setUsageSummary(payload);
    } catch (error) {
      setUsageError(
        error instanceof Error ? error.message : "无法读取今日免费额度",
      );
    } finally {
      setIsUsageLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError) {
        setErrorMessage(sessionError.message);
        setIsCheckingAuth(false);
        return;
      }

      const user = sessionData.session?.user;

      if (!user) {
        setUserId(null);
        setUserEmail(null);
        setIsCheckingAuth(false);
        void refreshUsage(null);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);
      void refreshUsage(sessionData.session?.access_token ?? null);

      const { data, error } = await supabase
        .from("user_model_settings")
        .select("provider, model, api_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error.message);
        setIsCheckingAuth(false);
        return;
      }

      if (data?.provider && isKnownProvider(data.provider)) {
        setProvider(data.provider);
        setModel(data.model || getDefaultModel(data.provider));
        setSavedProvider(data.provider);
        setSavedApiKey(data.provider === "fanforge_free" ? "" : data.api_key ?? "");
        setHasSavedApiKey(data.provider !== "fanforge_free" && Boolean(data.api_key));
      }

      setIsCheckingAuth(false);
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProvider = modelProviders.find((item) => item.provider === provider) ?? modelProviders[0];
  const requiresProviderKey = provider !== "fanforge_free";

  function handleSelectProvider(nextProvider: Provider) {
    setProvider(nextProvider);
    setModel(getDefaultModel(nextProvider));
    setStatusMessage(null);
    setErrorMessage(null);
    setApiKey("");

    if (nextProvider === "fanforge_free" || nextProvider !== savedProvider) {
      setSavedApiKey("");
      setHasSavedApiKey(false);
    }
  }

  async function handleSaveSettings() {
    setStatusMessage(null);
    setErrorMessage(null);

    if (!userId) {
      setErrorMessage("请先登录后配置模型");
      return;
    }

    const nextApiKey = requiresProviderKey ? apiKey.trim() || savedApiKey : "";

    if (requiresProviderKey && !nextApiKey) {
      setErrorMessage("请输入 API Key");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("user_model_settings").upsert(
      {
        user_id: userId,
        provider,
        model: provider === "fanforge_free" ? "fanforge-free" : model,
        api_key: provider === "fanforge_free" ? null : nextApiKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSavedApiKey(nextApiKey);
    setSavedProvider(provider);
    setHasSavedApiKey(Boolean(nextApiKey));
    setApiKey("");
    setStatusMessage("模型设置已保存");

    const { data: sessionData } = await supabase.auth.getSession();
    await refreshUsage(sessionData.session?.access_token ?? null);
  }

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
                {userEmail ?? "请先登录后配置模型"}
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
                  免费模型适合新用户体验；高级模型需要用户自带 API Key。
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                {usageModes.map((mode) => {
                  const Icon = mode.icon;
                  const selected =
                    mode.provider === "fanforge_free"
                      ? provider === "fanforge_free"
                      : provider !== "fanforge_free";

                  return (
                    <button
                      key={mode.title}
                      type="button"
                      onClick={() =>
                        handleSelectProvider(
                          mode.provider === "fanforge_free"
                            ? "fanforge_free"
                            : "openai",
                        )
                      }
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

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1fr]">
          <SettingsManual
            title="免费模型"
            label="Free Model"
            description="默认第一位，无需 API Key。"
          >
            <div className="flex flex-col gap-2">
              <OptionButton
                selected={provider === "fanforge_free"}
                onClick={() => handleSelectProvider("fanforge_free")}
                label="FanForge Free Model"
                meta="实时额度"
              />
              <p className="rounded-xl border border-[#53613b]/30 bg-[#e7ead4] px-3 py-3 text-xs leading-relaxed text-[#3f4b2f]">
                免费体验模型，适合新用户试用情绪切片、章节草稿和多 Agent 审稿。
              </p>
              <UsageQuotaCard
                usage={usageSummary}
                error={usageError}
                isLoading={isUsageLoading}
              />
            </div>
          </SettingsManual>

          <SettingsManual
            title="高级模型 BYOK"
            label="Advanced Models"
            description="使用自己的 API Key。"
          >
            <div className="flex flex-col gap-2">
              {modelProviders.slice(1).map((item) => (
                <OptionButton
                  key={item.provider}
                  selected={provider === item.provider}
                  onClick={() => handleSelectProvider(item.provider)}
                  label={item.label}
                  meta={item.meta}
                />
              ))}
            </div>
          </SettingsManual>

          <SettingsManual
            title="模型选择"
            label="Model Policy"
            description={
              provider === "fanforge_free"
                ? "当前使用免费模型。"
                : `${selectedProvider.label} 模型列表。`
            }
          >
            <div className="flex flex-col gap-2">
              {selectedProvider.models.map((item) => (
                <OptionButton
                  key={item.value}
                  selected={model === item.value}
                  onClick={() => setModel(item.value)}
                  label={item.label}
                  meta={provider === "fanforge_free" ? "无需 Key" : selectedProvider.label}
                />
              ))}
            </div>
          </SettingsManual>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SettingsManual
            title="API Key"
            label="BYOK Input"
            description={
              requiresProviderKey
                ? "高级模型需要填写对应供应商的 API Key。"
                : "当前使用免费模型，无需配置 API Key。"
            }
          >
            {requiresProviderKey ? (
              <>
                {hasSavedApiKey ? (
                  <p className="mb-3 rounded-xl border border-[#53613b]/30 bg-[#e7ead4] px-3 py-3 text-xs leading-relaxed text-[#3f4b2f]">
                    已配置 API Key。输入新 Key 后保存可覆盖当前配置。
                  </p>
                ) : null}
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-... / gemini-... / claude-... / deepseek-..."
                  aria-label="API Key"
                  className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17] placeholder:text-[#9a8f78]"
                />
                <p className="mt-3 text-xs leading-relaxed text-[#6f6759]">
                  当前选择 {selectedProvider.label}，请输入自己的 API Key。不会写入 localStorage。
                </p>
                {apiKey ? (
                  <p className="mt-2 text-xs text-[#3f4b2f]">
                    已输入 {apiKey.length} 个字符。
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="rounded-xl border border-[#53613b]/30 bg-[#e7ead4] px-3 py-3 text-xs leading-relaxed text-[#3f4b2f]">
                  当前使用免费模型，无需配置 API Key。
                </p>
                <UsageQuotaCard
                  usage={usageSummary}
                  error={usageError}
                  isLoading={isUsageLoading}
                />
              </div>
            )}
            <Button
              type="button"
              className="mt-4 h-10 w-full rounded-xl bg-[#171410] text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f] disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSaveSettings}
            >
              {isSaving ? "保存中..." : "保存模型设置"}
            </Button>
            {statusMessage ? (
              <p className="mt-3 rounded-xl border border-[#53613b]/30 bg-[#e7ead4] px-3 py-2 text-xs text-[#3f4b2f]">
                {statusMessage}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-3 rounded-xl border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-2 text-xs text-[#7f3326]">
                {errorMessage}
              </p>
            ) : null}
          </SettingsManual>

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

function getDefaultModel(provider: Provider) {
  return (
    modelProviders.find((item) => item.provider === provider)?.models[0]?.value ??
    "fanforge-free"
  );
}

function isKnownProvider(value: string): value is Provider {
  return modelProviders.some((item) => item.provider === value);
}

function UsageQuotaCard({
  usage,
  error,
  isLoading,
}: {
  usage: UsageSummary | null;
  error: string | null;
  isLoading: boolean;
}) {
  if (isLoading && !usage) {
    return (
      <div className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#6f6759]">
        正在读取今日免费额度……
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-3 text-xs leading-relaxed text-[#7f3326]">
        {error}
      </div>
    );
  }

  if (!usage?.loggedIn) {
    return (
      <div className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#6f6759]">
        登录后可查看今日免费额度。
      </div>
    );
  }

  const isEmpty = usage.remaining === 0;
  const isLow = usage.remaining > 0 && usage.remaining <= 2;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 text-xs leading-relaxed",
        isEmpty
          ? "border-[#8a3f30]/25 bg-[#f3d8cc] text-[#7f3326]"
          : isLow
            ? "border-[#9a7f45]/35 bg-[#efe2c7] text-[#6f5f3f]"
            : "border-[#53613b]/30 bg-[#e7ead4] text-[#3f4b2f]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          今日免费额度：剩余 {usage.remaining} / {usage.limit}
        </span>
        <span className="text-[10px] opacity-80">已用 {usage.totalUsed}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] opacity-90">
        <span>情绪切片已用：{usage.sliceUsed}</span>
        <span>章节写作已用：{usage.chapterUsed}</span>
      </div>
      {isLow ? (
        <p className="mt-2">免费额度即将用完，可切换高级模型 BYOK。</p>
      ) : null}
      {isEmpty ? (
        <p className="mt-2">今日免费额度已用完，请切换高级模型或明天再试。</p>
      ) : null}
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
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  meta?: string;
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
      <div className="flex shrink-0 items-center gap-2">
        {meta ? <span className="text-[10px] text-[#8a7c62]">{meta}</span> : null}
        <Badge
          variant="outline"
          className={cn(
            "rounded-xl border-[#8a7c62]/24 bg-transparent text-[10px] text-[#6f6759]",
            selected && "border-[#53613b]/35 text-[#3f4b2f]",
          )}
        >
          {selected ? "当前" : "可选"}
        </Badge>
      </div>
    </button>
  );
}
