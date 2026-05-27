"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { memo, useState, type ReactNode } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PersonaNodeData = {
  title: string;
  body: string;
  tag?: string;
};

type CoreNode = Node<PersonaNodeData, "core">;
type StageNode = Node<PersonaNodeData, "stage">;
type EventNode = Node<PersonaNodeData, "event">;
type ThreadNode = Node<PersonaNodeData, "thread">;

const handleClassName =
  "!size-2 !border-border !bg-muted-foreground/40 !opacity-0";

function CoreNode({ data }: NodeProps<CoreNode>) {
  return (
    <div className="w-[300px] rounded-xl border border-foreground/20 bg-card px-5 py-4 shadow-md ring-1 ring-foreground/10">
      <Badge variant="outline" className="mb-2 text-[10px] tracking-widest uppercase">
        {data.tag ?? "Core"}
      </Badge>
      <p className="text-base font-medium text-foreground">{data.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {data.body}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClassName}
      />
    </div>
  );
}

function StageNode({ data }: NodeProps<StageNode>) {
  return (
    <div className="w-[220px] rounded-lg border border-border/80 bg-card/90 px-4 py-3 shadow-sm">
      <Badge variant="secondary" className="mb-2 text-[10px]">
        {data.tag ?? "Stage"}
      </Badge>
      <p className="text-sm font-medium text-foreground">{data.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {data.body}
      </p>
      <Handle
        type="target"
        position={Position.Top}
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClassName}
      />
    </div>
  );
}

function EventNode({ data }: NodeProps<EventNode>) {
  return (
    <div className="w-[240px] rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <Badge variant="outline" className="mb-2 text-[10px] text-muted-foreground">
        {data.tag ?? "Event"}
      </Badge>
      <p className="text-sm font-medium text-foreground">{data.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {data.body}
      </p>
      <Handle
        type="target"
        position={Position.Top}
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClassName}
      />
    </div>
  );
}

function ThreadNode({ data }: NodeProps<ThreadNode>) {
  return (
    <div className="w-[260px] rounded-lg border border-dashed border-foreground/15 bg-card/50 px-4 py-3">
      <Badge
        variant="outline"
        className="mb-2 border-dashed text-[10px] text-muted-foreground"
      >
        {data.tag ?? "Thread"}
      </Badge>
      <p className="text-sm font-medium text-foreground/90">{data.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {data.body}
      </p>
      <Handle
        type="target"
        position={Position.Top}
        className={handleClassName}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClassName}
      />
    </div>
  );
}

const nodeTypes = {
  core: memo(CoreNode),
  stage: memo(StageNode),
  event: memo(EventNode),
  thread: memo(ThreadNode),
};

type PersonaForm = {
  name: string;
  identity: string;
  corePersonality: string;
  lifeStages: string;
  keyEvents: string;
  relationshipPattern: string;
  oocBoundaries: string;
};

const defaultPersona: PersonaForm = {
  name: "苏砚",
  identity: "没落帝国王子 / 流亡阵营的名义继承人",
  corePersonality:
    "外冷内温，责任先于自我。习惯用理性与沉默掩盖不安；只有在重要的人面前，才会短暂卸下防备。",
  lifeStages:
    "童年在宫廷礼法与权力窥视中长大；少年时期经历政变与流亡；成年后以顾问身份潜伏在新政权边缘。",
  keyEvents:
    "雨夜宫变中失去亲族，被迫放弃王储身份；少年时被友人救下，自此对承诺和背叛高度敏感。",
  relationshipPattern:
    "亲密关系里先保持距离，用讽刺和礼貌作为防御机制；真正担心对方时会先处理危险，再解释情绪。",
  oocBoundaries:
    "禁止突然热烈告白；禁止轻易示弱求安慰；禁止在关系未推进前主动拥抱或撒娇；禁止把责任完全推给他人。",
};

const edgeStyle = { stroke: "rgba(255,255,255,0.22)", strokeWidth: 1.5 };
const threadEdgeStyle = {
  stroke: "rgba(255,255,255,0.14)",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};

function createPersonaNodes(form: PersonaForm): Node<PersonaNodeData>[] {
  const name = form.name.trim() || defaultPersona.name;
  const identity = form.identity.trim() || defaultPersona.identity;
  const corePersonality =
    form.corePersonality.trim() || defaultPersona.corePersonality;
  const lifeStages = form.lifeStages.trim() || defaultPersona.lifeStages;
  const keyEvents = form.keyEvents.trim() || defaultPersona.keyEvents;
  const relationshipPattern =
    form.relationshipPattern.trim() || defaultPersona.relationshipPattern;
  const oocBoundaries = form.oocBoundaries.trim() || defaultPersona.oocBoundaries;

  return [
    {
      id: "core",
      type: "core",
      position: { x: 310, y: 0 },
      data: {
        tag: "人格内核",
        title: `${name} · 核心人格内核`,
        body: corePersonality,
      },
    },
    {
      id: "identity",
      type: "stage",
      position: { x: 0, y: 160 },
      data: {
        tag: "原作身份",
        title: "身份 / 阵营",
        body: identity,
      },
    },
    {
      id: "life-stage",
      type: "stage",
      position: { x: 300, y: 160 },
      data: {
        tag: "人生阶段",
        title: "阶段轨迹",
        body: lifeStages,
      },
    },
    {
      id: "relationship",
      type: "stage",
      position: { x: 600, y: 160 },
      data: {
        tag: "关系模式",
        title: "关系模式 / 防御机制",
        body: relationshipPattern,
      },
    },
    {
      id: "key-event",
      type: "event",
      position: { x: 120, y: 340 },
      data: {
        tag: "关键事件",
        title: "关键事件 / 创伤经历",
        body: keyEvents,
      },
    },
    {
      id: "foreshadow",
      type: "thread",
      position: { x: 300, y: 520 },
      data: {
        tag: "伏笔暗线",
        title: "可复用写作暗线",
        body: `由「${keyEvents.slice(0, 42)}${keyEvents.length > 42 ? "..." : ""}」延伸：后续关系戏可反复回扣承诺、身份暴露和未说出口的保护欲。`,
      },
    },
    {
      id: "ooc-boundary",
      type: "thread",
      position: { x: 600, y: 340 },
      data: {
        tag: "OOC 边界",
        title: "禁止越界写法",
        body: oocBoundaries,
      },
    },
  ];
}

