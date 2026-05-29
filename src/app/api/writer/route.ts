import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

type WriterResponse = {
  text: string;
  emotionStructure: string[];
  characterConstraints: string[];
  usedCanonDocuments?: string[];
  usedPersonaProfiles?: string[];
};

type ModelProvider =
  | "fanforge_free"
  | "openai"
  | "gemini"
  | "claude"
  | "deepseek";

type UserModelSettings = {
  provider: ModelProvider;
  model: string;
  api_key: string | null;
  user_id: string | null;
  access_token: string | null;
};

type WriterRequestBody = {
  characterNames?: string;
  relationshipType?: string;
  relationshipTypeCustom?: string;
  relationshipTypeFinal?: string;
  moment?: string;
  momentCustom?: string;
  momentFinal?: string;
  stage?: string;
  stageCustom?: string;
  stageFinal?: string;
  tension?: string;
  tensionCustom?: string;
  tensionFinal?: string;
  expectedLength?: string;
  expectedWordCount?: string;
  customLength?: string | number;
  styleCard?: string;
  styleCustom?: string;
  styleRequirement?: string;
  forbiddenItems?: string[];
  forbiddenCustom?: string;
  sceneDescription?: string;
  canonContext?: string;
  personaContext?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

const FREE_DAILY_LIMIT = 10;
const FREE_PROVIDER = "fanforge_free";
const WRITER_FEATURE = "slice";

function createSupabaseClientForToken(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

const writerResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      description: "只包含文学正文，不包含规则解释、参数说明或禁止项说明。",
    },
    emotionStructure: {
      type: "array",
      description: "按起承转合说明情绪结构，3-5 条。",
      items: { type: "string" },
    },
    characterConstraints: {
      type: "array",
      description: "说明角色边界、关系阶段、边界和写作约束，3-5 条。",
      items: { type: "string" },
    },
  },
  required: ["text", "emotionStructure", "characterConstraints"],
} as const;

type NormalizedWriterInput = {
  nameA: string;
  nameB: string;
  relationshipType: string;
  relationshipDetail: string;
  literaryRelationshipCue: string;
  moment: string;
  stage: string;
  tension: string;
  styleCard: string;
  styleDetail: string;
  forbiddenText: string;
  targetLength: number;
  canonContext: string;
  usedCanonDocuments: string[];
  personaContext: string;
  usedPersonaProfiles: string[];
};

type CanonContextResult = {
  text: string;
  titles: string[];
};

