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

type RelationshipPerson = {
  id: string;
  name: string;
  identity: string;
  label: string;
  stage: string;
  connection: string;
  hiddenEmotion: string;
  conflict: string;
  foreshadow: string;
  taboo: string;
};

type RelationshipForm = Omit<RelationshipPerson, "id">;

const defaultRelationshipForm: RelationshipForm = {
  name: "",
  identity: "",
  label: "",
  stage: "",
  connection: "",
  hiddenEmotion: "",
  conflict: "",
  foreshadow: "",
  taboo: "",
};

const defaultRelationshipPeople: RelationshipPerson[] = [
  {
    id: "mentor",
    name: "闻砚白",
    identity: "旧王朝太傅 / 流亡后的秘密监护人",
    label: "师徒",
    stage: "信任裂缝后的重新试探",
    connection: "名义上的授业与监护，公开场合保持礼法距离。",
    hiddenEmotion: "敬重里夹着迟来的依赖，不愿承认自己仍需要指引。",
    conflict: "师长曾在宫变前夜隐瞒真相，保护与背叛的边界始终未被说清。",
    foreshadow: "一枚旧印章被反复借用，可在后文揭示真正的继承线索。",
    taboo: "禁止写成无条件服从；不要让师长替他完成关键选择。",
  },
  {
    id: "old-friend",
    name: "陆青澜",
    identity: "少年旧友 / 曾替主角承担追捕风险",
    label: "旧友",
    stage: "分离后重逢",
    connection: "少年故交，重逢后用玩笑和疏离维持安全距离。",
    hiddenEmotion: "怀念、愧疚与未说出口的保护欲同时存在。",
    conflict: "旧友曾替他承担追捕风险，他却在流亡途中不告而别。",
    foreshadow: "未寄出的信与一枚断裂袖扣可作为重逢时的暗线回扣。",
    taboo: "禁止一见面就和解；不要跳过试探、误会和迟来的解释。",
  },
  {
    id: "rival",
    name: "裴照夜",
    identity: "新政权审判官 / 王室旧案持证人",
    label: "宿敌",
    stage: "立场对立但彼此熟悉",
    connection: "政治立场对立，彼此熟悉对方的判断方式。",
    hiddenEmotion: "敌意之下有强烈认可，甚至比盟友更懂彼此底线。",
    conflict: "宿敌掌握王室旧案证据，但证据会同时伤害中心角色的正当性。",
    foreshadow: "每次交锋都提到同一场雪，后文可揭示他们曾在那夜短暂联手。",
    taboo: "禁止把宿敌写成单薄反派；不要用突然倒戈替代价值冲突。",
  },
  {
    id: "ally",
    name: "沈棠",
    identity: "地下情报商 / 临时同盟组织负责人",
    label: "盟友",
    stage: "利益合作，信任尚未成立",
    connection: "共同目标下的合作关系，利益绑定多于私人信任。",
    hiddenEmotion: "欣赏中心角色的克制，却怀疑他终有一天会选择旧王朝。",
    conflict: "盟友要的是新秩序，中心角色要的是清算旧债，目标并不完全一致。",
    foreshadow: "一份共同签署的密约可在后文成为信任裂痕或救命凭据。",
    taboo: "禁止写成无脑追随；盟友必须保留自己的判断和代价计算。",
  },
] as const satisfies RelationshipPerson[];

