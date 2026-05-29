"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const RELATION_TYPES = ["CP", "宿敌", "师徒", "亲情", "阵营对立"] as const;
const MOMENTS = ["雨夜重逢", "战后包扎", "冷战破冰", "旧物归还", "临别前一刻"] as const;
const STAGES = ["初识", "对立", "暧昧", "冷战", "分离后重逢"] as const;
const TENSIONS = ["克制", "酸涩", "旧情未了", "保护欲", "共犯感"] as const;
const VIBES = ["冷艳华美", "温润烟火", "疏离克制", "浪漫诗性"] as const;
const FORBIDDEN = ["禁止告白", "禁止拥抱", "禁止亲吻", "禁止心理解释", "禁止过度甜腻"] as const;
const WORD_COUNTS = ["300 字", "500 字", "800 字", "自定义"] as const;
const FEEDBACK_TAGS = ["满意", "OOC", "情绪不够", "风格不对", "Canon 冲突", "想要更克制"] as const;

const STYLE_DESCRIPTIONS: Record<(typeof VIBES)[number], string> = {
  冷艳华美: "语言更冷、更锋利，意象偏金属、雨、灯影、冷色。",
  温润烟火: "语言更柔和，意象偏饭菜、灯火、旧物、日常器物。",
  疏离克制: "语言减少直白情绪，更多停顿、动作和未说出口的话。",
  浪漫诗性: "语言更有节奏和意象，但避免堆砌辞藻。",
};

const FEEDBACK_STORAGE_KEY = "fanforge-feedback-records";
const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

type SliceParams = {
  relation: (typeof RELATION_TYPES)[number];
  moment: (typeof MOMENTS)[number];
  stage: (typeof STAGES)[number];
  tension: (typeof TENSIONS)[number];
  vibe: (typeof VIBES)[number];
  forbiddens: (typeof FORBIDDEN)[number][];
};

const defaultParams: SliceParams = {
  relation: "CP",
  moment: "雨夜重逢",
  stage: "分离后重逢",
  tension: "克制",
  vibe: "疏离克制",
  forbiddens: ["禁止告白", "禁止过度甜腻"],
};

type SlicePreview = {
  fragment: string;
  structure: string[];
  constraints: string[];
};

type FeedbackRecord = {
  id: string;
  createdAt: string;
  scenarioText: string;
  targetLength: string;
  styleRequirement: string;
  selectedTags: string[];
  comment: string;
  generatedPreview: string;
};

function relationCue(relation: SliceParams["relation"]) {
  const cues: Record<SliceParams["relation"], string> = {
    CP: "未曾说破的牵连",
    宿敌: "针锋相对的旧日默契",
    师徒: "克制照拂里的分寸",
    亲情: "不必解释的牵挂",
    阵营对立: "立场相背时的迟疑",
  };

  return cues[relation];
}

