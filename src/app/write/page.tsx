"use client";

import { BookOpenText, Layers, PenLine, Sparkles } from "lucide-react";
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

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const writingModes = ["单章续写", "长篇大纲", "场景扩写", "结局改写"] as const;
const wordCounts = ["1000 字", "2000 字", "3000 字", "自定义"] as const;

const contextItems = [
  {
    title: "Canon Evidence",
    enabled: true,
    constraint: "约束世界观与时间线",
    writerImpact: "限制章节中的事件顺序、称呼、能力使用和设定新增，降低 Canon 冲突。",
  },
  {
    title: "Persona Map",
    enabled: true,
    constraint: "约束角色人格与 OOC 边界",
    writerImpact: "约束角色在冲突中的反应方式，避免突然告白、突然崩坏或动机断裂。",
  },
  {
    title: "Relationship Map",
    enabled: true,
    constraint: "约束关系阶段与未解冲突",
    writerImpact: "决定互动距离、冲突升级节奏和章节结尾可留下的关系钩子。",
  },
  {
    title: "Style Card",
    enabled: true,
    constraint: "影响语言肌理、意象和节奏",
    writerImpact: "影响叙述节奏、环境描写比例和情绪表达方式，让长文风格保持一致。",
  },
  {
    title: "User Intent",
    enabled: true,
    constraint: "用户输入的剧情目标",
    writerImpact: "把本章目标转成 Writer Agent 的章节结构规划，而不是只生成短片段。",
  },
] as const;

type ChapterResult = {
  draft: string;
  contextNotes: string[];
  foreshadowHints: string[];
  nextChapterSuggestions: string[];
};

function buildChapterDraft(mode: string, target: string, plot: string): ChapterResult {
  const chapterGoal =
    target.trim() || "让主角在回到帝都后完成一次身份隐藏下的关系试探";
  const plotSeed =
    plot.trim() ||
    "主角在流亡三年后回到帝都，但必须隐藏身份参加旧友的婚礼。";

  return {
    draft: [
      `【开场段】\n帝都的钟声比记忆里更冷。${plotSeed}他站在宾客队列的末尾，把请柬压在掌心，指腹刚好覆住旧日王徽的位置。大厅里所有灯都亮着，却没有一盏照向他真正的名字。`,
      `【冲突推进】\n婚礼开始前，旧友派人送来一枚没有署名的袖扣。那是三年前宫变夜遗失的样式，按理说不该出现在这里。主角必须在不暴露身份的前提下确认对方是否知情，而禁卫府的人已经守在侧门，逐一核对宾客来历。`,
      `【情绪转折】\n他原本以为自己只是回来取证，可当旧友隔着人群看向他时，那一眼没有惊讶，只有一种早已等候太久的平静。${chapterGoal}不再只是任务，它变成一条更危险的线：如果对方认出了他，却仍选择沉默，那么这场婚礼本身也许就是一场保护。`,
      `【结尾钩子】\n在「${mode}」模式下，章节不会在此处直接解谜。誓词念到一半，教堂外忽然落雪。侍从递来第二封请柬，封口处压着半枚誓印的纹路。纸上只有一句话：今晚不要去北塔。`,
    ].join("\n\n"),
    contextNotes: [
      "Canon Evidence：保留流亡三年后回帝都的时间线，不让主角公开使用王子身份。",
      "Persona Map：主角以克制、试探和风险计算推进情节，不直接解释恐惧或思念。",
      "Relationship Map：旧友关系处于未确认信任阶段，因此使用沉默、物件和站位表达保护。",
      "Style Card：使用冷光、钟声、旧物、落雪等意象维持疏离克制的章节氛围。",
      "User Intent：围绕本章目标组织开场、冲突、转折和钩子，而不是只写单个情绪瞬间。",
    ],
    foreshadowHints: [
      "袖扣可以在三章后证明旧友曾进入宫变现场。",
      "北塔禁令暗示有人利用婚礼调开禁卫府视线。",
      "落雪意象可反复出现，绑定主角与旧友共同隐瞒的过去。",
    ],
    nextChapterSuggestions: [
      "下一章可写主角是否违背警告前往北塔，制造主动选择的代价。",
      "让 Reviewer 检查王城地理、禁卫府权限和誓印规则是否冲突。",
      "把旧友的沉默延迟解释，先用行动证明其立场。",
    ],
  };
}

