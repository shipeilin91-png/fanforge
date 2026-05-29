import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

type ChapterResponse = {
  draft: string;
  usedContext: string[];
  foreshadowingNotes: string[];
  nextChapterHooks: string[];
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

type ChapterRequestBody = {
  mode?: string;
  chapterTitle?: string;
  chapterGoal?: string;
  plotInput?: string;
  expectedLength?: string | number;
  styleRequirement?: string;
  forbiddenItems?: string[] | string;
  canonContext?: string;
  personaContext?: string;
  relationshipContext?: string;
  previousChapterSummary?: string;
};

type NormalizedChapterInput = {
  mode: string;
  chapterTitle: string;
  chapterGoal: string;
  plotInput: string;
  expectedLength: number;
  styleRequirement: string;
  forbiddenText: string;
  canonContext: string;
  personaContext: string;
  relationshipContext: string;
  previousChapterSummary: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

const chapterResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    draft: {
      type: "string",
      description: "章节正文，只能是小说正文，不包含解释说明。",
    },
    usedContext: {
      type: "array",
      description: "使用到的上下文，2-5 条。",
      items: { type: "string" },
    },
    foreshadowingNotes: {
      type: "array",
      description: "伏笔提示，2-5 条。",
      items: { type: "string" },
    },
    nextChapterHooks: {
      type: "array",
      description: "下一章衔接钩子，2-5 条。",
      items: { type: "string" },
    },
  },
  required: ["draft", "usedContext", "foreshadowingNotes", "nextChapterHooks"],
} as const;

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

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseExpectedLength(value: unknown) {
  const raw = stringValue(value, "1200");
  const matched = raw.match(/\d+/);
  const parsed = matched ? Number(matched[0]) : 1200;

  if (!Number.isFinite(parsed)) return 1200;
  return Math.min(5000, Math.max(600, Math.round(parsed)));
}

function parseForbiddenItems(value: ChapterRequestBody["forbiddenItems"]) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .join("、");
  }

  return stringValue(value, "无");
}

function normalizeChapterInput(body: ChapterRequestBody): NormalizedChapterInput {
  return {
    mode: stringValue(body.mode, "单章续写"),
    chapterTitle: stringValue(body.chapterTitle, "雨夜重逢"),
    chapterGoal: stringValue(
      body.chapterGoal,
      "让角色在一次重逢后做出新的行动选择，并埋下下一章冲突。",
    ),
    plotInput: stringValue(
      body.plotInput,
      "雨夜里，旧友在同一处屋檐下重逢。两人都认出了对方，却都没有先承认。",
    ),
    expectedLength: parseExpectedLength(body.expectedLength),
    styleRequirement: stringValue(
      body.styleRequirement,
      "短段落，动作推进，少解释，多留白。",
    ),
    forbiddenText: parseForbiddenItems(body.forbiddenItems),
    canonContext: stringValue(body.canonContext, "维持原作时间线、世界观和已知设定。"),
    personaContext: stringValue(body.personaContext, "维持角色人格、行动动机和 OOC 边界。"),
    relationshipContext: stringValue(
      body.relationshipContext,
      "维持当前关系阶段，不让关系突然越界。",
    ),
    previousChapterSummary: stringValue(
      body.previousChapterSummary,
      "上一章留下未解释的旧物和未完成的对话。",
    ),
  };
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

  if (userError || !user) return defaultSettings;

  const userSupabase = createSupabaseClientForToken(token);
  if (!userSupabase) return defaultSettings;

  const { data, error } = await userSupabase
    .from("user_model_settings")
    .select("provider, model, api_key")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data?.[0]) return defaultSettings;

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

const BANNED_DRAFT_TERMS = [
  "根据用户要求",
  "本章目标是",
  "生成",
  "mock",
  "demo",
  "fallback",
  "参数",
  "禁止项",
  "设定说明",
] as const;

