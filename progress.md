# ClawDoc 开发进度

## 2026-03-10

### 完成的工作

**1. React Flow 可视化画布**
- `web/src/app/canvas/page.tsx` — 重写，3 种自定义节点（AgentConfig/Model/File），拖拽连线，demo 模式
- 16 个模型（Anthropic/OpenAI/Google/DeepSeek/xAI/Ollama）
- 帮助说明 overlay，边/节点删除，Apply 按钮

**2. 落地页 + 路由重构**
- `web/src/app/page.tsx` — 新落地页（Hero/痛点/Features/How It Works/FAQ/CTA）
- `web/src/app/connect/page.tsx` — Connect 页从 `/` 移到 `/connect`
- `web/src/components/LayoutShell.tsx` — 新建，`/` 无 sidebar，其他页有 sidebar
- `web/src/components/Sidebar.tsx` — Connect href 改为 `/connect`，Visual Config 不再需要连接

**3. SEO 优化**
- `web/src/app/sitemap.ts` — 8 个页面的 sitemap.xml
- `web/src/app/robots.ts` — robots.txt
- `web/src/app/opengraph-image.tsx` — 动态 OG 社交预览图 1200x630
- `web/src/app/layout.tsx` — 18 个关键词 + OG/Twitter meta + JSON-LD (SoftwareApplication)
- `web/src/app/page.tsx` — FAQ 区块 5 个问题 + JSON-LD (FAQPage)
- 7 个子页面独立 metadata layout：
  - `canvas/layout.tsx`, `architecture/layout.tsx`, `wizard/layout.tsx`
  - `diagnose/layout.tsx`, `templates/layout.tsx`, `optimizer/layout.tsx`, `connect/layout.tsx`

**4. 部署**
- GitHub 仓库：https://github.com/suyfdong/clawdoc
- 域名：clawdoc.cc（Cloudflare）
- Vercel 项目已创建并部署，域名绑定中（等 DNS 生效）

### 当前状态
- Vercel 部署成功，等待 clawdoc.cc DNS 指向生效
- Cloudflare 需添加 A 记录：`@` → `216.150.1.1`（DNS only）

### 下一步
1. 确认 clawdoc.cc 域名生效
2. 功能测试（所有页面在线上环境检查）
3. Companion Agent 开发 + 部署到腾讯云服务器
4. Google Search Console 提交 sitemap

## 2026-03-11

### 完成的工作 — v2 LLM Brain 架构

**核心重构：从硬编码到 LLM 驱动**

旧方案：16 个硬编码模型、3 个硬编码槽位、6 个 switch-case 操作、8 条硬编码诊断规则
新方案：LLM Brain（通过 OpenRouter 调用 Haiku 3.5）读取真实配置，动态生成拓扑和修改

**1. Agent 端 — LLM 管道（Phase 1）**
- `agent/llm.js` — OpenRouter LLM 客户端（tool use + streaming + agentic loop）
- `agent/tools.js` — 沙箱化文件工具（read_file, list_directory, file_info, search_config）
- `agent/prompts.js` — 3 套系统提示（analyze / chat / quick-op）
- `agent/index.js` — 新增 5 个端点：
  - `POST /api/analyze` — SSE 流式，LLM 分析完整配置 → 返回拓扑 + 动态选项
  - `POST /api/chat` — SSE 流式，对话式配置修改 → 返回 diff 预览
  - `POST /api/quick-op` — 画布操作快速通道（LLM 验证 + 生成修改）
  - `POST /api/apply-changes` — 沙箱化文件写入（带自动备份）
  - `GET /api/brain/status` — Brain 配置状态
- 删除：旧 `/api/apply`（6 个 switch-case）、`/api/diagnose`（8 条硬编码规则）、`diagnoseConfig()`

**2. Web 端 — Store 扩展（Phase 2）**
- `web/src/lib/store.ts` — 新增类型：AnalysisResult, BrainStatus, ProposedChange, ChatMessage
- 新增 actions：runAnalysis, sendChatMessage, quickOp, applyProposedChanges, fetchBrainStatus
- SSE 流式 helper：readSSE()
- 保留 legacy shims（runDiagnosis, applyOperation）兼容未迁移页面

**3. Web 端 — 画布重写（Phase 2+3）**
- `web/src/app/canvas/page.tsx` — 完全重写
  - 删除：AVAILABLE_MODELS 硬编码、SLOTS 硬编码、buildInitialState、slotAssignments
  - 新增：从 analysis.topology 动态生成节点/边
  - 新增：AgentConfigNode 支持动态槽位 + 下拉选择器
  - 新增：guessTier() 自动推断模型等级
  - 左侧：分析摘要面板（agents/models/issues/files）
  - 右侧：可折叠聊天窗口（ChatPanel）
  - Demo 模式保留（DEMO_ANALYSIS 模拟数据）
- `web/src/components/ChatPanel.tsx` — 新建
  - 可折叠右侧面板，聊天消息列表 + 输入框
  - ProposedChange 预览 + Apply/Reject 按钮
  - Brain 未配置时显示引导
- `web/src/components/DiffPreview.tsx` — 新建
  - 文件变更预览组件（文件名 + 描述 + 内容预览）

**Build 状态：通过（14/14 页面）**

### 当前状态
- Agent 端 LLM 管道完成，需要在服务器上安装测试
- 画布已重写为 LLM 驱动，但需要真实服务器连接验证
- diagnose/wizard/templates 页面使用 legacy shims，未来需迁移

