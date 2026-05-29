import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

type WriterResponse = {
  text: string;
  emotionStructure: string;
  characterConstraints: string;
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
};

type WriterRequestBody = {
  characterNames?: string;
  relationshipType?: string;
  relationshipTypeCustom?: string;
  moment?: string;
  momentCustom?: string;
  stage?: string;
  stageCustom?: string;
  tension?: string;
  tensionCustom?: string;
  expectedLength?: string;
  expectedWordCount?: string;
  customLength?: string | number;
  styleCard?: string;
  styleCustom?: string;
  styleRequirement?: string;
  forbiddenItems?: string[];
  forbiddenCustom?: string;
  sceneDescription?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

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
      type: "string",
      description: "按起承转合说明情绪结构，每段一行。",
    },
    characterConstraints: {
      type: "string",
      description: "说明角色边界、关系阶段、禁止项和写作约束。",
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

function parseTargetLength(customLength: unknown, expectedLength: unknown) {
  const raw = stringValue(customLength, stringValue(expectedLength, "500"));
  const matched = raw.match(/\d+/);
  const value = matched ? Number(matched[0]) : 500;

  if (!Number.isFinite(value)) return 500;
  return Math.min(1500, Math.max(100, Math.round(value)));
}

function combineSelectedAndCustom(selected: string, custom: unknown) {
  const detail = stringValue(custom);
  return detail ? `${selected}；${detail}` : selected;
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

function normalizeWriterInput(body: WriterRequestBody): NormalizedWriterInput {
  const [nameA, nameB] = parseCharacterNames(body.characterNames);
  const relationshipType = stringValue(body.relationshipType, "CP");
  const moment = stringValue(
    body.momentCustom,
    stringValue(body.sceneDescription, stringValue(body.moment, "雨夜重逢")),
  );
  const stage = combineSelectedAndCustom(
    stringValue(body.stage, "分离后重逢"),
    body.stageCustom,
  );
  const tension = combineSelectedAndCustom(
    stringValue(body.tension, "克制"),
    body.tensionCustom,
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
    relationshipDetail: combineSelectedAndCustom(
      relationshipType,
      body.relationshipTypeCustom,
    ),
    literaryRelationshipCue: createLiteraryRelationshipCue(
      relationshipType,
      body.relationshipTypeCustom,
    ),
    moment,
    stage,
    tension,
    styleCard,
    styleDetail,
    forbiddenText: [...forbiddenItems, forbiddenCustom].filter(Boolean).join("、") || "无",
    targetLength: parseTargetLength(
      body.customLength,
      body.expectedLength ?? body.expectedWordCount,
    ),
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
  } = input;

  const baseParagraphs = [
    `${moment}。雨把街灯洗成一团旧金色，${nameA}和${nameB}被迫停在同一处屋檐下，身后是来不及合上的门，脚边是从檐角滴下来的水。${literaryRelationshipCue}让这个距离变得难以安放，太近像旧事复燃，太远又显得刻意。`,
    `${nameB}先看见${nameA}肩头湿透的那一块布料，像看见一封被雨水拆开的信。${stage}没有给他们留下从容寒暄的余地，熟悉还在，分寸也还在，两样东西挤在狭窄的光里，谁先开口都像认输。`,
    `“你怎么还走这条路？”${nameB}问。`,
    `${nameA}把伞沿往${nameB}那边偏了半寸：“只是顺路。”`,
    `这句话太轻，轻得像可以被雨声带走。可${nameB}听见了，也听懂了。${tension}没有落成更直白的句子，只落在${nameA}握伞时微微发白的指节上，落在${nameB}想提醒又收回去的呼吸里。`,
    `“那你继续顺路。”${nameB}说。`,
    `“等雨小一点。”${nameA}回答得很快，快得像早就准备好这句不越界的挽留。`,
  ];

  const expansionParagraphs = [
    createStyleParagraph(styleCard, nameA, nameB),
    `${nameB}没有道谢。道谢会显得生分，不道谢又显得太熟。于是${nameB}只把手往伞柄边缘挪了一点，像是确认那半寸遮挡确实存在。${nameA}没有看过去，目光落在雨帘尽头，肩线却慢慢松下来。`,
    `五年的空白没有在这一刻被填满。它只是被雨水泡软，露出里面还没完全褪色的纹路。${nameB}听见自己说：“你变了。”`,
    `${nameA}沉默片刻：“你也是。”`,
    `这不是责备，也不是怀念。它更像一枚被递回来的旧徽章，边缘仍然锋利，拿在手里会疼，却没人舍得扔掉。`,
    `雨势终于小了一点。街口有人撑伞走过，脚步声把沉默切开。${nameB}先迈下台阶，水花溅到鞋尖，没有回头，只听见身后那把伞跟了上来，保持着恰好的距离。`,
    `到了路灯下，${nameA}停住。伞影从${nameB}肩上撤开，冷意立刻贴上来。${nameB}这才转身，看见${nameA}站在雨里，像把所有没说出口的话都留给了这一场不合时宜的天气。`,
    `“明天还会下雨。”${nameA}说。`,
    `${nameB}看了${nameA}一会儿，轻声道：“那就明天再说。”`,
  ];

  const neededParagraphs =
    targetLength >= 900
      ? [...baseParagraphs, ...expansionParagraphs]
      : targetLength >= 500
        ? [...baseParagraphs, ...expansionParagraphs.slice(0, 6)]
        : [...baseParagraphs, ...expansionParagraphs.slice(0, 2)];

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
  ].join("\n");
  const characterConstraints = [
    `人物姓名：正文固定使用 ${nameA} 和 ${nameB}，不使用泛称。`,
    `关系约束：${relationshipDetail}；${stage}。`,
    `风格约束：${styleCard}；${styleDetail}。`,
    `边界约束：${forbiddenText}。`,
  ].join("\n");

  return { text, emotionStructure, characterConstraints };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
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
    return defaultSettings;
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
  };
}

