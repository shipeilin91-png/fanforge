import OpenAI from "openai";

type WriterResponse = {
  text: string;
  emotionStructure: string;
  characterConstraints: string;
};

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

function createFallbackResponse({
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
  const text = [
    `${moment}的语境里，${stage}的两人像被潮水推到同一块礁石。`,
    ``,
    `她站在檐下，袖口还留着没干透的水痕；他停在两步之外，肩线绷得很直，像刻意把距离维持在一个不会被误读的长度。谁也没有先开口——${tension}在空气里摊开，却比任何对白都更清晰。`,
    ``,
    `其中一人把视线落在对方指节上——那里有一道旧伤，颜色已经很淡，指腹却在伞柄上收紧了一瞬，又慢慢松开。他什么都没说，只把伞沿往她那边倾了半寸。水痕顺着伞骨滑下去，滴在两人脚边同一块湿砖上。`,
    ``,
    `雨声很大。她伸手去接斜过来的雨，指尖擦过他袖口，又很快收回。`,
  ].join("\n");

  const emotionStructure = [
    `起——以「${moment}」打开场景张力，让读者先撞上空间与体感，再看见人物。`,
    `承——用「${stage}」里悬而未决的关系刻度，两人之间有话未说、有事未了。`,
    `转——以「${tension}」为轴心加压：不写结论，改写几乎发生的动作与被压回去的欲望。`,
    `合——回扣「${relationshipType}」：同一动作出现两次位移（靠近 / 退去），留白收束。`,
  ].join("\n");

  const characterConstraints = [
    `文学气质锚点：${styleCard}（句式与意象围绕该气质收束）。`,
    `情绪张力：${tension}（禁止用旁白直接命名情绪，仅允许通过行为与节奏暗示）。`,
    `关系框架：${relationshipType} · ${stage}（对白密度压低，用动作与物件承担叙事）。`,
    `本轮写作禁止项：${forbiddenText}`,
  ].join("\n");

  return { text, emotionStructure, characterConstraints };
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
  const body = await request.json();

  const {
    relationshipType = "CP",
    moment = "雨夜重逢",
    stage = "分离后重逢",
    tension = "克制",
    styleCard = "疏离克制",
    forbiddenItems = [] as string[],
  } = body as {
    relationshipType?: string;
    moment?: string;
    stage?: string;
    tension?: string;
    styleCard?: string;
    forbiddenItems?: string[];
  };

  const apiKey = process.env.OPENAI_API_KEY;
  const forbiddenText =
    Array.isArray(forbiddenItems) && forbiddenItems.length > 0
      ? forbiddenItems.join("、")
      : "无";
  const fallback = createFallbackResponse({
    relationshipType,
    moment,
    stage,
    tension,
    styleCard,
    forbiddenText,
  });

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
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
      return Response.json(fallback);
    }

    return Response.json(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(fallback);
    }

    const message =
      error instanceof Error ? error.message : "OpenAI API request failed.";

    return Response.json({ error: message }, { status: 500 });
  }
}
