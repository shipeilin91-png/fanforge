import Link from "next/link";

const navLinks = [
  { label: "首页", href: "/" },
  { label: "人格图", href: "/persona" },
  { label: "情绪切片", href: "/slice" },
  { label: "多 Agent", href: "/agents" },
  { label: "反馈", href: "/feedback" },
  { label: "模型设置", href: "/settings" },
] as const;

const linkClassName =
  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SiteNav() {
  return (
    <header className="dark sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-10 lg:px-14">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
        >
          FanForge
        </Link>
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
      </div>
    </header>
  );
}
