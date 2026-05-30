import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

type WriterResponse = {
  text: string;
  emotionStructure: string[];
  characterConstraints: string[];
  usedCanonDocuments?: string[];
  usedCanonEvidence?: UsedCanonEvidence[];
  canonUsage?: CanonUsage;
  usedPersonaProfiles?: string[];
};

type UsedCanonEvidence = {
  title: string;
  contentPreview: string;
  similarity: number;
  documentId?: string;
};

type CanonMode = "none" | "auto" | "selected";

type CanonUsage = {
  mode: CanonMode;
  status: "disabled" | "used" | "no_relevant_evidence" | "missing_selected_document";
  message: string;
  selectedDocumentTitle?: string;
  evidenceCount?: number;
  maxSimilarity?: number;
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
  mode?: string;
  rewriteInstruction?: string;
  previousText?: string;
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
  canonMode?: string;
  selectedCanonDocumentId?: string;
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

const FREE_DAILY_LIMIT = 30;
const FREE_PROVIDER = "fanforge_free";
const WRITER_FEATURE = "slice";
const EXPECTED_EMBEDDING_DIMENSION = 1536;
const CANON_SIMILARITY_THRESHOLD = 0.65;

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
  mode: string;
  rewriteInstruction: string;
  previousText: string;
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
  usedCanonEvidence: UsedCanonEvidence[];
  canonUsage: CanonUsage;
  personaContext: string;
  usedPersonaProfiles: string[];
  feedbackLearningContext: string;
};

type CanonContextResult = {
  text: string;
  titles: string[];
};

type CanonEvidenceHit = {
  documentId?: string;
  title: string;
  content: string;
  similarity: number | null;
};

type GeminiEmbeddingResponse = {
  embeddings?: Array<{
    values?: number[];
  }>;
  embedding?: {
    values?: number[];
  };
  error?: {
    message?: string;
  };
};

type PersonaContextResult = {
  text: string;
  titles: string[];
};

