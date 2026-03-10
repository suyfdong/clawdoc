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
