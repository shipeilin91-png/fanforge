"use client";

import {
  AlertTriangle,
  BarChart3,
  Database,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const ADMIN_UNLOCK_STORAGE_KEY = "fanforge-admin-unlocked";

type UserProfile = {
  id: string;
  email: string | null;
  role: string | null;
};

type FeedbackRecord = {
  id: string;
  user_id: string;
  feature: string;
  rating: string;
  issue_tags: string[];
  comment: string;
  generated_text: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type UsageRecord = {
  id: string;
  user_id: string;
  usage_date: string;
  feature: string;
  provider: string;
  count: number;
  updated_at: string | null;
};

type ModelSetting = {
  user_id: string;
  provider: string;
  model: string;
  updated_at: string | null;
};

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === "string");
}

function shortDate(value: string | null) {
  if (!value) return "未知时间";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function countFeedbackSignal(
  records: FeedbackRecord[],
  matcher: (text: string) => boolean,
) {
  return records.filter((record) =>
    matcher([...record.issue_tags, record.comment].join(" ")),
  ).length;
}

function userLabel(userId: string, profilesById: Map<string, UserProfile>) {
  return profilesById.get(userId)?.email || userId;
}

function buildOptimizationAdvice(stats: AdminStats) {
  const candidates = [
    {
      count: stats.oocCount,
      text: "强化 Persona 和角色声线约束，降低 OOC 与对话不像角色的问题。",
    },
    {
      count: stats.canonConflictCount,
      text: "提高 Canon 文档优先级，生成前增加硬设定冲突提醒。",
    },
    {
      count: stats.weakEmotionCount,
      text: "Writer prompt 增加动作、停顿、短对话和关系拉扯。",
    },
    {
      count: stats.styleMismatchCount,
      text: "强化 styleCard 和 styleCustom 的权重，减少风格漂移。",
    },
    {
      count: stats.tooAiCount,
      text: "减少抽象总结、排比句和模板化表达，增加具体物件与不完整对话。",
    },
    {
      count: stats.relationTooFastCount,
      text: "限制直接告白、拥抱、和解，把关系停在临界点。",
    },
  ]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item) => item.text);

  return candidates.length
    ? candidates
    : ["暂无明显问题峰值；继续收集反馈后再调整 Prompt 权重。"];
}

type AdminStats = {
  totalFeedback: number;
  dissatisfiedCount: number;
  oocCount: number;
  canonConflictCount: number;
  weakEmotionCount: number;
  styleMismatchCount: number;
  relationTooFastCount: number;
  tooAiCount: number;
  todayFreeUsage: number;
  activeUsers: number;
};