type PersonaContextResult = {
  text: string;
  titles: string[];
};

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseCharacterNames(value: unknown): [string, string] {
  const raw = stringValue(value);
  if (!raw) return ["沈砚", "林栀"];

  const parts = raw
    .split(/[×xX/&、，,和与\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return [parts[0] || "沈砚", parts[1] || "林栀"];
}

function parseTargetLength(input: unknown, fallback = 500) {
  const raw = stringValue(input, String(fallback));
  const matched = raw.match(/\d+/);
  const value = matched ? Number(matched[0]) : fallback;

  if (!Number.isFinite(value)) return fallback;
  return Math.min(1500, Math.max(100, Math.round(value)));
}

function getLengthRange(targetLength: number) {
  const ratio = targetLength <= 300 ? 0.2 : 0.15;

  return {
    min: Math.floor(targetLength * (1 - ratio)),
    max: Math.ceil(targetLength * (1 + ratio)),
  };
}

function createLiteraryRelationshipCue(selected: string, custom: unknown) {
  const detail = stringValue(custom);
  if (detail) return detail;

  const cues: Record<string, string> = {
    CP: "未曾说破的牵连",
    宿敌: "针锋相对里藏着旧日默契",
    师徒: "克制的照拂与不肯越界的距离",
    亲情: "熟悉到不必解释的牵挂",
    阵营对立: "立场相背却仍会迟疑的旧识",
  };

  return cues[selected] || "复杂而未明的牵连";
}

function finalValue(finalValueInput: unknown, selectedInput: unknown, fallback: string) {
  const final = stringValue(finalValueInput);
  if (
    final &&
    final !== "自定义关系" &&
    final !== "自定义瞬间" &&
    final !== "自定义阶段" &&
    final !== "自定义张力"
  ) {
    return final;
  }

  const selected = stringValue(selectedInput);
  if (
    selected &&
    selected !== "自定义关系" &&
    selected !== "自定义瞬间" &&
    selected !== "自定义阶段" &&
    selected !== "自定义张力"
  ) {
    return selected;
  }

  return fallback;
}

function normalizeWriterInput(body: WriterRequestBody): NormalizedWriterInput {
  const [nameA, nameB] = parseCharacterNames(body.characterNames);
  const relationshipType = finalValue(
    body.relationshipTypeFinal,
    body.relationshipType,
    "CP",
  );
  const moment = stringValue(
    body.momentFinal,
    stringValue(
      body.momentCustom,
      stringValue(body.sceneDescription, finalValue(undefined, body.moment, "雨夜重逢")),
    ),
  );
  const stage = finalValue(
    body.stageFinal,
    body.stage,
    "分离后重逢",
  );
  const tension = finalValue(
    body.tensionFinal,
    body.tension,
    "克制",
  );
  const styleCard = stringValue(body.styleCard, "疏离克制");
  const styleDetail = stringValue(
    body.styleCustom,
    stringValue(
      body.styleRequirement,
      STYLE_DEFAULTS[styleCard] || "动作克制，留白充足。",
    ),
  );
  const forbiddenItems = Array.isArray(body.forbiddenItems)
    ? body.forbiddenItems.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      )
    : [];
  const forbiddenCustom = stringValue(body.forbiddenCustom);

  return {
    nameA,
    nameB,
    relationshipType,
    relationshipDetail: relationshipType,
    literaryRelationshipCue: createLiteraryRelationshipCue(
      relationshipType,
      relationshipType === stringValue(body.relationshipTypeCustom)
        ? body.relationshipTypeCustom
        : undefined,
    ),
    moment,
    stage,
    tension,
    styleCard,
    styleDetail,
    forbiddenText: [...forbiddenItems, forbiddenCustom].filter(Boolean).join("、") || "无",
    targetLength: parseTargetLength(
      stringValue(body.customLength) ? body.customLength : body.expectedLength ?? body.expectedWordCount,
      500,
    ),
    canonContext: stringValue(body.canonContext),
    usedCanonDocuments: [],
    personaContext: stringValue(body.personaContext),
    usedPersonaProfiles: [],
  };
}

const STYLE_DEFAULTS: Record<string, string> = {
  冷艳华美: "意象冷冽，句子可以略长，但不堆砌解释。",
  温润烟火: "多写生活质感、细碎动作和可触摸的声音。",
  疏离克制: "短句、停顿和沉默优先，情绪不写满。",
  浪漫诗性: "允许轻微象征和复沓，但以真实场景为底。",
};

function trimToApproximateLength(text: string, targetLength: number) {
  if (text.length <= targetLength + 180) return text;

  const paragraphs = text.split("\n\n");
  const kept: string[] = [];
  let length = 0;

  for (const paragraph of paragraphs) {
    if (length + paragraph.length > targetLength + 120 && kept.length >= 4) break;
    kept.push(paragraph);
    length += paragraph.length;
  }

  return kept.join("\n\n");
}

function getParagraphHint(targetLength: number) {
  if (targetLength <= 300) return { min: 5, max: 7, label: "5-7 段" };
  if (targetLength <= 600) return { min: 7, max: 10, label: "7-10 段" };
  if (targetLength <= 1200) return { min: 12, max: 16, label: "12-16 段" };
  return { min: 16, max: 22, label: "16-22 段" };
}

function splitLongParagraph(paragraph: string) {
  if (paragraph.length <= 160) return [paragraph];

  const sentences = paragraph
    .replace(/([。！？])(?=.)/g, "$1\n")
    .replace(/([”」])(?=.)/g, "$1\n")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const result: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (current.length + sentence.length > 140) {
      result.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current) result.push(current);
  return result.length > 0 ? result : [paragraph];
}

function formatBreathingParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitLongParagraph(paragraph.trim()))
    .filter(Boolean)
    .join("\n\n");
}

function separateDialogueParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .flatMap((paragraph) => {
      const pieces = paragraph.match(/“[^”]+”[^“”。！？\n]*[。！？]?|[^“”]+/g);
      if (!pieces) return [paragraph];

      return pieces
        .map((piece) => piece.trim())
        .filter(Boolean)
        .flatMap((piece) => {
          if (piece.startsWith("“")) return [piece];
          return splitLongParagraph(piece);
        });
    })
    .join("\n\n");
}