### 下一步
1. 在腾讯云服务器上测试 Companion Agent + brain 配置
2. 用 curl 测试 /api/analyze 端点
3. 迁移 diagnose/wizard 页面到新 API
4. Connect 页面加 Brain Status 显示
5. 推送到 GitHub + Vercel 部署

---

## 2026-03-11（下午 — Bug 修复 + UI 迭代）

### 改了哪些文件

1. **`agent/index.js`**
   - 新增 `extractBalancedJSON()` — 替换 greedy regex，修复 JSON 解析
   - 新增 `POST /api/brain/configure` — Web UI 远程配置 API key（无需 SSH）
   - `/api/apply-changes` 增加 `realpath()` symlink 安全检查

2. **`agent/llm.js`**
   - 修复 `runAgentLoop` 最终 assistant 消息未追加的 bug

3. **`web/src/app/canvas/page.tsx`**（改动最多）
   - 修复 `onConnect` stale closure（useRef 模式）
   - 修复 `guessTier` 运算符优先级
   - Demo 数据迭代：3 agent → 1 agent（"My Agent"），16 个可用模型
   - 去掉 File 节点（减少画布混乱）
   - 槽位加描述：Primary/Fallback/Heartbeat 含义说明
   - Heartbeat 槽位加 AlertTriangle 警告（已知 bug，model override 不生效）

4. **`web/src/app/connect/page.tsx`**
   - 新增 "AI BRAIN" 区块：显示 Brain 状态 + API key 输入表单
   - 链接 openrouter.ai/keys 方便用户获取 key

5. **`web/src/lib/store.ts`**
   - 边类型增加 `sourceHandle`
   - 新增 `configureBrain` action

6. **`web/src/components/Sidebar.tsx`**
   - Logo 改为 `<Link href="/">`，可点击返回首页

7. **`web/src/components/DiffPreview.tsx`**
   - 修复冗余 string split

### 当前状态
- main 分支 commit `03d2123`，已推送 GitHub，Vercel 部署成功
- 本机 `~/.clawdoc/brain.json` 已创建（OpenRouter key）
- 画布 Demo：1 个 Agent + 3 个已连接模型 + 16 个侧边栏可用模型
- Heartbeat 槽位有视觉警告标记

### 下一步
> **开始前先读 `clawdoc/issues.md`** — 2026-03-12 全面排查的 14 个问题清单（P0~P3），按优先级逐一修复。

1. 修复 P0：Wizard/Diagnose/Templates 调用已删除旧端点 → 迁移到 LLM API
2. 修复 P1：SSE 真流式、Canvas 真实模式验证、拖拽交互补全
3. 修复 P2：速率限制、WebSocket 心跳、回滚 API
4. 修复 P3：dead code 清理、JSON 解析容错、错误码细化等
5. 腾讯云部署 Companion Agent + 真实 OpenClaw 测试

## 2026-03-13

### 完成的工作 — Issues 批量修复（10/14）

**Agent 端（`agent/`）**

1. **`agent/llm.js`** — SSE 真流式重写
   - `callLLMStream()` 完全重写：解析 OpenAI SSE 流式格式，累积 content + tool_calls，每个 token 调用 `onToken` 回调
   - `runAgentLoop()` 从 `callLLM()` 切换到 `callLLMStream()`，新增 `onToken` 参数全程流式

2. **`agent/index.js`** — 5 项改进
   - `/api/chat` 传递 `onToken` 回调，发送 SSE "token" 事件（P1 #3）
   - JSON 块解析容错：支持 ` ```json ` 和 ` ```json:changes `，大小写不敏感（P3 #10）
   - `/api/quick-op` 错误码细分：400/422/502/500（P3 #11）
   - 速率限制：20 calls/min in-memory limiter，覆盖 analyze/chat/quick-op（P2 #6）
   - WebSocket 30s ping/pong 心跳 + 死连接自动清理（P2 #7）

3. **`agent/tools.js`** — search_config 扩展搜索 `.md` 文件（P3 #12）

**Web 端（`web/`）**

4. **`web/src/lib/store.ts`** — 流式状态
   - 新增 `streamingContent` 状态字段
   - `sendChatMessage` 处理 "token" SSE 事件，增量构建流式内容
   - 完成时清空 streamingContent 并写入最终消息

5. **`web/src/components/ChatPanel.tsx`** — 流式显示
   - 有 streamingContent 时显示实时文本 + 闪烁光标，无内容时显示 "Thinking..."
   - auto-scroll 响应 streamingContent 变化

6. **`web/src/app/canvas/page.tsx`** — 拖拽补全（P1 #5）
   - 侧边栏模型 `draggable` + `onDragStart` 序列化模型数据
   - ReactFlow 区域 `onDrop` 创建新 modelNode + `onDragOver` 允许放置
   - 用 `screenToFlowPosition()` 转换坐标

7. **`web/src/components/Sidebar.tsx`** — 统一禁用状态（P3 #14）
   - 所有页面 `requiresConnection: false`，均可浏览
   - 各页面自行在操作时检查连接

**Build：14/14 页面通过**

### 当前状态
- 14 个 issues 中 10 个已修复
- 剩余 4 个：#4（真实模式验证，需服务器）、#8（回滚 API）、#9（dead code 清理）、#13（评分优化）

### 下一步
1. 推送到 GitHub + Vercel 部署
2. 腾讯云部署 Agent，验证 P1 #4（Canvas 真实模式）
3. 清理 dead code（旧 `callLLM` 函数可删除）
4. 长期：回滚 API + Diagnose 评分优化
