"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const navLinks = [
  { label: "首页", href: "/dashboard" },
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

type DemoUser = {
  nickname?: string;
};

export function SiteNav() {
  const router = useRouter();
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DemoUser;
      setDemoUser(parsed);
    } catch {
      setDemoUser(null);
    }
  }, []);

  function handleLogout() {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    setDemoUser(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080806]">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <Link
          href="/dashboard"
          className="font-serif text-lg font-semibold tracking-[-0.02em] text-[#fff8ea] transition-colors hover:text-[#e7ead4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]"
        >
          FanForge
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
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
              {demoUser?.nickname
                ? `Demo 用户：${demoUser.nickname}`
                : "未登录"}
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
      </div>
    </header>
  );
}
