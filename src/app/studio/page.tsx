"use client";

import Link from "next/link";
import {
  BookOpenText,
  ExternalLink,
  FileText,
  PanelLeft,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

type AssetTab = "outline" | "materials" | "docs";
type Asset = {
  id: string;
  title: string;
  description: string;
  source?: "/persona" | "/canon";
  chapterTitle?: string;
};

type ReviewResult = {
  scores: { label: string; value: string; note: string }[];
  suggestions: string[];
};

const assets: Record<AssetTab, Asset[]> = {
  outline: [
    {
      id: "chapter-1",
      title: "第一章：旧友婚礼",
      description: "主角隐姓埋名回到帝都，在旧友婚礼上确认对方是否认出自己。",
      chapterTitle: "第一章：旧友婚礼",
    },
    {
      id: "chapter-2",
      title: "第二章：雨夜重逢",
      description: "婚礼后的雨夜，两人在无人回廊短暂对峙，关系进入试探阶段。",
      chapterTitle: "第二章：雨夜重逢",
    },
    {
      id: "chapter-3",
      title: "第三章：身份暴露",
      description: "禁卫府发现旧徽章线索，主角真实身份开始逼近暴露。",
      chapterTitle: "第三章：身份暴露",
    },
    {
      id: "foreshadow-badge",
      title: "伏笔节点：旧徽章",
      description: "旧徽章连接宫变夜、旧友沉默和北塔禁令，是后续回收线索。",
    },
  ],
  materials: [
    {
      id: "persona",
      title: "角色人格",
      description: "来自 /persona：核心人格内核、人生阶段和 OOC 边界。",
      source: "/persona",
    },
    {
      id: "relationship",
      title: "人物关系",
      description: "来自 /persona：人物关系阶段、隐藏情绪、未解冲突和可埋伏笔。",
      source: "/persona",
    },
    {
      id: "worldbuilding",
      title: "世界观设定",
      description: "帝国政体、禁卫府权限、誓印规则和王城地理约束。",
    },
    {
      id: "canon",
      title: "Canon 证据",
      description: "来自 /canon：原作硬设定、时间线、身份信息和证据片段。",
      source: "/canon",
    },
    {
      id: "style-card",
      title: "文学气质风格卡",
      description: "当前风格摘要：疏离克制，短句与停顿偏多，情绪落在动作、旧物、雨雪和站位上。",
    },
  ],
  docs: [
    {
      id: "origin-snippet",
      title: "原作片段",
      description: "摘录的原作段落，用于辅助 Canon 判断和语气参考。",
    },
    {
      id: "uploads",
      title: "用户上传资料",
      description: "用户补充的人设、同人设定、连载大纲和章节规划。",
    },
    {
      id: "drafts",
      title: "章节草稿",
      description: "Studio 中保存的本地 Demo 草稿记录。",
    },
    {
      id: "review-logs",
      title: "审稿记录",
      description: "Reviewer / Criticizer 的历史审稿结论和修改建议。",
    },
  ],
};

const writingModes = ["情绪切片", "单章续写", "场景扩写", "结局改写"] as const;
const wordCounts = ["500", "1000", "2000", "3000"] as const;
const styleCards = ["疏离克制", "温润烟火", "冷艳华美", "青春酸涩"] as const;
const tensions = ["克制", "拉扯", "爆发", "余韵"] as const;
const relationshipStages = [
  "初识",
  "分离后重逢",
  "信任破裂",
  "共同作战",
] as const;

const contextSwitches = [
  {
    title: "Canon Evidence",
    source: "/canon",
    description: "已启用，来自 /canon，约束时间线、身份和世界观硬设定。",
  },
  {
    title: "Persona Map",
    source: "/persona",
    description: "已启用，来自 /persona，约束角色人格内核和 OOC 边界。",
  },
  {
    title: "Relationship Map",
    source: "/persona",
    description: "已启用，来自 /persona，约束关系阶段、冲突和互动距离。",
  },
  {
    title: "Style Card",
    source: null,
    description: "已启用，来自当前参数，约束文学气质、语言肌理和意象偏好。",
  },
] as const;

const tabLabels: Record<AssetTab, string> = {
  outline: "大纲",
  materials: "素材",
  docs: "文档",
};

function buildReviewResult(draft: string): ReviewResult {
  const hasCanonSignal = /徽章|誓印|帝都|禁卫府|王城/.test(draft);
  const hasEmotionSignal = /沉默|旧友|雨|雪|旧伤|停顿/.test(draft);

  return {
    scores: [
      {
        label: "OOC 风险",
        value: draft.length > 180 ? "低" : "中",
        note: "角色仍以克制、试探和风险计算行动，没有突然转向直白表达。",
      },
      {
        label: "Canon 风险",
        value: hasCanonSignal ? "低" : "中",
        note: hasCanonSignal
          ? "正文含有可回扣的 Canon 物件或地点，可交给证据引擎继续校验。"
          : "缺少明确 Canon 锚点，建议补入身份、时间线或世界观证据。",
      },
      {
        label: "情绪张力",
        value: hasEmotionSignal ? "较强" : "偏弱",
        note: hasEmotionSignal
          ? "情绪主要由旧友、沉默和环境意象承载，适合继续推进。"
          : "目前情绪触发点不足，可加入动作停顿、旧物或关系试探。",
      },
      {
        label: "风格匹配",
        value: "良好",
        note: "整体可保持当前文学气质，但需要避免解释性总结句过多。",
      },
    ],
    suggestions: [
      "保留身份隐藏悬念，让旧友识破与否延后揭示。",
      "增加一个 Canon 证据锚点，例如旧徽章、誓印碎片或禁卫府称号。",
      "把情绪转折落在动作、站位和物象上，减少直接心理解释。",
    ],
  };
}

export default function StudioPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [assetTab, setAssetTab] = useState<AssetTab>("outline");
  const [selectedAssetId, setSelectedAssetId] = useState("chapter-1");
  const [chapterTitle, setChapterTitle] = useState("第一章：旧友婚礼");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<(typeof writingModes)[number]>("单章续写");
  const [wordCount, setWordCount] = useState<(typeof wordCounts)[number]>("1000");
  const [styleCard, setStyleCard] = useState<(typeof styleCards)[number]>("疏离克制");
  const [tension, setTension] = useState<(typeof tensions)[number]>("克制");
  const [relationshipStage, setRelationshipStage] =
    useState<(typeof relationshipStages)[number]>("分离后重逢");
  const [forbiddenItems, setForbiddenItems] = useState("不要公开暴露身份；不要直接告白。");
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  const selectedAsset = useMemo(() => {
    return (
      assets[assetTab].find((asset) => asset.id === selectedAssetId) ??
      assets[assetTab][0]
    );
  }, [assetTab, selectedAssetId]);

  function handleSelectAsset(asset: Asset) {
    setSelectedAssetId(asset.id);
    setSavedHint(null);

    if (asset.chapterTitle) {
      setChapterTitle(asset.chapterTitle);
    }
  }

  function appendDraft(text: string) {
    setDraft((current) => `${current.trim() ? `${current}\n\n` : ""}${text}`);
    setSavedHint(null);
    setReviewError(null);
  }

  function handleContinueWriting() {
    appendDraft(
      "旧友抬眼时，正厅里的烛火轻轻晃了一下。陆沉没有回避那道视线，只把请柬折回袖中，像把自己的名字也一并藏回阴影里。",
    );
    setLastToolCall("已调用：单章续写模式");
  }

  function handleExpandScene() {
    appendDraft(
      "婚礼进行曲响起前，侍从送来一枚袖扣。银盘很冷，袖扣背面刻着一道几乎磨平的王徽，只有在雪光下才露出旧日纹路。",
    );
    setLastToolCall("已调用：场景扩写模式");
  }

  function handleGenerateSlice() {
    appendDraft(
      "雨雪从彩窗外斜斜落下。旧友没有叫他的名字，只把戒指盒往掌心里收了半寸，像替他挡住某个即将暴露的旧称。",
    );
    setLastToolCall("已调用：Slice 模式");
  }

  function handleSaveDraft() {
    setSavedHint("草稿已保存到本地 Demo 状态");
  }

  function handleReview() {
    if (!draft.trim()) {
      setReviewError("请先输入或生成正文");
      setReviewResult(null);
      return;
    }

    setReviewError(null);
    setReviewResult(buildReviewResult(draft));
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
            FanForge Studio · Main Workspace
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              FanForge Studio
            </h1>
            <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              Studio 是主创作台；Canon、人格图、情绪切片、多 Agent
              等页面作为深度编辑与独立能力页，为 Studio 提供上下文和工具能力。
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
                轻量选择资产，深度编辑跳转到独立能力页
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs
                value={assetTab}
                onValueChange={(value) => {
                  const nextTab = value as AssetTab;
                  setAssetTab(nextTab);
                  setSelectedAssetId(assets[nextTab][0]?.id ?? selectedAssetId);
                }}
              >
                <TabsList className="grid h-auto w-full grid-cols-3 bg-muted/50 p-1">
                  <TabsTrigger value="outline" className="text-xs">
                    大纲
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="text-xs">
                    素材
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs">
                    文档
                  </TabsTrigger>
                </TabsList>
                {(["outline", "materials", "docs"] as const).map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    <div className="flex flex-col gap-2">
                      {assets[tab].map((asset, index) => {
                        const isSelected =
                          assetTab === tab && selectedAssetId === asset.id;

                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => handleSelectAsset(asset)}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                              isSelected
                                ? "border-foreground/25 bg-muted/45 text-foreground"
                                : "border-border/50 bg-muted/15 text-foreground/90 hover:bg-muted/30",
                            )}
                          >
                            <span>{asset.title}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70">
            <CardHeader className="gap-3 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">正文写作区</CardTitle>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      当前资产：{selectedAsset?.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {selectedAsset?.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {tabLabels[assetTab]}
                  </Badge>
                </div>
                {selectedAsset?.title === "角色人格" ? (
                  <DeepLink href="/persona" label="打开人格图深度编辑" />
                ) : null}
                {selectedAsset?.title === "Canon 证据" ? (
                  <DeepLink href="/canon" label="打开 Canon 证据引擎" />
                ) : null}
                {selectedAsset?.title === "文学气质风格卡" ? (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    当前风格摘要：{styleCard}；建议使用停顿、环境、旧物和动作承载情绪，避免大段解释性心理描写。
                  </p>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex h-full min-h-[610px] flex-col gap-4 pt-5">
              <Input
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                placeholder="章节标题，例如：第一章：旧友婚礼"
                className="bg-background/40 text-base font-medium"
              />
              <div className="relative flex min-h-[430px] flex-1 rounded-lg border border-border/60 bg-background/40">
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
                    setReviewError(null);
                  }}
                  className="min-h-full resize-none border-0 bg-transparent px-5 py-5 text-sm leading-8 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="h-10" onClick={handleContinueWriting}>
                  <Sparkles className="mr-2 size-4" />
                  继续写
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={handleExpandScene}
                >
                  扩写场景
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={handleGenerateSlice}
                >
                  生成情绪切片
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={handleSaveDraft}
                >
                  <Save className="mr-2 size-4" />
                  保存草稿
                </Button>
                {savedHint ? (
                  <span className="text-xs text-muted-foreground">
                    {savedHint}
                  </span>
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
                Studio 只做轻量调用，深度模式由独立页面承接
              </CardDescription>
              {lastToolCall ? (
                <Badge variant="secondary" className="w-fit text-[10px]">
                  {lastToolCall}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs defaultValue="params">
                <TabsList className="grid h-auto w-full grid-cols-2 bg-muted/50 p-1">
                  <TabsTrigger value="params" className="text-xs">
                    创作参数
                  </TabsTrigger>
                  <TabsTrigger value="review" className="text-xs">
                    审稿助手
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="params" className="mt-4 flex flex-col gap-4">
                  <ParamSelect
                    label="创作模式"
                    value={mode}
                    values={writingModes}
                    onChange={(value) =>
                      setMode(value as (typeof writingModes)[number])
                    }
                  />
                  <ParamSelect
                    label="期望字数"
                    value={wordCount}
                    values={wordCounts}
                    onChange={(value) =>
                      setWordCount(value as (typeof wordCounts)[number])
                    }
                  />
                  <ParamSelect
                    label="文学气质"
                    value={styleCard}
                    values={styleCards}
                    onChange={(value) =>
                      setStyleCard(value as (typeof styleCards)[number])
                    }
                  />
                  <ParamSelect
                    label="情绪张力"
                    value={tension}
                    values={tensions}
                    onChange={(value) =>
                      setTension(value as (typeof tensions)[number])
                    }
                  />
                  <ParamSelect
                    label="关系阶段"
                    value={relationshipStage}
                    values={relationshipStages}
                    onChange={(value) =>
                      setRelationshipStage(
                        value as (typeof relationshipStages)[number],
                      )
                    }
                  />
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
                  <Button className="h-10 w-full" onClick={handleReview}>
                    运行 Reviewer 检查
                  </Button>
                  {reviewError ? (
                    <p className="text-sm text-destructive">{reviewError}</p>
                  ) : null}
                  {reviewResult ? (
                    <>
                      {reviewResult.scores.map((score) => (
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
                          {reviewResult.suggestions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-8 text-center text-sm text-muted-foreground">
                      输入正文后可运行 Reviewer mock 检查。
                    </div>
                  )}
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

function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex w-fit items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
    >
      {label}
      <ExternalLink className="size-3" />
    </Link>
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
