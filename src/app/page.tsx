"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const CREATOR_IDENTITIES = [
  "新手同人创作者",
  "长篇连载作者",
  "CP 短文创作者",
  "设定党",
] as const;

const FAVORITE_TYPES = ["CP", "群像", "宿敌", "师徒", "原创角色"] as const;

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [creatorIdentity, setCreatorIdentity] = useState<
    (typeof CREATOR_IDENTITIES)[number]
  >("新手同人创作者");
  const [favoriteType, setFavoriteType] =
    useState<(typeof FAVORITE_TYPES)[number]>("CP");

  function handleEnterDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const demoUser = {
      nickname: nickname.trim() || "演示创作者",
      creatorIdentity,
      favoriteType,
      createdAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      DEMO_USER_STORAGE_KEY,
      JSON.stringify(demoUser),
    );
    router.push("/dashboard");
  }

  return (
    <main className="dark flex min-h-full items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-3 text-center">
          <span className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Fan Fiction · AI Co-writing
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold tracking-tight">FanForge</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              面向同人创作者的原著一致性 AI 共写平台
            </p>
          </div>
        </header>

        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="gap-2 border-b border-border/60 pb-5">
            <CardTitle className="text-base">进入创作工作台</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              用演示身份体验 FanForge 的原作理解、情绪切片和多 Agent 审稿流程。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              className="flex flex-col gap-5"
              onSubmit={handleEnterDashboard}
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="nickname"
                  className="text-xs font-medium text-muted-foreground"
                >
                  创作者昵称
                </label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="例如：夜航写手"
                  className="bg-background/40"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  创作身份
                </span>
                <Select
                  value={creatorIdentity}
                  onValueChange={(value) =>
                    setCreatorIdentity(
                      value as (typeof CREATOR_IDENTITIES)[number],
                    )
                  }
                >
                  <SelectTrigger className="w-full bg-background/40">
                    <SelectValue placeholder="选择创作身份" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="w-[var(--radix-select-trigger-width)]"
                  >
                    {CREATOR_IDENTITIES.map((identity) => (
                      <SelectItem key={identity} value={identity}>
                        {identity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  常写类型
                </span>
                <Select
                  value={favoriteType}
                  onValueChange={(value) =>
                    setFavoriteType(value as (typeof FAVORITE_TYPES)[number])
                  }
                >
                  <SelectTrigger className="w-full bg-background/40">
                    <SelectValue placeholder="选择常写类型" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="w-[var(--radix-select-trigger-width)]"
                  >
                    {FAVORITE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="lg" className="mt-1 h-11 w-full">
                进入创作工作台
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          当前为 MVP 演示登录，不涉及真实账号系统；后续可接入 Supabase /
          Clerk / NextAuth 实现正式用户登录、项目保存和反馈追踪。
        </p>
      </div>
    </main>
  );
}
