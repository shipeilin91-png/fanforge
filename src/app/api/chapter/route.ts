import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

type ChapterResponse = {
  draft: string;
  usedContext: string[];
  foreshadowingNotes: string[];
  nextChapterHooks: string[];
  usedCanonDocuments?: string[];
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
  usedCanonDocuments: string[];
};

type CanonContextResult = {
  text: string;
  titles: string[];
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
const CHAPTER_FEATURE = "chapter";

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

function parseTargetLength(value: unknown, fallback = 1000) {
  const raw = stringValue(value, String(fallback));
  const matched = raw.match(/\d+/);
  const parsed = matched ? Number(matched[0]) : fallback;

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(5000, Math.max(300, Math.round(parsed)));
}

function getLengthRange(targetLength: number) {
  const ratio = targetLength <= 300 ? 0.2 : 0.15;

  return {
    min: Math.floor(targetLength * (1 - ratio)),
    max: Math.ceil(targetLength * (1 + ratio)),
  };
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
    expectedLength: parseTargetLength(body.expectedLength, 1000),
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
    usedCanonDocuments: [],
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
    console.error("Chapter Canon context read failed", error.message);
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

  if (userError || !user) return defaultSettings;

  const userSupabase = createSupabaseClientForToken(token);
  if (!userSupabase) return defaultSettings;

  const { data, error } = await userSupabase
    .from("user_model_settings")
    .select("provider, model, api_key")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
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
  "根据 Canon 文档",
  "根据Canon文档",
  "资料显示",
  "设定中写道",
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

function getChapterParagraphCount(targetLength: number) {
  if (targetLength <= 600) return { min: 8, max: 12 };
  if (targetLength <= 1200) return { min: 14, max: 20 };
  return { min: 20, max: 28 };
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
    `林栀把手按在门框上，指节因为用力而发白。她知道这不是普通的追兵，也知道沈砚不会无缘无故把危险带到她门前。`,
    `“进来。”她终于说。`,
    `沈砚没有动：“你会后悔。”`,
    `“我后悔的事已经够多了。”`,
    `这句话落下去，屋里的暗处像被轻轻拨动了一下。旧书架上有一页纸滑出来，正好停在两人脚边。`,
    `纸上是半幅王城巡防图，北塔的位置被红线圈住。红线旁边还有一个细小的墨点，像谁在匆忙中留下的记号。`,
    `沈砚低头看了一眼，脸色第一次变了。`,
    `“这东西怎么会在你这里？”`,
    `林栀没有回答。她弯腰捡起那页纸，纸背上沾着一点干涸的泥。那泥色很浅，只有禁卫府后巷的白石路会留下这种痕迹。`,
    `外面的脚步声又近了一步。有人在院墙外低声报出一个名字，那不是沈砚现在用的名字，而是五年前就该被埋掉的旧称。`,
    `烛火已经灭了，屋内只剩雨光。林栀站在黑暗里，忽然明白沈砚为什么一定要来拿那枚旧徽章。`,
    `那不是证物。`,
    `那是钥匙。`,
    `“你还信我吗？”沈砚问。`,
    `林栀把巡防图折好，塞进袖中：“先活过今晚。”`,
    `话音刚落，门外有人抬手叩门。三下，不轻不重，像早就知道里面有两个人。`,
    `林栀转身去取墙上的短刀，刀鞘多年未动，抽出时发出一声低哑的响。`,
    `沈砚看着她的动作，眼神里那点犹豫终于沉下去。他把旧徽章重新扣进掌心，像扣住一个迟来的答案。`,
    `“北塔的门只能开一次。”他说。`,
    `林栀回头：“那就别浪费。”`,
    `门闩在下一瞬被人从外面震了一下。木屑落下来，雨声忽然变得很远。`,
    `屋内没有人再说话。`,
    `第二下撞击来临前，林栀看见窗纸上浮出一道陌生的影子。那影子抬起手，掌心印着半枚誓印。`,
  ];

  const paragraphCount = getChapterParagraphCount(input.expectedLength);
  const targetParagraphCount = Math.min(paragraphCount.max, paragraphs.length);
  const draft = sanitizeDraft(paragraphs.slice(0, targetParagraphCount).join("\n\n"));

  return {
    draft,
    usedContext: [
      `写作模式：${input.mode}`,
      `章节目标：${input.chapterGoal}`,
      `剧情输入：${input.plotInput}`,
      `Canon 约束：${input.canonContext}`,
      ...(input.usedCanonDocuments.length
        ? [
            `使用了最近保存的 Canon 文档：${input.usedCanonDocuments.join("、")}`,
          ]
        : []),
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
    usedCanonDocuments: input.usedCanonDocuments,
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
  const lengthRange = getLengthRange(normalized.expectedLength);
  const settings = await getUserModelSettings(request);
  let canonDocuments: CanonContextResult = { text: "", titles: [] };

  if (settings.user_id && settings.access_token) {
    const userSupabase = createSupabaseClientForToken(settings.access_token);
    if (userSupabase) {
      canonDocuments = await getUserCanonContext(userSupabase, settings.user_id);
    }
  }

  const normalizedWithCanon: NormalizedChapterInput = {
    ...normalized,
    canonContext: mergeCanonContext(body.canonContext, canonDocuments.text),
    usedCanonDocuments: canonDocuments.titles,
  };
  const freeModelResponse = createFreeChapterResponse(normalizedWithCanon);

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
        CHAPTER_FEATURE,
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
        CHAPTER_FEATURE,
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
        "你是 FanForge 的章节写作 Agent，专门负责同人长文和连载章节草稿。",
        "你的任务不是写情绪切片，而是写一个可继续扩展的章节片段。",
        "你要关注剧情推进、人物状态变化、伏笔埋设、上下文连续性、角色关系阶段、下一章钩子、Canon 和人格一致性。",
        normalizedWithCanon.canonContext
          ? `Canon 上下文：\n${normalizedWithCanon.canonContext}`
          : "Canon 上下文：",
        "章节正文 draft 应遵守 Canon 硬设定。如果 Canon 文档中有人物经历、身份、世界观规则，章节正文不能随意改掉。",
        "如果用户输入和 Canon 上下文冲突，优先保持 Canon 一致性，但不要在 draft 正文里解释冲突。",
        "draft 正文里不要写“根据设定”“根据 Canon 文档”“资料显示”等解释性语言；Canon 只作为隐性约束。",
        `draft 字段目标字数约为 ${normalizedWithCanon.expectedLength} 个中文字符，章节正文必须尽量落在 ${lengthRange.min} 到 ${lengthRange.max} 个中文字符之间。`,
        "不要只输出短片段。如果用户选择 1000 字，应至少写到 850 字左右。",
        "draft 字段只能是小说正文，不要混入解释说明、写作策略、上下文列表或大纲。",
        "draft 必须有明确场景开端、人物行动、至少 3 句自然对话、短段落和下一章钩子。",
        "draft 不允许出现：根据用户要求、本章目标是、生成、mock、demo、fallback、参数、禁止项、设定说明。",
        "如果有 forbiddenItems，只作为边界约束，不要在 draft 里解释这些限制。",
        "usedContext、foreshadowingNotes、nextChapterHooks 必须单独返回，不要混进 draft。",
        "输出必须是符合 schema 的 JSON，不要输出 Markdown 或额外解释。",
      ].join("\n"),
      input: JSON.stringify({
        ...normalized,
        ...normalizedWithCanon,
        targetLength: normalizedWithCanon.expectedLength,
        minLength: lengthRange.min,
        maxLength: lengthRange.max,
        usedCanonDocuments: canonDocuments.titles,
        task: "生成一个章节草稿片段，并返回上下文、伏笔提示和下一章钩子。",
      }),
      max_output_tokens: Math.min(7000, Math.max(2200, normalizedWithCanon.expectedLength * 3)),
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
      usedContext: [
        ...parsed.usedContext,
        ...(canonDocuments.titles.length
          ? [
              `使用了最近保存的 Canon 文档：${canonDocuments.titles.join("、")}`,
            ]
          : []),
      ],
      usedCanonDocuments: canonDocuments.titles,
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