type FeedbackRow = {
  rating: string;
  issue_tags: string[];
  comment: string;
  feature: string;
  created_at: string;
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
    mode: stringValue(body.mode, "generate"),
    rewriteInstruction: stringValue(body.rewriteInstruction),
    previousText: stringValue(body.previousText),
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
    usedCanonEvidence: [],
    canonUsage: createCanonUsage("auto", []),
    personaContext: stringValue(body.personaContext),
    usedPersonaProfiles: [],
    feedbackLearningContext: "",
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

function extractVoiceLine(personaContext: string) {
  const match = personaContext.match(/常说的话：([^\n]+)/);
  if (!match?.[1]) return "";

  const raw = match[1].trim();
  const quoted = raw.match(/[“‘'"]([^”’'"]+)[”’'"]?/);
  return (quoted?.[1] || raw.split(/[。；;\/]/)[0] || "").trim().slice(0, 28);
}

function createFreeRewriteText(input: NormalizedWriterInput) {
  const base = sanitizeLiteraryText(
    input.previousText || createFreeModelResponse({ ...input, mode: "generate" }).text,
    input.nameA,
    input.nameB,
  );
  const paragraphs = base.split(/\n{2,}/).filter(Boolean);
  const voiceLine = extractVoiceLine(input.personaContext);
  const extraByInstruction: Record<string, string[]> = {
    更克制: [
      `${input.nameB}把话咽回去，只用指节蹭了蹭袖口的雨痕。`,
      `“算了。”${input.nameA}说。`,
      `${input.nameB}没有问算了什么。她往旁边让出半步，檐下的阴影也跟着空了一点。`,
    ],
    更多对话: [
      `“你认出我了。”${input.nameA}说。`,
      `“没有。”`,
      `“那你为什么不看我？”`,
      `${input.nameB}停了停：“因为雨太大。”`,
    ],
    更有张力: [
      `${input.nameA}往前一步，伞影刚要覆过去，${input.nameB}却先退到了灯光边缘。`,
      `“别过来。”`,
      `这三个字没有落重，却比雨声更清楚。${input.nameA}停住，手指仍扣着伞柄，没有松开。`,
    ],
    更贴近角色: [
      `${input.nameA}没有解释，只把伞柄转向她那边。动作很稳，像是在把所有多余的话都按回骨头里。`,
      `“${voiceLine || "别把话说得太满"}。”${input.nameB}低声说。`,
      `“我没说不管。”`,
    ],
    更像原作: [
      `街角旧徽章的暗纹被雨水洗亮了一瞬。${input.nameA}看见它，神色比方才更冷。`,
      `“这东西还在你这里？”`,
      `${input.nameB}把徽章握进掌心，没有回答。`,
    ],
    少一点心理描写: [
      `雨水顺着伞骨落下来，砸在两人中间。`,
      `${input.nameB}抬手，像要接那把伞，又在碰到伞柄前停住。`,
      `“不用。”她说。`,
    ],
  };
  const additions = extraByInstruction[input.rewriteInstruction] ?? extraByInstruction.更克制;
  const insertionIndex = Math.min(Math.max(3, Math.floor(paragraphs.length / 2)), paragraphs.length);
  const rewritten = [
    ...paragraphs.slice(0, insertionIndex),
    ...additions,
    ...paragraphs.slice(insertionIndex),
  ].join("\n\n");

  return trimToApproximateLength(
    sanitizeLiteraryText(rewritten, input.nameA, input.nameB),
    input.targetLength,
  );
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
    feedbackLearningContext,
  } = input;
  const paragraphHint = getParagraphHint(targetLength);
  const voiceLine = extractVoiceLine(personaContext);

  if (input.mode === "rewrite") {
    const text = createFreeRewriteText(input);

    return {
      text,
      emotionStructure: [
        `起——保留原片段的「${moment}」和人物距离。`,
        `承——按「${input.rewriteInstruction || "定向改写"}」调整对白、动作和留白比例。`,
        `转——继续维持「${tension}」下的克制推进。`,
        "合——结尾仍停在未完全越界的位置，不替角色总结感情。",
      ],
      characterConstraints: [
        `人物姓名：正文固定使用 ${nameA} 和 ${nameB}。`,
        `关系约束：${relationshipDetail}；${stage}。`,
        `风格约束：${styleCard}；${styleDetail}。`,
        `边界约束：${forbiddenText}。`,
        personaContext
          ? "Persona 约束：已读取角色档案和声线样本作为对白边界。"
          : "Persona 约束：未读取到额外角色档案。",
        feedbackLearningContext
          ? "历史偏好：已参考近期反馈，降低重复问题。"
          : "历史偏好：暂无反馈约束。",
      ],
      usedCanonDocuments,
      usedCanonEvidence: input.usedCanonEvidence,
      canonUsage: input.canonUsage,
      usedPersonaProfiles,
    };
  }

  const baseParagraphs = [
    `${moment}。雨把街灯洗成旧金色，积水沿着砖缝往低处流，${nameA}和${nameB}停在同一处屋檐下，谁都没有先往外迈一步。`,
    `${nameB}先看见${nameA}肩头湿透的布料。檐角的水一滴一滴落到脚边，${literaryRelationshipCue}把两人的距离压得很窄，窄到任何一句寒暄都会显得多余。`,
    `“你怎么还走这条路？”${nameB}问。`,
    `“只是顺路。”${nameA}说。`,
    voiceLine ? `“${voiceLine}。”${nameB}说。` : "",
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

  const neededParagraphs = [...baseParagraphs, ...expansionParagraphs]
    .filter(Boolean)
    .slice(0, paragraphHint.max);

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
    feedbackLearningContext
      ? "历史偏好：已参考近期反馈，减少重复问题。"
      : "历史偏好：暂无反馈约束。",
  ];

  return {
    text,
    emotionStructure,
    characterConstraints,
    usedCanonDocuments,
    usedCanonEvidence: input.usedCanonEvidence,
    canonUsage: input.canonUsage,
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

async function createGeminiEmbedding(text: string) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = "models/gemini-embedding-001";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            model,
            outputDimensionality: EXPECTED_EMBEDDING_DIMENSION,
            content: {
              parts: [{ text }],
            },
          },
        ],
      }),
    },
  );

  const payload = (await response.json()) as GeminiEmbeddingResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || "Gemini embedding request failed");
  }

  const embedding = payload.embeddings?.[0]?.values ?? payload.embedding?.values ?? [];
  if (embedding.length !== EXPECTED_EMBEDDING_DIMENSION) {
    throw new Error(
      `Gemini embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSION}, got ${embedding.length}.`,
    );
  }

  return embedding;
}

