import { NextResponse } from "next/server";

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

  const forbiddenText =
    Array.isArray(forbiddenItems) && forbiddenItems.length > 0
      ? forbiddenItems.join("、")
      : "无";

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

  return NextResponse.json({ text, emotionStructure, characterConstraints });
}
