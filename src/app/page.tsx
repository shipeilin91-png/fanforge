"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

type AuthUser = {
  id: string;
  email?: string | null;
};

async function upsertUserProfile(user: AuthUser) {
  const { error } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("User profile sync failed", error.message);
  }
}

export default function HomePage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        setAuthError(error.message);
      }

      if (data.session?.user) {
        await upsertUserProfile(data.session.user);
      }

      setHasSession(Boolean(data.session));
      setIsCheckingSession(false);
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleEnterStudio() {
    if (!hasSession) {
      setAuthError("请先登录或注册");
      setAuthMessage(null);
      return;
    }

    router.push("/studio");
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    if (!email.trim() || !password) {
      setAuthError("请输入邮箱和密码");
      return;
    }

    setIsSubmitting(true);

    const credentials = {
      email: email.trim(),
      password,
    };

    const { data, error } =
      authMode === "login"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setIsSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.user) {
      await upsertUserProfile(data.user);
    }

    if (data.session) {
      setHasSession(true);
      router.push("/studio");
      return;
    }

    if (authMode === "signup") {
      setAuthMessage("注册成功，请检查邮箱完成验证");
      return;
    }

    setAuthError("登录未完成，请检查邮箱或密码");
  }

  function handleToggleMode() {
    setAuthMode((current) => (current === "login" ? "signup" : "login"));
    setAuthError(null);
    setAuthMessage(null);
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-[#f4ecd9] text-[#191611]">
      <SiteNav />
      <main className="relative min-h-[calc(100vh-3.5rem)] px-4 py-7 sm:px-6 sm:py-9 lg:px-12 lg:py-10">
        <div className="pointer-events-none absolute left-[-7vw] top-16 hidden text-[16vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CANON
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[38%] hidden text-[13vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          PERSONA
        </div>

        <div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.58fr)_minmax(340px,0.42fr)] xl:gap-16">
          <section className="max-w-[880px]">
            <div className="mb-5 inline-flex max-w-full border border-[#2d281f]/20 bg-[#fffaf0]/45 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#6a654f] sm:mb-7 sm:px-4 sm:text-xs sm:tracking-[0.22em]">
              FAN FICTION · CANON-AWARE AI WRITING
            </div>
            <h1 className="max-w-full break-words font-serif text-[clamp(3.75rem,18vw,12.5rem)] font-semibold leading-[0.84] tracking-[-0.035em] text-[#171410] sm:leading-[0.78]">
              FanForge
            </h1>
            <div className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-[0.85fr_1fr]">
              <p className="max-w-xl font-serif text-[clamp(2rem,10vw,4.5rem)] leading-[1] tracking-[-0.025em] text-[#1e1a14]">
                面向同人创作者的原著一致性 AI 共写平台
              </p>
              <div className="flex max-w-xl flex-col justify-end gap-5 sm:gap-6">
                <p className="text-base leading-7 text-[#5f5849] sm:text-lg sm:leading-8">
                  从 Canon 证据、角色人格到多 Agent
                  审稿，把长文本创作中的一致性问题产品化。
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl bg-[#171410] px-5 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f] sm:w-auto"
                    onClick={handleEnterStudio}
                  >
                    进入创作室
                  </Button>
                  <Link
                    href="/slice"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#53613b]/35 bg-[#e7ead4] px-5 text-sm font-medium text-[#28331f] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/70 hover:bg-[#dfe6c7] sm:w-auto"
                  >
                    情绪切片
                  </Link>
                  <Link
                    href="/canon"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#8a7c62]/30 bg-[#fffaf0] px-5 text-sm font-medium text-[#171410] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8a7c62]/55 hover:bg-[#fbf5e8] sm:w-auto"
                  >
                    Canon 证据
                  </Link>
                  <Link
                    href="/write"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#8a7c62]/30 bg-[#fffaf0] px-5 text-sm font-medium text-[#171410] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8a7c62]/55 hover:bg-[#fbf5e8] sm:w-auto"
                  >
                    章节写作
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <aside className="relative w-full max-w-[430px] justify-self-center rounded-[18px] border border-[#171410]/20 bg-[#efe2c7]/70 p-4 shadow-[0_20px_60px_rgba(49,39,24,0.08)] sm:p-6 lg:translate-y-4 lg:justify-self-end">
            <div className="absolute right-3 top-3 size-16 bg-[#53613b] opacity-90 sm:-right-4 sm:-top-4 sm:size-24" />
            <div className="relative flex min-h-[430px] flex-col justify-between rounded-[18px] border border-[#171410]/15 bg-[#f8f0df] p-5 sm:min-h-[520px] sm:p-6">
              <div>
                <Badge
                  variant="outline"
                  className="border-[#53613b]/40 bg-[#e7ead4] text-[#3f4b2f]"
                >
                  Canon-aware Studio
                </Badge>
                <p className="mt-7 font-serif text-3xl leading-none text-[#171410] sm:mt-8 sm:text-4xl">
                  Canon stays.
                  <br />
                  Characters stay.
                  <br />
                  Tension moves.
                </p>
              </div>

              <div className="mt-8 rounded-xl border border-[#8a7c62]/30 bg-[#fffaf0] px-4 py-4 shadow-[0_12px_30px_rgba(49,39,24,0.05)]">
                {hasSession ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                        Access Ready
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#5f5849]">
                        当前账号已可进入创作工作台。
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="h-10 w-full rounded-xl bg-[#171410] text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                      onClick={handleEnterStudio}
                      disabled={isCheckingSession}
                    >
                      继续进入创作室
                    </Button>
                  </div>
                ) : (
                  <form className="flex flex-col gap-3" onSubmit={handleAuthSubmit}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                          Creator Pass
                        </p>
                        <h2 className="mt-1 font-serif text-2xl leading-none text-[#171410]">
                          {authMode === "login" ? "登录" : "注册"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-[#53613b] underline-offset-4 transition-colors hover:text-[#28331f] hover:underline"
                        onClick={handleToggleMode}
                      >
                        {authMode === "login" ? "创建账号" : "已有账号"}
                      </button>
                    </div>

                    <label className="flex flex-col gap-2 text-xs font-medium text-[#6f6759]">
                      邮箱
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        className="h-10 rounded-xl border-[#8a7c62]/30 bg-[#fffdf7] text-sm text-[#211d17] placeholder:text-[#9a8f78]"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-medium text-[#6f6759]">
                      密码
                      <Input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="输入密码"
                        autoComplete={
                          authMode === "login" ? "current-password" : "new-password"
                        }
                        className="h-10 rounded-xl border-[#8a7c62]/30 bg-[#fffdf7] text-sm text-[#211d17] placeholder:text-[#9a8f78]"
                      />
                    </label>

                    {authError ? (
                      <p className="rounded-xl border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-2 text-xs leading-relaxed text-[#7f3326]">
                        {authError}
                      </p>
                    ) : null}
                    {authMessage ? (
                      <p className="rounded-xl border border-[#53613b]/30 bg-[#e7ead4] px-3 py-2 text-xs leading-relaxed text-[#3f4b2f]">
                        {authMessage}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      className="mt-1 h-10 w-full rounded-xl bg-[#171410] text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                      disabled={isSubmitting || isCheckingSession}
                    >
                      {isSubmitting
                        ? "处理中..."
                        : authMode === "login"
                          ? "登录并进入创作室"
                          : "注册"}
                    </Button>
                  </form>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-8 sm:pt-10">
                {["Canon", "Persona", "Agent"].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-[#171410]/15 bg-[#f4ecd9] px-3 py-3 text-center text-xs font-medium text-[#5f5849]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
