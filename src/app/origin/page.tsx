"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const modules = [
  {
    title: "故事一句话概括",
    description: "原作主线的极简锚点",
    content: (
      <p className="text-sm leading-relaxed text-foreground/90">
        帝国第三王子在加冕前夜遭近臣与皇兄联手背叛，被迫流亡边境；三年后以假名潜入旧都，在复仇与复国之间重新辨认「王权」与「自我」的边界。
      </p>
    ),
  },
  {
    title: "世界观基础规则",
    description: "写作时默认成立的世界法则",
    content: (
      <ul className="list-none space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="text-foreground/80">帝国政体：</span>
          皇权与元老院共治，军权由「北境军团」与「禁卫府」分掌，互不隶属。
        </li>
        <li>
          <span className="text-foreground/80">魔法/科技：</span>
          低魔高武；王室血脉可感应「誓印」，但公开施印视为谋反征兆。
        </li>
        <li>
          <span className="text-foreground/80">边境：</span>
          流亡期主要活动于灰港与盐原驿站一带，法外之地，身份可被金钱改写。
        </li>
      </ul>
    ),
  },
  {
    title: "主线时间轴",
    description: "关键节点顺序（不可随意颠倒因果）",
    content: (
      <ol className="list-none space-y-3 text-sm leading-relaxed text-muted-foreground">
        {[
          "加冕前夜 · 宫变：太子指控三王子「私通北境」，禁卫府封锁王城。",
          "血月出逃：近侍埃兰战死，王子携誓印碎片的半片流亡。",
          "流亡第一年：灰港做账房假名「陆沉」，结识走私商线与情报掮客。",
          "流亡第三年：旧都地下议会流传「王子未死」，复国派系开始接触。",
          "回归前夜：皇兄以「肃清叛党」名义清洗元老院，王子必须选边。",
        ].map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-mono text-xs text-muted-foreground/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    title: "主要人物关系",
    description: "核心角色与张力方向",
    content: (
      <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="font-medium text-foreground/90">三王子 / 陆沉：</span>
          主角；流亡期压抑、警觉，对「信任」有创伤性成本。
        </li>
        <li>
          <span className="font-medium text-foreground/90">皇兄（太子）：</span>
          主要对立；并非纯粹恶，而是「秩序优先」的执政者逻辑。
        </li>
        <li>
          <span className="font-medium text-foreground/90">埃兰（已故近侍）：</span>
          王子良心与旧日温柔的化身；忌消费式滥情回忆。
        </li>
        <li>
          <span className="font-medium text-foreground/90">绯娅（走私线）：</span>
          流亡期同盟；利益与情义交织，适合写试探而非速配。
        </li>
        <li>
          <span className="font-medium text-foreground/90">禁卫府指挥 · 谢霖：</span>
          曾奉命追杀王子；回归线关键变量，可敌可友。
        </li>
      </ul>
    ),
  },
  {
    title: "Canon 硬设定",
    description: "违反即 OOC / 毁设定",
    highlight: true,
    content: (
      <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
        <li>誓印为双片合一：王子流亡时只持半片，无法在远距离召唤禁卫府制式武装。</li>
        <li>王城地下有「无声廊」，廊内禁止流血；宫变夜的血迹只能发生在外廷。</li>
        <li>帝国法律：流亡者一旦被宣告「剥夺宗籍」，公开自称王子即构成煽动罪。</li>
        <li>北境军团不介入王城继承争端，除非皇帝玉玺与三军令同时出示。</li>
        <li>埃兰之死发生在宫变当夜，此后时间线中不可活着登场（仅回忆/文献）。</li>
      </ul>
    ),
  },
  {
    title: "新手创作提醒",
    description: "常见踩雷点",
    content: (
      <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <li className="flex gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground/70">01</span>
          <span>
            不要让角色在流亡期公开使用王子身份——应使用假名、暗语或他人代称。
          </span>
        </li>
        <li className="flex gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground/70">02</span>
          <span>
            不要让关系过早进入告白阶段——流亡期的信任应缓慢、带代价地建立。
          </span>
        </li>
        <li className="flex gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground/70">03</span>
          <span>
            不要忽略复仇主线和身份创伤——日常戏需回扣「被剥夺」与「要夺回什么」。
          </span>
        </li>
      </ul>
    ),
  },
] as const;

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

export default function OriginPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="dark flex min-h-full items-center justify-center bg-background text-sm text-muted-foreground">
        正在检查登录状态……
      </div>
    );
  }

  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Canon · Worldbuilding Pack
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              原作理解包
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              帮助新手创作者快速补齐原作世界观、主线故事、人物关系和 Canon
              硬设定。
            </p>
          </div>
        </header>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="border-border/60 border-b pb-6">
            <CardTitle className="text-base">输入原作材料</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              粘贴片段或大纲后生成理解包（当前为静态示例，未接入模型）。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                粘贴原作片段 / 故事大纲
              </span>
              <Textarea
                className="min-h-32 resize-y text-sm leading-relaxed"
                placeholder="粘贴小说片段、角色资料、世界观设定或你自己整理的大纲……"
              />
            </label>
            <Button size="lg" className="h-11 w-fit px-6" type="button">
              生成原作理解包
            </Button>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium tracking-wide text-foreground">
              理解包模块
            </h2>
            <p className="text-xs text-muted-foreground">
              示例故事：帝国王子被背叛、流亡、回归复仇
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {modules.map((mod) => (
              <Card
                key={mod.title}
                className={cn(
                  "border-border/80 bg-card/60",
                  "highlight" in mod &&
                    mod.highlight &&
                    "border-foreground/20 bg-card/80 ring-1 ring-foreground/15",
                )}
              >
                <CardHeader className="gap-2 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    {"highlight" in mod && mod.highlight && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] tracking-wide uppercase"
                      >
                        不可违反
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {mod.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">{mod.content}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