export default function AdminPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [modelSettings, setModelSettings] = useState<ModelSetting[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeAdmin() {
      setIsChecking(true);
      setDataError(null);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!isMounted) return;

      const user = sessionData.session?.user;
      setCurrentEmail(user?.email ?? null);

      if (sessionError) {
        setDataError(sessionError.message);
      }

      if (window.sessionStorage.getItem(ADMIN_UNLOCK_STORAGE_KEY) !== "true") {
        setIsUnlocked(false);
        setIsChecking(false);
        return;
      }

      setIsUnlocked(true);
      await loadAdminData(isMounted);
      if (isMounted) setIsChecking(false);
    }

    void initializeAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUnlocking) return;

    setUnlockError(null);
    setIsUnlocking(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        setUnlockError(payload?.message || "管理员口令错误");
        return;
      }

      window.sessionStorage.setItem(ADMIN_UNLOCK_STORAGE_KEY, "true");
      setIsUnlocked(true);
      setAccessCode("");
      await loadAdminData();
    } catch {
      setUnlockError("管理员口令错误");
    } finally {
      setIsUnlocking(false);
    }
  }

  function handleAdminLogout() {
    window.sessionStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY);
    setIsUnlocked(false);
    setAccessCode("");
    setUnlockError(null);
    setProfiles([]);
    setFeedback([]);
    setUsage([]);
    setModelSettings([]);
  }

  async function loadAdminData(isMounted = true) {
    const [
      feedbackResult,
      profilesResult,
      usageResult,
      modelSettingsResult,
    ] = await Promise.all([
      supabase
        .from("user_feedback")
        .select(
          "id, user_id, feature, rating, issue_tags, comment, generated_text, metadata, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("user_profiles").select("id, email, role"),
      supabase
        .from("user_generation_usage")
        .select("id, user_id, usage_date, feature, provider, count, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("user_model_settings")
        .select("user_id, provider, model, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

    if (!isMounted) return;

    const errors = [
      feedbackResult.error,
      profilesResult.error,
      usageResult.error,
      modelSettingsResult.error,
    ].filter(Boolean);

    if (errors.length) {
      setDataError(
        "当前前端 anon client 受 RLS 限制，正式管理员后台应通过服务端 admin API 查询全量数据。",
      );
    }

    setFeedback(
      (feedbackResult.data ?? []).map((item) => ({
        id: String(item.id),
        user_id: String(item.user_id),
        feature: typeof item.feature === "string" ? item.feature : "slice",
        rating: typeof item.rating === "string" ? item.rating : "neutral",
        issue_tags: normalizeTags(item.issue_tags),
        comment: typeof item.comment === "string" ? item.comment : "",
        generated_text:
          typeof item.generated_text === "string" ? item.generated_text : "",
        metadata:
          item.metadata && typeof item.metadata === "object"
            ? (item.metadata as Record<string, unknown>)
            : null,
        created_at:
          typeof item.created_at === "string"
            ? item.created_at
            : new Date(0).toISOString(),
      })),
    );
    setProfiles(
      (profilesResult.data ?? []).map((item) => ({
        id: String(item.id),
        email: typeof item.email === "string" ? item.email : null,
        role: typeof item.role === "string" ? item.role : null,
      })),
    );
    setUsage(
      (usageResult.data ?? []).map((item) => ({
        id: String(item.id),
        user_id: String(item.user_id),
        usage_date: typeof item.usage_date === "string" ? item.usage_date : "",
        feature: typeof item.feature === "string" ? item.feature : "",
        provider: typeof item.provider === "string" ? item.provider : "",
        count: typeof item.count === "number" ? item.count : 0,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
      })),
    );
    setModelSettings(
      (modelSettingsResult.data ?? []).map((item) => ({
        user_id: String(item.user_id),
        provider: typeof item.provider === "string" ? item.provider : "",
        model: typeof item.model === "string" ? item.model : "",
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
      })),
    );
  }

  const profilesById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const stats = useMemo<AdminStats>(() => {
    const userIds = new Set<string>();
    feedback.forEach((record) => userIds.add(record.user_id));
    usage.forEach((record) => userIds.add(record.user_id));

    return {
      totalFeedback: feedback.length,
      dissatisfiedCount: feedback.filter(
        (record) => record.rating === "dissatisfied",
      ).length,
      oocCount: countFeedbackSignal(
        feedback,
        (text) =>
          text.includes("OOC") ||
          text.includes("角色不像") ||
          text.includes("对话不像角色"),
      ),
      canonConflictCount: countFeedbackSignal(
        feedback,
        (text) => text.includes("Canon") || text.includes("canon"),
      ),
      weakEmotionCount: countFeedbackSignal(feedback, (text) =>
        text.includes("情绪不足"),
      ),
      styleMismatchCount: countFeedbackSignal(feedback, (text) =>
        text.includes("风格不匹配"),
      ),
      relationTooFastCount: countFeedbackSignal(feedback, (text) =>
        text.includes("关系推进过快"),
      ),
      tooAiCount: countFeedbackSignal(
        feedback,
        (text) => text.includes("太 AI") || text.includes("AI 味"),
      ),
      todayFreeUsage: usage
        .filter(
          (record) =>
            record.usage_date === getTodayDateString() &&
            record.provider === "fanforge_free",
        )
        .reduce((sum, record) => sum + record.count, 0),
      activeUsers: userIds.size,
    };
  }, [feedback, usage]);

  const metricCards = [
    { label: "总反馈数", value: stats.totalFeedback, icon: MessageSquareText },
    { label: "不满意反馈数", value: stats.dissatisfiedCount, icon: AlertTriangle },
    { label: "OOC / 角色不像", value: stats.oocCount, icon: Users },
    { label: "Canon 冲突", value: stats.canonConflictCount, icon: Database },
    { label: "情绪不足", value: stats.weakEmotionCount, icon: BarChart3 },
    { label: "风格不匹配", value: stats.styleMismatchCount, icon: BarChart3 },
    { label: "关系推进过快", value: stats.relationTooFastCount, icon: AlertTriangle },
    { label: "太 AI", value: stats.tooAiCount, icon: AlertTriangle },
    { label: "今日免费模型使用", value: stats.todayFreeUsage, icon: KeyRound },
    { label: "活跃用户数", value: stats.activeUsers, icon: Users },
  ];
  const optimizationAdvice = buildOptimizationAdvice(stats);

  if (isChecking) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f6efdf] text-sm text-[#6f6759]">
        正在检查后台访问状态……
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f6efdf] px-6 text-[#191611]">
        <section className="relative w-full max-w-md rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0] p-6 shadow-[0_22px_70px_rgba(92,69,42,0.09)]">
          <div className="absolute -right-3 -top-3 size-20 bg-[#53613b] opacity-85" />
          <div className="relative border border-[#171410]/12 bg-[#fffdf7] p-6">
            <ShieldCheck className="mb-5 size-6 text-[#53613b]" />
            <p className="text-xs uppercase tracking-[0.22em] text-[#8a7c62]">
              Private Analytics
            </p>
            <h1 className="mt-3 font-serif text-6xl leading-none tracking-[-0.035em] text-[#171410]">
              Admin
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5f5849]">
              输入管理员口令后查看产品数据。
            </p>

            <form className="mt-7 flex flex-col gap-4" onSubmit={handleAdminLogin}>
              <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#6f6759]">
                Access Code
                <input
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="管理员口令"
                  className="h-11 rounded-xl border border-[#8a7c62]/28 bg-[#fffaf0] px-3 text-sm normal-case tracking-normal text-[#211d17] outline-none transition-colors placeholder:text-[#9a8f78] focus:border-[#53613b]/45"
                />
              </label>
              {unlockError ? (
                <p className="rounded-xl border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-2 text-xs leading-6 text-[#7f3326]">
                  {unlockError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isUnlocking}
                className="h-11 rounded-xl bg-[#171410] px-5 text-sm font-medium text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUnlocking ? "校验中..." : "进入后台"}
              </button>
            </form>

            {currentEmail ? (
              <p className="mt-5 text-xs leading-6 text-[#8a7c62]">
                当前登录：{currentEmail}
              </p>
            ) : null}
            {dataError ? (
              <p className="mt-3 text-xs leading-6 text-[#8a3f30]">
                {dataError}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#f6efdf] text-[#191611]">
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-7 sm:px-8 lg:px-12">
        <header className="border-b border-[#b9aa83]/70 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
                ADMIN · SUPABASE DATA
              </div>
              <h1 className="font-serif text-[clamp(3rem,6vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.04em] text-[#171410]">
                Admin Analytics
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5f5849]">
                真实数据后台，用于观察用户反馈、免费模型使用量和模型配置分布，辅助判断 Prompt 与 Context Engine 优化优先级。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {currentEmail ? (
                <div className="rounded-xl border border-[#53613b]/24 bg-[#f4f7ea] px-4 py-3 text-xs leading-6 text-[#3f4b2f]">
                  当前登录：{currentEmail}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleAdminLogout}
                className="h-10 rounded-xl border border-[#8a7c62]/28 bg-[#fffaf0] px-4 text-xs font-medium text-[#5f5849] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
              >
                退出后台
              </button>
            </div>
          </div>
          {dataError ? (
            <div className="mt-5 rounded-xl border border-[#8a3f30]/25 bg-[#f3d8cc] px-4 py-3 text-xs leading-6 text-[#7f3326]">
              {dataError}
            </div>
          ) : null}
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <section
                key={metric.label}
                className={cn(
                  "rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]/86 px-4 py-4 shadow-[0_14px_38px_rgba(92,69,42,0.04)]",
                  index >= 8 && "border-[#53613b]/24 bg-[#f4f7ea]/72",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs leading-5 text-[#8a7c62]">
                    {metric.label}
                  </span>
                  <Icon className="size-4 text-[#53613b]" />
                </div>
                <p className="mt-5 font-serif text-4xl leading-none text-[#171410]">
                  {metric.value}
                </p>
              </section>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
            <SectionHeader
              eyebrow="Recent Feedback"
              title="反馈明细"
              icon={<MessageSquareText className="size-4 text-[#53613b]" />}
            />
            {feedback.length === 0 ? (
              <EmptyState text="暂无可读取反馈。若已存在数据，可能受 RLS 限制。" />
            ) : (
              <div className="mt-5 flex max-h-[680px] flex-col gap-3 overflow-y-auto pr-1">
                {feedback.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-4 py-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge className="border-[#53613b]/28 bg-[#e7ead4] text-[#3f4b2f]" variant="outline">
                        {userLabel(record.user_id, profilesById)}
                      </Badge>
                      <Badge variant="outline" className="border-[#8a7c62]/28 bg-[#fffaf0] text-[#6f6759]">
                        {record.feature}
                      </Badge>
                      <Badge variant="outline" className="border-[#53613b]/28 bg-[#f4f7ea] text-[#3f4b2f]">
                        {record.rating}
                      </Badge>
                      <span className="text-xs text-[#8a7c62]">
                        {shortDate(record.created_at)}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {record.issue_tags.length ? (
                        record.issue_tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-[#8a7c62]/24 bg-[#f7f4e9] text-[10px] text-[#5f5849]"
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-[#8a7c62]">无标签</span>
                      )}
                    </div>
                    <p className="text-sm leading-7 text-[#332d24]">
                      {record.comment || "未填写评论"}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[#6f6759]">
                      生成预览：{record.generated_text.replace(/\s+/g, " ").slice(0, 120) || "无"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-[14px] border border-[#53613b]/24 bg-[#f4f7ea]/72 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
              <SectionHeader
                eyebrow="Prompt Strategy"
                title="Prompt 优化建议"
                icon={<ShieldCheck className="size-4 text-[#53613b]" />}
              />
              <div className="mt-5 grid gap-3">
                {optimizationAdvice.map((item, index) => (
                  <div
                    key={item}
                    className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl border border-[#53613b]/22 bg-[#fffdf7] px-3 py-3 text-sm leading-7 text-[#4f5841]"
                  >
                    <span className="font-serif text-2xl leading-none text-[#53613b]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
              <SectionHeader
                eyebrow="Model Settings"
                title="模型设置概览"
                icon={<KeyRound className="size-4 text-[#53613b]" />}
              />
              {modelSettings.length === 0 ? (
                <EmptyState text="暂无可读取模型设置。" />
              ) : (
                <div className="mt-5 grid gap-2">
                  {modelSettings.slice(0, 8).map((setting) => (
                    <div
                      key={`${setting.user_id}-${setting.provider}-${setting.model}`}
                      className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-3 text-xs leading-6 text-[#5f5849]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-[#171410]">
                          {userLabel(setting.user_id, profilesById)}
                        </span>
                        <span>{shortDate(setting.updated_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-[#53613b]/28 bg-[#e7ead4] text-[#3f4b2f]">
                          {setting.provider}
                        </Badge>
                        <Badge variant="outline" className="border-[#8a7c62]/24 bg-[#fffaf0] text-[#6f6759]">
                          {setting.model}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
          <SectionHeader
            eyebrow="Generation Usage"
            title="免费模型使用量"
            icon={<Database className="size-4 text-[#53613b]" />}
          />
          {usage.length === 0 ? (
            <EmptyState text="暂无可读取使用量记录。" />
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.14em] text-[#8a7c62]">
                    <th className="border-b border-[#b9aa83]/45 px-3 py-3">用户</th>
                    <th className="border-b border-[#b9aa83]/45 px-3 py-3">Feature</th>
                    <th className="border-b border-[#b9aa83]/45 px-3 py-3">Provider</th>
                    <th className="border-b border-[#b9aa83]/45 px-3 py-3">Count</th>
                    <th className="border-b border-[#b9aa83]/45 px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((record) => (
                    <tr key={record.id} className="text-[#5f5849]">
                      <td className="border-b border-[#8a7c62]/14 px-3 py-3">
                        {userLabel(record.user_id, profilesById)}
                      </td>
                      <td className="border-b border-[#8a7c62]/14 px-3 py-3">
                        {record.feature}
                      </td>
                      <td className="border-b border-[#8a7c62]/14 px-3 py-3">
                        {record.provider}
                      </td>
                      <td className="border-b border-[#8a7c62]/14 px-3 py-3 font-serif text-2xl text-[#171410]">
                        {record.count}
                      </td>
                      <td className="border-b border-[#8a7c62]/14 px-3 py-3">
                        {record.usage_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffdf7] px-4 py-4 text-xs leading-6 text-[#6f6759]">
          数据来自 Supabase：`user_feedback`、`user_profiles`、`user_generation_usage`、`user_model_settings`。前端 anon client 受 RLS 限制；正式管理员后台应通过服务端 admin API + service role key 查询，不应在前端暴露敏感密钥。
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#b9aa83]/45 pb-4">
      {icon}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
          {title}
        </h2>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-[#8a7c62]/32 bg-[#fffdf7]/74 px-6 py-8 text-center text-sm leading-7 text-[#7a705e]">
      {text}
    </div>
  );
}
