"use client";

import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const USER_STORAGE_KEY = "fanforge-demo-user";

function ensureLocalUser() {
  const existing = window.localStorage.getItem(USER_STORAGE_KEY);
  if (existing) return;

  window.localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({
      nickname: "演示创作者",
      creatorIdentity: "新手同人创作者",
      favoriteType: "CP",
      createdAt: new Date().toISOString(),
    }),
  );
}

export default function HomePage() {
  const router = useRouter();

  function handleEnterStudio() {
    ensureLocalUser();
    router.push("/studio");
  }

  return (
    <div className="min-h-full overflow-hidden bg-[#f4ecd9] text-[#191611]">
      <SiteNav />
      <main className="relative flex min-h-[calc(100vh-3.5rem)] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="pointer-events-none absolute left-[-7vw] top-16 hidden text-[16vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CANON
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[38%] hidden text-[13vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          PERSONA
        </div>

        <div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[minmax(0,0.58fr)_minmax(340px,0.42fr)] xl:gap-16">
          <section className="max-w-[880px]">
            <div className="mb-7 inline-flex border border-[#2d281f]/20 bg-[#fffaf0]/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              FAN FICTION · CANON-AWARE AI WRITING
            </div>
            <h1 className="font-serif text-[clamp(4.75rem,13vw,12.5rem)] font-semibold leading-[0.78] tracking-[-0.035em] text-[#171410]">
              FanForge
            </h1>
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1fr]">
              <p className="max-w-xl font-serif text-[clamp(2rem,4vw,4.5rem)] leading-[0.95] tracking-[-0.025em] text-[#1e1a14]">
                面向同人创作者的原著一致性 AI 共写平台
              </p>
              <div className="flex max-w-xl flex-col justify-end gap-6">
                <p className="text-base leading-8 text-[#5f5849] sm:text-lg">
                  从 Canon 证据、角色人格到多 Agent
                  审稿，把长文本创作中的一致性问题产品化。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="h-11 bg-[#171410] px-5 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                    onClick={handleEnterStudio}
                  >
                    进入创作室
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="relative w-full max-w-[430px] justify-self-end border border-[#171410]/20 bg-[#efe2c7]/70 p-6 shadow-[0_20px_60px_rgba(49,39,24,0.08)] lg:translate-y-4">
            <div className="absolute -right-4 -top-4 size-24 bg-[#53613b] opacity-90" />
            <div className="relative flex min-h-[360px] flex-col justify-between border border-[#171410]/15 bg-[#f8f0df] p-6">
              <div>
                <Badge
                  variant="outline"
                  className="border-[#53613b]/40 bg-[#e7ead4] text-[#3f4b2f]"
                >
                  Canon-aware Studio
                </Badge>
                <p className="mt-8 font-serif text-4xl leading-none text-[#171410]">
                  Canon stays.
                  <br />
                  Characters stay.
                  <br />
                  Tension moves.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-10">
                {["Canon", "Persona", "Agent"].map((item) => (
                  <div
                    key={item}
                    className="border border-[#171410]/15 bg-[#f4ecd9] px-3 py-3 text-center text-xs font-medium text-[#5f5849]"
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
