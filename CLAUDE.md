# ClawDoc

Visual control panel for OpenClaw. Drag-and-drop model configuration, config diagnosis, cost optimization.

## Tech Stack

- **Web**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **Canvas**: @xyflow/react 12 (React Flow)
- **State**: Zustand 5 (`web/src/lib/store.ts`)
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Agent**: Node.js + Express (port 17017)
- **Deploy**: Vercel + Cloudflare DNS (clawdoc.cc)

## Project Structure

```
clawdoc/
  web/                        # Next.js frontend
    src/app/
      page.tsx                # Landing page (/, no sidebar)
      canvas/page.tsx         # React Flow visual config (core feature)
      connect/page.tsx        # Connect to OpenClaw server
      architecture/page.tsx   # Architecture explainer
      wizard/page.tsx         # Model selection wizard
      diagnose/page.tsx       # Config diagnosis
      templates/page.tsx      # Config templates
      optimizer/page.tsx      # Cost optimizer
      layout.tsx              # Root layout (fonts, SEO metadata, JSON-LD)
      sitemap.ts              # sitemap.xml generation
      robots.ts               # robots.txt generation
      opengraph-image.tsx     # Dynamic OG image 1200x630
    src/components/
      LayoutShell.tsx         # "/" = no sidebar, all other routes = sidebar
      Sidebar.tsx             # Navigation sidebar (7 items)
    src/lib/
      store.ts                # Zustand global state + API client
  agent/                      # Companion Agent (runs on user's server)
    index.js                  # Express REST API + WebSocket
```

## Key Patterns

- **Build**: Always use `npm run build && npm run start` from `web/`. Do NOT use `npm run dev` (turbopack hangs on this machine).
- **Sidebar**: `LayoutShell.tsx` conditionally renders sidebar. Landing page (`/`) has no sidebar.
- **Demo mode**: Canvas works with mock data when not connected to Companion Agent.
- **API auth**: Bearer token in headers. Connection persisted in localStorage.
- **SEO**: Each route has its own `layout.tsx` with page-specific metadata. Root layout has JSON-LD SoftwareApplication. Landing page has FAQPage JSON-LD.
- **CSS variables**: Dark theme using CSS custom properties (`--bg-deep`, `--accent-amber`, etc.) defined in `globals.css`.

## Companion Agent API

Base: `http://<server>:17017`

- `GET /api/health` — health check (no auth)
- `GET /api/info` — OpenClaw version, agents, config, bootstrap files
- `GET /api/diagnose` — run config diagnosis
- `POST /api/apply` — apply config changes `{ operation, params }`
- `PUT /api/files/:filename` — update bootstrap file `{ content }`

## Domain & Deployment

- **Domain**: clawdoc.cc (Cloudflare)
- **Hosting**: Vercel (root directory = `web`)
- **GitHub**: https://github.com/suyfdong/clawdoc
- **DNS**: A record `@` → `216.150.1.1` (Vercel)