function isWriterResponse(value: unknown): value is WriterResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.text === "string" &&
    typeof candidate.emotionStructure === "string" &&
    typeof candidate.characterConstraints === "string"
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

  return next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/([。！？；，、])\s+/g, "$1")
    .replace(/\s+([。！？；，、])/g, "$1")
    .replace(/「」/g, "")
    .replace(/（）/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const freeModelResponse = createFreeModelResponse(normalized);
  const settings = await getUserModelSettings(request);

  if (settings.provider === "fanforge_free") {
    return Response.json(freeModelResponse);
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
        "你是 FanForge 的 Writer Agent，负责生成同人关系情绪切片。",
        "优先遵守用户自由输入，其次遵守 select 选项。",
        `正文必须使用具体人物名：${normalized.nameA}、${normalized.nameB}。`,
        `text 字段必须尽量接近 ${normalized.targetLength} 个中文字符，并包含至少 2 句自然、克制的对话。`,
        "text 字段只能是小说正文，不能写产品说明、规则解释、参数说明或生成策略。",
        "text 中绝对禁止出现：CP、关系类型、关系阶段、情绪张力、风格卡、禁止项、男主、女主、角色A、角色B、用户要求、参数、设定说明、本段、生成、mock、fallback、demo。",
        "表达关系时，只能用人物动作、短对白、称呼、站位、距离和物件暗示，不要写任何产品参数词。",
        "必须体现用户输入的具体场景、关系设定、阶段细节、情绪推进、风格要求和边界要求，但不能直接说出这些字段名。",
        "emotionStructure 输出 3-5 条情绪结构说明；characterConstraints 输出 3-5 条使用到的角色、关系、风格约束。",
        "输出必须是符合 schema 的 JSON，不要输出 Markdown 或额外解释。",
      ].join("\n"),
      input: JSON.stringify({
        characterNames: `${normalized.nameA} × ${normalized.nameB}`,
        relationshipType: body.relationshipType,
        relationshipTypeCustom: body.relationshipTypeCustom,
        relationshipDetail: normalized.relationshipDetail,
        moment: body.moment,
        momentCustom: body.momentCustom,
        sceneDescription: body.sceneDescription,
        effectiveMoment: normalized.moment,
        stage: body.stage,
        stageCustom: body.stageCustom,
        effectiveStage: normalized.stage,
        tension: body.tension,
        tensionCustom: body.tensionCustom,
        effectiveTension: normalized.tension,
        expectedLength: body.expectedLength ?? body.expectedWordCount,
        customLength: body.customLength,
        effectiveTargetLength: normalized.targetLength,
        styleCard: normalized.styleCard,
        styleCustom: body.styleCustom ?? body.styleRequirement,
        effectiveStyleDetail: normalized.styleDetail,
        forbiddenItems: body.forbiddenItems,
        forbiddenCustom: body.forbiddenCustom,
        forbiddenText: normalized.forbiddenText,
        task: [
          "生成一个关系情绪短片段。",
          "text 只写正文，不写任何解释。",
          "emotionStructure 和 characterConstraints 单独输出，不要混入 text。",
        ].join("\n"),
      }),
      max_output_tokens: Math.min(2600, Math.max(1200, normalized.targetLength * 2)),
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
      text: sanitizeLiteraryText(parsed.text, normalized.nameA, normalized.nameB),
    };

    if (containsProhibitedExplanation(sanitizedResponse.text)) {
      return Response.json(freeModelResponse);
    }

    return Response.json(sanitizedResponse);
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