export default function WritePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mode, setMode] = useState<(typeof writingModes)[number]>("单章续写");
  const [chapterGoal, setChapterGoal] = useState("");
  const [plotInput, setPlotInput] = useState("");
  const [wordCount, setWordCount] = useState<(typeof wordCounts)[number]>("2000 字");
  const [customWordCount, setCustomWordCount] = useState("");
  const [styleRequest, setStyleRequest] = useState("");
  const [forbiddenItems, setForbiddenItems] = useState("");
  const [result, setResult] = useState<ChapterResult | null>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  function handleGenerateDraft() {
    setResult(buildChapterDraft(mode, chapterGoal, plotInput));
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
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[14vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CHAPTER
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[520px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          DRAFT
        </div>
        <div className="pointer-events-none absolute bottom-8 left-[28%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          LONGFORM
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              LONGFORM WRITING · CHAPTER DRAFT
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Chapter Desk
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                面向长文、章节续写和连载创作，组织原作、角色、关系和风格上下文。
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.06)]">
            <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
              <div className="border-b border-[#b9aa83]/45 px-5 py-4">
                <div className="flex items-center gap-2">
                  <PenLine className="size-4 text-[#53613b]" />
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Chapter Plan Manuscript
                  </p>
                </div>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  章节计划手稿
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                  先组织章节目标和上下文，再生成草稿。
                </p>
              </div>
              <div className="flex flex-col gap-5 p-5">
                <ParamSelect
                  label="创作模式"
                  value={mode}
                  values={writingModes}
                  onChange={(value) => setMode(value as (typeof writingModes)[number])}
                />

                <TextAreaField
                  label="本章目标"
                  value={chapterGoal}
                  onChange={setChapterGoal}
                  placeholder="例如：让主角在婚礼现场确认旧友是否已经认出自己的真实身份。"
                  minHeight="min-h-24"
                />

                <TextAreaField
                  label="剧情输入"
                  value={plotInput}
                  onChange={setPlotInput}
                  placeholder="例如：主角在流亡三年后回到帝都，但必须隐藏身份参加旧友的婚礼……"
                  minHeight="min-h-36"
                />

                <div className="flex flex-col gap-2">
                  <FieldLabel>期望字数</FieldLabel>
                  <Select
                    value={wordCount}
                    onValueChange={(value) => setWordCount(value as (typeof wordCounts)[number])}
                  >
                    <SelectTrigger className="w-full rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]">
                      <SelectValue placeholder="选择期望字数" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {wordCounts.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {wordCount === "自定义" ? (
                    <Input
                      value={customWordCount}
                      onChange={(event) => setCustomWordCount(event.target.value)}
                      placeholder="例如：4500 字"
                      className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]"
                    />
                  ) : null}
                </div>

                <TextAreaField
                  label="文风要求"
                  value={styleRequest}
                  onChange={setStyleRequest}
                  placeholder="例如：叙事克制，少解释心理，多用环境和动作推进关系。"
                  minHeight="min-h-24"
                />

                <TextAreaField
                  label="禁止项"
                  value={forbiddenItems}
                  onChange={setForbiddenItems}
                  placeholder="例如：不要公开暴露身份；不要直接告白；不要新增未解释的魔法能力。"
                  minHeight="min-h-24"
                />

                <Button
                  className="h-11 w-full rounded-xl bg-[#171410] text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                  onClick={handleGenerateDraft}
                >
                  生成章节草稿
                </Button>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#b9aa83]/45 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-[#53613b]" />
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                      Context Index Cards
                    </p>
                  </div>
                  <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                    Context Engine
                  </h2>
                </div>
                <Badge variant="outline" className="rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]">
                  已启用
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {contextItems.map((item, index) => (
                  <div
                    key={item.title}
                    className="group rounded-xl border border-[#7b8359]/22 bg-[#fffdf7] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="font-serif text-3xl leading-none text-[#53613b]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#171410]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-[#6f6759]">
                            {item.constraint}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                      >
                        {item.enabled ? "已启用" : "未启用"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
              <div className="mb-5 flex items-center gap-2 border-b border-[#b9aa83]/45 pb-5">
                <BookOpenText className="size-4 text-[#53613b]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Chapter Draft Paper
                  </p>
                  <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
                    章节生成结果
                  </h2>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                {result ? (
                  <>
                    <div className="rounded-xl border border-[#8a7c62]/28 bg-[#fffdf7] px-6 py-6 font-serif text-[16px] leading-9 text-[#211d17] shadow-[0_16px_40px_rgba(92,69,42,0.06)]">
                      {result.draft.split("\n\n").map((paragraph) => (
                        <p key={paragraph} className="mb-5 whitespace-pre-line last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    <ResultList title="使用到的上下文说明" items={result.contextNotes} />
                    <ResultList title="伏笔提示" items={result.foreshadowHints} />
                    <ResultList title="下一章衔接建议" items={result.nextChapterSuggestions} />
                  </>
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[#8a7c62]/32 bg-[#fffdf7]/74 px-4 py-8 text-center text-sm leading-7 text-[#7a705e]">
                    尚未生成章节草稿。
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6f6759]">
      {children}
    </span>
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

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${minHeight} resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17] placeholder:text-[#9a8f78]`}
      />
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[#8a7c62]/24 bg-[#fffaf0] px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-[#53613b]" />
        <h3 className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={item}
            className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#5f5849]"
          >
            <span className="font-serif text-2xl leading-none text-[#53613b]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