function createStyleParagraph(styleCard: string, nameA: string, nameB: string) {
  if (styleCard === "温润烟火") {
    return `檐下有刚收摊的热气，混着雨水和纸袋的麦香。${nameB}低头整理被风吹乱的袖口，指尖绕过一道旧线头，忽然记起从前${nameA}也总把话藏在这些小事里。`;
  }

  if (styleCard === "冷艳华美") {
    return `远处车灯划过水面，像一枚薄薄的刀背，又很快钝进夜色里。${nameB}低头整理被风吹乱的袖口，水珠在指节上冷得发亮。`;
  }

  if (styleCard === "浪漫诗性") {
    return `雨线垂下来，把街口缝成一页潮湿的信。${nameB}低头整理袖口，听见水声在两人之间反复折返，像一句始终没有落款的话。`;
  }

  return `周围的一切都安静下来。${nameB}低头整理被风吹乱的袖口，指尖绕过一道旧线头，忽然记起从前${nameA}也有这样的习惯：话说得少，却总在别人看不见的地方留一条退路。`;
}

function createFreeModelResponse(input: NormalizedWriterInput): WriterResponse {
  const {
    nameA,
    nameB,
    relationshipDetail,
    literaryRelationshipCue,
    moment,
    stage,
    tension,
    styleCard,
    styleDetail,
    forbiddenText,
    targetLength,
    canonContext,
    usedCanonDocuments,
    personaContext,
    usedPersonaProfiles,
  } = input;
  const paragraphHint = getParagraphHint(targetLength);

  const baseParagraphs = [
    `${moment}。雨把街灯洗成旧金色，积水沿着砖缝往低处流，${nameA}和${nameB}停在同一处屋檐下，谁都没有先往外迈一步。`,
    `${nameB}先看见${nameA}肩头湿透的布料。檐角的水一滴一滴落到脚边，${literaryRelationshipCue}把两人的距离压得很窄，窄到任何一句寒暄都会显得多余。`,
    `“你怎么还走这条路？”${nameB}问。`,
    `“只是顺路。”${nameA}说。`,
    `“那你继续顺路。”${nameB}说。`,
    `${nameA}把伞沿往${nameB}那边偏了半寸。雨水顺着伞骨滑下来，刚好避开她的袖口，却把他自己的手背打湿。`,
    `${stage}没有给他们留下从容寒暄的余地。熟悉还在，分寸也还在，谁先开口都像认输，谁先退后又像承认从前真的断过。`,
    `这句话太轻，轻得像可以被雨声带走。${nameB}听见了，也听懂了，却只低头看着脚边那一圈水纹慢慢散开。`,
    `${tension}没有落成更直白的句子，只落在${nameA}握伞时微微发白的指节上，也落在${nameB}几次想抬起又放下的手上。`,
    `“等雨小一点。”${nameA}回答得很快，快得像早就准备好这句不越界的挽留。`,
  ];

  const expansionParagraphs = [
    createStyleParagraph(styleCard, nameA, nameB),
    `${nameB}没有道谢。道谢会显得生分，不道谢又显得太熟，于是她只把呼吸放得更轻，像怕惊动那点刚刚被雨声遮住的旧默契。`,
    `${nameB}只把手往伞柄边缘挪了一点，像是确认那半寸遮挡确实存在。她的指尖离他的手背还有一段距离，那段距离足够放下一整场迟来的解释。`,
    `${nameA}没有看过去，目光落在雨帘尽头，肩线却慢慢松下来。街口有车轮碾过水坑，他的影子在水光里短暂晃了一下。`,
    `五年的空白没有在这一刻被填满。它只是被雨水泡软，露出里面还没完全褪色的纹路，像旧信纸上被反复折过的痕。`,
    `${nameB}听见自己说：“你变了。”`,
    `${nameA}沉默片刻：“你也是。”`,
    `这不是责备，也不是怀念。它更像一枚被递回来的旧徽章，边缘仍然锋利，拿在手里会疼，松开又舍不得。`,
    `雨势终于小了一点。街口有人撑伞走过，脚步声把沉默切开，铺子檐下悬着的灯也跟着晃了晃。`,
    `${nameB}先迈下台阶，水花溅到鞋尖，没有回头。她走得不快，像是在给身后那个人一个可以拒绝的余地。`,
    `身后那把伞跟了上来，保持着恰好的距离。近一步会显得越界，远一步又挡不住斜吹进来的雨。`,
    `到了路灯下，${nameA}停住。伞影从${nameB}肩上撤开，冷意立刻贴上来。`,
    `${nameB}这才转身，看见${nameA}站在雨里。`,
    `“明天还会下雨。”${nameA}说。`,
    `${nameB}看了${nameA}一会儿，轻声道：“那就明天再说。”`,
    `雨水从伞骨上滚下来，落在两人之间。那一点声音很轻，却像把刚才所有没说完的话都重新摆回原处。`,
    `${nameA}没有立刻走。${nameB}也没有催，只把视线移到街角那盏坏了一半的灯上。`,
    `“你还住在老地方？”${nameB}问。`,
    `${nameA}像是笑了一下，又很快收住：“你不是早就知道。”`,
    `这句话把距离拉近了一点，又立刻推远。${nameB}握紧包带，指尖被雨气浸得发冷。`,
    `远处有车驶过，水光短暂照亮${nameA}的侧脸。那道旧伤还在，只是比记忆里淡了许多。`,
    `${nameB}想问伤从哪里来，话到嘴边却变成：“伞拿走吧。”`,
    `“不用。”${nameA}说。`,
    `他把伞柄往她手边推了推，动作很稳，像只是递出一件无关紧要的东西。`,
    `${nameB}没有接。两个人就那样停着，谁都没有越过那截伞柄。`,
    `楼上忽然有人推开窗，昏黄的光漏下来。${nameA}往后退了一步，把自己重新退回雨里。`,
    `“有人在等你。”${nameB}说。`,
    `${nameA}抬眼看她，雨水顺着额发滑到眉骨：“也许是在等你。”`,
    `这一次，${nameB}没有立刻移开目光。风把檐下的雨吹斜，像要把两个人重新推到同一处。`,
  ];

  const neededParagraphs = [...baseParagraphs, ...expansionParagraphs].slice(
    0,
    paragraphHint.max,
  );

  const text = sanitizeLiteraryText(
    trimToApproximateLength(neededParagraphs.join("\n\n"), targetLength),
    nameA,
    nameB,
  );
  const emotionStructure = [
    `起——以「${moment}」建立具体空间，让人物在同一处屋檐下被迫靠近。`,
    `承——通过「${relationshipDetail}」和「${stage}」控制熟悉感与边界感。`,
    `转——围绕「${tension}」写未完成动作和短对白，让情绪停在克制处。`,
    `合——以雨势变小和距离变化收束，留下下一次见面的余温。`,
  ];
  const characterConstraints = [
    `人物姓名：正文固定使用 ${nameA} 和 ${nameB}，不使用泛称。`,
    `关系约束：${relationshipDetail}；${stage}。`,
    `风格约束：${styleCard}；${styleDetail}。`,
    `边界约束：${forbiddenText}。`,
    canonContext
      ? "Canon 约束：已读取并作为隐性硬设定约束正文。"
      : "Canon 约束：未读取到额外原作文档。",
    personaContext
      ? "Persona 约束：已读取角色档案并作为 OOC 边界约束正文。"
      : "Persona 约束：未读取到额外角色档案。",
  ];

  return {
    text,
    emotionStructure,
    characterConstraints,
    usedCanonDocuments,
    usedPersonaProfiles,
  };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function getFreeUsage(
  client: NonNullable<typeof supabase>,
  userId: string,
  feature: string,
) {
  const { data, error } = await client
    .from("user_generation_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", getTodayDateString())
    .eq("feature", feature)
    .eq("provider", FREE_PROVIDER)
    .maybeSingle();

  if (error) {
    return { error, count: 0, exists: false };
  }

  return {
    error: null,
    count: typeof data?.count === "number" ? data.count : 0,
    exists: Boolean(data),
  };
}

async function incrementFreeUsage(
  client: NonNullable<typeof supabase>,
  userId: string,
  feature: string,
  currentCount: number,
  exists: boolean,
) {
  const now = new Date().toISOString();
  const nextCount = currentCount + 1;

  if (exists) {
    const { error } = await client
      .from("user_generation_usage")
      .update({ count: nextCount, updated_at: now })
      .eq("user_id", userId)
      .eq("usage_date", getTodayDateString())
      .eq("feature", feature)
      .eq("provider", FREE_PROVIDER);

    return { error, count: nextCount };
  }

  const { error } = await client.from("user_generation_usage").insert({
    user_id: userId,
    usage_date: getTodayDateString(),
    feature,
    provider: FREE_PROVIDER,
    count: nextCount,
    created_at: now,
    updated_at: now,
  });

  return { error, count: nextCount };
}

async function checkFreeQuota(
  client: NonNullable<typeof supabase>,
  userId: string,
  feature: string,
) {
  const usage = await getFreeUsage(client, userId, feature);

  if (usage.error) {
    return {
      allowed: false,
      error: "无法读取免费生成额度，请稍后重试。",
      count: 0,
      exists: false,
    };
  }

  if (usage.count >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      message: "今日免费生成额度已用完，请切换高级模型或明天再试。",
      count: usage.count,
      exists: usage.exists,
    };
  }

  return {
    allowed: true,
    count: usage.count,
    exists: usage.exists,
  };
}

