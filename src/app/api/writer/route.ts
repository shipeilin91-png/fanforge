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
  relationshipType?: string;
  moment?: string;
  stage?: string;
  tension?: string;
  styleCard?: string;
  forbiddenItems?: string[];
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
      description: "正文片段，约 400-700 中文字，分段输出。",
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

function createFreeModelResponse({
  relationshipType,
  moment,
  stage,
  tension,
  styleCard,
  forbiddenText,
}: {
  relationshipType: string;
  moment: string;
  stage: string;
  tension: string;
  styleCard: string;
  forbiddenText: string;
}): WriterResponse {
  const forbiddenClause =
    forbiddenText === "无"
      ? "两人都没有把话说满，只把真正的念头留在动作之间。"
      : `那些被禁止的越界写法没有出现，${forbiddenText}都被压在场景边缘。`;

  const text = [
    `${moment}把${stage}里的两个人推到同一处窄檐下。雨声很密，像替他们把周围的喧哗一层层隔开，只剩彼此袖口上未干的水痕。`,
    ``,
    `他停在两步之外，没有立刻靠近。那段距离比礼貌更近，又比亲密更远，正好容得下「${relationshipType}」这个名字里所有未说出口的部分。她看见他指节上的旧伤，颜色淡得几乎要被雨光抹去，可他握伞的力道还是在那一瞬收紧。`,
    ``,
    `${tension}没有落成一句话。她只是抬手，像要接过伞柄，又在触到他袖口前停住。风从他们之间穿过去，把灯影吹得轻轻晃了一下；他顺势把伞沿偏向她半寸，仿佛这只是再自然不过的避雨。`,
    ``,
    `${forbiddenClause}等雨水从伞骨落到同一块湿砖上，她才低声说了一句无关紧要的话。他没有拆穿，只把那半寸距离继续留给她。`,
  ].join("\n");

  const emotionStructure = [
    `起——用「${moment}」建立空间压缩感，让关系先从距离和雨声里显影。`,
    `承——以「${stage}」控制人物默认距离，避免关系推进过快。`,
    `转——围绕「${tension}」写未完成动作，让情绪停在几乎触碰的一刻。`,
    `合——回到「${relationshipType}」的关系框架，用半寸伞沿和湿砖收束留白。`,
  ].join("\n");

  const characterConstraints = [
    `文学气质：${styleCard}，以雨声、袖口、伞沿和湿砖承载情绪。`,
    `情绪张力：${tension}，通过停顿、未完成动作和距离变化表达。`,
    `关系阶段：${relationshipType} · ${stage}，不越过当前关系刻度。`,
    `禁止项：${forbiddenText}`,
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

export async function POST(request: Request) {
  let body: WriterRequestBody = {};

  try {
    body = (await request.json()) as WriterRequestBody;
  } catch {
    body = {};
  }

  const {
    relationshipType = "CP",
    moment = "雨夜重逢",
    stage = "分离后重逢",
    tension = "克制",
    styleCard = "疏离克制",
    forbiddenItems = [] as string[],
  } = body;

  const forbiddenText =
    Array.isArray(forbiddenItems) && forbiddenItems.length > 0
      ? forbiddenItems.join("、")
      : "无";
  const freeModelResponse = createFreeModelResponse({
    relationshipType,
    moment,
    stage,
    tension,
    styleCard,
    forbiddenText,
  });
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
        "你必须遵守角色边界：不写 OOC 的突然告白、不替角色越过当前关系阶段、不违反用户禁止项。",
        "你要围绕关系瞬间、关系阶段、情绪张力和文学气质生成片段。",
        "输出必须是符合 schema 的 JSON，不要输出 Markdown 或额外解释。",
      ].join("\n"),
      input: JSON.stringify({
        relationshipType,
        moment,
        stage,
        tension,
        styleCard,
        forbiddenItems,
        task: [
          "生成一个可供 Reviewer Agent 审稿的关系情绪片段。",
          "text 是正文，要有文学质感、动作和物象，不直接解释情绪。",
          "emotionStructure 说明起承转合如何服务关系推进。",
          "characterConstraints 说明角色边界、关系阶段、禁止项和风格锚点。",
        ].join("\n"),
      }),
      max_output_tokens: 1200,
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

    return Response.json(parsed);
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
