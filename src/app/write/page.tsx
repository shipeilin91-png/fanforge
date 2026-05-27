"use client";

import { BookOpenText, Layers, PenLine, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

const writingModes = ["单章续写", "长篇大纲", "场景扩写", "结局改写"] as const;
const wordCounts = ["1000 字", "2000 字", "3000 字", "自定义"] as const;

const contextItems = [
  {
    title: "Canon Evidence",
    enabled: true,
    constraint: "原作硬设定、时间线、身份信息与世界观规则。",
    writerImpact: "限制章节中的事件顺序、称呼、能力使用和设定新增，降低 Canon 冲突。",
  },
  {
    title: "Persona Map",
    enabled: true,
    constraint: "角色人格内核、人生阶段、行为模式与 OOC 边界。",
    writerImpact: "约束角色在冲突中的反应方式，避免突然告白、突然崩坏或动机断裂。",
  },
  {
    title: "Relationship Map",
    enabled: true,
    constraint: "人物关系阶段、隐藏情绪、未解冲突和可埋伏笔。",
    writerImpact: "决定互动距离、冲突升级节奏和章节结尾可留下的关系钩子。",
  },
  {
    title: "Style Card",
    enabled: true,
    constraint: "文学气质、语言肌理、句式密度和意象偏好。",
    writerImpact: "影响叙述节奏、环境描写比例和情绪表达方式，让长文风格保持一致。",
  },
  {
    title: "User Intent",
    enabled: true,
    constraint: "用户自由输入的剧情目标、本章任务和禁止项。",
    writerImpact: "把本章目标转成 Writer Agent 的章节结构规划，而不是只生成短片段。",
  },
] as const;

type ChapterResult = {
  draft: string;
  contextNotes: string[];
  foreshadowHints: string[];
  nextChapterSuggestions: string[];
};

function buildMockChapterDraft(mode: string, target: string, plot: string): ChapterResult {
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
    setResult(buildMockChapterDraft(mode, chapterGoal, plotInput));
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
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Longform Writing · Context Engine
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              同人章节写作工作台
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              面向长文、章节续写和连载创作，基于 FanForge Context Engine
              组织原作、角色、关系和风格上下文。
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            当前为 MVP Demo，后续可将 Context Engine 接入真实 Writer API 和 RAG 检索结果。
          </Badge>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="gap-2 border-b border-border/60 pb-5">
              <div className="flex items-center gap-2">
                <PenLine className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">创作输入区</CardTitle>
              </div>
              <CardDescription className="text-xs">
                长文模式会先组织章节目标和上下文，再生成草稿。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-5">
              <div className="flex flex-col gap-2">
                <FieldLabel>创作模式</FieldLabel>
                <Select value={mode} onValueChange={(value) => setMode(value as (typeof writingModes)[number])}>
                  <SelectTrigger className="w-full bg-background/40">
                    <SelectValue placeholder="选择创作模式" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                    {writingModes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>本章目标</FieldLabel>
                <Textarea
                  value={chapterGoal}
                  onChange={(event) => setChapterGoal(event.target.value)}
                  placeholder="例如：让主角在婚礼现场确认旧友是否已经认出自己的真实身份。"
                  className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>剧情输入</FieldLabel>
                <Textarea
                  value={plotInput}
                  onChange={(event) => setPlotInput(event.target.value)}
                  placeholder="例如：主角在流亡三年后回到帝都，但必须隐藏身份参加旧友的婚礼……"
                  className="min-h-32 resize-none bg-background/40 text-sm leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>期望字数</FieldLabel>
                <Select value={wordCount} onValueChange={(value) => setWordCount(value as (typeof wordCounts)[number])}>
                  <SelectTrigger className="w-full bg-background/40">
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
                    className="bg-background/40"
                  />
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>文风要求</FieldLabel>
                <Textarea
                  value={styleRequest}
                  onChange={(event) => setStyleRequest(event.target.value)}
                  placeholder="例如：叙事克制，少解释心理，多用环境和动作推进关系。"
                  className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>禁止项</FieldLabel>
                <Textarea
                  value={forbiddenItems}
                  onChange={(event) => setForbiddenItems(event.target.value)}
                  placeholder="例如：不要公开暴露身份；不要直接告白；不要新增未解释的魔法能力。"
                  className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
                />
              </div>

              <Button className="h-11 w-full" onClick={handleGenerateDraft}>
                生成章节草稿
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-border/80 bg-card/80">
              <CardHeader className="gap-2 border-b border-border/60 pb-5">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">Context Engine</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  本次章节生成会把这些上下文传递给 Writer Agent
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-2">
                {contextItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <Badge variant={item.enabled ? "secondary" : "outline"} className="text-[10px]">
                        {item.enabled ? "已启用" : "未启用"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      约束：{item.constraint}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      影响 Writer：{item.writerImpact}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/80">
              <CardHeader className="gap-2 border-b border-border/60 pb-5">
                <div className="flex items-center gap-2">
                  <BookOpenText className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">章节生成结果</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  输出长文结构草稿、上下文说明、伏笔和下一章衔接建议
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 pt-5">
                {result ? (
                  <>
                    <div className="rounded-lg border border-border/50 bg-background/40 px-4 py-4 text-sm leading-8 text-foreground/90">
                      {result.draft.split("\n\n").map((paragraph) => (
                        <p key={paragraph} className="mb-4 whitespace-pre-line last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    <ResultList title="使用到的上下文说明" items={result.contextNotes} />
                    <ResultList title="伏笔提示" items={result.foreshadowHints} />
                    <ResultList title="下一章衔接建议" items={result.nextChapterSuggestions} />
                  </>
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                    点击「生成章节草稿」后，这里会展示长文结构草稿和 Context Engine 使用说明。
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={item}
            className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
          >
            <span className="mr-2 font-mono text-[10px] text-muted-foreground/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
