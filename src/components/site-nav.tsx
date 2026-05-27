"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const navLinks = [
  { label: "首页", href: "/dashboard" },
  { label: "人格图", href: "/persona" },
  { label: "情绪切片", href: "/slice" },
  { label: "多 Agent", href: "/agents" },
  { label: "反馈", href: "/feedback" },
  { label: "模型设置", href: "/settings" },
] as const;

const linkClassName =
  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    <header className="dark sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-10 lg:px-14">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
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
          <div className="flex items-center gap-2 border-l border-border/60 pl-3">
            <span className="max-w-32 truncate text-xs text-muted-foreground">
              {demoUser?.nickname
                ? `Demo 用户：${demoUser.nickname}`
                : "未登录"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
