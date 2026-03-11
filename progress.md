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