function mergeCanonContext(frontendCanonContext: unknown, documentCanonContext: string) {
  return [stringValue(frontendCanonContext), documentCanonContext]
    .filter(Boolean)
    .join("\n\n");
}

function mergePersonaContext(frontendPersonaContext: unknown, profilePersonaContext: string) {
  return [stringValue(frontendPersonaContext), profilePersonaContext]
    .filter(Boolean)
    .join("\n\n");
}

async function getUserCanonContext(
  client: NonNullable<typeof supabase>,
  userId: string,
): Promise<CanonContextResult> {
  const { data, error } = await client
    .from("user_canon_documents")
    .select("title, content")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Writer Canon context read failed", error.message);
    return { text: "", titles: [] };
  }

  const documents = (data ?? [])
    .map((item, index) => {
      const title =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : `未命名原作文档 ${index + 1}`;
      const content =
        typeof item.content === "string" ? item.content.trim().slice(0, 1200) : "";

      return content ? { title, content } : null;
    })
    .filter((item): item is { title: string; content: string } => item !== null);

  const text = documents
    .map(
      (item, index) =>
        `【Canon 文档 ${index + 1}：${item.title}】\n${item.content}`,
    )
    .join("\n\n")
    .slice(0, 3600);

  return {
    text,
    titles: documents.map((item) => item.title),
  };
}

