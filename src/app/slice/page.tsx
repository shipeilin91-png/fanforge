"use client";

import { useMemo, useState, type ReactNode } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const RELATION_TYPES = [
  "CP",
  "宿敌",
  "师徒",
  "亲情",
  "阵营对立",
] as const;

const MOMENTS = [
  "雨夜重逢",
  "战后包扎",
  "冷战破冰",
  "旧物归还",
  "临别前一刻",
] as const;

const STAGES = ["初识", "对立", "暧昧", "冷战", "分离后重逢"] as const;

const TENSIONS = [
  "克制",
  "酸涩",
  "旧情未了",
  "保护欲",
  "共犯感",
] as const;

const VIBES = ["冷艳华美", "温润烟火", "疏离克制", "浪漫诗性"] as const;

const FORBIDDEN = [
  "禁止告白",
  "禁止拥抱",
  "禁止亲吻",
  "禁止心理解释",
  "禁止过度甜腻",
] as const;

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

function buildMockPreview(p: SliceParams): {
  fragment: string;
  structure: string[];
  constraints: string[];
} {
  const forbiddenLine =
    p.forbiddens.length > 0
      ? p.forbiddens.join(" · ")
      : "（本轮未勾选额外禁止项）";

  const fragment = [
    `${p.moment}的语境里，${p.stage}的两人像被潮水推到同一块礁石。屋檐下的雨线密得像是故意要把世界缩小成两人之间的一臂距离。谁也没有先开口——${p.tension}在空气里摊开，却比任何对白都更清晰。`,
    `其中一人把视线落在对方袖口的水痕上，像在看一段尚未愈合的旧伤；另一人只是把肩侧过去半寸，把「${p.relation}」这一层名目轻轻挡住，不叫路人窥见内里。笔触依 ${p.vibe} 的路线行走：物象偏冷，动词偏轻，情绪只从停顿与留白里渗出。`,
    `雨声盖过了心跳节拍，却仍盖不住那一次呼吸里多停留的零点几秒。写到这里，不写破、不写尽，给读者留个可以反复摩挲的切口。`,
  ].join("\n\n");

  const structure = [
    `起——以「${p.moment}」打开场景张力，让读者先撞上空间与体感（湿冷、局促、回声），再看见人物。`,
    `承——用「${p.stage}」里悬而未决的关系刻度，让读者感到两人之间有话未说、有事未了的惯性。`,
    `转——以「${p.tension}」为轴心加压：不写结论，改写几乎发生的动作与被压回去的欲望。`,
    `合——回扣「${p.relation}」：同一动作或物件出现两次位移（靠近 / 退去），留白收束而不是解释。`,
  ];

  const constraints = [
    `文学气质锚点：${p.vibe}（句式与意象围绕该气质收束，避免混搭到甜宠常用语汇）。`,
    `情绪张力：${p.tension}（禁止用旁白直接命名情绪，仅允许通过行为与节奏暗示）。`,
    `角色边界（演示）：不在此段写清两人「为何分开」的全因，只保留一枚可被读出的细节（湿袖口、旧物角、站位的半寸）。`,
    `本轮写作禁止项：${forbiddenLine}`,
  ];

  return { fragment, structure, constraints };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export default function SlicePage() {
  const [relation, setRelation] =
    useState<SliceParams["relation"]>(defaultParams.relation);
  const [moment, setMoment] = useState<SliceParams["moment"]>(
    defaultParams.moment,
  );
  const [stage, setStage] = useState<SliceParams["stage"]>(defaultParams.stage);
  const [tension, setTension] = useState<SliceParams["tension"]>(
    defaultParams.tension,
  );
  const [vibe, setVibe] = useState<SliceParams["vibe"]>(defaultParams.vibe);
  const [forbiddens, setForbiddens] = useState<
    SliceParams["forbiddens"]
  >(defaultParams.forbiddens);

  const [committed, setCommitted] = useState<SliceParams>(defaultParams);
  const [demoRun, setDemoRun] = useState(1);

  const preview = useMemo(() => buildMockPreview(committed), [committed]);

  function toggleForbidden(item: (typeof FORBIDDEN)[number]) {
    setForbiddens((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  function handleGenerate() {
    setCommitted({
      relation,
      moment,
      stage,
      tension,
      vibe,
      forbiddens: [...forbiddens],
    });
    setDemoRun((n) => n + 1);
  }

  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:gap-10 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Relationship · Emotional Slice
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              关系情绪切片生成器
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              根据关系瞬间、情绪张力、文学气质和角色边界，生成高情绪密度片段。
            </p>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <Card className="border-border/80 bg-card/80 lg:col-span-5">
            <CardHeader className="border-border/60 border-b pb-6">
              <CardTitle className="text-base">参数配置</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                下拉选择即刻写入表单；勾选禁止项将作为约束汇入预览区（演示数据）。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-6">
              <div className="flex flex-col gap-2">
                <FieldLabel>关系类型</FieldLabel>
                <Select
                  value={relation}
                  onValueChange={(v) =>
                    setRelation(v as SliceParams["relation"])
                  }
                >
                  <SelectTrigger className="w-full shadow-xs">
                    <SelectValue placeholder="选择关系类型" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                    {RELATION_TYPES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>关系瞬间</FieldLabel>
                <Select
                  value={moment}
                  onValueChange={(v) => setMoment(v as SliceParams["moment"])}
                >
                  <SelectTrigger className="w-full shadow-xs">
                    <SelectValue placeholder="选择关系瞬间" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                    {MOMENTS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>关系阶段</FieldLabel>
                <Select
                  value={stage}
                  onValueChange={(v) => setStage(v as SliceParams["stage"])}
                >
                  <SelectTrigger className="w-full shadow-xs">
                    <SelectValue placeholder="选择关系阶段" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                    {STAGES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>情绪张力</FieldLabel>
                <Select
                  value={tension}
                  onValueChange={(v) =>
                    setTension(v as SliceParams["tension"])
                  }
                >
                  <SelectTrigger className="w-full shadow-xs">
                    <SelectValue placeholder="选择情绪张力" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                    {TENSIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3">
                <FieldLabel>文学气质风格卡</FieldLabel>
                <Tabs value={vibe} onValueChange={(v) => setVibe(v as SliceParams["vibe"])}>
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1">
                    {VIBES.map((label) => (
                      <TabsTrigger
                        key={label}
                        value={label}
                        className="px-2 py-2 text-xs sm:text-sm"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent
                    value="冷艳华美"
                    className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    偏意象堆叠与金属质感，句子略长但不黏连。
                  </TabsContent>
                  <TabsContent
                    value="温润烟火"
                    className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    偏生活肌理与细碎声响，隐喻落在日常器物上。
                  </TabsContent>
                  <TabsContent
                    value="疏离克制"
                    className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    短句与停顿偏多，不写满、不写透。
                  </TabsContent>
                  <TabsContent
                    value="浪漫诗性"
                    className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    允许轻微的象征与复沓，仍以场景为底板。
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>禁止项（可多选）</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {FORBIDDEN.map((item) => (
                    <Badge
                      key={item}
                      variant={
                        forbiddens.includes(item) ? "secondary" : "outline"
                      }
                      className={cn(
                        "cursor-pointer px-3 py-1 text-xs font-normal transition-colors",
                        forbiddens.includes(item) &&
                          "border-transparent bg-muted text-foreground",
                      )}
                      onClick={() => toggleForbidden(item)}
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 lg:col-span-7">
            <CardHeader className="border-border/60 border-b pb-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">生成结果预览</CardTitle>
                  <CardDescription className="text-xs">
                    Writer Agent 输出（静态演示）· 第 {demoRun} 次同步参数
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  Demo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-8 pt-6">
              <section className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    片段正文
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Writer Agent
                  </Badge>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-4 text-sm leading-8 text-foreground/90">
                  {preview.fragment.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-4 last:mb-0">
                      {para}
                    </p>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  情绪结构说明
                </span>
                <ul className="list-none space-y-2 rounded-lg border border-border/40 bg-muted/15 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                  {preview.structure.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-xs text-muted-foreground/70">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  使用到的角色约束
                </span>
                <div className="flex flex-col gap-2">
                  {preview.constraints.map((line, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-dashed border-foreground/10 bg-card/40 px-3 py-3 text-xs leading-relaxed text-muted-foreground"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        <footer className="flex flex-col gap-4 border-t border-border/60 pt-8">
          <p className="text-xs text-muted-foreground">
            以下为演示链路：点击下方按钮会将左侧参数写入右侧预览文案（仍非真实模型调用）。
          </p>
          <Button size="lg" className="h-11 max-w-xs" onClick={handleGenerate}>
            生成情绪切片
          </Button>
        </footer>
      </div>
    </div>
  );
}