function buildPreviewFallback(p: SliceParams, runIndex: number): SlicePreview {
  const variant = runIndex % 3;
  const relationshipCue = relationCue(p.relation);

  const fragments: string[] = [
    [
      `雨声把街灯洗得发白，沈砚和林栀被迫停在同一处屋檐下。${p.moment}让${p.stage}里残留的熟悉重新浮出来，两个人都看见了，却谁也没有先认。`,
      `“你还是走这条路。”林栀说。`,
      `沈砚把伞往她那边偏了半寸：“只是顺路。”`,
      `${p.tension}压在这句顺路里，没有再往前走。林栀低头看见他袖口湿透，想提醒，又把声音吞回去，只让指尖在包带上收紧。雨水顺着檐角落下，一滴一滴，把他们之间那点旧事敲得很轻。`,
    ].join("\n\n"),
    [
      `${p.moment}来得太突然，林栀手里的旧信封被雨气浸软，边角贴在掌心。沈砚站在台阶下，隔着一层水光看她，像隔着五年没有拆开的信。`,
      `“还给你。”她说。`,
      `“你留着也可以。”沈砚的声音很低，低到几乎被雨声盖过去。`,
      `${p.stage}把他们挡在原地，${p.tension}却从那只没有伸出去的手里慢慢漫开。林栀没有追问，他也没有解释，只在她转身时把伞柄推到她能够碰到的位置。`,
    ].join("\n\n"),
    [
      `廊下的风带着${p.moment}特有的冷意。沈砚替林栀挡了一下被风卷来的水汽，动作很轻，轻到像随手，却又精准得不像随手。`,
      `“不用。”林栀往后退了半步。`,
      `“我知道。”沈砚说，“只是风太大。”`,
      `${relationshipCue}停在那半步里，${p.stage}的旧痕也停在那半步里。林栀看着沈砚肩头很快被雨打深，忽然想起从前他也总是这样，把多余的狼狈藏在沉默背后。`,
    ].join("\n\n"),
  ];

  const structureSets: string[][] = [
    [
      `起：以「${p.moment}」打开场景张力，让读者先撞上空间与体感，再看见人物。`,
      `承：用「${p.stage}」里悬而未决的关系刻度，让读者感到两人有话未说、有事未了。`,
      `转：以「${p.tension}」为轴心加压，不写结论，改写几乎发生的动作。`,
      `合：回扣「${p.relation}」，用靠近与退去的位移收束留白。`,
    ],
    [
      `起：用「${p.moment}」的环境声与光线建立压迫感，人物从物象中显影。`,
      `承：「${p.stage}」提供关系刻度，他们共享一段历史，却不敢轻易动用。`,
      `转：旧物、站位、视线构成「${p.tension}」的三重暗示。`,
      `合：以 ${p.vibe} 气质收束，末句落在可触细节上。`,
    ],
    [
      `起：「${p.moment}」作为情绪扳机，先写风、光、声，再写人。`,
      `承：「${p.stage}」决定两人默认距离，所有靠近都应是意外或不得已。`,
      `转：用未完成动作承载「${p.tension}」，让读者替人物把话说完。`,
      `合：禁止项内化收束，在「${p.relation}」框架下，用克制替代宣泄。`,
    ],
  ];

  const constraintSets: string[][] = [
    [
      `文学气质锚点：${p.vibe}，句式与意象围绕该气质收束，避免混搭到甜宠常用语汇。`,
      `情绪张力：${p.tension}，禁止用旁白直接命名情绪，仅允许通过行为与节奏暗示。`,
      `角色边界：不在此段写清两人为何分开，只保留一枚可被读出的细节。`,
      `禁止项会作为边界约束，不进入正文解释。`,
    ],
    [
      `关系瞬间：${p.moment}，环境细节须服务瞬间，不得写成泛化的伤感。`,
      `关系阶段：${p.stage}，对白密度压低，用动作与物件承担叙事。`,
      `文学气质：${p.vibe} · 情绪张力：${p.tension}，二者冲突时，以气质优先收束句式。`,
      `禁止项会作为边界约束，不进入正文解释。`,
    ],
    [
      `关系类型：${p.relation}，互动须符合该关系的社会语境与风险感。`,
      `情绪张力：${p.tension}，允许差一点的肢体距离，禁止一步到位。`,
      `风格卡：${p.vibe}，末段建议落在可触物象，避免抽象总结句。`,
      `禁止项会作为边界约束，不进入正文解释。`,
    ],
  ];

  return {
    fragment: fragments[variant]!,
    structure: structureSets[variant]!,
    constraints: constraintSets[variant]!,
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6f6759]">
      {children}
    </span>
  );
}

