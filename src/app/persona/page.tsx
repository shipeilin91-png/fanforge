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
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
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

const initialNodes: Node<PersonaNodeData>[] = [
  {
    id: "core",
    type: "core",
    position: { x: 310, y: 0 },
    data: {
      tag: "人格内核",
      title: "外冷内温 · 责任先于自我",
      body: "习惯用理性与沉默掩盖不安；只有在重要的人面前，才会短暂卸下防备。写作时需避免「突然变话痨」式 OOC。",
    },
  },
  {
    id: "stage-child",
    type: "stage",
    position: { x: 0, y: 160 },
    data: {
      tag: "人生阶段",
      title: "童年（0–12）",
      body: "父母长期远行，由祖母在江南小城带大。物质不匮乏，情感回应稀薄。",
    },
  },
  {
    id: "stage-youth",
    type: "stage",
    position: { x: 300, y: 160 },
    data: {
      tag: "人生阶段",
      title: "青年（13–22）",
      body: "考入外地书院，第一次离开故乡。以成绩换取安全感，对「被留下」异常敏感。",
    },
  },
  {
    id: "stage-adult",
    type: "stage",
    position: { x: 600, y: 160 },
    data: {
      tag: "人生阶段",
      title: "成年（23–）",
      body: "成为出版社编辑，生活稳定而克制。与少年时代友人重逢，旧日伏笔开始浮现。",
    },
  },
  {
    id: "event-child",
    type: "event",
    position: { x: 0, y: 340 },
    data: {
      tag: "关键事件",
      title: "雨夜独自等门",
      body: "祖母临时外出，承诺「很快回来」却至深夜未归。形成对「承诺」与「等待」的过度解读。",
    },
  },
  {
    id: "event-youth",
    type: "event",
    position: { x: 300, y: 340 },
    data: {
      tag: "关键事件",
      title: "抄袭风波中的挺身",
      body: "友人替他承担舆论压力。此后对信任门槛极高，一旦认定便愿为其承担代价。",
    },
  },
  {
    id: "event-adult",
    type: "event",
    position: { x: 600, y: 340 },
    data: {
      tag: "关键事件",
      title: "辞去编辑工作",
      body: "为帮友人完成未竟长篇而离开稳定岗位。责任压倒稳妥，也埋下经济与人际张力。",
    },
  },
  {
    id: "thread-letter",
    type: "thread",
    position: { x: 120, y: 520 },
    data: {
      tag: "伏笔",
      title: "未寄出的信",
      body: "抽屉里反复出现的信封，从未写满也未寄出。可在后文揭示：写给「不敢联系的人」。",
    },
  },
  {
    id: "thread-departure",
    type: "thread",
    position: { x: 480, y: 520 },
    data: {
      tag: "暗线",
      title: "对「离开」的生理性回避",
      body: "车站、码头、机场等场景会触发沉默与走神。关系戏宜写「想留却说不出口」而非激烈争吵。",
    },
  },
];

const edgeStyle = { stroke: "rgba(255,255,255,0.22)", strokeWidth: 1.5 };
const threadEdgeStyle = {
  stroke: "rgba(255,255,255,0.14)",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};

const initialEdges: Edge[] = [
  {
    id: "e-core-child",
    source: "core",
    target: "stage-child",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-core-youth",
    source: "core",
    target: "stage-youth",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-core-adult",
    source: "core",
    target: "stage-adult",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-child-event",
    source: "stage-child",
    target: "event-child",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-youth-event",
    source: "stage-youth",
    target: "event-youth",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-adult-event",
    source: "stage-adult",
    target: "event-adult",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-ev1-thread1",
    source: "event-child",
    target: "thread-letter",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
  {
    id: "e-ev2-thread1",
    source: "event-youth",
    target: "thread-letter",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
  {
    id: "e-ev2-thread2",
    source: "event-youth",
    target: "thread-departure",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
  {
    id: "e-ev3-thread2",
    source: "event-adult",
    target: "thread-departure",
    type: "smoothstep",
    style: threadEdgeStyle,
  },
  {
    id: "e-thread-link",
    source: "thread-letter",
    sourceHandle: "right",
    target: "thread-departure",
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

export default function PersonaPage() {
  return (
    <div className="dark min-h-full bg-background text-foreground">
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
                将角色拆分为核心人格、人生阶段、关键事件与伏笔暗线，形成可检索的写作参照树（静态示例）。
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              示例角色 · 苏砚
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

        <section className="flex flex-1 flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            自上而下：人格内核 → 人生阶段 → 关键事件 → 伏笔暗线。可拖拽画布、滚轮缩放。
          </p>
          <div className="h-[min(72vh,760px)] w-full overflow-hidden rounded-xl border border-border/80 bg-card/20 ring-1 ring-foreground/5">
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
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