function normalizeCanonEvidenceRow(row: unknown): CanonEvidenceHit | null {
  if (!row || typeof row !== "object") return null;

  const record = row as Record<string, unknown>;
  const content = stringValue(record.content);
  if (!content) return null;

  return {
    documentId: stringValue(record.document_id, stringValue(record.documentId)),
    title: stringValue(record.title, "未命名 Canon 文档"),
    content,
    similarity:
      typeof record.similarity === "number" && Number.isFinite(record.similarity)
        ? record.similarity
        : null,
  };
}

async function retrieveCanonChunks(
  client: NonNullable<typeof supabase>,
  userId: string,
  query: string,
  matchCount = 5,
): Promise<CanonEvidenceHit[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    const embedding = await createGeminiEmbedding(trimmedQuery);
    const { data, error } = await client.rpc("match_canon_chunks", {
      query_embedding: embedding,
      match_user_id: userId,
      match_count: matchCount,
    });

    if (error) {
      console.error("Writer Canon RAG retrieval failed", error.message);
      return [];
    }

    return (Array.isArray(data) ? data : [])
      .map(normalizeCanonEvidenceRow)
      .filter((item): item is CanonEvidenceHit => item !== null)
      .slice(0, matchCount);
  } catch (error) {
    console.error(
      "Writer Canon RAG retrieval failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}

function normalizeCanonMode(value: unknown): CanonMode {
  if (value === "none" || value === "selected") return value;
  return "auto";
}

function filterRelevantCanonEvidence(evidence: CanonEvidenceHit[]) {
  return evidence
    .filter(
      (item) =>
        typeof item.similarity === "number" &&
        item.similarity >= CANON_SIMILARITY_THRESHOLD,
    )
    .slice(0, 5);
}

function uniqueEvidenceTitles(evidence: CanonEvidenceHit[]) {
  return Array.from(new Set(evidence.map((item) => item.title).filter(Boolean)));
}

function createCanonUsage(
  mode: CanonMode,
  evidence: CanonEvidenceHit[],
  extra?: {
    status?: CanonUsage["status"];
    message?: string;
    selectedDocumentTitle?: string;
  },
): CanonUsage {
  if (extra?.status) {
    return {
      mode,
      status: extra.status,
      message: extra.message || "",
      selectedDocumentTitle: extra.selectedDocumentTitle,
    };
  }

  if (mode === "none") {
    return {
      mode,
      status: "disabled",
      message: "本次生成未使用 Canon。",
    };
  }

  if (evidence.length === 0) {
    return {
      mode,
      status: "no_relevant_evidence",
      message: "未找到足够相关的 Canon 证据，本次生成未注入 Canon。",
      selectedDocumentTitle: extra?.selectedDocumentTitle,
    };
  }

  return {
    mode,
    status: "used",
    message: "本次已使用 Canon RAG 证据。",
    selectedDocumentTitle: extra?.selectedDocumentTitle,
    evidenceCount: evidence.length,
    maxSimilarity: Math.max(
      ...evidence.map((item) => (typeof item.similarity === "number" ? item.similarity : 0)),
    ),
  };
}

async function getCanonDocumentTitle(
  client: NonNullable<typeof supabase>,
  userId: string,
  documentId: string,
) {
  const { data, error } = await client
    .from("user_canon_documents")
    .select("title")
    .eq("user_id", userId)
    .eq("id", documentId)
    .maybeSingle();

  if (error) return "";
  return stringValue(data?.title);
}

function formatCanonRagEvidence(evidence: CanonEvidenceHit[]) {
  if (evidence.length === 0) return "";

  return [
    "【Canon RAG Evidence】",
    ...evidence.map((item, index) =>
      [
        `${index + 1}. 来源：${item.title}`,
        `   相似度：${item.similarity === null ? "未知" : item.similarity.toFixed(2)}`,
        `   证据：${item.content.slice(0, 900)}`,
      ].join("\n"),
    ),
  ].join("\n\n");
}

function toUsedCanonEvidence(evidence: CanonEvidenceHit[]): UsedCanonEvidence[] {
  return evidence.map((item) => ({
    title: item.title,
    contentPreview: item.content.replace(/\s+/g, " ").slice(0, 120),
    similarity: item.similarity ?? 0,
    documentId: item.documentId,
  }));
}

function buildWriterCanonRetrievalQuery(
  body: WriterRequestBody,
  input: NormalizedWriterInput,
) {
  const selectedForbiddenItems = Array.isArray(body.forbiddenItems)
    ? body.forbiddenItems.join("、")
    : "";

  return [
    `角色/CP 名称：${input.nameA} × ${input.nameB}`,
    `关系类型：${input.relationshipType}`,
    `关系设定：${input.relationshipDetail}`,
    `关系瞬间：${input.moment}`,
    `关系阶段：${input.stage}`,
    `情绪张力：${input.tension}`,
    `自由场景描述：${stringValue(body.sceneDescription)}`,
    `禁止项：${[selectedForbiddenItems, stringValue(body.forbiddenCustom)]
      .filter(Boolean)
      .join("、")}`,
    `文学气质：${input.styleCard}`,
    `风格补充：${input.styleDetail}`,
  ]
    .filter((line) => !line.endsWith("："))
    .join("\n");
}

function mergePersonaContext(frontendPersonaContext: unknown, profilePersonaContext: string) {
  return [stringValue(frontendPersonaContext), profilePersonaContext]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeIssueTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "");
}

async function getUserFeedbackRows(
  client: NonNullable<typeof supabase>,
  userId: string,
): Promise<FeedbackRow[]> {
  const { data, error } = await client
    .from("user_feedback")
    .select("rating, issue_tags, comment, feature, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Writer feedback context read failed", error.message);
    return [];
  }

  return (data ?? []).map((item) => ({
    rating: stringValue(item.rating, "neutral"),
    issue_tags: normalizeIssueTags(item.issue_tags),
    comment: stringValue(item.comment).slice(0, 80),
    feature: stringValue(item.feature, "slice"),
    created_at: stringValue(item.created_at),
  }));
}

