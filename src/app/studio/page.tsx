"use client";

import {
  BookOpenText,
  FileText,
  PanelLeft,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const outlineItems = ["章节结构", "主线剧情", "情绪曲线", "伏笔节点"] as const;
const materialItems = [
  "角色人格",
  "人物关系",
  "世界观设定",
  "Canon 证据",
  "文学气质风格卡",
] as const;
const documentItems = [
  "原作片段",
  "用户上传资料",
  "章节草稿",
  "审稿记录",
] as const;

const writingModes = ["情绪切片", "单章续写", "场景扩写", "结局改写"] as const;
const wordCounts = ["500 字", "1000 字", "2000 字", "自定义"] as const;
const styleCards = ["疏离克制", "冷艳华美", "温润烟火", "浪漫诗性"] as const;
const tensions = ["克制", "酸涩", "保护欲", "旧情未了", "共犯感"] as const;
const relationshipStages = ["初识", "对立", "暧昧", "冷战", "分离后重逢"] as const;

const contextSwitches = [
  {
    title: "Canon Evidence",
    description: "约束时间线、身份、世界观规则和硬设定。",
  },
  {
    title: "Persona Map",
    description: "约束角色人格内核、行为模式和 OOC 边界。",
  },
  {
    title: "Relationship Map",
    description: "约束关系阶段、未解冲突和互动距离。",
  },
  {
    title: "Style Card",
    description: "约束文学气质、语言肌理和意象偏好。",
  },
] as const;

const reviewScores = [
  { label: "OOC 风险", value: "低", note: "当前正文保持克制反应，未出现明显人格跳变。" },
  { label: "Canon 风险", value: "中", note: "旧都与禁卫府设定需要补充 Canon 证据校验。" },
  { label: "情绪张力", value: "较强", note: "关系张力集中在旧友婚礼和身份隐藏之间。" },
  { label: "风格匹配", value: "良好", note: "意象偏冷，叙事节奏符合疏离克制风格卡。" },
] as const;

const revisionSuggestions = [
  "保留旧友是否识破身份的悬念，不要在本章直接解释。",
  "增加一个与 Canon 证据相关的物件锚点，方便后续 Reviewer 检查。",
  "把情绪转折落在动作和站位上，减少直白心理总结。",
] as const;

const demoDraft = `教堂的钟声落下时，帝都正下着很薄的雪。

陆沉站在最后一排宾客之间，黑色礼服的袖口压得很低，刚好遮住掌心那道旧伤。三年流亡教会他如何在人群里消失：不抬头，不停留，不让任何称呼落到自己身上。

旧友的婚礼原本不该邀请他。更准确地说，不该邀请这个名字已经从王室谱系里被抹去的人。

可请柬是真的，封蜡上的纹路也是真的。它没有写王子旧名，只写了他在灰港用过的假身份。像一句没有说出口的试探，又像一条提前铺好的退路。`;

function AssetList({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          className="flex items-center justify-between rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-muted/30"
        >
          <span>{item}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function StudioPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [chapterTitle, setChapterTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<(typeof writingModes)[number]>("单章续写");
  const [wordCount, setWordCount] = useState<(typeof wordCounts)[number]>("1000 字");
  const [styleCard, setStyleCard] = useState<(typeof styleCards)[number]>("疏离克制");
  const [tension, setTension] = useState<(typeof tensions)[number]>("克制");
  const [relationshipStage, setRelationshipStage] =
    useState<(typeof relationshipStages)[number]>("分离后重逢");
  const [forbiddenItems, setForbiddenItems] = useState("不要公开暴露身份；不要直接告白。");
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  function handleContinueWriting() {
    setChapterTitle((current) => current || "第七章：旧友婚礼");
    setDraft((current) => `${current || demoDraft}\n\n他看见旧友抬起眼，隔着宾客与烛火，准确地望向他藏身的位置。那一瞬间，所有预设好的退路都变得太轻。`);
    setSavedHint(null);
  }

  function handleExpandScene() {
    setDraft((current) => `${current || demoDraft}\n\n婚礼进行曲响起前，侍从送来一枚袖扣。它被放在银盘中央，纹路朝上，像一枚迟到三年的证词。`);
    setSavedHint(null);
  }

  function handleGenerateSlice() {
    setDraft((current) => `${current || demoDraft}\n\n雨雪从彩窗外斜斜落下。旧友没有叫他的名字，只把手里的戒指盒往掌心里收了半寸，像替他挡住某个即将暴露的旧称。`);
    setSavedHint(null);
  }

  function handleSaveDraft() {
    setSavedHint("已保存本地草稿状态（MVP Demo）。");
  }

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
      <main className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col gap-6 px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border/60 pb-6">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            FanForge Studio · Unified Workspace
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              FanForge Studio
            </h1>
            <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              统一管理大纲、素材、文档和正文写作，把 Canon 证据、角色人格、人物关系、Context Engine、多 Agent 审稿和反馈闭环放进同一个创作空间。
            </p>
          </div>
        </header>

        <section className="grid min-h-[720px] grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <PanelLeft className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">项目资产栏</CardTitle>
              </div>
              <CardDescription className="text-xs">
                管理大纲、素材和文档上下文
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs defaultValue="outline">
                <TabsList className="grid h-auto w-full grid-cols-3 bg-muted/50 p-1">
                  <TabsTrigger value="outline" className="text-xs">大纲</TabsTrigger>
                  <TabsTrigger value="materials" className="text-xs">素材</TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs">文档</TabsTrigger>
                </TabsList>
                <TabsContent value="outline" className="mt-4">
                  <AssetList items={outlineItems} />
                </TabsContent>
                <TabsContent value="materials" className="mt-4">
                  <AssetList items={materialItems} />
                </TabsContent>
                <TabsContent value="docs" className="mt-4">
                  <AssetList items={documentItems} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">正文写作区</CardTitle>
              </div>
              <CardDescription className="text-xs">
                选择左侧章节或直接开始写作
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full min-h-[610px] flex-col gap-4 pt-5">
              <Input
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                placeholder="章节标题，例如：第七章：旧友婚礼"
                className="bg-background/40 text-base font-medium"
              />
              <div className="relative flex min-h-[460px] flex-1 rounded-lg border border-border/60 bg-background/40">
                {!draft.trim() ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    选择左侧章节或直接开始写作
                  </div>
                ) : null}
                <Textarea
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSavedHint(null);
                  }}
                  placeholder=""
                  className="min-h-full resize-none border-0 bg-transparent px-5 py-5 text-sm leading-8 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="h-10" onClick={handleContinueWriting}>
                  <Sparkles className="mr-2 size-4" />
                  继续写
                </Button>
                <Button variant="outline" className="h-10" onClick={handleExpandScene}>
                  扩写场景
                </Button>
                <Button variant="outline" className="h-10" onClick={handleGenerateSlice}>
                  生成情绪切片
                </Button>
                <Button variant="outline" className="h-10" onClick={handleSaveDraft}>
                  <Save className="mr-2 size-4" />
                  保存草稿
                </Button>
                {savedHint ? (
                  <span className="text-xs text-muted-foreground">{savedHint}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">AI 参数与审稿栏</CardTitle>
              </div>
              <CardDescription className="text-xs">
                控制 Writer 输入，并查看 Reviewer mock 反馈
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs defaultValue="params">
                <TabsList className="grid h-auto w-full grid-cols-2 bg-muted/50 p-1">
                  <TabsTrigger value="params" className="text-xs">创作参数</TabsTrigger>
                  <TabsTrigger value="review" className="text-xs">审稿助手</TabsTrigger>
                </TabsList>

                <TabsContent value="params" className="mt-4 flex flex-col gap-4">
                  <ParamSelect label="创作模式" value={mode} values={writingModes} onChange={(value) => setMode(value as (typeof writingModes)[number])} />
                  <ParamSelect label="期望字数" value={wordCount} values={wordCounts} onChange={(value) => setWordCount(value as (typeof wordCounts)[number])} />
                  <ParamSelect label="文学气质" value={styleCard} values={styleCards} onChange={(value) => setStyleCard(value as (typeof styleCards)[number])} />
                  <ParamSelect label="情绪张力" value={tension} values={tensions} onChange={(value) => setTension(value as (typeof tensions)[number])} />
                  <ParamSelect label="关系阶段" value={relationshipStage} values={relationshipStages} onChange={(value) => setRelationshipStage(value as (typeof relationshipStages)[number])} />
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      禁止项
                    </span>
                    <Textarea
                      value={forbiddenItems}
                      onChange={(event) => setForbiddenItems(event.target.value)}
                      className="min-h-20 resize-none bg-background/40 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      Context Engine 开关
                    </span>
                    {contextSwitches.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-md border border-border/50 bg-muted/15 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-foreground/90">
                            {item.title}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            已启用
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="review" className="mt-4 flex flex-col gap-4">
                  {reviewScores.map((score) => (
                    <div
                      key={score.label}
                      className="rounded-md border border-border/50 bg-muted/15 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {score.label}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {score.value}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {score.note}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        修改建议
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                      <li>保留身份隐藏悬念，让旧友识破与否延后揭示。</li>
                      <li>增加一个 Canon 物件证据，方便后续章节回收。</li>
                      <li>情绪转折尽量落在动作、站位和物象上。</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <p className="rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          当前为 Studio MVP Demo：用于展示 FanForge 如何把大纲、素材、文档和 AI
          写作参数整合到一个创作空间；后续可接入真实数据库、RAG 和 Writer / Reviewer API。
        </p>
      </main>
    </div>
  );
}

function ParamSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-background/40">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="w-[var(--radix-select-trigger-width)]"
        >
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
