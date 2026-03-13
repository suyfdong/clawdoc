# ClawDoc 问题排查清单

> 2026-03-12 全面审查，逐一修正用

---

## P0 — 核心功能缺失

### 1. Wizard / Diagnose / Templates 未接入 LLM Brain

v2 的核心卖点是"LLM 驱动一切"，但目前只有 Canvas 和 Chat 真正走了 LLM 管道。以下三个页面还在用 v1 硬编码逻辑：

**Wizard (`web/src/app/wizard/page.tsx`)**
- `generateRecommendation()` 是纯 if-else 硬编码决策树
- 预算分档（$0-10 / $10-50 / $50+）→ 固定推荐模型组合
- 没有调用 `/api/chat` 或 `/api/analyze`，LLM Brain 完全没参与
- 应该：用户回答问卷后，把答案发给 LLM，让 LLM 基于真实配置 + 用户需求给出个性化推荐

**Diagnose (`web/src/app/diagnose/page.tsx`)**
- 6 条诊断规则全部硬编码在前端（无 fallback? heartbeat 用贵模型? memory flush 关了?）
- 走的是 `store.runDiagnosis()` → 旧的 `/api/diagnose` 端点（已在 agent 端删除）
- 也就是说：连接真实服务器后，诊断功能会**完全失败**——端点已经不存在了
- 应该：迁移到 `/api/analyze`，让 LLM 动态发现问题

**Templates (`web/src/app/templates/page.tsx`)**
- 9 个模板的配置 JSON 是前端硬编码
- 应用模板走的是 `store.applyOperation()` → 旧的 `/api/apply` 端点（已删除）
- 同样：连接真实服务器后，应用模板会**报错**——端点不存在
- 应该：应用模板走 `/api/apply-changes` 新端点

**影响**：这三个页面在 Demo 模式下看起来正常，但连接真实服务器后会直接报错或无响应。

---

### 2. 旧 API 端点已删除，但前端还在调用

`agent/index.js` 在 v2 重构时删除了：
- `DELETE /api/apply`（旧的 6 个 switch-case 操作）
- `GET /api/diagnose`（旧的 8 条硬编码规则）

但 `web/src/lib/store.ts` 中仍保留了调用这些旧端点的 legacy shims：
- `runDiagnosis()` → 调用 `/api/diagnose`（404）
- `applyOperation()` → 调用 `/api/apply`（404）

这意味着 Diagnose 页面的"Run Diagnosis"和 Templates 页面的"Apply"按钮在连接模式下会直接失败。

---

## P1 — 体验断裂

### 3. SSE "假流式"——不是真正的流式传输

`agent/llm.js` 中有 `callLLMStream()` 函数（真正的流式），但从未被调用。

实际流程：
```
用户点击 → SSE 连接建立 → Agent 调用 callLLM()（非流式，等完整响应）
→ 可能等 10-30 秒无任何输出 → 突然一次性推送全部内容
```

用户体验：点击后长时间空白，以为挂了。

应该：用 `callLLMStream()` 替代 `callLLM()`，token 级流式推送，用户实时看到 LLM 在"思考"。

涉及文件：
- `agent/index.js` — `/api/analyze` 和 `/api/chat` 端点
- `agent/llm.js` — `callLLMStream()` 需要完善（当前是 dead code，返回 raw stream 但无解析逻辑）

---

### 4. Canvas 真实模式从未验证过

Demo 模式下画布渲染正常（DEMO_ANALYSIS 是精心构造的 JSON），但真实模式依赖 LLM 返回的 JSON 格式。

风险点：
- LLM 返回的 `topology.nodes` 格式稍有偏差 → 节点不渲染
- LLM 返回的 `topology.edges` 缺少 `sourceHandle` → 连线断裂
- `extractBalancedJSON()` 只处理了 JSON 提取，但没处理 LLM 返回不完整 JSON 的情况
- `guessTier()` 依赖模型名称匹配，LLM 返回的模型名可能与预期格式不同

建议：在腾讯云部署后，用 curl 测试 `/api/analyze`，拿到真实 LLM 响应，验证前端能否正常渲染。

---

### 5. 侧边栏模型拖拽到 Agent 节点未实现

计划中强调"扣子(Coze)风格拖拽"体验，但目前：
- ✅ 节点可以拖拽移动位置
- ✅ 下拉菜单可以切换槽位模型
- ❌ 不能从侧边栏的可用模型列表拖拽一个模型到 Agent 节点的槽位上

这是计划中明确提到的核心交互，缺少它会让"拖拽配置"的卖点打折扣。

涉及文件：`web/src/app/canvas/page.tsx` — 需要给侧边栏模型加 `draggable`，给 Agent 节点加 `onDrop` 处理。

---

## P2 — 安全与健壮性

### 6. 无 API 调用速率限制

Agent 端没有任何频率限制机制。每次 `/api/analyze`、`/api/chat`、`/api/quick-op` 都会调用 OpenRouter API（花钱）。

风险：
- 用户快速连续点击 Chat 发送 → 并发多个 LLM 请求 → 成本失控
- 页面刷新自动触发 analyze → 每次刷新都花钱
- 没有防抖/节流

建议：
- Agent 端加简单的速率限制（如每分钟最多 10 次 LLM 调用）
- 前端加 debounce（Chat 发送按钮、analyze 触发）
- 考虑 analyze 结果缓存（相同配置不重复分析）

---

### 7. WebSocket 无心跳检测

`agent/index.js` 中 WebSocket 用于实时文件监控（chokidar），但：
- 没有 ping/pong 心跳
- 长连接可能僵死（网络切换、休眠恢复后）
- 客户端不知道连接已断开