const FEEDBACK_LEARNING_RULES = [
  {
    key: "OOC / 角色不像",
    match: (text: string) =>
      text.includes("OOC") ||
      text.includes("角色不像") ||
      text.includes("对话不像角色"),
    strategies: [
      "强化 Persona 上下文。",
      "对话和行为必须更贴近角色声线。",
      "不要让角色突然告白、突然和解、突然做违背人格的动作。",
    ],
  },
  {
    key: "Canon 冲突",
    match: (text: string) => text.includes("Canon") || text.includes("canon"),
    strategies: [
      "强化 Canon 上下文优先级。",
      "不得随意改写身份、时间线、世界观规则。",
      "不确定时保持模糊，不主动创造硬设定。",
    ],
  },
  {
    key: "情绪不足",
    match: (text: string) => text.includes("情绪不足"),
    strategies: [
      "增加关系张力。",
      "增加停顿、动作、短对话、未说出口的话。",
      "不要只写平铺直叙的剧情。",
    ],
  },
  {
    key: "风格不匹配",
    match: (text: string) => text.includes("风格不匹配"),
    strategies: [
      "更严格遵守 styleCard 和 styleCustom。",
      "减少与用户风格要求冲突的表达。",
      "不要过度华丽或过度口语，按用户偏好调整。",
    ],
  },
  {
    key: "太直白 / 心理描写过多",
    match: (text: string) => text.includes("太直白") || text.includes("心理描写过多"),
    strategies: [
      "减少解释性心理描写。",
      "用动作、物件、环境和对话承载情绪。",
      "避免直接总结感情。",
    ],
  },
  {
    key: "关系推进过快",
    match: (text: string) => text.includes("关系推进过快"),
    strategies: [
      "关系推进更慢。",
      "不要突然亲密、拥抱、告白或和解。",
      "让关系停在快要越界但没有越界的位置。",
    ],
  },
  {
    key: "太 AI / AI 味",
    match: (text: string) => text.includes("太 AI") || text.includes("AI 味"),
    strategies: [
      "减少抽象总结句。",
      "减少排比和套路化抒情。",
      "增加具体动作、物件、停顿和不完整对话。",
    ],
  },
] as const;