function readableLine(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      stringValue(record.label),
      stringValue(record.tag),
      stringValue(record.title),
      stringValue(record.name),
      stringValue(record.description),
      stringValue(record.body),
      stringValue(record.identity),
      stringValue(record.stage),
      stringValue(record.connection),
      stringValue(record.hiddenEmotion),
      stringValue(record.conflict),
      stringValue(record.foreshadow),
      stringValue(record.taboo),
    ]
      .filter(Boolean)
      .join("：");
  }

  return "";
}

function readableList(value: unknown, limit: number) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object" && "data" in item) {
          return readableLine((item as Record<string, unknown>).data);
        }
        return readableLine(item);
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, item]) => {
        if (Array.isArray(item)) {
          return item.map((entry) => `${key}：${readableLine(entry)}`);
        }
        return `${key}：${readableLine(item)}`;
      })
      .filter((item) => item.replace(/^[^：]+：/, "").trim())
      .slice(0, limit);
  }

  return stringValue(value) ? [stringValue(value)] : [];
}

async function getUserPersonaContext(
  client: NonNullable<typeof supabase>,
  userId: string,
): Promise<PersonaContextResult> {
  const { data, error } = await client
    .from("user_persona_profiles")
    .select(
      "title, character_name, core_profile, persona_nodes, relationship_nodes, ooc_boundaries, metadata",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Writer Persona context read failed", error.message);
    return { text: "", titles: [] };
  }

  const profiles = (data ?? []).map((item, index) => {
    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : `未命名角色档案 ${index + 1}`;
    const personaLines = readableList(item.persona_nodes, 8);
    const relationLines = readableList(item.relationship_nodes, 8);
    const oocLines = [
      ...readableList(item.ooc_boundaries, 6),
      ...readableList((item.metadata as Record<string, unknown> | null)?.notes, 6),
    ].slice(0, 6);
    const sections = [
      `【角色档案 ${index + 1}：${title}】`,
      `角色名：${stringValue(item.character_name, "未填写")}`,
      `核心设定：${stringValue(item.core_profile, "未填写")}`,
      personaLines.length ? `人格节点：\n${personaLines.join("\n")}` : "",
      relationLines.length ? `关系节点：\n${relationLines.join("\n")}` : "",
      oocLines.length ? `OOC 边界：\n${oocLines.join("\n")}` : "",
    ].filter(Boolean);

    return {
      title,
      text: sections.join("\n").slice(0, 1200),
    };
  });

  return {
    text: profiles.map((profile) => profile.text).join("\n\n").slice(0, 3600),
    titles: profiles.map((profile) => profile.title),
  };
}

function normalizeProvider(value: unknown): ModelProvider {
  if (
    value === "openai" ||
    value === "gemini" ||
    value === "claude" ||
    value === "deepseek"
  ) {
    return value;
  }

  return "fanforge_free";
}