建议：加 30 秒心跳 ping，客户端检测断开后自动重连。

---

### 8. `/api/apply-changes` 无回滚 API

文件修改前会自动备份（`.bak` 文件），但没有提供回滚端点。如果用户应用了错误的更改：
- 备份文件存在，但需要手动 SSH 到服务器恢复
- 没有"撤销上次更改"的 API 或 UI

建议（长期）：加 `POST /api/rollback` 端点 + 画布上加"Undo"按钮。

---

## P3 — 代码质量

### 9. `callLLMStream()` 是 Dead Code

`agent/llm.js` 第 45-60 行左右，`callLLMStream()` 函数已实现但从未被任何代码调用。

- 返回 `res.body`（ReadableStream），但没有 SSE 解析逻辑
- 没有处理 tool_calls 在流式中的拼接
- 要么删除（减少维护负担），要么完善并替换 `callLLM`（解决 P1 #3）

---

### 10. JSON 块解析格式匹配脆弱

`agent/index.js` 中 `/api/chat` 的响应解析：
```javascript
const changesMatch = result.content.match(/```json:changes\s*\n([\s\S]*?)\n```/);
```

只匹配 ` ```json:changes ` 格式。但 LLM 可能返回：
- ` ```json ` （不带 :changes 后缀）
- ` ```JSON:changes `（大写）
- JSON 前后有多余空行

建议：增加容错，支持多种变体：
```javascript
const changesMatch = result.content.match(/```(?:json:changes|json)\s*\n([\s\S]*?)\n```/i);
```

---

### 11. `/api/quick-op` 错误分类笼统

当前所有错误都返回 `500 Internal Server Error`，不区分：
- 无效操作类型（应该 400）
- 配置文件解析失败（应该 422）
- LLM 调用失败（应该 502）

用户看到 500 无法判断是自己操作有误还是服务器问题。

---

### 12. `search_config` 工具不搜索 Markdown 文件

`agent/tools.js` 中 `search_config` 只搜索 `.json / .json5 / .jsonc` 文件。

但 OpenClaw 的关键配置也包含 `.md` 文件：
- `SOUL.md` — 核心人设
- `USER.md` — 用户上下文
- 其他 bootstrap 文件

LLM 在分析时可能漏掉这些重要文件的内容。

---

### 13. Diagnose 页面评分逻辑与新架构冲突

`diagnose/page.tsx` 的评分系统（0-100 分 + A/B/C/D 等级）是基于 6 条硬编码规则计算的。

即使迁移到 LLM API 后，也需要重新设计评分机制——LLM 返回的诊断结果格式与硬编码规则完全不同，现有的分数计算逻辑无法复用。

---

### 14. Sidebar 禁用状态不一致

`web/src/components/Sidebar.tsx` 中标记了 Diagnose 和 Cost Optimizer "需要连接才能使用"（灰色禁用），但：
- Wizard 也依赖连接后的数据（需要知道当前配置才能推荐），却没有被禁用
- Templates 的"Apply"需要连接，但页面本身没有禁用

应该统一：要么都标记需要连接，要么都允许浏览（只在操作时提示需要连接）。

---

## 修复顺序建议

1. **先修 P0 #1 #2** — 否则连接真实服务器后 3 个页面直接崩溃
2. **再修 P1 #3** — SSE 真流式，体验质变
3. **然后 P1 #4** — 真实环境验证
4. **P1 #5** — 拖拽交互补全
5. **P2 #6** — 速率限制（部署前必须加）
6. **其余 P2/P3** — 部署后迭代

---

## 2026-03-13 修复记录

### 已修复

| # | 优先级 | 状态 | 说明 |
|---|--------|------|------|
| 1 | P0 | ✅ 已修复（store shim） | Wizard/Diagnose/Templates 的 store 层已路由到新 API（runDiagnosis→runAnalysis, applyOperation→quickOp） |
| 2 | P0 | ✅ 已修复（store shim） | 旧端点调用已被 legacy shims 转换为新 API |
| 3 | P1 | ✅ 已修复 | SSE 真流式：callLLMStream 解析 OpenAI 流式格式，agent loop 全程流式，chat 端 token 级推送 |
| 5 | P1 | ✅ 已修复 | 侧边栏模型可拖拽到画布（draggable + onDrop + screenToFlowPosition） |
| 6 | P2 | ✅ 已修复 | Agent 端 20 calls/min 速率限制（analyze/chat/quick-op） |
| 7 | P2 | ✅ 已修复 | WebSocket 30s ping/pong 心跳，自动清理死连接 |
| 10 | P3 | ✅ 已修复 | JSON 块解析支持 ```json 和 ```json:changes，大小写不敏感 |
| 11 | P3 | ✅ 已修复 | quick-op 错误码：400/422/502/500 细分 |
| 12 | P3 | ✅ 已修复 | search_config 现在也搜索 .md 文件 |
| 14 | P3 | ✅ 已修复 | 所有 Sidebar 项均可浏览（requiresConnection: false），操作时各页面自行检查连接 |

### 待做

| # | 优先级 | 说明 |
|---|--------|------|
| 4 | P1 | Canvas 真实模式验证（需腾讯云部署后测试） |
| 8 | P2 | 回滚 API（POST /api/rollback + UI Undo 按钮） |
| 9 | P3 | callLLMStream 已被使用，旧 callLLM 可删除（dead code 清理） |
| 13 | P3 | Diagnose 评分逻辑（shim 用 issues 数量简单计算，可优化） |
