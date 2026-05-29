"use client";

import Link from "next/link";
import {
  BookOpenText,
  Brain,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  Library,
  MessageSquareText,
  PanelLeft,
  PenLine,
  Save,
  SearchCheck,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

type AssetTab = "outline" | "materials" | "docs";
type Asset = {
  id: string;
  title: string;
  description: string;
  source?: "/persona" | "/canon" | "/slice" | "/agents";
  sourceLabel?: string;
  chapterTitle?: string;
  meta: string;
  status: string;
};

type ReviewResult = {
  scores: { label: string; value: string; note: string }[];
  suggestions: string[];
};

type ChapterGenerationResult = {
  usedContext: string[];
  foreshadowingNotes: string[];
  nextChapterHooks: string[];
};

type SliceGenerationResult = {
  emotionStructure: string[];
  characterConstraints: string[];
};

const assets: Record<AssetTab, Asset[]> = {
  outline: [
    {
      id: "chapter-1",
      title: "第一章：旧友婚礼",
      description: "主角隐姓埋名回到帝都，在旧友婚礼上确认对方是否认出自己。",
      chapterTitle: "第一章：旧友婚礼",
      meta: "Chapter",
      status: "正在写",
    },
    {
      id: "chapter-2",
      title: "第二章：雨夜重逢",
      description: "婚礼后的雨夜，两人在无人回廊短暂对峙，关系进入试探阶段。",
      chapterTitle: "第二章：雨夜重逢",
      meta: "Chapter",
      status: "待铺垫",
    },
    {
      id: "chapter-3",
      title: "第三章：身份暴露",
      description: "禁卫府发现旧徽章线索，主角真实身份开始逼近暴露。",
      chapterTitle: "第三章：身份暴露",
      meta: "Chapter",
      status: "高风险",
    },
    {
      id: "foreshadow-badge",
      title: "伏笔节点：旧徽章",
      description: "旧徽章连接宫变夜、旧友沉默和北塔禁令，是后续回收线索。",
      meta: "Foreshadow",
      status: "需回收",
    },
  ],
  materials: [
    {
      id: "persona",
      title: "角色人格",
      description: "来自 /persona：核心人格内核、人生阶段和 OOC 边界。",
      source: "/persona",
      sourceLabel: "Persona Map",
      meta: "Character",
      status: "已启用",
    },
    {
      id: "relationship",
      title: "人物关系",
      description: "来自 /persona：人物关系阶段、隐藏情绪、未解冲突和可埋伏笔。",
      source: "/persona",
      sourceLabel: "Relationship",
      meta: "Relation",
      status: "已启用",
    },
    {
      id: "worldbuilding",
      title: "世界观设定",
      description: "帝国政体、禁卫府权限、誓印规则和王城地理约束。",
      meta: "World",
      status: "已索引",
    },
    {
      id: "canon",
      title: "Canon 证据",
      description: "来自 /canon：原作硬设定、时间线、身份信息和证据片段。",
      source: "/canon",
      sourceLabel: "Canon Evidence",
      meta: "Evidence",
      status: "已锁定",
    },
    {
      id: "style-card",
      title: "文学气质风格卡",
      description:
        "当前风格摘要：疏离克制，短句与停顿偏多，情绪落在动作、旧物、雨雪和站位上。",
      meta: "Style",
      status: "已匹配",
    },
  ],
  docs: [
    {
      id: "origin-snippet",
      title: "原作片段",
      description: "摘录的原作段落，用于辅助 Canon 判断和语气参考。",
      meta: "Quote",
      status: "可引用",
    },
    {
      id: "uploads",
      title: "用户上传资料",
      description: "用户补充的人设、同人设定、连载大纲和章节规划。",
      meta: "Upload",
      status: "3 份",
    },
    {
      id: "drafts",
      title: "章节草稿",
      description: "Studio 中保存的本地草稿记录。",
      meta: "Draft",
      status: "本地",
    },
    {
      id: "review-logs",
      title: "审稿记录",
      description: "Reviewer / Criticizer 的历史审稿结论和修改建议。",
      source: "/agents",
      sourceLabel: "Agent Desk",
      meta: "Review",
      status: "可追溯",
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

const tabLabels: Record<AssetTab, string> = {
  outline: "大纲",
  materials: "素材",
  docs: "文档",
};

const tabNotes: Record<AssetTab, string> = {
  outline: "章节骨架、伏笔和节奏节点",
  materials: "人格、关系、Canon 与风格约束",
  docs: "原作摘录、上传资料和审稿记录",
};

const contextModules = [
  {
    title: "Canon Evidence",
    source: "/canon",
    icon: SearchCheck,
    cardClass:
      "border-[#53613b]/35 bg-[#eef1df]/80 hover:border-[#53613b]/60",
    dotClass: "bg-[#53613b]",
    iconClass: "text-[#53613b]",
  },
  {
    title: "Persona Map",
    source: "/persona",
    icon: Brain,
    cardClass:
      "border-[#9a7f45]/35 bg-[#f1e7cf]/80 hover:border-[#9a7f45]/60",
    dotClass: "bg-[#8a6f38]",
    iconClass: "text-[#8a6f38]",
  },
  {
    title: "Relationship Map",
    source: "/persona",
    icon: GitBranch,
    cardClass:
      "border-[#66745b]/35 bg-[#edf0e2]/80 hover:border-[#66745b]/60",
    dotClass: "bg-[#66745b]",
    iconClass: "text-[#66745b]",
  },
  {
    title: "Style Card",
    source: null,
    icon: MessageSquareText,
    cardClass:
      "border-[#8d6f58]/35 bg-[#f3e6d5]/80 hover:border-[#8d6f58]/60",
    dotClass: "bg-[#8d6f58]",
    iconClass: "text-[#8d6f58]",
  },
] as const;

function parseTargetLength(input: unknown, fallback = 1000) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input);
  }

  if (typeof input === "string") {
    const matched = input.match(/\d+/);
    if (matched) return Number(matched[0]);
  }

  return fallback;
}

function getLengthRange(targetLength: number) {
  const ratio = targetLength <= 300 ? 0.2 : 0.15;

  return {
    min: Math.floor(targetLength * (1 - ratio)),
    max: Math.ceil(targetLength * (1 + ratio)),
  };
}

function lengthStatus(currentLength: number, targetLength: number) {
  const range = getLengthRange(targetLength);

  if (currentLength < range.min) return "低于目标，可继续扩写";
  if (currentLength > range.max) return "已超过目标";
  return "接近目标";
}

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
  const [outlineAssets, setOutlineAssets] = useState<Asset[]>(assets.outline);
  const [selectedAssetId, setSelectedAssetId] = useState("chapter-1");
  const [chapterTitle, setChapterTitle] = useState("第一章：旧友婚礼");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<(typeof writingModes)[number]>("单章续写");
  const [wordCount, setWordCount] = useState<(typeof wordCounts)[number]>("1000");
  const [styleCard, setStyleCard] =
    useState<(typeof styleCards)[number]>("疏离克制");
  const [tension, setTension] = useState<(typeof tensions)[number]>("克制");
  const [relationshipStage, setRelationshipStage] =
    useState<(typeof relationshipStages)[number]>("分离后重逢");
  const [forbiddenItems, setForbiddenItems] = useState(
    "不要公开暴露身份；不要直接告白。",
  );
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<
    "continue" | "expand" | "slice" | null
  >(null);
  const [chapterGenerationResult, setChapterGenerationResult] =
    useState<ChapterGenerationResult | null>(null);
  const [sliceGenerationResult, setSliceGenerationResult] =
    useState<SliceGenerationResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  const activeAssets = useMemo(
    () => ({
      ...assets,
      outline: outlineAssets,
    }),
    [outlineAssets],
  );

  const selectedAsset = useMemo(() => {
    return (
      activeAssets[assetTab].find((asset) => asset.id === selectedAssetId) ??
      activeAssets[assetTab][0]
    );
  }, [activeAssets, assetTab, selectedAssetId]);
  const targetLength = parseTargetLength(wordCount, 1000);
  const currentLength = draft.length;
  const currentLengthStatus = lengthStatus(currentLength, targetLength);

  function handleTabChange(value: string) {
    const nextTab = value as AssetTab;
    const firstAsset = activeAssets[nextTab][0];

    setAssetTab(nextTab);
    setSelectedAssetId(firstAsset.id);
    setSavedHint(null);

    if (firstAsset.chapterTitle) {
      setChapterTitle(firstAsset.chapterTitle);
    }
  }

  function handleSelectAsset(asset: Asset) {
    setSelectedAssetId(asset.id);
    setSavedHint(null);

    if (asset.chapterTitle) {
      setChapterTitle(asset.chapterTitle);
    }
  }

  function handleAddChapter() {
    const nextNumber =
      outlineAssets.filter((asset) => asset.chapterTitle).length + 1;
    const title = `新章节 ${nextNumber}`;
    const newChapter: Asset = {
      id: `new-chapter-${nextNumber}-${Date.now()}`,
      title,
      description: "新建章节，可继续补全本章目标、场景节奏和正文草稿。",
      chapterTitle: title,
      meta: "CHAPTER",
      status: "新建",
    };

    setOutlineAssets((current) => [...current, newChapter]);
    setAssetTab("outline");
    setSelectedAssetId(newChapter.id);
    setChapterTitle(title);
    setSavedHint(null);
  }

  function appendDraft(text: string) {
    setDraft((current) => `${current.trim() ? `${current}\n\n` : ""}${text}`);
    setSavedHint(null);
    setReviewError(null);
    setGenerationError(null);
  }

  async function requestHeaders() {
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }

    return headers;
  }

  function requestErrorMessage(status: number) {
    return status === 400
      ? "生成失败，请检查模型设置。OpenAI API Key 未配置时可切换 FanForge Free Model。"
      : "生成失败，请稍后重试。";
  }

  async function handleChapterGeneration(kind: "continue" | "expand") {
    if (generationStatus) return;

    setGenerationStatus(kind);
    setGenerationError(null);

    try {
      const response = await fetch("/api/chapter", {
        method: "POST",
        headers: await requestHeaders(),
        body: JSON.stringify({
          mode: kind === "continue" ? "continue" : "expand_scene",
          chapterTitle,
          chapterGoal:
            kind === "continue"
              ? "延续当前章节正文，保持角色关系和上下文一致"
              : "扩写当前场景，增加动作、对话、情绪推进和场景细节",
          plotInput: draft,
          expectedLength: wordCount,
          styleRequirement: styleCard,
          forbiddenItems,
          canonContext: "Canon Evidence 已启用，约束世界观、身份信息和时间线。",
          personaContext: "Persona Map 已启用，约束角色人格和 OOC 边界。",
          relationshipContext: `Relationship Map 已启用，当前关系阶段：${relationshipStage}。`,
          previousChapterSummary: draft.trim()
            ? draft.trim().slice(0, 600)
            : selectedAsset?.description,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;

        throw new Error(
          payload?.error || payload?.message || requestErrorMessage(response.status),
        );
      }

      const data = (await response.json()) as {
        draft: string;
        usedContext: string[];
        foreshadowingNotes: string[];
        nextChapterHooks: string[];
      };

      appendDraft(data.draft);
      setChapterGenerationResult({
        usedContext: data.usedContext,
        foreshadowingNotes: data.foreshadowingNotes,
        nextChapterHooks: data.nextChapterHooks,
      });
      setSliceGenerationResult(null);
      setLastToolCall(kind === "continue" ? "本次调用：单章续写" : "本次调用：场景扩写");
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "生成失败，请检查模型设置。",
      );
    } finally {
      setGenerationStatus(null);
    }
  }

  async function handleContinueWriting() {
    await handleChapterGeneration("continue");
  }

  async function handleExpandScene() {
    await handleChapterGeneration("expand");
  }

  async function handleGenerateSlice() {
    if (generationStatus) return;

    setGenerationStatus("slice");
    setGenerationError(null);

    try {
      const lastParagraph =
        draft
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean)
          .at(-1) ?? "";
      const response = await fetch("/api/writer", {
        method: "POST",
        headers: await requestHeaders(),
        body: JSON.stringify({
          characterNames: "",
          relationshipType: "角色关系",
          relationshipTypeFinal: relationshipStage,
          moment: "当前章节瞬间",
          momentFinal: [chapterTitle, lastParagraph].filter(Boolean).join("："),
          stage: relationshipStage,
          stageFinal: relationshipStage,
          tension,
          tensionFinal: tension,
          expectedLength: wordCount,
          customLength: "",
          styleCard,
          styleCustom: "",
          forbiddenItems: forbiddenItems
            ? forbiddenItems.split(/[；;、\n]/).filter(Boolean)
            : [],
          forbiddenCustom: "",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;

        throw new Error(
          payload?.error || payload?.message || requestErrorMessage(response.status),
        );
      }

      const data = (await response.json()) as {
        text: string;
        emotionStructure: string[];
        characterConstraints: string[];
      };

      appendDraft(data.text);
      setSliceGenerationResult({
        emotionStructure: data.emotionStructure,
        characterConstraints: data.characterConstraints,
      });
      setChapterGenerationResult(null);
      setLastToolCall("本次调用：Slice 模式");
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "生成失败，请检查模型设置。",
      );
    } finally {
      setGenerationStatus(null);
    }
  }

  function handleSaveDraft() {
    setSavedHint("草稿已保存");
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
      <div className="flex min-h-full items-center justify-center bg-[#f3ead7] text-sm text-[#6f6759]">
        正在检查登录状态……
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-hidden bg-[#f6efdf] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1540px] flex-col gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute left-[-7vw] top-24 hidden text-[14vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          STUDIO
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[420px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          DRAFT
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-5xl">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#6f6759]">
                FanForge Studio · Editorial Workspace
              </span>
              <h1 className="mt-3 font-serif text-[clamp(3.5rem,9vw,8.5rem)] font-semibold leading-[0.82] tracking-[-0.04em] text-[#171410]">
                Writing Desk
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label="Context Engine" tone="moss" />
              <StatusPill label="Canon Locked" tone="gold" />
              <StatusPill label="Reviewer Ready" tone="ink" />
            </div>
          </div>
        </header>

        <section className="relative grid min-h-[760px] grid-cols-1 gap-4 xl:grid-cols-[294px_minmax(0,1fr)_356px]">
          <aside className="border border-[#7b8359]/35 bg-[#f7efe0]/86 shadow-[0_18px_50px_rgba(92,69,42,0.08)]">
            <div className="border-b border-[#8a7c62]/25 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Library className="size-4 text-[#53613b]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#171410]">
                      项目资产栏
                    </h2>
                    <p className="text-xs text-[#6f6759]">
                      Project archive
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-[#8a7c62]/30 bg-[#fbf5e8] text-[10px] text-[#6f6759]"
                >
                  Archive
                </Badge>
              </div>
            </div>

            <Tabs value={assetTab} onValueChange={handleTabChange}>
              <div className="px-4 pt-4">
                <TabsList className="grid h-10 w-full grid-cols-3 border border-[#7b8359]/25 bg-[#f8f0df] p-1">
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
                <p className="mt-3 text-xs leading-relaxed text-[#7a705e]">
                  {tabNotes[assetTab]}
                </p>
                {assetTab === "outline" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-9 w-full justify-center border-[#53613b]/35 bg-[#fffaf0] text-xs text-[#28331f] hover:-translate-y-0.5 hover:border-[#53613b]/65 hover:bg-[#eef1df]"
                    onClick={handleAddChapter}
                  >
                    + 新增章节
                  </Button>
                ) : null}
              </div>

              {(["outline", "materials", "docs"] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="flex flex-col gap-2 px-3 py-4">
                    {activeAssets[tab].map((asset) => {
                      const isSelected =
                        assetTab === tab && selectedAssetId === asset.id;

                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelectAsset(asset)}
                          className={cn(
                            "group border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                            isSelected
                              ? "border-[#53613b]/65 bg-[#e5ead4] text-[#171410] shadow-[0_8px_22px_rgba(63,75,47,0.14)]"
                              : "border-[#9a7f45]/20 bg-[#fffaf0]/78 text-[#332d24] hover:border-[#53613b]/35 hover:bg-[#fffdf7]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-medium leading-5">
                              {asset.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 border-[#171410]/15 bg-transparent text-[10px] text-[#7a705e]",
                                isSelected && "border-[#53613b]/45 text-[#3f4b2f]",
                              )}
                            >
                              {asset.status}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#8a7c62]">
                            <span>{asset.meta}</span>
                            {asset.sourceLabel ? (
                              <span>{asset.sourceLabel}</span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            <div className="border border-[#9a7f45]/30 bg-[#fffaf0]/86 px-5 py-4 shadow-[0_14px_44px_rgba(92,69,42,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-[#9a7f45]/30 bg-[#f0e4cc] text-[10px] text-[#6f6759]"
                    >
                      {tabLabels[assetTab]}
                    </Badge>
                    {selectedAsset?.source ? (
                      <Badge
                        variant="outline"
                        className="border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                      >
                        来自 {selectedAsset.source}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-[#8a7c62]/35 bg-transparent text-[10px] text-[#6f6759]"
                      >
                        Studio 本地上下文
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-2 truncate font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                    {selectedAsset?.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5f5849]">
                    {selectedAsset?.description}
                  </p>
                </div>
                <ContextDeepLink asset={selectedAsset} />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              {contextModules.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className={cn(
                      "rounded-[24px] border px-3.5 py-3.5 transition-all duration-200 hover:-translate-y-0.5",
                      item.cardClass,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("size-3.5", item.iconClass)} />
                        <span className="text-xs font-semibold text-[#171410]">
                          {item.title}
                        </span>
                      </div>
                      <span
                        className={cn("size-1.5 rounded-full", item.dotClass)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-1 flex-col gap-4 border border-[#9a7f45]/35 bg-[#fbf7ed]/78 p-4 shadow-[0_20px_64px_rgba(92,69,42,0.08)]">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#6f6759]">
                  章节标题
                </label>
                <Input
                  value={chapterTitle}
                  onChange={(event) => setChapterTitle(event.target.value)}
                  placeholder="章节标题，例如：第一章：旧友婚礼"
                  className="h-12 border-[#9a7f45]/35 bg-[#fffaf0] font-serif text-xl text-[#171410] placeholder:text-[#9a8f78]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-2 text-xs text-[#6f6759]">
                <span>目标字数：{targetLength}</span>
                <span className="text-[#b9aa83]">/</span>
                <span>当前字数：{currentLength}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-[#8a7c62]/24 bg-[#fbf5e8] text-[10px]",
                    currentLengthStatus === "接近目标" &&
                      "border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
                    currentLengthStatus === "已超过目标" &&
                      "border-[#9a7f45]/35 bg-[#efe2c7] text-[#6f5f3f]",
                    currentLengthStatus === "低于目标，可继续扩写" &&
                      "border-[#8a3f30]/25 bg-[#f3d8cc] text-[#7f3326]",
                  )}
                >
                  {currentLengthStatus}
                </Badge>
              </div>

              <div className="relative flex min-h-[470px] flex-1 overflow-hidden border border-[#8a6f38]/35 bg-[#fffaf0] shadow-[0_18px_44px_rgba(92,69,42,0.09)]">
                <Textarea
                  value={draft}
                  placeholder="从这里开始写。"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSavedHint(null);
                    setReviewError(null);
                  }}
                  className="min-h-full resize-none border-0 bg-transparent px-7 py-7 font-serif text-[16px] leading-9 text-[#211d17] shadow-none placeholder:text-[#9a8f78] focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-[#b9aa83]/55 pt-4">
                <Button
                  className="h-10 bg-[#171410] px-4 text-[#f8f0df] hover:-translate-y-0.5 hover:bg-[#28331f]"
                  onClick={handleContinueWriting}
                  disabled={generationStatus !== null}
                >
                  <Sparkles className="mr-2 size-4" />
                  {generationStatus === "continue" ? "续写中..." : "继续写"}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-[#53613b]/35 bg-[#fbf5e8] text-[#28331f] hover:-translate-y-0.5 hover:border-[#53613b]/70 hover:bg-[#e7ead4]"
                  onClick={handleExpandScene}
                  disabled={generationStatus !== null}
                >
                  <BookOpenText className="mr-2 size-4" />
                  {generationStatus === "expand" ? "扩写中..." : "扩写场景"}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-[#53613b]/35 bg-[#fbf5e8] text-[#28331f] hover:-translate-y-0.5 hover:border-[#53613b]/70 hover:bg-[#e7ead4]"
                  onClick={handleGenerateSlice}
                  disabled={generationStatus !== null}
                >
                  <PenLine className="mr-2 size-4" />
                  {generationStatus === "slice" ? "生成中..." : "生成情绪切片"}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-[#171410]/18 bg-[#fbf5e8] text-[#171410] hover:-translate-y-0.5 hover:border-[#171410]/35 hover:bg-[#fff8ea]"
                  onClick={handleSaveDraft}
                >
                  <Save className="mr-2 size-4" />
                  保存草稿
                </Button>
                {savedHint ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#3f4b2f]">
                    <CheckCircle2 className="size-3.5" />
                    {savedHint}
                  </span>
                ) : null}
                {generationError ? (
                  <span className="text-xs text-[#7f3326]">
                    {generationError}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="border border-[#8a7c62]/35 bg-[#fffaf0]/84 shadow-[0_18px_50px_rgba(92,69,42,0.06)]">
            <div className="border-b border-[#8a7c62]/28 px-4 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#53613b]" />
                <div>
                  <h2 className="text-sm font-semibold text-[#171410]">
                    AI 参数与审稿栏
                  </h2>
                  <p className="text-xs text-[#6f6759]">
                    Editorial notes panel
                  </p>
                </div>
              </div>
              {lastToolCall ? (
                <Badge
                  variant="outline"
                  className="mt-3 w-fit border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                >
                  {lastToolCall}
                </Badge>
              ) : null}
            </div>

            <Tabs defaultValue="params" className="px-4 py-4">
              <TabsList className="grid h-10 w-full grid-cols-2 border border-[#8a7c62]/30 bg-[#fbf7ed] p-1">
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
                  <span className="text-xs font-medium text-[#6f6759]">
                    禁止项
                  </span>
                  <Textarea
                    value={forbiddenItems}
                    onChange={(event) => setForbiddenItems(event.target.value)}
                    className="min-h-20 resize-none border-[#8a7c62]/30 bg-[#fffaf0] text-sm leading-relaxed text-[#211d17]"
                  />
                </div>

                <div className="border-t border-[#b9aa83]/55 pt-4">
                  <h3 className="text-xs font-medium text-[#6f6759]">
                    Context Engine
                  </h3>
                  <div className="mt-3 grid gap-2">
                    {contextModules.map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#7b8359]/24 bg-[#fffdf7] px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45"
                      >
                        <span className="text-xs font-medium text-[#171410]">
                          {item.title}
                        </span>
                        <span className="flex h-5 w-9 items-center rounded-full border border-[#53613b]/35 bg-[#dfe6c7] p-0.5 shadow-inner">
                          <span className="ml-auto size-3.5 rounded-full bg-[#53613b] shadow-[0_1px_3px_rgba(23,20,16,0.22)]" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="review" className="mt-4 flex flex-col gap-4">
                <Button
                  className="h-10 w-full bg-[#171410] text-[#f8f0df] hover:-translate-y-0.5 hover:bg-[#28331f]"
                  onClick={handleReview}
                >
                  <ShieldCheck className="mr-2 size-4" />
                  运行 Reviewer 检查
                </Button>
                {reviewError ? (
                  <div className="border border-[#8a3f30]/25 bg-[#f3d8cc] px-3 py-2 text-sm text-[#7f3326]">
                    {reviewError}
                  </div>
                ) : null}
                {reviewResult ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {reviewResult.scores.map((score) => (
                        <div
                          key={score.label}
                          className="border border-[#171410]/12 bg-[#f8f0df] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-[#332d24]">
                              {score.label}
                            </span>
                            <Badge
                              variant="outline"
                              className="border-[#53613b]/35 bg-transparent text-[10px] text-[#3f4b2f]"
                            >
                              {score.value}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[#7a705e]">
                            {score.note}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border border-[#8a7c62]/30 bg-[#efe2c7] px-3 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText className="size-4 text-[#53613b]" />
                        <span className="text-sm font-medium text-[#171410]">
                          修改建议
                        </span>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed text-[#5f5849]">
                        {reviewResult.suggestions.map((item) => (
                          <li key={item}>· {item}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="border border-dashed border-[#171410]/20 bg-[#f8f0df]/70 px-3 py-8 text-center text-sm leading-relaxed text-[#7a705e]">
                    Reviewer 会在有正文后返回 OOC、Canon、情绪张力和风格匹配四项评分。
                  </div>
                )}
                {chapterGenerationResult ? (
                  <div className="grid gap-3">
                    <GenerationList
                      title="使用到的上下文"
                      items={chapterGenerationResult.usedContext}
                    />
                    <GenerationList
                      title="伏笔提示"
                      items={chapterGenerationResult.foreshadowingNotes}
                    />
                    <GenerationList
                      title="下一章钩子"
                      items={chapterGenerationResult.nextChapterHooks}
                    />
                  </div>
                ) : null}
                {sliceGenerationResult ? (
                  <div className="grid gap-3">
                    <GenerationList
                      title="情绪结构"
                      items={sliceGenerationResult.emotionStructure}
                    />
                    <GenerationList
                      title="使用到的约束"
                      items={sliceGenerationResult.characterConstraints}
                    />
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </aside>
        </section>
      </main>
    </div>
  );
}

function ContextDeepLink({ asset }: { asset?: Asset }) {
  if (!asset?.source) {
    return (
      <div className="flex shrink-0 items-center gap-2 border border-[#171410]/12 bg-[#f8f0df] px-3 py-2 text-xs text-[#6f6759]">
        <PanelLeft className="size-3.5" />
        已同步到编辑器
      </div>
    );
  }

  const label =
    asset.title === "角色人格"
      ? "打开人格图深度编辑"
      : asset.title === "Canon 证据"
        ? "打开 Canon 证据引擎"
        : `打开 ${asset.source}`;

  return (
    <Link
      href={asset.source}
      className="inline-flex shrink-0 items-center gap-1.5 border border-[#53613b]/35 bg-[#e7ead4] px-3 py-2 text-xs text-[#3f4b2f] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/70 hover:bg-[#dfe6c7]"
    >
      {label}
      <ExternalLink className="size-3.5" />
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
      <span className="text-xs font-medium text-[#6f6759]">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-[#171410]/15 bg-[#f8f0df] text-[#211d17]">
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

function GenerationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#8a7c62]/28 bg-[#fffdf7] px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-3.5 text-[#53613b]" />
        <span className="text-sm font-medium text-[#171410]">{title}</span>
      </div>
      <ul className="space-y-2 text-xs leading-relaxed text-[#5f5849]">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "moss" | "gold" | "ink";
}) {
  const tones = {
    moss: "border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
    gold: "border-[#8a7c62]/30 bg-[#efe2c7] text-[#6f5f3f]",
    ink: "border-[#171410]/20 bg-[#fbf5e8] text-[#171410]",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}
