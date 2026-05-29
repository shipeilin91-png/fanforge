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
import { memo, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
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
  "!size-2 !border-[#53613b]/45 !bg-[#53613b]/45 !opacity-0";

function CoreNode({ data }: NodeProps<CoreNode>) {
  return (
    <div className="w-[300px] rounded-xl border border-[#8a7c62]/28 bg-[#fffaf0] px-5 py-4 shadow-[0_12px_34px_rgba(49,39,24,0.08)]">
      <Badge
        variant="outline"
        className="mb-2 border-[#53613b]/35 bg-[#e7ead4] text-[10px] uppercase tracking-widest text-[#3f4b2f]"
      >
        {data.tag ?? "Core"}
      </Badge>
      <p className="font-serif text-2xl leading-none tracking-[-0.02em] text-[#171410]">
        {data.title}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#5f5849]">{data.body}</p>
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
    <div className="w-[220px] rounded-xl border border-[#53613b]/22 bg-[#fffaf0] px-4 py-3 shadow-[0_8px_24px_rgba(49,39,24,0.06)]">
      <Badge
        variant="outline"
        className="mb-2 border-[#171410]/15 bg-[#f0e4cc] text-[10px] text-[#6f6759]"
      >
        {data.tag ?? "Stage"}
      </Badge>
      <p className="text-sm font-semibold text-[#171410]">{data.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6f6759]">
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
    <div className="w-[240px] rounded-xl border border-[#8a7c62]/30 bg-[#fbf7ed] px-4 py-3">
      <Badge
        variant="outline"
        className="mb-2 border-[#8a7c62]/30 bg-transparent text-[10px] text-[#8a7c62]"
      >
        {data.tag ?? "Event"}
      </Badge>
      <p className="text-sm font-semibold text-[#171410]">{data.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6f6759]">
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
    <div className="w-[260px] rounded-xl border border-dashed border-[#53613b]/35 bg-[#e7ead4] px-4 py-3">
      <Badge
        variant="outline"
        className="mb-2 border-dashed border-[#53613b]/45 text-[10px] text-[#3f4b2f]"
      >
        {data.tag ?? "Thread"}
      </Badge>
      <p className="text-sm font-semibold text-[#171410]">{data.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[#5f5849]">
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

const edgeStyle = { stroke: "#8a7c62", strokeWidth: 1.5 };
const threadEdgeStyle = {
  stroke: "#53613b",
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
  { label: "人格内核", className: "border-[#171410]/20 bg-[#fffaf0]" },
  { label: "人生阶段", className: "border-[#53613b]/20 bg-[#fbf5e8]" },
  { label: "关键事件", className: "border-[#8a7c62]/30 bg-[#f8f0df]" },
  { label: "伏笔 / 暗线", className: "border-dashed border-[#53613b]/35 bg-[#e7ead4]" },
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

type PersonaProfile = {
  id: string;
  title: string;
  character_name: string;
  core_profile: string;
  persona_nodes: Node<PersonaNodeData>[];
  relationship_nodes: RelationshipPerson[];
  relationship_edges: Edge[];
  ooc_boundaries: unknown;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

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

const DEMO_USER_STORAGE_KEY = "fanforge-demo-user";

function formatProfileDate(value: string | null) {
  if (!value) return "未记录";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizePersonaNodes(value: unknown) {
  return Array.isArray(value) ? (value as Node<PersonaNodeData>[]) : createPersonaNodes(defaultPersona);
}

function normalizeRelationshipPeople(value: unknown) {
  return Array.isArray(value) ? (value as RelationshipPerson[]) : [...defaultRelationshipPeople];
}

function normalizeRelationshipEdges(value: unknown) {
  return Array.isArray(value) ? (value as Edge[]) : generatedEdges;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6f6759]">
      {children}
    </span>
  );
}

export default function PersonaPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [profileTitle, setProfileTitle] = useState("");
  const [profiles, setProfiles] = useState<PersonaProfile[]>([]);
  const [currentPersonaId, setCurrentPersonaId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("登录后可保存和加载角色档案。");
  const [profileError, setProfileError] = useState<string | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    async function initializeProfiles() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user && !window.localStorage.getItem(DEMO_USER_STORAGE_KEY)) {
        router.replace("/");
        return;
      }

      if (user) {
        await loadPersonaProfiles(user.id, isMounted);
      } else if (isMounted) {
        setProfileMessage("登录后可保存和加载角色档案。");
      }

      if (isMounted) setIsCheckingAuth(false);
    }

    void initializeProfiles();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f3ead7] text-sm text-[#6f6759]">
        正在检查登录状态……
      </div>
    );
  }

  async function loadPersonaProfiles(userId: string, isMounted = true) {
    setLoadingProfiles(true);
    setProfileError(null);

    const { data, error } = await supabase
      .from("user_persona_profiles")
      .select(
        "id, title, character_name, core_profile, persona_nodes, relationship_nodes, relationship_edges, ooc_boundaries, metadata, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!isMounted) return;

    setLoadingProfiles(false);

    if (error) {
      setProfileError("角色档案读取失败。");
      setProfiles([]);
      return;
    }

    const nextProfiles = (data ?? []).map((item) => ({
      id: String(item.id),
      title: safeString(item.title, "未命名角色档案"),
      character_name: safeString(item.character_name),
      core_profile: safeString(item.core_profile),
      persona_nodes: normalizePersonaNodes(item.persona_nodes),
      relationship_nodes: normalizeRelationshipPeople(item.relationship_nodes),
      relationship_edges: normalizeRelationshipEdges(item.relationship_edges),
      ooc_boundaries: item.ooc_boundaries,
      metadata:
        item.metadata && typeof item.metadata === "object"
          ? (item.metadata as Record<string, unknown>)
          : null,
      updated_at: safeString(item.updated_at) || null,
    }));

    setProfiles(nextProfiles);
    setProfileMessage(nextProfiles.length ? "" : "暂无角色档案。");
  }

  async function refreshPersonaProfiles() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      setProfiles([]);
      setProfileMessage("登录后可保存和加载角色档案。");
      return;
    }

    await loadPersonaProfiles(user.id);
  }

  function loadProfile(profile: PersonaProfile) {
    const metadataForm =
      profile.metadata?.form && typeof profile.metadata.form === "object"
        ? (profile.metadata.form as Partial<PersonaForm>)
        : {};
    const nextForm: PersonaForm = {
      name: profile.character_name || safeString(metadataForm.name, defaultPersona.name),
      identity: safeString(metadataForm.identity, defaultPersona.identity),
      corePersonality:
        profile.core_profile || safeString(metadataForm.corePersonality, defaultPersona.corePersonality),
      lifeStages: safeString(metadataForm.lifeStages, defaultPersona.lifeStages),
      keyEvents: safeString(metadataForm.keyEvents, defaultPersona.keyEvents),
      relationshipPattern: safeString(
        metadataForm.relationshipPattern,
        defaultPersona.relationshipPattern,
      ),
      oocBoundaries:
        typeof profile.ooc_boundaries === "string"
          ? profile.ooc_boundaries
          : safeString(metadataForm.oocBoundaries, defaultPersona.oocBoundaries),
    };

    setCurrentPersonaId(profile.id);
    setProfileTitle(profile.title);
    setForm(nextForm);
    setNodes(profile.persona_nodes.length ? profile.persona_nodes : createPersonaNodes(nextForm));
    setEdges(profile.relationship_edges.length ? profile.relationship_edges : generatedEdges);
    setRelationshipPeople(
      profile.relationship_nodes.length ? profile.relationship_nodes : [...defaultRelationshipPeople],
    );
    setSelectedPersonId(
      profile.relationship_nodes[0]?.id ?? defaultRelationshipPeople[0].id,
    );
    setActiveName(nextForm.name.trim() || defaultPersona.name);
    setProfileMessage("角色档案已加载。");
    setProfileError(null);
  }

  function buildProfilePayload(userId: string) {
    const now = new Date().toISOString();

    return {
      user_id: userId,
      title: profileTitle.trim() || "未命名角色档案",
      character_name: form.name.trim(),
      core_profile: form.corePersonality.trim(),
      persona_nodes: nodes,
      relationship_nodes: relationshipPeople,
      relationship_edges: edges,
      ooc_boundaries: {
        oocBoundaries: form.oocBoundaries,
        hiddenEmotions: relationshipPeople.map((person) => ({
          name: person.name,
          hiddenEmotion: person.hiddenEmotion,
        })),
        unresolvedConflicts: relationshipPeople.map((person) => ({
          name: person.name,
          conflict: person.conflict,
        })),
        writingTaboos: relationshipPeople.map((person) => ({
          name: person.name,
          taboo: person.taboo,
        })),
      },
      metadata: {
        savedFrom: "persona-page",
        updatedAt: now,
        notes: {
          form,
          relationshipForm,
          activeName,
        },
      },
      updated_at: now,
    };
  }

  async function handleSavePersonaProfile() {
    if (savingProfile) return;

    setProfileMessage("");
    setProfileError(null);
    setSavingProfile(true);

    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setProfileError("请先登录后保存角色档案。");
        return;
      }

      if (!form.name.trim() && !form.corePersonality.trim()) {
        setProfileError("请先输入角色信息。");
        return;
      }

      const payload = buildProfilePayload(user.id);

      if (currentPersonaId) {
        const { error } = await supabase
          .from("user_persona_profiles")
          .update(payload)
          .eq("id", currentPersonaId)
          .eq("user_id", user.id);

        if (error) {
          setProfileError(error.message);
          return;
        }
      } else {
        const { data: insertedProfile, error } = await supabase
          .from("user_persona_profiles")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          setProfileError(error.message);
          return;
        }

        if (insertedProfile?.id) {
          setCurrentPersonaId(String(insertedProfile.id));
        }
      }

      setProfileMessage("角色档案已保存。");
      await refreshPersonaProfiles();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "保存失败，请稍后重试。",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function handleNewPersonaProfile() {
    setCurrentPersonaId(null);
    setProfileTitle("");
    setProfileMessage("");
    setProfileError(null);
  }

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
    <div className="min-h-full overflow-hidden bg-[#f6efdf] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[14vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          PERSONA
        </div>
        <div className="pointer-events-none absolute right-[-8vw] top-[520px] hidden text-[12vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          RELATION
        </div>
        <div className="pointer-events-none absolute bottom-12 left-[34%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          OOC
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              PERSONA MAP · OOC BOUNDARY
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Persona Archive
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                结构化角色人格、人生阶段、人物关系和写作禁区。
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {legend.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-xs text-[#6f6759]"
              >
                <span className={cn("size-3 border", item.className)} />
                {item.label}
              </div>
            ))}
          </div>
        </header>

        <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.06)]">
          <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#b9aa83]/45 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Character Manuscript
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  角色信息输入区
                </h2>
              </div>
              <Button
                className="h-10 shrink-0 rounded-xl bg-[#171410] px-5 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                onClick={handleGeneratePersonaMap}
              >
                生成人格思维导图
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b border-[#b9aa83]/45 p-5 lg:grid-cols-[1fr_360px]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <FieldLabel>角色档案名</FieldLabel>
                  <Input
                    value={profileTitle}
                    onChange={(event) => setProfileTitle(event.target.value)}
                    placeholder="例如：苏砚人格时间树 / 林晚关系档案 / 双主角关系图"
                    className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-[#53613b]/35 bg-[#e7ead4] px-5 text-[#3f4b2f] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/65 hover:bg-[#dfe6c7]"
                    onClick={handleSavePersonaProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "保存中..." : "保存角色档案"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] px-4 text-[#5f5849] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
                    onClick={handleNewPersonaProfile}
                  >
                    新建档案
                  </Button>
                  {profileMessage ? (
                    <span className="text-xs text-[#3f4b2f]">
                      {profileMessage}
                    </span>
                  ) : null}
                  {profileError ? (
                    <span className="text-xs text-[#7f3326]">
                      {profileError}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-[#8a7c62]/24 bg-[#fffdf7] px-3 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f6759]">
                      角色档案库
                    </p>
                    <p className="mt-1 text-[11px] text-[#8a7c62]">
                      Persona profiles
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-xl border-[#53613b]/28 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                  >
                    {profiles.length}/10
                  </Badge>
                </div>
                {loadingProfiles ? (
                  <div className="rounded-xl border border-dashed border-[#8a7c62]/28 bg-[#fffaf0]/70 px-3 py-4 text-center text-xs text-[#7a705e]">
                    正在读取角色档案……
                  </div>
                ) : profiles.length ? (
                  <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                    {profiles.map((profile) => {
                      const isCurrent = currentPersonaId === profile.id;

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => loadProfile(profile)}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                            isCurrent
                              ? "border-[#53613b]/60 bg-[#e7ead4] shadow-[0_8px_20px_rgba(63,75,47,0.12)]"
                              : "border-[#9a7f45]/18 bg-[#fffaf0]/80 hover:border-[#53613b]/35 hover:bg-[#fffdf7]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="line-clamp-2 text-sm font-medium leading-5 text-[#171410]">
                              {profile.title}
                            </span>
                            <span className="shrink-0 text-[10px] text-[#8a7c62]">
                              {formatProfileDate(profile.updated_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#6f6759]">
                            {profile.character_name || "未填写角色名"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#8a7c62]/28 bg-[#fffaf0]/70 px-3 py-4 text-center text-xs text-[#7a705e]">
                    {profileMessage || "暂无角色档案。"}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <FieldLabel>角色姓名</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="例如：苏砚"
                  className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]"
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
                  className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>核心人格描述</FieldLabel>
                <PersonaTextarea
                  value={form.corePersonality}
                  onChange={(value) => updateField("corePersonality", value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>关键人生阶段</FieldLabel>
                <PersonaTextarea
                  value={form.lifeStages}
                  onChange={(value) => updateField("lifeStages", value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>关键事件 / 创伤经历</FieldLabel>
                <PersonaTextarea
                  value={form.keyEvents}
                  onChange={(value) => updateField("keyEvents", value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>关系模式 / 防御机制</FieldLabel>
                <PersonaTextarea
                  value={form.relationshipPattern}
                  onChange={(value) => updateField("relationshipPattern", value)}
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <FieldLabel>禁止 OOC 点</FieldLabel>
                <Textarea
                  value={form.oocBoundaries}
                  onChange={(event) =>
                    updateField("oocBoundaries", event.target.value)
                  }
                  className="min-h-20 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
              Persona Timeline Tree
            </p>
            <h2 className="font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
              人格时间树
            </h2>
            <p className="max-w-4xl text-sm leading-7 text-[#6f6759]">
              自上而下：人格内核 → 原作身份 / 人生阶段 / 关系模式 → 关键事件 / OOC 边界 → 伏笔暗线。可拖拽画布、滚轮缩放。
            </p>
          </div>
          <div className="h-[min(72vh,760px)] w-full overflow-hidden rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0] shadow-[0_18px_54px_rgba(92,69,42,0.06)]">
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
              <Background gap={24} size={1} color="rgba(83,97,59,0.16)" />
              <Controls
                showInteractive={false}
                className="!border-[#171410]/15 !bg-[#fffaf0] !shadow-md [&>button]:!border-[#171410]/12 [&>button]:!bg-[#f8f0df] [&>button]:!fill-[#6f6759] [&>button:hover]:!bg-[#e7ead4]"
              />
            </ReactFlow>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
              Editorial Relationship Map
            </p>
            <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
              人物关系与伏笔图
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6f6759]">
              用于展示角色与关键人物之间的关系阶段、隐藏情绪、冲突点和可埋伏笔，帮助长线同人创作保持关系一致性。点击人物节点后查看关系详情。
            </p>
          </div>

          <div className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative min-h-[460px] overflow-hidden rounded-xl border border-[#b9aa83]/45 bg-[#fffdf7]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(83,97,59,0.12),transparent_55%)]" />
                <div className="absolute left-1/2 top-1/2 z-20 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#171410]/20 bg-[#f8f0df] px-4 text-center shadow-[0_12px_30px_rgba(49,39,24,0.08)]">
                  <span className="text-sm font-semibold leading-snug text-[#171410]">
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
            </div>
          </div>

          <section className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.05)]">
            <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
              <div className="border-b border-[#b9aa83]/45 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Relationship Intake
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  添加人物关系
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
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
                    className="mt-2 h-10 w-full rounded-xl bg-[#171410] px-5 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f] sm:w-fit"
                    onClick={handleAddRelationshipPerson}
                  >
                    添加到关系图
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                Foreshadow Notes
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                伏笔建议
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                可直接作为后续章节的暗线提示。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {foreshadowSuggestions.map((item, index) => (
                <div
                  key={item}
                  className="rounded-xl border border-dashed border-[#53613b]/30 bg-[#fffdf7] px-3 py-3 text-xs leading-relaxed text-[#5f5849] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/55 hover:bg-[#f4f7ea]"
                >
                  <span className="mb-2 block font-serif text-2xl leading-none text-[#53613b]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function PersonaTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-24 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17]"
    />
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
        className="absolute left-1/2 top-1/2 h-px origin-left bg-[#8a7c62]/45"
        style={{
          width: `${radius}px`,
          transform: `rotate(${angle}deg)`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#171410]/15 bg-[#f8f0df] px-2 py-1 text-[10px] text-[#6f6759]"
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
          "absolute left-1/2 top-1/2 z-20 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-[#fbf5e8] px-3 text-center text-xs font-semibold leading-snug text-[#171410] shadow-[0_10px_24px_rgba(49,39,24,0.08)] transition-all duration-200 hover:border-[#53613b]/60 hover:bg-[#e7ead4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53613b]",
          selected
            ? "border-[#53613b]/70 bg-[#e7ead4] ring-2 ring-[#53613b]/20"
            : "border-[#171410]/15",
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
    <div className="rounded-xl border border-[#8a7c62]/28 bg-[#fffdf7] px-4 py-4">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#b9aa83]/45 pb-4">
        <div>
          <p className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
            {person.name}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
            {person.identity}
          </p>
        </div>
        <Badge
        variant="outline"
          className="rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
        >
          {person.label}
        </Badge>
      </div>
      <div className="grid gap-3 text-xs leading-relaxed text-[#5f5849]">
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
        className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17]"
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
        className="min-h-20 resize-none rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-sm leading-relaxed text-[#211d17]"
      />
    </div>
  );
}

function RelationLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-[#332d24]">{label}：</span>
      {value}
    </p>
  );
}