function buildFeedbackLearningContext(rows: FeedbackRow[]) {
  if (rows.length === 0) return "";

  const counts = FEEDBACK_LEARNING_RULES.map((rule) => ({
    key: rule.key,
    count: rows.reduce((sum, row) => {
      const searchable = [...row.issue_tags, row.comment].join(" ");
      return rule.match(searchable) ? sum + 1 : sum;
    }, 0),
    strategies: rule.strategies,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (counts.length === 0) return "";

  const strategies = Array.from(
    new Set(counts.flatMap((item) => item.strategies)),
  ).slice(0, 6);

  return [
    "【用户历史反馈倾向】",
    "最近反馈中常见问题：",
    ...counts.map((item) => `- ${item.key}：${item.count} 次`),
    "",
    "下一次生成请自动调整：",
    ...strategies.map((item) => `- ${item}`),
  ]
    .join("\n")
    .slice(0, 800);
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

function voiceProfileLines(metadata: Record<string, unknown> | null) {
  const voiceProfile =
    metadata?.voiceProfile && typeof metadata.voiceProfile === "object"
      ? (metadata.voiceProfile as Record<string, unknown>)
      : null;

  if (!voiceProfile) return [];

  return [
    ["常说的话", voiceProfile.commonLines],
    ["不会说的话", voiceProfile.forbiddenLines],
    ["称呼习惯", voiceProfile.addressHabits],
    ["语气关键词", voiceProfile.toneKeywords],
  ]
    .map(([label, value]) => {
      const text = stringValue(value);
      return text ? `${label}：${text}` : "";
    })
    .filter(Boolean);
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
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : null;
    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : `未命名角色档案 ${index + 1}`;
    const personaLines = readableList(item.persona_nodes, 8);
    const relationLines = readableList(item.relationship_nodes, 8);
    const oocLines = [
      ...readableList(item.ooc_boundaries, 6),
      ...readableList(metadata?.notes, 6),
    ].slice(0, 6);
    const voiceLines = voiceProfileLines(metadata);
    const sections = [
      `【角色档案 ${index + 1}：${title}】`,
      `角色名：${stringValue(item.character_name, "未填写")}`,
      `核心设定：${stringValue(item.core_profile, "未填写")}`,
      personaLines.length ? `人格节点：\n${personaLines.join("\n")}` : "",
      relationLines.length ? `关系节点：\n${relationLines.join("\n")}` : "",
      oocLines.length ? `OOC 边界：\n${oocLines.join("\n")}` : "",
      voiceLines.length ? `【角色声线】\n${voiceLines.join("\n")}` : "",
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
  "根据证据",
  "RAG 检索显示",
  "根据 Canon 证据",
  "RAG 显示",
  "Canon RAG Evidence",
  "资料显示",
  "设定中写道",
  "根据 Persona",
  "根据Persona",
  "人格图显示",
  "角色设定中写道",
  "根据角色声线",
  "voiceProfile",
  "改写",
  "改写说明",
  "根据要求",
  "根据你的历史反馈",
  "反馈显示",
  "用户认为",
  "历史反馈",
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
  const canonMode = normalizeCanonMode(body.canonMode);
  const selectedCanonDocumentId = stringValue(body.selectedCanonDocumentId);
  let canonDocuments: CanonContextResult = { text: "", titles: [] };
  let canonEvidence: CanonEvidenceHit[] = [];
  let selectedDocumentTitle = "";
  let personaProfiles: PersonaContextResult = { text: "", titles: [] };
  let feedbackLearningContext = "";

  if (settings.user_id && settings.access_token) {
    const userSupabase = createSupabaseClientForToken(settings.access_token);
    if (userSupabase) {
      if (canonMode !== "none") {
        if (canonMode === "selected" && selectedCanonDocumentId) {
          selectedDocumentTitle = await getCanonDocumentTitle(
            userSupabase,
            settings.user_id,
            selectedCanonDocumentId,
          );
        }

        if (canonMode !== "selected" || selectedCanonDocumentId) {
          const rawCanonEvidence = await retrieveCanonChunks(
            userSupabase,
            settings.user_id,
            buildWriterCanonRetrievalQuery(body, normalized),
            canonMode === "selected" ? 30 : 5,
          );
          const scopedEvidence =
            canonMode === "selected"
              ? rawCanonEvidence.filter(
                  (item) => item.documentId === selectedCanonDocumentId,
                )
              : rawCanonEvidence;

          canonEvidence = filterRelevantCanonEvidence(scopedEvidence);
          canonDocuments = {
            text: "",
            titles: uniqueEvidenceTitles(canonEvidence),
          };
        }
      }
      personaProfiles = await getUserPersonaContext(userSupabase, settings.user_id);
      feedbackLearningContext = buildFeedbackLearningContext(
        await getUserFeedbackRows(userSupabase, settings.user_id),
      );
    }
  }

  const canonUsage =
    canonMode === "none"
      ? createCanonUsage("none", [])
      : canonMode === "selected" && !selectedCanonDocumentId
        ? createCanonUsage("selected", [], {
            status: "missing_selected_document",
            message: "请选择要使用的 Canon 文档。",
          })
        : createCanonUsage(canonMode, canonEvidence, {
            selectedDocumentTitle,
          });
  const canonRagContext = formatCanonRagEvidence(canonEvidence);
  const usedCanonEvidence = toUsedCanonEvidence(canonEvidence);
  const normalizedWithCanon: NormalizedWriterInput = {
    ...normalized,
    canonContext:
      canonUsage.status === "used"
        ? mergeCanonContext(
            body.canonContext,
            [canonRagContext, canonDocuments.text].filter(Boolean).join("\n\n"),
          )
        : "",
    usedCanonDocuments: canonDocuments.titles,
    usedCanonEvidence,
    canonUsage,
    personaContext: mergePersonaContext(body.personaContext, personaProfiles.text),
    usedPersonaProfiles: personaProfiles.titles,
    feedbackLearningContext,
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
        usedCanonEvidence,
        canonUsage,
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
      usedCanonEvidence,
      canonUsage,
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
        "如果 Canon 上下文包含【Canon RAG Evidence】，必须优先遵守其中命中的硬设定。",
        "只有当 Canon RAG Evidence 存在时才优先遵守 Canon；如果本次没有 Canon RAG Evidence，不要假装使用了 Canon。",
        "不得编造与 Canon RAG Evidence 冲突的身份、时间线、阵营或世界观规则。",
        "如果证据不足，不要强行创造硬设定；保持模糊比主动编造更重要。",
        "如果 Canon RAG Evidence 与用户自由输入冲突，优先遵守 Canon RAG Evidence。",
        "text 正文中不要写“根据证据”“RAG 检索显示”等说明性语言。",
        "text 正文中不要写“根据 Canon 证据”“RAG 显示”“Canon RAG Evidence”等说明性语言；Canon Evidence 只作为生成约束，不要直接复述成说明文。",
        "如果 Canon 上下文存在，生成时要优先遵守其中的硬设定，不得主动改写其中明确的人物身份、时间线、阵营和世界观规则。",
        "如果用户输入和 Canon 上下文冲突，优先保持 Canon 一致性，但不要在正文里解释冲突。",
        "text 正文里不要出现“根据 Canon 文档”“资料显示”“设定中写道”等说明性语言；Canon 只作为隐性约束进入正文。",
        normalizedWithCanon.personaContext
          ? `Persona 上下文：\n${normalizedWithCanon.personaContext}`
          : "Persona 上下文：",
        "生成时优先遵守角色核心设定，不得让角色做出明显违反 OOC 边界的行为。",
        "如果 Persona 中写明角色克制、冷静、不直接表白，正文不要突然直白告白。",
        "如果 Persona 上下文包含【角色声线】，至少 3 句对话要参考常说的话的句式和语气，避免不会说的话中的表达，称呼遵守称呼习惯，语气关键词影响对白和叙述节奏。",
        "不要在正文里写“根据角色声线”，不要把 voiceProfile 或声线样本原样堆进正文。",
        "用动作、语气、停顿体现人格，而不是在正文里解释“他是一个怎样的人”。",
        "text 正文里不要出现“根据 Persona”“人格图显示”“角色设定中写道”等说明性语言。",
        normalizedWithCanon.feedbackLearningContext
          ? `历史反馈学习：\n${normalizedWithCanon.feedbackLearningContext}`
          : "历史反馈学习：",
        "历史反馈学习只作为生成优化信号；text 正文里不要写“根据你的历史反馈”“反馈显示”“用户认为”等解释。",
        normalizedWithCanon.mode === "rewrite"
          ? [
              "当前是定向改写模式：必须基于 previousText 改写，不要重新生成完全无关内容。",
              `改写指令：${normalizedWithCanon.rewriteInstruction || "保持原意并优化文本"}`,
              "text 字段仍然只输出小说正文，不要解释“已经帮你改写”。",
              "如果指令是“更克制”，减少直白心理描写和情绪宣告，增加停顿、动作、未说出口的话。",
              "如果指令是“更多对话”，增加自然短对话，对话单独成段，不要变成说明式对白。",
              "如果指令是“更有张力”，增加距离变化、回避、试探和误解，不要直接拥抱、告白或和解。",
              "如果指令是“更贴近角色”，更严格遵守 Persona 上下文、OOC 边界和角色声线。",
              "如果指令是“更像原作”，更严格遵守 Canon 上下文，不改写原作硬设定。",
              "如果指令是“少一点心理描写”，用动作、物件、环境和对话承载情绪，减少解释句。",
            ].join("\n")
          : "当前是首次生成模式。",
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
        "改写模式下还禁止出现：改写、改写说明、根据要求、我已经、以下是。",
        "表达关系时，只能用人物动作、短对白、称呼、站位、距离和物件暗示，不要写任何产品参数词。",
        "必须体现用户输入的具体场景、关系设定、阶段细节、情绪推进、风格要求和边界要求，但不能直接说出这些字段名。",
        "emotionStructure 输出 3-5 条情绪结构说明；characterConstraints 输出 3-5 条使用到的角色、关系、风格约束。",
        "输出必须是符合 schema 的 JSON，不要输出 Markdown 或额外解释。",
      ].join("\n"),
      input: JSON.stringify({
        characterNames: `${normalizedWithCanon.nameA} × ${normalizedWithCanon.nameB}`,
        mode: normalizedWithCanon.mode,
        rewriteInstruction: normalizedWithCanon.rewriteInstruction,
        previousText: normalizedWithCanon.previousText,
        relationshipType: body.relationshipType,
        relationshipTypeCustom: body.relationshipTypeCustom,
        relationshipTypeFinal: body.relationshipTypeFinal,
        relationshipDetail: normalizedWithCanon.relationshipDetail,
        canonContext: normalizedWithCanon.canonContext,
        usedCanonDocuments: canonDocuments.titles,
        usedCanonEvidence,
        canonUsage,
        personaContext: normalizedWithCanon.personaContext,
        usedPersonaProfiles: personaProfiles.titles,
        feedbackLearningContext: normalizedWithCanon.feedbackLearningContext,
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
          normalizedWithCanon.mode === "rewrite"
            ? "基于 previousText 做定向改写。"
            : "生成一个关系情绪短片段。",
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
      usedCanonEvidence,
      canonUsage,
      usedPersonaProfiles: personaProfiles.titles,
    };

    if (containsProhibitedExplanation(sanitizedResponse.text)) {
      return Response.json(freeModelResponse);
    }

    return Response.json({
      ...sanitizedResponse,
      usedCanonDocuments: canonDocuments.titles,
      usedCanonEvidence,
      canonUsage,
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
