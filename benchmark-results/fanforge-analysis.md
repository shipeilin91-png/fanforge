# FanForge Benchmark Analysis

## 1. 测试目标

验证 FanForge 在 Canon-aware、Persona-aware、Emotion Slice、Multi-Agent 审稿链路中的可控生成能力。本轮是 30 条高质量 synthetic benchmark，用于生成作品集/简历可解释的候选指标；数据来自合成测试集，不代表真实用户数据。

## 2. 测试集构成

30 条 synthetic benchmark case：

- Canon 8
- Persona 8
- Emotion Slice 8
- Multi-Agent 6

Base URL: http://localhost:3000
Case source: docs/benchmark/fanforge-cases.json
Generated at: 2026-06-02T11:56:25.996Z

## 3. 自动化运行情况

- Total cases: 30
- Success: 0
- Partial: 22
- Skipped: 8
- Failed: 0
- API calls succeeded: 34
- API calls skipped: 7
- Successful API endpoints: /api/writer, /api/reviewer, /api/criticizer

Skipped / unavailable API notes:

- canon-001 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-002 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-003 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-005 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-006 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-007 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-008 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.

## 4. Canon Consistency 指标

- canonCaseCount: 8
- canonKeywordHitRate: 43%
- canonKeywordHitCount: 9
- expectedCanonKeywordCount: 21
- canonConflictDetectedCount: 5
- irrelevantCanonLeakCount: 2
- evidenceApiSuccessCount: 0
- canonApiSkippedCount: 7

## 5. Persona Timeline 指标

- personaCaseCount: 8
- boundaryViolationCount: 0
- directConfessionViolationCount: 1
- personaStageSignalCount: 20
- voiceConstraintObservation: voice/subtext signals observed in static or generated text

## 6. Emotion Slice 指标

- emotionCaseCount: 8
- relationshipTooFastCount: 0
- directConfessionViolationCount: 0
- overExplanationViolationCount: 0
- subtextSignalCount: 17
- restraintSignalCount: 15

## 7. Multi-Agent Revision 指标

- multiAgentCaseCount: 6
- initialDraftIssueCount: 52
- reviewerDetectedIssueCount: 18
- criticizerSuggestionCount: 18
- estimatedIssueReductionRate: 63%
- canonConflictCoverage: observed
- oocCoverage: observed
- relationshipTooFastCoverage: observed

## 8. Multi-Agent Revision Before/After Analysis

- averageInitialIssueCount: 8.67
- averageFinalIssueCount: 1.67
- averageActualIssueReductionRate: 81%
- canonConflictReductionRate: 33%
- directConfessionReductionRate: 100%
- overExplanationReductionRate: 80%
- relationshipTooFastReductionRate: 100%
- averageSubtextSignalLift: 3
- averageRestraintSignalLift: 2
- revisedTextGenerationRate: 100%
- revisedTextGenerated: 6 / 6

All Multi-Agent cases generated revisedText, so before/after reductions are computed from actual revised text.

## 9. 可用于简历/作品集的数据表达

- Built a 30-case synthetic benchmark covering Canon consistency, Persona Timeline, Emotion Slice control, and Multi-Agent revision; results are synthetic and not real user data.
- In 6 intentionally flawed Multi-Agent benchmark drafts, the Reviewer/Criticizer + Writer revision chain reduced total rule-based issues from 52 to 10, an actual 81% reduction on synthetic cases.
- Canon conflict / direct confession / relationship-too-fast violations changed by 33% / 100% / 100% in the 6-case synthetic Multi-Agent set.
- Revised outputs increased subtext signals by an average of 3 and restraint signals by an average of 2 across synthetic Multi-Agent cases.
- Emotion Slice cases showed 17 subtext signals and 15 restraint signals while tracking direct confession, over-explanation, and relationship-overreach violations.
- Canon benchmark tracked 9 Canon keyword hits, 5 conflict detections, and 7 retrieval skips caused by missing benchmark auth/seed data.
- Metrics are candidates for portfolio discussion; estimated values are labeled estimated and should not be presented as real production impact.

## 10. 产品迭代建议

- Canon retrieve / writer / chapter / reviewer / criticizer 都可以被 runner 建模为可调用 API，但 Canon RAG 和 Persona 相关 case 在真实评估时需要登录 token、已保存文档和已索引 chunks。
- Canon retrieve 需要 benchmark token 或 seed canon chunks，才能从 skipped 进入真实 evidence hit rate 评估。
- Persona 需要独立 evaluator API，以便更稳定地评分 Persona Timeline、角色声线和 OOC 边界。
- Multi-Agent 最好补 final rewrite API 或二次 reviewer 链路，用于从 estimated issue reduction 升级为真实 before/after reduction。
- Emotion Slice 可补 subtext/relationship evaluator，减少纯关键词规则的局限。