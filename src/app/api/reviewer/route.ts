export async function POST(request: Request) {
    const body = await request.json();
  
    const {
      writerText = "",
      relationshipType = "CP",
      stage = "分离后重逢",
      tension = "克制",
      styleCard = "冷艳华美",
    } = body;
  
    const hasDirectConfession =
      writerText.includes("我爱你") ||
      writerText.includes("我想你") ||
      writerText.includes("我需要你");
  
    const relationshipStageScore = hasDirectConfession ? 6.8 : 8.4;
    const oocScore = hasDirectConfession ? 7.1 : 8.6;
  
    return Response.json({
      scores: {
        ooc: oocScore,
        canon: 9.1,
        relationshipStage: relationshipStageScore,
        emotionalTension: 9.0,
      },
      riskLevel: hasDirectConfession ? "中风险" : "低风险",
      issues: [
        {
          type: "关系阶段",
          quote: hasDirectConfession
            ? "我想你 / 我需要你"
            : "他把伞往前递了递。",
          reason: hasDirectConfession
            ? `当前关系阶段为「${stage}」，如果直接表达依赖，会让关系推进过快。`
            : `当前关系阶段为「${stage}」，用动作代替直白表达，符合克制型关系推进。`,
          suggestion: hasDirectConfession
            ? "建议删除直接告白，改为动作、反话或沉默表达在意。"
            : "可以保留动作暗示，并进一步增加一句有潜台词的对话。",
        },
        {
          type: "文学气质",
          quote: styleCard,
          reason: `当前选择的文学气质为「${styleCard}」，适合通过意象、环境和细节承载情绪。`,
          suggestion: "建议继续使用雨、旧伤、伞、灯影等意象，不要用大段心理解释。",
        },
        {
          type: "情绪张力",
          quote: tension,
          reason: `当前情绪张力为「${tension}」，片段应保持欲言又止和关系留白。`,
          suggestion: "可以增加一次动作错位，例如靠近后又退开，强化关系拉扯。",
        },
      ],
      summary: `Reviewer 判断：这段「${relationshipType}」关系切片整体符合「${stage}」阶段，Canon 风险较低，情绪张力较强。主要需要注意的是避免过早告白或过度解释心理。`,
    });
  }