# FanForge Benchmark Analysis

## 1. 测试目标

验证 FanForge 在 Canon-aware、Persona-aware、Emotion Slice、Multi-Agent 审稿链路中的可控生成能力。本轮是 Phase 2 MVP，小样本 synthetic benchmark，用于验证 runner、case schema、API 调用和 rule-based evaluator，不代表最终产品指标。

## 2. 测试集构成

7 条 synthetic benchmark case：

- Canon 2
- Persona 2
- Emotion Slice 2
- Multi-Agent 1

Base URL: http://localhost:3000
Case source: docs/benchmark/fanforge-cases.json
Generated at: 2026-06-02T10:35:41.000Z

## 3. 当前可自动化程度

- Total cases: 7
- Cases with successful API calls: 5
- Cases fully skipped at API layer: 2
- API calls succeeded: 6
- API calls skipped: 2

Skipped / unavailable API notes:

- canon-001 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.
- canon-002 / canonRetrieve: Auth token not provided. Set FANFORGE_BENCHMARK_TOKEN for authenticated tests.

## 4. 指标结果

### Canon

- Cases: 2
- Canon conflict count: 2
- Direct confession violations: 0
- Over-explanation violations: 0
- Relationship too fast count: 0
- Boundary violation count: 0
- Subtext signal count: 3

### Persona

- Cases: 2
- Canon conflict count: 0
- Direct confession violations: 1
- Over-explanation violations: 0
- Relationship too fast count: 0
- Boundary violation count: 0
- Subtext signal count: 5

### Emotion Slice

- Cases: 2
- Canon conflict count: 0
- Direct confession violations: 0
- Over-explanation violations: 0
- Relationship too fast count: 0
- Boundary violation count: 0
- Subtext signal count: 5

### Multi-Agent

- Cases: 1
- Canon conflict count: 2
- Direct confession violations: 2
- Over-explanation violations: 1
- Relationship too fast count: 4
- Boundary violation count: 0
- Subtext signal count: 0

## 5. 初步产品结论

- Canon retrieve / writer / chapter / reviewer / criticizer 都可以被 runner 建模为可调用 API，但 Canon RAG 和 Persona 相关 case 在真实评估时需要登录 token、已保存文档和已索引 chunks。
- Rule-based evaluator 已能识别 Canon 冲突、直接告白、过度心理解释、关系推进过快、防御期边界违反和潜台词信号。
- Persona Timeline 目前仍主要通过 writer/chapter 的上下文注入间接测试；后续如果要更稳，需要独立 Persona evaluator API。
- Multi-Agent 本轮可检查低质量 draft 是否被 Reviewer / Criticizer 接住，但最终 issue reduction 仍需要二次 reviewer 或更完整对照链路。

## 6. 可用于简历/作品集的指标候选

以下只适合作为小样本 synthetic benchmark 的候选指标，不应直接夸大为真实用户效果：

- Canon evidence hit rate / low-similarity filtering behavior
- Canon conflict count
- OOC / boundary violation count
- Direct confession and relationship-too-fast violation count
- Over-explanation violation count
- Subtext signal count
- Reviewer issue count and Criticizer suggestion count

## 7. 下一步

Phase 3 扩展到最终 30 条高质量 case：Canon 8、Persona 8、Emotion Slice 8、Multi-Agent 6。Phase 3 才用于生成更适合简历展示的稳定指标。