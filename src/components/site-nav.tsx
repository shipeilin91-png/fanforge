"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

const navLinks = [
  { label: "首页", href: "/" },
  { label: "创作室", href: "/studio" },
  { label: "Canon 证据", href: "/canon" },
  { label: "章节写作", href: "/write" },
  { label: "人格图", href: "/persona" },
  { label: "情绪切片", href: "/slice" },
  { label: "多 Agent", href: "/agents" },
  { label: "反馈", href: "/feedback" },
  { label: "模型设置", href: "/settings" },
] as const;

const linkClassName =
  "px-3 py-1.5 text-sm text-[#c7c1b4] transition-colors hover:text-[#fff8ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]";

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

export function SiteNav() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      const user = data.session?.user;
      setUserEmail(user?.email ?? null);

      if (user) {
        await upsertUserProfile(user);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setUserEmail(user?.email ?? null);

      if (user) {
        void upsertUserProfile(user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsMenuOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080806]">
      <div className="mx-auto flex min-h-14 w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-12">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-[-0.02em] text-[#fff8ea] transition-colors hover:text-[#e7ead4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
          onClick={() => setIsMenuOpen(false)}
        >
          FanForge
        </Link>
        <div className="hidden flex-wrap items-center justify-end gap-3 md:flex">
          <nav
            className="flex flex-wrap items-center gap-0.5"
            aria-label="主导航"
          >
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className={linkClassName}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
            <span className="max-w-32 truncate text-xs text-[#a9a296]">
              {userEmail ?? "未登录"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2 py-1 text-xs text-[#c7c1b4] transition-colors hover:text-[#fff8ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
            >
              退出
            </button>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-white/[0.12] px-3 text-sm text-[#fff8ea] transition-colors hover:border-[#53613b]/60 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b] md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-site-nav"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? "关闭" : "菜单"}
        </button>
      </div>

      {isMenuOpen ? (
        <div
          id="mobile-site-nav"
          className="border-t border-white/[0.08] bg-[#080806] px-4 pb-4 pt-3 md:hidden"
        >
          <nav className="grid gap-1" aria-label="移动端主导航">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm text-[#d8d0c0] transition-colors hover:bg-white/[0.05] hover:text-[#fff8ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
            <span className="min-w-0 flex-1 truncate text-xs text-[#a9a296]">
              {userEmail ?? "未登录"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/[0.1] px-3 py-1.5 text-xs text-[#c7c1b4] transition-colors hover:border-[#53613b]/60 hover:text-[#fff8ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
            >
              退出
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