async function getUserModelSettings(request: Request): Promise<UserModelSettings> {
  const defaultSettings: UserModelSettings = {
    provider: "fanforge_free",
    model: "fanforge-free",
    api_key: null,
    user_id: null,
    access_token: null,
  };

  const token = getBearerToken(request);
  if (!token || !supabase) return defaultSettings;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return defaultSettings;
  }

  const userSupabase = createSupabaseClientForToken(token);
  if (!userSupabase) return defaultSettings;

  const { data, error } = await userSupabase
    .from("user_model_settings")
    .select("provider, model, api_key")
    .eq("user_id", user.id)
    .limit(1);

  if (error || !data?.[0]) {
    return {
      ...defaultSettings,
      user_id: user.id,
      access_token: token,
    };
  }

  const settings = data[0] as {
    provider?: unknown;
    model?: unknown;
    api_key?: unknown;
  };
  const provider = normalizeProvider(settings.provider);

  return {
    provider,
    model:
      typeof settings.model === "string" && settings.model.trim()
        ? settings.model
        : provider === "fanforge_free"
          ? "fanforge-free"
          : provider,
    api_key: typeof settings.api_key === "string" ? settings.api_key : null,
    user_id: user.id,
    access_token: token,
  };
}

function isWriterResponse(value: unknown): value is WriterResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.text === "string" &&
    Array.isArray(candidate.emotionStructure) &&
    candidate.emotionStructure.every((item) => typeof item === "string") &&
    Array.isArray(candidate.characterConstraints) &&
    candidate.characterConstraints.every((item) => typeof item === "string")
  );
}

const PRODUCT_TERMS_IN_TEXT = [
  "CP",
  "关系类型",
  "关系阶段",
  "情绪张力",
  "风格卡",
  "禁止项",
  "用户要求",
  "参数",
  "设定说明",
  "本段",
  "生成",
  "mock",
  "fallback",
  "demo",
  "自定义关系",
  "自定义瞬间",
  "自定义阶段",
  "自定义张力",
  "根据 Canon 文档",
  "根据Canon文档",
  "资料显示",
  "设定中写道",
  "根据 Persona",
  "根据Persona",
  "人格图显示",
  "角色设定中写道",
] as const;

function sanitizeLiteraryText(text: string, nameA = "沈砚", nameB = "林栀") {
  let next = text
    .replaceAll("男主", nameA)
    .replaceAll("女主", nameB)
    .replaceAll("角色A", nameA)
    .replaceAll("角色B", nameB);

  for (const term of PRODUCT_TERMS_IN_TEXT) {
    next = next.replaceAll(term, "");
  }

  const cleaned = next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/([。！？；，、])\s+/g, "$1")
    .replace(/\s+([。！？；，、])/g, "$1")
    .replace(/「」/g, "")
    .replace(/（）/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return formatBreathingParagraphs(separateDialogueParagraphs(cleaned));
}

function containsProhibitedExplanation(text: string) {
  return [
    ...PRODUCT_TERMS_IN_TEXT,
    "本段遵守",
    "根据用户要求",
    "生成策略",
    "规则",
    "CP 这个名字",
    "男主",
    "女主",
    "角色A",
    "角色B",
  ].some((item) => text.includes(item));
}