export default function SlicePage() {
  const router = useRouter();
  const [relation, setRelation] =
    useState<SliceParams["relation"]>(defaultParams.relation);
  const [moment, setMoment] = useState<SliceParams["moment"]>(defaultParams.moment);
  const [stage, setStage] = useState<SliceParams["stage"]>(defaultParams.stage);
  const [tension, setTension] = useState<SliceParams["tension"]>(defaultParams.tension);
  const [vibe, setVibe] = useState<SliceParams["vibe"]>(defaultParams.vibe);
  const [forbiddens, setForbiddens] =
    useState<SliceParams["forbiddens"]>(defaultParams.forbiddens);
  const [characterNames, setCharacterNames] = useState("");
  const [relationshipTypeCustom, setRelationshipTypeCustom] = useState("");
  const [momentCustom, setMomentCustom] = useState("");
  const [stageCustom, setStageCustom] = useState("");
  const [tensionCustom, setTensionCustom] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [wordCount, setWordCount] = useState<(typeof WORD_COUNTS)[number]>("500 字");
  const [customLength, setCustomLength] = useState("500");
  const [styleCustom, setStyleCustom] = useState("");
  const [forbiddenCustom, setForbiddenCustom] = useState("");
  const [feedbackTags, setFeedbackTags] = useState<(typeof FEEDBACK_TAGS)[number][]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [savedFeedback, setSavedFeedback] = useState<FeedbackRecord | null>(null);
  const [generationRun, setGenerationRun] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<SlicePreview>(() =>
    buildPreviewFallback(defaultParams, 1),
  );
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
      <div className="flex min-h-full items-center justify-center bg-[#f3ead7] text-sm text-[#6f6759]">
        正在检查登录状态……
      </div>
    );
  }

  function currentParams(): SliceParams {
    return { relation, moment, stage, tension, vibe, forbiddens };
  }

  function toggleForbidden(item: (typeof FORBIDDEN)[number]) {
    setForbiddens((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  function getTargetLength() {
    const parsed = Number(customLength);
    if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 1500) {
      return `${Math.round(parsed)} 字`;
    }

    return wordCount;
  }

  function saveFeedbackRecord(tags: string[] = feedbackTags, comment = feedbackText) {
    if (typeof window === "undefined") return;
    if (tags.length === 0 && comment.trim() === "") return;

    const record: FeedbackRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      scenarioText: momentCustom || sceneDescription,
      targetLength: getTargetLength(),
      styleRequirement: styleCustom,
      selectedTags: tags,
      comment,
      generatedPreview: preview.fragment.replace(/\s+/g, " ").slice(0, 80),
    };

    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    let existing: FeedbackRecord[] = [];

    try {
      const parsed = raw ? JSON.parse(raw) : [];
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }

    window.localStorage.setItem(
      FEEDBACK_STORAGE_KEY,
      JSON.stringify([record, ...existing]),
    );
    setSavedFeedback(record);
  }

  function toggleFeedbackTag(item: (typeof FEEDBACK_TAGS)[number]) {
    const next = feedbackTags.includes(item)
      ? feedbackTags.filter((x) => x !== item)
      : [...feedbackTags, item];

    setFeedbackTags(next);
    saveFeedbackRecord(next, feedbackText);
  }

  async function handleGenerate() {
    if (isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionData.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch("/api/writer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          characterNames,
          relationshipType: relation,
          relationshipTypeCustom,
          moment,
          momentCustom,
          stage,
          stageCustom,
          tension,
          tensionCustom,
          expectedLength: wordCount,
          customLength,
          styleCard: vibe,
          styleCustom,
          forbiddenItems: [...forbiddens],
          forbiddenCustom,
          sceneDescription,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as {
        text: string;
        emotionStructure: string;
        characterConstraints: string;
      };

      setPreview({
        fragment: data.text,
        structure: data.emotionStructure
          .split("\n")
          .filter((l) => l.trim() !== ""),
        constraints: data.characterConstraints
          .split("\n")
          .filter((l) => l.trim() !== ""),
      });
      setGenerationRun((n) => n + 1);
    } catch {
      const nextRun = generationRun + 1;
      setPreview(buildPreviewFallback(currentParams(), nextRun));
      setGenerationRun(nextRun);
      setErrorMsg("已生成预览，请检查参数与输出。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-full overflow-hidden bg-[#f6efdf] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[16vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          SLICE
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[500px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          TENSION
        </div>
        <div className="pointer-events-none absolute bottom-10 left-[30%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          MOMENT
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              EMOTIONAL SLICE · RELATIONSHIP MOMENT
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Emotion Slice
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                把关系瞬间、关系阶段、情绪张力和文学气质压缩成高密度短片段。
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.06)] lg:col-span-5">
            <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
              <div className="border-b border-[#b9aa83]/45 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Writing Parameters
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  创作参数手稿
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                  结构化参数约束角色边界，自由描述补充具体场景意图。
                </p>
              </div>

              <div className="flex flex-col gap-6 p-5">
                <div className="flex flex-col gap-2">
                  <FieldLabel>CP / 角色姓名</FieldLabel>
                  <Input
                    value={characterNames}
                    onChange={(event) => setCharacterNames(event.target.value)}
                    placeholder="例如：沈砚 × 林栀；如果留空，系统会自动生成临时姓名。"
                    className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>自由场景描述</FieldLabel>
                  <Textarea
                    value={sceneDescription}
                    onChange={(event) => setSceneDescription(event.target.value)}
                    placeholder="例如：我想写他们在大雪夜重逢，但两个人都假装不认识对方；其中一人明明担心对方，却只用刻薄的话掩饰。"
                    className="min-h-32 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] px-4 py-4 text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ParamSelect label="关系类型" value={relation} values={RELATION_TYPES} onChange={(v) => setRelation(v as SliceParams["relation"])} />
                  <ParamSelect label="关系瞬间" value={moment} values={MOMENTS} onChange={(v) => setMoment(v as SliceParams["moment"])} />
                  <ParamSelect label="关系阶段" value={stage} values={STAGES} onChange={(v) => setStage(v as SliceParams["stage"])} />
                  <ParamSelect label="情绪张力" value={tension} values={TENSIONS} onChange={(v) => setTension(v as SliceParams["tension"])} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <FieldLabel>关系类型补充</FieldLabel>
                    <Textarea
                      value={relationshipTypeCustom}
                      onChange={(event) => setRelationshipTypeCustom(event.target.value)}
                      placeholder="补充关系设定，例如：名义婚约、旧友重逢、宿敌合作、互相亏欠。"
                      className="min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel>关系阶段补充</FieldLabel>
                    <Textarea
                      value={stageCustom}
                      onChange={(event) => setStageCustom(event.target.value)}
                      placeholder="补充阶段细节，例如：分离五年后重逢，仍然熟悉但不敢越界。"
                      className="min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>关系瞬间自由输入</FieldLabel>
                  <Textarea
                    value={momentCustom}
                    onChange={(event) => setMomentCustom(event.target.value)}
                    placeholder="具体描述你想写的瞬间，例如：雨夜里两人躲在同一处屋檐下，谁都没有先开口。"
                    className="min-h-28 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>情绪张力补充</FieldLabel>
                  <Textarea
                    value={tensionCustom}
                    onChange={(event) => setTensionCustom(event.target.value)}
                    placeholder="你希望这段的情绪如何推进？例如：表面克制，内里酸涩，有一点旧情未了。"
                    className="min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>期望字数</FieldLabel>
                  <Select
                    value={wordCount}
                    onValueChange={(v) => setWordCount(v as (typeof WORD_COUNTS)[number])}
                  >
                    <SelectTrigger className="w-full rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]">
                      <SelectValue placeholder="选择期望字数" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {WORD_COUNTS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={100}
                    max={1500}
                    value={customLength}
                    onChange={(event) => setCustomLength(event.target.value)}
                    placeholder="自定义字数"
                    className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <FieldLabel>文学气质风格卡</FieldLabel>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#8a7c62]/28 bg-[#fbf7ed] p-2">
                    {VIBES.map((label) => {
                      const selected = vibe === label;

                      return (
                        <button
                          key={label}
                          type="button"
                          className={cn(
                            "flex h-14 min-h-[52px] items-center justify-center rounded-xl border px-3 text-center text-sm font-medium text-[#5f5849] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#fffdf7]",
                            selected
                              ? "border-[#53613b]/55 bg-[#fffdf7] text-[#28331f] shadow-[0_8px_20px_rgba(83,97,59,0.12)]"
                              : "border-[#8a7c62]/18 bg-[#f8f0df]",
                          )}
                          onClick={() => setVibe(label)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#6f6759]">
                    {STYLE_DESCRIPTIONS[vibe]}
                  </div>
                  <Textarea
                    value={styleCustom}
                    onChange={(event) => setStyleCustom(event.target.value)}
                    placeholder="补充你想要的语言风格，例如：少一点华丽辞藻，多一点动作和沉默。"
                    className="min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>禁止项（可多选）</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {FORBIDDEN.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className={cn(
                          "cursor-pointer rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] px-3 py-1 text-xs font-normal text-[#6f6759] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#e7ead4]",
                          forbiddens.includes(item) &&
                            "border-[#53613b]/45 bg-[#e7ead4] text-[#3f4b2f]",
                        )}
                        onClick={() => toggleForbidden(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>禁止项补充</FieldLabel>
                  <Textarea
                    value={forbiddenCustom}
                    onChange={(event) => setForbiddenCustom(event.target.value)}
                    placeholder="额外禁止项，例如：不要直接表白，不要拥抱，不要解释心理活动。"
                    className="min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                  />
                </div>

                <Button
                  size="lg"
                  className="h-11 w-full rounded-xl bg-[#171410] text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Writer 生成中..." : "生成情绪切片"}
                </Button>
                {errorMsg ? <p className="text-sm text-[#7f3326]">{errorMsg}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)] lg:col-span-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#b9aa83]/45 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Literary Fragment
                </p>
                <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
                  短篇稿纸
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-3">
                <div
                  className={cn(
                    "rounded-xl border border-[#8a7c62]/28 bg-[#fffdf7] px-6 py-6 font-serif text-[16px] leading-9 text-[#211d17] shadow-[0_16px_40px_rgba(92,69,42,0.06)] transition-opacity",
                    isGenerating && "opacity-50",
                  )}
                >
                  {isGenerating ? (
                    <p className="text-[#7a705e]">正在根据当前参数生成片段…</p>
                  ) : (
                    preview.fragment.split("\n\n").map((para, i) => (
                      <p key={i} className="mb-5 last:mb-0">
                        {para}
                      </p>
                    ))
                  )}
                </div>
              </section>

              <InfoSection title="情绪结构">
                <ol className={cn("space-y-3 transition-opacity", isGenerating && "opacity-50")}>
                  {preview.structure.map((line, i) => (
                    <li key={i} className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 text-sm leading-7 text-[#5f5849]">
                      <span className="font-serif text-2xl leading-none text-[#53613b]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </InfoSection>

              <InfoSection title="使用到的约束">
                <div className={cn("grid gap-2 transition-opacity", isGenerating && "opacity-50")}>
                  {preview.constraints.map((line, i) => (
                    <div key={i} className="rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#5f5849]">
                      {line}
                    </div>
                  ))}
                </div>
              </InfoSection>

              <InfoSection title="风格卡影响">
                <p className="text-sm leading-7 text-[#5f5849]">
                  当前风格卡为「{vibe}」，会影响句长、意象密度、动作留白和情绪显影方式；与「{tension}」冲突时，优先让文字保持 FanForge 的角色一致性。
                </p>
              </InfoSection>

              <section className="border-t border-[#b9aa83]/45 pt-6">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Reader / Editor Note
                  </p>
                  <h3 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                    本次生成反馈
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TAGS.map((item) => (
                    <Badge
                      key={item}
                      variant="outline"
                      className={cn(
                        "cursor-pointer rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] px-3 py-1 text-xs font-normal text-[#6f6759] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#e7ead4]",
                        feedbackTags.includes(item) &&
                          "border-[#53613b]/45 bg-[#e7ead4] text-[#3f4b2f]",
                      )}
                      onClick={() => toggleFeedbackTag(item)}
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder="可以写下你觉得哪里不像角色、哪里情绪不够、哪里需要修改……"
                  className="mt-4 min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]"
                />
                <Button
                  variant="outline"
                  className="mt-3 h-10 w-full rounded-xl border-[#53613b]/35 bg-[#fffaf0] text-[#28331f] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/70 hover:bg-[#e7ead4] sm:w-fit"
                  onClick={() => saveFeedbackRecord()}
                  disabled={feedbackTags.length === 0 && !feedbackText.trim()}
                >
                  记录本轮反馈
                </Button>
                {savedFeedback ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#5f5849]">
                    <p className="font-medium text-[#171410]">已记录本轮反馈</p>
                    {(savedFeedback?.selectedTags.length ?? 0) > 0 ? (
                      <p className="mt-2">反馈标签：{savedFeedback?.selectedTags.join("、")}</p>
                    ) : null}
                    {savedFeedback?.comment.trim() ? (
                      <p className="mt-2">文字反馈：{savedFeedback.comment}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </div>
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
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
          {values.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#8a7c62]/24 bg-[#fffaf0] px-4 py-4">
      <h3 className="mb-3 font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
        {title}
      </h3>
      {children}
    </section>
  );
}