const foreshadowSuggestions = [
  "让旧友保留一件中心角色以为早已遗失的物件，重逢时不解释来源。",
  "宿敌每次谈判都避开同一个地名，暗示两人共享一段未公开过去。",
  "盟友在关键时刻选择公开保护中心角色，但事后要求他交出王室旧证。",
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
  const [relationshipPeople, setRelationshipPeople] = useState<
    RelationshipPerson[]
  >([...defaultRelationshipPeople]);
  const [selectedPersonId, setSelectedPersonId] = useState(
    defaultRelationshipPeople[0].id,
  );
  const [relationshipForm, setRelationshipForm] = useState<RelationshipForm>(
    defaultRelationshipForm,
  );

  const selectedPerson =
    relationshipPeople.find((person) => person.id === selectedPersonId) ??
    relationshipPeople[0];
  const relationshipCenterName = form.name.trim() || defaultPersona.name;

  function updateField(field: keyof PersonaForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateRelationshipField(field: keyof RelationshipForm, value: string) {
    setRelationshipForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleGeneratePersonaMap() {
    setNodes(createPersonaNodes(form));
    setEdges(generatedEdges);
    setActiveName(form.name.trim() || defaultPersona.name);
  }

  function handleAddRelationshipPerson() {
    const name = relationshipForm.name.trim();
    if (!name) return;

    const newPerson: RelationshipPerson = {
      id: `custom-${Date.now()}`,
      name,
      identity: relationshipForm.identity.trim() || "未填写人物身份",
      label: relationshipForm.label.trim() || "关系",
      stage: relationshipForm.stage.trim() || "未设定关系阶段",
      connection: relationshipForm.connection.trim() || "待补充与主角的基本联系。",
      hiddenEmotion: relationshipForm.hiddenEmotion.trim() || "待补充隐藏情绪。",
      conflict: relationshipForm.conflict.trim() || "待补充未解冲突。",
      foreshadow: relationshipForm.foreshadow.trim() || "待补充可埋伏笔。",
      taboo: relationshipForm.taboo.trim() || "待补充写作禁区。",
    };

    setRelationshipPeople((prev) => [...prev, newPerson]);
    setSelectedPersonId(newPerson.id);
    setRelationshipForm(defaultRelationshipForm);
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

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium tracking-tight">
              人物关系与伏笔图
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              用于展示角色与关键人物之间的关系阶段、隐藏情绪、冲突点和可埋伏笔，帮助长线同人创作保持关系一致性。
            </p>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
              复杂关系信息点击人物节点后查看，默认图谱保持简洁，便于长线创作时快速理解人物网络。
            </p>
          </div>

          <Card className="border-border/80 bg-card/70">
            <CardContent className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative min-h-[460px] overflow-hidden rounded-xl border border-border/70 bg-background/40 ring-1 ring-foreground/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />
                <div className="absolute left-1/2 top-1/2 z-20 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/25 bg-card px-4 text-center shadow-md ring-1 ring-foreground/10">
                  <span className="text-sm font-medium leading-snug text-foreground">
                    {relationshipCenterName}
                  </span>
                </div>

                {relationshipPeople.map((person, index) => (
                  <RelationshipNode
                    key={person.id}
                    person={person}
                    index={index}
                    total={relationshipPeople.length}
                    selected={person.id === selectedPerson?.id}
                    onSelect={() => setSelectedPersonId(person.id)}
                  />
                ))}
              </div>

              {selectedPerson ? (
                <RelationshipDetailCard person={selectedPerson} />
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="border-border/60 border-b pb-4">
              <CardTitle className="text-base">添加人物关系</CardTitle>
              <CardDescription className="text-xs">
                先用前端状态维护关系图，后续可接入项目数据库和关系抽取 Agent
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2">
              <RelationshipInput
                label="人物姓名"
                value={relationshipForm.name}
                onChange={(value) => updateRelationshipField("name", value)}
                placeholder="例如：林照"
              />
              <RelationshipInput
                label="人物身份 / 基本信息"
                value={relationshipForm.identity}
                onChange={(value) => updateRelationshipField("identity", value)}
                placeholder="例如：边境军医 / 主角旧识"
              />
              <RelationshipInput
                label="关系标签"
                value={relationshipForm.label}
                onChange={(value) => updateRelationshipField("label", value)}
                placeholder="例如：CP / 亲人 / 盟友"
              />
              <RelationshipInput
                label="关系阶段"
                value={relationshipForm.stage}
                onChange={(value) => updateRelationshipField("stage", value)}
                placeholder="例如：暧昧前期 / 冷战后重逢"
              />
              <RelationshipTextarea
                label="与主角的基本联系"
                value={relationshipForm.connection}
                onChange={(value) =>
                  updateRelationshipField("connection", value)
                }
              />
              <RelationshipTextarea
                label="隐藏情绪"
                value={relationshipForm.hiddenEmotion}
                onChange={(value) =>
                  updateRelationshipField("hiddenEmotion", value)
                }
              />
              <RelationshipTextarea
                label="未解冲突"
                value={relationshipForm.conflict}
                onChange={(value) => updateRelationshipField("conflict", value)}
              />
              <RelationshipTextarea
                label="可埋伏笔"
                value={relationshipForm.foreshadow}
                onChange={(value) =>
                  updateRelationshipField("foreshadow", value)
                }
              />
              <div className="flex flex-col gap-2 md:col-span-2">
                <RelationshipTextarea
                  label="写作禁区"
                  value={relationshipForm.taboo}
                  onChange={(value) => updateRelationshipField("taboo", value)}
                />
                <Button
                  className="mt-2 h-10 w-full sm:w-fit"
                  onClick={handleAddRelationshipPerson}
                >
                  添加到关系图
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader className="border-border/60 border-b pb-4">
              <CardTitle className="text-base">伏笔建议</CardTitle>
              <CardDescription className="text-xs">
                可直接作为后续章节的暗线提示
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-3">
              {foreshadowSuggestions.map((item, index) => (
                <div
                  key={item}
                  className="rounded-md border border-dashed border-foreground/10 bg-muted/15 px-3 py-3 text-xs leading-relaxed text-muted-foreground"
                >
                  <span className="mb-2 block font-mono text-[10px] text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function RelationshipNode({
  person,
  index,
  total,
  selected,
  onSelect,
}: {
  person: RelationshipPerson;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const angle = -90 + (360 / total) * index;
  const radius = 172;
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;
  const labelX = Math.cos((angle * Math.PI) / 180) * (radius * 0.52);
  const labelY = Math.sin((angle * Math.PI) / 180) * (radius * 0.52);

  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 h-px origin-left bg-border/70"
        style={{
          width: `${radius}px`,
          transform: `rotate(${angle}deg)`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground"
        style={{
          transform: `translate(calc(-50% + ${labelX}px), calc(-50% + ${labelY}px))`,
        }}
      >
        {person.label}
      </div>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "absolute left-1/2 top-1/2 z-20 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-card px-3 text-center text-xs font-medium leading-snug text-foreground shadow-sm transition-all hover:border-foreground/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-foreground/40 ring-2 ring-foreground/15"
            : "border-border/80",
        )}
        style={{
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        }}
      >
        {person.name}
      </button>
    </>
  );
}

function RelationshipDetailCard({ person }: { person: RelationshipPerson }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-medium text-foreground">{person.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {person.identity}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {person.label}
        </Badge>
      </div>
      <div className="grid gap-3 text-xs leading-relaxed text-muted-foreground">
        <RelationLine label="与主角的基本联系" value={person.connection} />
        <RelationLine label="关系阶段" value={person.stage} />
        <RelationLine label="隐藏情绪" value={person.hiddenEmotion} />
        <RelationLine label="未解冲突" value={person.conflict} />
        <RelationLine label="可埋伏笔" value={person.foreshadow} />
        <RelationLine label="写作禁区" value={person.taboo} />
      </div>
    </div>
  );
}

function RelationshipInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-background/40"
      />
    </div>
  );
}

function RelationshipTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 resize-none bg-background/40 text-sm leading-relaxed"
      />
    </div>
  );
}

function RelationLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-foreground/80">{label}：</span>
      {value}
    </p>
  );
}