export async function POST(request: Request) {
  let body: WriterRequestBody = {};

  try {
    body = (await request.json()) as WriterRequestBody;
  } catch {
    body = {};
  }

  const normalized = normalizeWriterInput(body);
  const paragraphHint = getParagraphHint(normalized.targetLength);
  const lengthRange = getLengthRange(normalized.targetLength);
  const settings = await getUserModelSettings(request);
  let canonDocuments: CanonContextResult = { text: "", titles: [] };
  let personaProfiles: PersonaContextResult = { text: "", titles: [] };

  if (settings.user_id && settings.access_token) {
    const userSupabase = createSupabaseClientForToken(settings.access_token);
    if (userSupabase) {
      canonDocuments = await getUserCanonContext(userSupabase, settings.user_id);
      personaProfiles = await getUserPersonaContext(userSupabase, settings.user_id);
    }
  }

  const normalizedWithCanon: NormalizedWriterInput = {
    ...normalized,
    canonContext: mergeCanonContext(body.canonContext, canonDocuments.text),
    usedCanonDocuments: canonDocuments.titles,
    personaContext: mergePersonaContext(body.personaContext, personaProfiles.text),
    usedPersonaProfiles: personaProfiles.titles,
  };
  const freeModelResponse = createFreeModelResponse(normalizedWithCanon);

  if (settings.provider === "fanforge_free") {
    if (settings.user_id && settings.access_token) {
      const userSupabase = createSupabaseClientForToken(settings.access_token);

      if (!userSupabase) {
        return Response.json(
          { error: "无法连接免费额度服务，请稍后重试。" },
          { status: 500 },
        );
      }

      const quota = await checkFreeQuota(
        userSupabase,
        settings.user_id,
        WRITER_FEATURE,
      );

      if (!quota.allowed) {
        return Response.json(
          { message: quota.message ?? quota.error },
          { status: quota.message ? 429 : 500 },
        );
      }

      const usage = await incrementFreeUsage(
        userSupabase,
        settings.user_id,
        WRITER_FEATURE,
        quota.count,
        quota.exists,
      );

      if (usage.error) {
        return Response.json(
          { error: "无法更新免费生成额度，请稍后重试。" },
          { status: 500 },
        );
      }

      return Response.json({
        ...freeModelResponse,
        usedCanonDocuments: canonDocuments.titles,
        usedPersonaProfiles: personaProfiles.titles,
        usage: {
          limit: FREE_DAILY_LIMIT,
          used: usage.count,
          remaining: Math.max(0, FREE_DAILY_LIMIT - usage.count),
        },
      });
    }

    return Response.json({
      ...freeModelResponse,
      usedCanonDocuments: canonDocuments.titles,
      usedPersonaProfiles: personaProfiles.titles,
    });
  }

  if (
    settings.provider === "gemini" ||
    settings.provider === "claude" ||
    settings.provider === "deepseek"
  ) {
    return Response.json(
      {
        message:
          "该模型适配器即将开放，请先使用 FanForge Free Model 或 OpenAI GPT。",
      },
      { status: 400 },
    );
  }

  if (!settings.api_key) {
    return Response.json(
      { error: "请先在模型设置中配置 OpenAI API Key" },
      { status: 400 },
    );
  }

  try {
    const client = new OpenAI({ apiKey: settings.api_key });
    const response = await client.responses.create({
      model: settings.model || "gpt-5.2",
      instructions: [
        "你是 FanForge 的情绪切片写作 Agent，专门为同人/关系向创作生成高密度短片段。",
        "你的目标不是写剧情梗概，也不是解释人物关系，而是写一个可以直接放进正文里的文学片段。",
        "你擅长关系瞬间、潜台词、留白、动作暗示、短句对话、克制的情绪推进，以及场景中的关系张力。",
        "优先遵守用户自由输入，其次遵守 select 选项。",
        `正文必须使用具体人物名：${normalizedWithCanon.nameA}、${normalizedWithCanon.nameB}。`,
        normalizedWithCanon.canonContext
          ? `Canon 上下文：\n${normalizedWithCanon.canonContext}`
          : "Canon 上下文：",
        "如果 Canon 上下文存在，生成时要优先遵守其中的硬设定，不得主动改写其中明确的人物身份、时间线、阵营和世界观规则。",
        "如果用户输入和 Canon 上下文冲突，优先保持 Canon 一致性，但不要在正文里解释冲突。",
        "text 正文里不要出现“根据 Canon 文档”“资料显示”“设定中写道”等说明性语言；Canon 只作为隐性约束进入正文。",
        normalizedWithCanon.personaContext
          ? `Persona 上下文：\n${normalizedWithCanon.personaContext}`
          : "Persona 上下文：",
        "生成时优先遵守角色核心设定，不得让角色做出明显违反 OOC 边界的行为。",
        "如果 Persona 中写明角色克制、冷静、不直接表白，正文不要突然直白告白。",
        "用动作、语气、停顿体现人格，而不是在正文里解释“他是一个怎样的人”。",
        "text 正文里不要出现“根据 Persona”“人格图显示”“角色设定中写道”等说明性语言。",
        `text 字段目标字数约为 ${normalizedWithCanon.targetLength} 个中文字符，最终正文必须尽量落在 ${lengthRange.min} 到 ${lengthRange.max} 个中文字符之间，并写成 ${paragraphHint.label}。`,
        "不要因为分段变短而大幅缩水。如果目标是 500 字，不能只写 200 字；如果目标是 1000 字，不能只写 400 字。",
        `段落规则：每段 1-4 句话；不允许超过 160 个中文字符的超长段落；如果目标约 400-600 字，至少 7 个自然段；如果目标约 700-1000 字，至少 10 个自然段。`,
        "对话必须单独成段，至少包含 3 句自然、克制的短对话；每句对话尽量不超过 20 个字。",
        "每 2-3 段要出现一个具体动作、物件或环境细节，例如停顿、错开的目光、手指、衣袖、雨声、灯影。",
        "用动作写情绪，不要连续大段心理解释；不要让人物把心里话说透。",
        "不要突然拥抱、亲吻、和解或直接告白，除非用户明确要求。",
        "让关系推进停在快要越界但没有越界的位置；结尾留白，不要总结感情，不要点明两人还爱着。",
        "禁止写成一整坨散文，禁止总结人物关系，禁止写“他们之间的关系如何如何”或“这种距离象征着……”。",
        "text 字段只能是小说正文，不能写产品说明、规则解释、参数说明或生成策略。",
        "text 中绝对禁止出现：CP、关系类型、关系阶段、情绪张力、风格卡、禁止项、男主、女主、角色A、角色B、用户要求、参数、设定说明、本段、生成、mock、fallback、demo、自定义关系、自定义瞬间、自定义阶段、自定义张力。",
        "表达关系时，只能用人物动作、短对白、称呼、站位、距离和物件暗示，不要写任何产品参数词。",
        "必须体现用户输入的具体场景、关系设定、阶段细节、情绪推进、风格要求和边界要求，但不能直接说出这些字段名。",
        "emotionStructure 输出 3-5 条情绪结构说明；characterConstraints 输出 3-5 条使用到的角色、关系、风格约束。",
        "输出必须是符合 schema 的 JSON，不要输出 Markdown 或额外解释。",
      ].join("\n"),
      input: JSON.stringify({
        characterNames: `${normalizedWithCanon.nameA} × ${normalizedWithCanon.nameB}`,
        relationshipType: body.relationshipType,
        relationshipTypeCustom: body.relationshipTypeCustom,
        relationshipTypeFinal: body.relationshipTypeFinal,
        relationshipDetail: normalizedWithCanon.relationshipDetail,
        canonContext: normalizedWithCanon.canonContext,
        usedCanonDocuments: canonDocuments.titles,
        personaContext: normalizedWithCanon.personaContext,
        usedPersonaProfiles: personaProfiles.titles,
        moment: body.moment,
        momentCustom: body.momentCustom,
        momentFinal: body.momentFinal,
        sceneDescription: body.sceneDescription,
        effectiveMoment: normalizedWithCanon.moment,
        stage: body.stage,
        stageCustom: body.stageCustom,
        stageFinal: body.stageFinal,
        effectiveStage: normalizedWithCanon.stage,
        tension: body.tension,
        tensionCustom: body.tensionCustom,
        tensionFinal: body.tensionFinal,
        effectiveTension: normalizedWithCanon.tension,
        expectedLength: body.expectedLength ?? body.expectedWordCount,
        customLength: body.customLength,
        effectiveTargetLength: normalizedWithCanon.targetLength,
        minLength: lengthRange.min,
        maxLength: lengthRange.max,
        paragraphHint: paragraphHint.label,
        styleCard: normalizedWithCanon.styleCard,
        styleCustom: body.styleCustom ?? body.styleRequirement,
        effectiveStyleDetail: normalizedWithCanon.styleDetail,
        forbiddenItems: body.forbiddenItems,
        forbiddenCustom: body.forbiddenCustom,
        forbiddenText: normalizedWithCanon.forbiddenText,
        task: [
          "生成一个关系情绪短片段。",
          "text 只写正文，不写任何解释。",
          "emotionStructure 和 characterConstraints 单独输出，不要混入 text。",
        ].join("\n"),
      }),
      max_output_tokens: Math.min(4200, Math.max(1400, normalizedWithCanon.targetLength * 3)),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "fanforge_writer_response",
          strict: true,
          schema: writerResponseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);

    if (!isWriterResponse(parsed)) {
      return Response.json(freeModelResponse);
    }

    const sanitizedResponse: WriterResponse = {
      ...parsed,
      text: sanitizeLiteraryText(
        parsed.text,
        normalizedWithCanon.nameA,
        normalizedWithCanon.nameB,
      ),
      usedCanonDocuments: canonDocuments.titles,
      usedPersonaProfiles: personaProfiles.titles,
    };

    if (containsProhibitedExplanation(sanitizedResponse.text)) {
      return Response.json(freeModelResponse);
    }

    return Response.json({
      ...sanitizedResponse,
      usedCanonDocuments: canonDocuments.titles,
      usedPersonaProfiles: personaProfiles.titles,
    });
  } catch (error) {
    console.error("Writer API error", error);

    if (error instanceof SyntaxError) {
      return Response.json(freeModelResponse);
    }

    const message =
      error instanceof Error ? error.message : "OpenAI API request failed.";

    return Response.json({ error: message }, { status: 500 });
  }
}
