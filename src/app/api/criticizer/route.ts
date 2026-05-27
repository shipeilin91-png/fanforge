type ReviewerIssue = {
  type?: string;
  quote?: string;
  reason?: string;
  suggestion?: string;
};

type ReviewerScores = {
  ooc?: number;
  canon?: number;
  relationshipStage?: number;
  emotionalTension?: number;
};

export async function POST(request: Request) {
  const body = await request.json();

  const {
    writerText = "",
    reviewerSummary = "",
    issues = [] as ReviewerIssue[],
    scores = {} as ReviewerScores,
    stage = "分离后重逢",
    tension = "克制",
    styleCard = "疏离克制",
  } = body as {
    writerText?: string;
    reviewerSummary?: string;
    issues?: ReviewerIssue[];
    scores?: ReviewerScores;
    stage?: string;
    tension?: string;
    styleCard?: string;
  };

  const issueTypes = Array.isArray(issues)
    ? issues.map((issue) => issue.type).filter(Boolean)
    : [];
  const hasRelationshipIssue = issueTypes.includes("关系阶段");
  const hasTensionIssue = issueTypes.includes("情绪张力");
  const hasDirectConfession =
    writerText.includes("我爱你") ||
    writerText.includes("我想你") ||
    writerText.includes("我需要你");
  const relationshipScore = scores.relationshipStage ?? 8.4;

  const coreCritique =
    hasDirectConfession || relationshipScore < 7.5
      ? `这段最大的问题是关系推进过快：在「${stage}」阶段直接说破依赖，会削弱重逢后的试探和留白。`
      : `这段最大的问题是解释性判断略重：它已经具备「${tension}」张力，但还可以把情绪更多交给动作和物象。`;

  const revisionStrategy = [
    hasRelationshipIssue
      ? "删除或压低直接告白，把关系推进改写为停顿、错身、递伞等可感动作。"
      : "保留两人之间的距离感，让靠近只发生在物件和视线层面。",
    hasTensionIssue
      ? `围绕「${tension}」增加一次欲言又止的动作错位，强化拉扯。`
      : "减少抽象心理解释，用雨声、旧伤、伞沿和灯影承载情绪。",
    `让句式贴合「${styleCard}」：短句负责停顿，意象负责收束，避免结尾直接总结关系。`,
  ];

  const revisedText = `雨线把巷口的路灯揉成一团湿冷的光。她站在檐下，袖口还留着没干透的水痕；他停在两步之外，肩线绷得很直，像一堵不肯再塌下来的墙。

风从两人之间穿过。她看向他的指节——旧伤淡得几乎看不见，指腹却在伞柄上收紧了一瞬，又慢慢松开。他没有问她这些年过得好不好，只把伞沿往她那边倾了半寸；水痕顺着伞骨滑下去，滴在两人脚边同一块湿砖上。

雨声很大。她伸手去接斜过来的雨，指尖擦过他袖口，又很快收回。那一点温度被雨水冲散以前，他终于低声说：走吧。`;

  const editorNote = reviewerSummary
    ? `已根据 Reviewer 反馈收束关系推进：保留「${stage}」阶段的克制感，弱化直白解释，让修订稿通过动作回应审稿问题。`
    : `已按「${stage} / ${tension} / ${styleCard}」重新压低表达强度，让情绪从动作和环境里浮出来。`;

  return Response.json({
    coreCritique,
    revisionStrategy,
    revisedText,
    editorNote,
  });
}