const generatedEdges: Edge[] = [
  {
    id: "e-core-identity",
    source: "core",
    target: "identity",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-core-life-stage",
    source: "core",
    target: "life-stage",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-core-relationship",
    source: "core",
    target: "relationship",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-life-event",
    source: "life-stage",
    target: "key-event",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-event-thread",
    source: "key-event",
    target: "foreshadow",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
  {
    id: "e-relationship-ooc",
    source: "relationship",
    target: "ooc-boundary",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
  {
    id: "e-ooc-thread",
    source: "ooc-boundary",
    target: "foreshadow",
    targetHandle: "left",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
];

const legend = [
  { label: "人格内核", className: "border-foreground/20 bg-card" },
  { label: "人生阶段", className: "border-border/80 bg-card/90" },
  { label: "关键事件", className: "border-border/60 bg-muted/30" },
  { label: "伏笔 / 暗线", className: "border-dashed border-foreground/15 bg-card/50" },
] as const;

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export default function PersonaPage() {
  const [form, setForm] = useState<PersonaForm>(defaultPersona);
  const [nodes, setNodes] = useState<Node<PersonaNodeData>[]>(() =>
    createPersonaNodes(defaultPersona),
  );
  const [edges, setEdges] = useState<Edge[]>(generatedEdges);
  const [activeName, setActiveName] = useState(defaultPersona.name);

  function updateField(field: keyof PersonaForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleGeneratePersonaMap() {
    setNodes(createPersonaNodes(form));
    setEdges(generatedEdges);
    setActiveName(form.name.trim() || defaultPersona.name);
  }

  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-10 py-14 lg:px-14 lg:py-16">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Character · Persona Map
          </span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                角色人格思维导图
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                将角色拆分为核心人格、人生阶段、关键事件与伏笔暗线，形成可检索的写作参照树。
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              当前角色 · {activeName}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            {legend.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className={cn(
                    "size-3 rounded-sm border",
                    item.className
                  )}
                />
                {item.label}
              </div>
            ))}
          </div>
        </header>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="border-border/60 border-b pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">角色信息输入区</CardTitle>
                <CardDescription className="mt-1 text-xs leading-relaxed">
                  当前为 MVP Demo：人格图由结构化输入生成，后续可接入 LLM 自动抽取角色人格。
                </CardDescription>
              </div>
              <Button
                className="h-10 shrink-0"
                onClick={handleGeneratePersonaMap}
              >
                生成人格思维导图
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel>角色姓名</FieldLabel>
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="例如：苏砚"
                className="bg-background/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>原作身份 / 所属阵营</FieldLabel>
              <Input
                value={form.identity}
                onChange={(event) =>
                  updateField("identity", event.target.value)
                }
                placeholder="例如：没落帝国王子 / 流亡阵营"
                className="bg-background/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>核心人格描述</FieldLabel>
              <Textarea
                value={form.corePersonality}
                onChange={(event) =>
                  updateField("corePersonality", event.target.value)
                }
                className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>关键人生阶段</FieldLabel>
              <Textarea
                value={form.lifeStages}
                onChange={(event) =>
                  updateField("lifeStages", event.target.value)
                }
                className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>关键事件 / 创伤经历</FieldLabel>
              <Textarea
                value={form.keyEvents}
                onChange={(event) =>
                  updateField("keyEvents", event.target.value)
                }
                className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>关系模式 / 防御机制</FieldLabel>
              <Textarea
                value={form.relationshipPattern}
                onChange={(event) =>
                  updateField("relationshipPattern", event.target.value)
                }
                className="min-h-24 resize-none bg-background/40 text-sm leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <FieldLabel>禁止 OOC 点</FieldLabel>
              <Textarea
                value={form.oocBoundaries}
                onChange={(event) =>
                  updateField("oocBoundaries", event.target.value)
                }
                className="min-h-20 resize-none bg-background/40 text-sm leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-1 flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            自上而下：人格内核 → 原作身份 / 人生阶段 / 关系模式 → 关键事件 / OOC 边界 → 伏笔暗线。可拖拽画布、滚轮缩放。
          </p>
          <div className="h-[min(72vh,760px)] w-full overflow-hidden rounded-xl border border-border/80 bg-card/20 ring-1 ring-foreground/5">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.35}
              maxZoom={1.25}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnScroll
              proOptions={{ hideAttribution: true }}
              className="bg-transparent"
            >
              <Background
                gap={24}
                size={1}
                color="rgba(255,255,255,0.06)"
              />
              <Controls
                showInteractive={false}
                className="!rounded-lg !border-border/80 !bg-card/90 !shadow-md [&>button]:!border-border/60 [&>button]:!bg-muted/40 [&>button]:!fill-muted-foreground [&>button:hover]:!bg-muted/70"
              />
            </ReactFlow>
          </div>
        </section>
      </div>
    </div>
  );
}