function sanitizeDraft(draft: string) {
  let next = draft;

  for (const term of BANNED_DRAFT_TERMS) {
    next = next.replaceAll(term, "");
  }

  return next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createFreeChapterResponse(input: NormalizedChapterInput): ChapterResponse {
  const paragraphs = [
    `${input.chapterTitle}这一夜来得很迟。雨从城墙外压下来，把巷口的灯打得忽明忽暗，石阶上积着薄薄一层水。`,
    `林栀推门时，先听见了靴底踩过水面的声音。那声音停在门外，没有立刻靠近。`,
    `“你不该来这里。”她说。`,
    `沈砚站在檐下，肩头湿了一大片。他没有抬伞，只看了一眼她身后的烛火。`,
    `“我来拿一样东西。”`,
    `桌上的旧徽章被烛光照出一道暗纹。上一章留下的那点疑问，像被雨水泡开，终于露出边缘。`,
    `林栀把门开得更窄：“你五年前也这么说。”`,
    `沈砚的手指停在袖口，那里有一道新划破的线。很短，却不像赶路时蹭出来的。`,
    `“这次不一样。”他说。`,
    `院墙外传来一声短促的哨音。两个人同时静下来，雨声在这一刻显得太大。`,
    `林栀伸手按灭了桌边的灯。黑暗落下去之前，她看见沈砚把那枚旧徽章推回了原处。`,
    `“你到底惹上了谁？”`,
    `沈砚没有回答。他只是把门外的伞收拢，伞尖在石阶上点了一下。`,
    `那一声很轻。墙外的脚步声却停了。`,
  ];

  const targetParagraphCount =
    input.expectedLength >= 1800 ? paragraphs.length : Math.max(8, Math.min(12, paragraphs.length));
  const draft = sanitizeDraft(paragraphs.slice(0, targetParagraphCount).join("\n\n"));

  return {
    draft,
    usedContext: [
      `写作模式：${input.mode}`,
      `章节目标：${input.chapterGoal}`,
      `剧情输入：${input.plotInput}`,
      `Canon 约束：${input.canonContext}`,
      `人格与关系上下文：${input.personaContext}；${input.relationshipContext}`,
    ],
    foreshadowingNotes: [
      "旧徽章再次出现，可作为身份、旧案或阵营线索。",
      "袖口新划痕暗示沈砚刚经历过追捕或交易。",
      "墙外哨音可以在下一章展开为外部压力。",
    ],
    nextChapterHooks: [
      "墙外脚步声停住后，来人是否已经确认屋内有人。",
      "沈砚为什么把旧徽章推回原处，而不是带走。",
      "林栀是否会选择开门，或先与沈砚共同隐瞒行踪。",
    ],
  };
}

function isChapterResponse(value: unknown): value is ChapterResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.draft === "string" &&
    Array.isArray(candidate.usedContext) &&
    candidate.usedContext.every((item) => typeof item === "string") &&
    Array.isArray(candidate.foreshadowingNotes) &&
    candidate.foreshadowingNotes.every((item) => typeof item === "string") &&
    Array.isArray(candidate.nextChapterHooks) &&
    candidate.nextChapterHooks.every((item) => typeof item === "string")
  );
}

export async function POST(request: Request) {
  let body: ChapterRequestBody = {};

  try {
    body = (await request.json()) as ChapterRequestBody;
  } catch {
    body = {};
  }

  const normalized = normalizeChapterInput(body);
  const freeModelResponse = createFreeChapterResponse(normalized);
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
        "你是 FanForge 的章节写作 Agent，专门负责同人长文和连载章节草稿。",
        "你的任务不是写情绪切片，而是写一个可继续扩展的章节片段。",
        "你要关注剧情推进、人物状态变化、伏笔埋设、上下文连续性、角色关系阶段、下一章钩子、Canon 和人格一致性。",
        "draft 字段只能是小说正文，不要混入解释说明、写作策略、上下文列表或大纲。",
        "draft 必须有明确场景开端、人物行动、至少 3 句自然对话、短段落和下一章钩子。",
        "draft 不允许出现：根据用户要求、本章目标是、生成、mock、demo、fallback、参数、禁止项、设定说明。",
        "如果有 forbiddenItems，只作为边界约束，不要在 draft 里解释这些限制。",
        "usedContext、foreshadowingNotes、nextChapterHooks 必须单独返回，不要混进 draft。",
        "输出必须是符合 schema 的 JSON，不要输出 Markdown 或额外解释。",
      ].join("\n"),
      input: JSON.stringify({
        ...normalized,
        task: "生成一个章节草稿片段，并返回上下文、伏笔提示和下一章钩子。",
      }),
      max_output_tokens: Math.min(5000, Math.max(1800, normalized.expectedLength * 2)),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "fanforge_chapter_response",
          strict: true,
          schema: chapterResponseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);

    if (!isChapterResponse(parsed)) {
      return Response.json(freeModelResponse);
    }

    return Response.json({
      ...parsed,
      draft: sanitizeDraft(parsed.draft),
    });
  } catch (error) {
    console.error("Chapter API error", error);

    if (error instanceof SyntaxError) {
      return Response.json(freeModelResponse);
    }

    const message =
      error instanceof Error ? error.message : "OpenAI API request failed.";

    return Response.json({ error: message }, { status: 500 });
  }
}
