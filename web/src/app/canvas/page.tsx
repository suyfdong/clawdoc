"use client";

import { useAppStore, AnalysisResult } from "@/lib/store";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Cpu,
  Brain,
  Zap,
  Shield,
  FileText,
  Eye,
  Sparkles,
  Globe,
  Server,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  Settings2,
  ChevronDown,
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";

// ─── Tier colors for model nodes ──────────────────────────────────

const TIER_COLORS: Record<string, { text: string; bg: string; edge: string }> = {
  premium: { text: "var(--accent-purple)", bg: "var(--accent-purple-dim)", edge: "#a78bfa" },
  balanced: { text: "var(--accent-blue)", bg: "var(--accent-blue-dim)", edge: "#5b9cf5" },
  budget: { text: "var(--accent-green)", bg: "var(--accent-green-dim)", edge: "#4ecdc4" },
  free: { text: "var(--text-secondary)", bg: "var(--bg-elevated)", edge: "#5c6078" },
  default: { text: "var(--accent-amber)", bg: "var(--accent-amber-dim)", edge: "#f59e42" },
};

function guessTier(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes("opus") || (id.includes("gpt-4o") && !id.includes("mini")) || id.includes("grok-3")) return "premium";
  if (id.includes("sonnet") || id.includes("deepseek")) return "balanced";
  if (id.includes("haiku") || id.includes("mini") || id.includes("flash")) return "budget";
  if (id.includes("ollama") || id.includes("local")) return "free";
  return "default";
}

// ─── Slot icon mapping ────────────────────────────────────────────

const SLOT_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  primary: Zap,
  fallback: Shield,
  heartbeat: Brain,
  compaction: Settings2,
  imageModel: Eye,
};

// ─── Custom Nodes (dynamic, data-driven) ──────────────────────────

interface AgentNodeData {
  label: string;
  subtitle: string;
  slots: Array<{ id: string; label: string; currentValue: string | null }>;
  availableModels?: Array<{ id: string; name: string }>;
  onSlotChange?: (slotId: string, modelId: string) => void;
  [key: string]: unknown;
}

function AgentConfigNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const slots = data.slots || [];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "2px solid var(--border-default)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)",
        width: 380,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,66,0.12), rgba(245,158,66,0.04))",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
            boxShadow: "0 0 16px rgba(245,158,66,0.3)",
          }}
        >
          <Cpu size={22} style={{ color: "var(--bg-deep)" }} />
        </div>
        <div>
          <p className="text-base font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {data.label}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {data.subtitle}
          </p>
        </div>
      </div>

      {/* Dynamic slots */}
      <div className="p-4 space-y-2.5">
        {slots.map((slot) => {
          const Icon = SLOT_ICONS[slot.id] || Settings2;
          const assigned = slot.currentValue;
          const tier = assigned ? guessTier(assigned) : null;
          const tierColor = tier ? TIER_COLORS[tier] : null;

          return (
            <div key={slot.id} className="relative">
              <Handle
                type="target"
                position={Position.Left}
                id={slot.id}
                style={{
                  width: 12,
                  height: 12,
                  background: assigned ? (tierColor?.edge || "var(--accent-amber)") : "var(--bg-elevated)",
                  border: `2px solid ${assigned ? (tierColor?.edge || "var(--accent-amber)") : "var(--border-default)"}`,
                  left: -7,
                  boxShadow: assigned ? `0 0 8px ${tierColor?.edge || "var(--accent-amber)"}` : "none",
                  transition: "all 0.2s ease",
                }}
              />
              <div
                className="rounded-lg px-4 py-3 flex items-center gap-3 transition-all"
                style={{
                  background: assigned ? `${tierColor?.bg || "var(--accent-amber-dim)"}` : "var(--bg-deep)",
                  border: `1px solid ${assigned ? `${tierColor?.edge || "var(--accent-amber)"}33` : "var(--border-subtle)"}`,
                }}
              >
                <Icon size={16} style={{ color: assigned ? (tierColor?.text || "var(--accent-amber)") : "var(--text-tertiary)" }} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
                  >
                    {slot.label}
                  </p>
                  {assigned ? (
                    <p className="text-sm font-medium truncate" style={{ color: tierColor?.text }}>
                      {assigned}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                      Connect a model
                    </p>
                  )}
                </div>
                {/* Dropdown for quick model change */}
                {data.availableModels && data.availableModels.length > 0 && (
                  <SlotDropdown
                    models={data.availableModels}
                    currentValue={assigned}
                    onSelect={(modelId) => data.onSlotChange?.(slot.id, modelId)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 flex items-center gap-2 text-[10px]"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-display)",
        }}
      >
        <Settings2 size={10} />
        <span>{data.subtitle}</span>
      </div>

    </div>
  );
}

function SlotDropdown({
  models,
  currentValue,
  onSelect,
}: {
  models: Array<{ id: string; name: string }>;
  currentValue: string | null;
  onSelect: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1 rounded transition-colors"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden py-1"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            minWidth: 200,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {models.map((m) => (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(m.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] transition-colors flex items-center justify-between"
              style={{
                color: m.id === currentValue ? "var(--accent-amber)" : "var(--text-secondary)",
                background: m.id === currentValue ? "var(--accent-amber-dim)" : "transparent",
              }}
            >
              <span>{m.name || m.id}</span>
              {m.id === currentValue && <Check size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Model check icon import
import { Check } from "lucide-react";

interface ModelNodeData {
  modelId: string;
  name: string;
  tier: string;
  source?: string;
  onDelete?: (nodeId: string) => void;
  [key: string]: unknown;
}

function ModelNode({ id, data }: NodeProps<Node<ModelNodeData>>) {
  const tierColor = TIER_COLORS[data.tier] || TIER_COLORS.default;

  return (
    <div
      className="rounded-xl px-5 py-3.5 flex items-center gap-3 group relative"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${tierColor.edge}44`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px ${tierColor.edge}22`,
        minWidth: 210,
      }}
    >
      {data.onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); data.onDelete!(id); }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
          style={{
            background: "var(--accent-red)",
            color: "var(--bg-deep)",
            boxShadow: "0 2px 8px rgba(239,100,97,0.4)",
          }}
        >
          <X size={10} />
        </button>
      )}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: tierColor.bg }}
      >
        {data.modelId.includes("anthropic") || data.modelId.includes("claude") ? (
          <Sparkles size={16} style={{ color: tierColor.text }} />
        ) : data.modelId.includes("openai") || data.modelId.includes("gpt") ? (
          <Globe size={16} style={{ color: tierColor.text }} />
        ) : data.modelId.includes("google") || data.modelId.includes("gemini") ? (
          <Zap size={16} style={{ color: tierColor.text }} />
        ) : data.modelId.includes("ollama") || data.modelId.includes("local") ? (
          <Server size={16} style={{ color: tierColor.text }} />
        ) : (
          <Brain size={16} style={{ color: tierColor.text }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{data.name}</p>
        {data.source && (
          <p className="text-[10px]" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
            {data.source}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          background: tierColor.edge,
          border: `2px solid ${tierColor.edge}`,
          right: -7,
          boxShadow: `0 0 6px ${tierColor.edge}`,
        }}
      />
    </div>
  );
}

interface FileNodeData {
  filename: string;
  tokens: number;
  exists: boolean;
  shared?: boolean;
  onView?: (filename: string) => void;
  [key: string]: unknown;
}

function FileNode({ data }: NodeProps<Node<FileNodeData>>) {
  const isHeavy = data.tokens > 2000;
  return (
    <div
      className="rounded-xl px-5 py-3.5 cursor-pointer transition-all relative"
      onClick={() => data.onView?.(data.filename)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isHeavy ? "rgba(239,100,97,0.3)" : "var(--border-subtle)"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        minWidth: 180,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: "var(--text-tertiary)",
          border: "2px solid var(--text-tertiary)",
          left: -5,
          opacity: 0.4,
        }}
      />
      <div className="flex items-center gap-2">
        <FileText size={16} style={{ color: isHeavy ? "var(--accent-red)" : "var(--text-tertiary)" }} />
        <span className="text-sm font-medium">{data.filename}</span>
        {data.shared && (
          <span
            className="text-[8px] px-1 py-0.5 rounded"
            style={{ background: "var(--accent-blue-dim)", color: "var(--accent-blue)" }}
          >
            shared
          </span>
        )}
      </div>
      <div
        className="text-xs mt-1.5 flex items-center gap-1"
        style={{
          fontFamily: "var(--font-display)",
          color: isHeavy ? "var(--accent-red)" : "var(--text-tertiary)",
        }}
      >
        <span>{data.tokens.toLocaleString()} tokens</span>
        {isHeavy && <span>— heavy</span>}
      </div>
    </div>
  );
}

// ─── Node type registry ──────────────────────────────────────────

const nodeTypes = {
  agentConfig: AgentConfigNode,
  modelNode: ModelNode,
  fileNode: FileNode,
};

// ─── Demo data (when not connected) ──────────────────────────────

const DEMO_ANALYSIS: AnalysisResult = {
  version: "0.4.2",
  summary: "Demo — drag models to change assignments, use dropdown for quick swap",
  agents: [
    {
      id: "default",
      name: "My Agent",
      model: { primary: "anthropic/claude-sonnet-4-6", fallbacks: ["deepseek/deepseek-chat-v3"], heartbeat: "google/gemini-2.0-flash" },
      configSource: "openclaw.json",
      hasOwnSoul: false,
      slots: [
        { id: "primary", label: "Primary", currentValue: "anthropic/claude-sonnet-4-6" },
        { id: "fallback", label: "Fallback", currentValue: "deepseek/deepseek-chat-v3" },
        { id: "heartbeat", label: "Heartbeat", currentValue: "google/gemini-2.0-flash" },
      ],
    },
  ],
  availableModels: [
    { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", source: "Anthropic", recommended: true },
    { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", source: "Anthropic", recommended: true },
    { id: "anthropic/claude-haiku-3-5", name: "Claude Haiku 3.5", source: "Anthropic", recommended: false },
    { id: "openai/gpt-4o", name: "GPT-4o", source: "OpenAI", recommended: false },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", source: "OpenAI", recommended: false },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", source: "Google", recommended: true },
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", source: "Google", recommended: false },
    { id: "deepseek/deepseek-chat-v3", name: "DeepSeek V3", source: "DeepSeek", recommended: true },
    { id: "deepseek/deepseek-reasoner", name: "DeepSeek R1", source: "DeepSeek", recommended: false },
    { id: "x-ai/grok-3", name: "Grok 3", source: "xAI", recommended: false },
    { id: "x-ai/grok-3-mini", name: "Grok 3 Mini", source: "xAI", recommended: false },
    { id: "meta-llama/llama-3.1-405b", name: "Llama 3.1 405B", source: "Meta", recommended: false },
    { id: "ollama/qwen2.5-coder", name: "Qwen 2.5 Coder", source: "Local (Ollama)", recommended: false },
    { id: "ollama/llama3", name: "Llama 3", source: "Local (Ollama)", recommended: false },
    { id: "mistralai/mistral-large", name: "Mistral Large", source: "Mistral", recommended: false },
    { id: "cohere/command-r-plus", name: "Command R+", source: "Cohere", recommended: false },
  ],
  sharedFiles: {
    "SOUL.md": { tokens: 1250, shared: true, path: "SOUL.md" },
    "IDENTITY.md": { tokens: 450, shared: true, path: "IDENTITY.md" },
    "USER.md": { tokens: 3800, shared: true, path: "USER.md" },
    "MEMORY.md": { tokens: 820, shared: true, path: "MEMORY.md" },
    "AGENTS.md": { tokens: 1680, shared: true, path: "AGENTS.md" },
    "TOOLS.md": { tokens: 2200, shared: true, path: "TOOLS.md" },
    "HEARTBEAT.md": { tokens: 380, shared: true, path: "HEARTBEAT.md" },
    "BOOTSTRAP.md": { tokens: 560, shared: true, path: "BOOTSTRAP.md" },
  },
  topology: {
    nodes: [
      // ── Your Agent (center-right) ──
      {
        id: "agent-default",
        type: "agentConfig",
        position: { x: 420, y: 50 },
        data: {
          label: "My Agent",
          subtitle: "openclaw.json",
          slots: [
            { id: "primary", label: "Primary — handles all conversations", currentValue: "anthropic/claude-sonnet-4-6" },
            { id: "fallback", label: "Fallback — auto-switches when primary fails", currentValue: "deepseek/deepseek-chat-v3" },
            { id: "heartbeat", label: "Heartbeat — periodic background check (every 30min)", currentValue: "google/gemini-2.0-flash" },
          ],
        },
      },
      // ── Models (left) ──
      {
        id: "model-sonnet",
        type: "modelNode",
        position: { x: 30, y: 60 },
        data: { modelId: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", tier: "balanced", source: "Anthropic" },
      },
      {
        id: "model-deepseek",
        type: "modelNode",
        position: { x: 30, y: 155 },
        data: { modelId: "deepseek/deepseek-chat-v3", name: "DeepSeek V3", tier: "balanced", source: "DeepSeek" },
      },
      {
        id: "model-flash",
        type: "modelNode",
        position: { x: 30, y: 250 },
        data: { modelId: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "budget", source: "Google" },
      },
    ],
    edges: [
      { id: "e-sonnet-primary", source: "model-sonnet", target: "agent-default", targetHandle: "primary", animated: true },
      { id: "e-deepseek-fallback", source: "model-deepseek", target: "agent-default", targetHandle: "fallback", animated: true },
      { id: "e-flash-heartbeat", source: "model-flash", target: "agent-default", targetHandle: "heartbeat", animated: true },
    ],
  },
  issues: [
    {
      id: "heavy-user-md",
      severity: "high",
      title: "USER.md is 3,800 tokens — exceeds recommended 2,000",
      description: "Large bootstrap files consume context window on every request. Consider trimming USER.md or moving details to MEMORY.md.",
      fix: { path: "USER.md", suggestion: "Split into USER.md (essentials) + MEMORY.md (details)" },
    },
    {
      id: "tools-heavy",
      severity: "medium",
      title: "TOOLS.md is 2,200 tokens — consider trimming",
      description: "TOOLS.md is loaded into every agent context. Remove unused tool descriptions to save tokens.",
      fix: { path: "TOOLS.md", suggestion: "Remove descriptions for tools not actively used" },
    },
  ],
};

// ─── Main Canvas ──────────────────────────────────────────────────

function CanvasInner() {
  const {
    connectionStatus,
    analysis,
    analysisLoading,
    analysisError,
    runAnalysis,
    quickOp,
    serverInfo,
    brainStatus,
  } = useAppStore();

  const isConnected = connectionStatus === "connected";
  const effectiveAnalysis = analysis || (!isConnected ? DEMO_ANALYSIS : null);

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Use refs for handlers so buildFromAnalysis always gets current versions
  const handleSlotChangeRef = useRef<(agentNodeId: string, slotId: string, modelId: string) => void>(() => {});
  const handleDeleteNodeRef = useRef<(nodeId: string) => void>(() => {});
  const handleViewFileRef = useRef<(filename: string) => void>(() => {});

  // Build nodes/edges from analysis topology
  function buildFromAnalysis(analysisData: AnalysisResult) {
    const builtNodes: Node[] = analysisData.topology.nodes.map((n) => ({
      ...n,
      draggable: true,
      data: {
        ...n.data,
        // Inject available models for agent nodes
        ...(n.type === "agentConfig"
          ? {
              availableModels: analysisData.availableModels,
              onSlotChange: (slotId: string, modelId: string) => {
                handleSlotChangeRef.current(n.id, slotId, modelId);
              },
            }
          : {}),
        // Inject file viewer for file nodes
        ...(n.type === "fileNode"
          ? { onView: (filename: string) => handleViewFileRef.current(filename) }
          : {}),
        // Inject delete for model nodes
        ...(n.type === "modelNode"
          ? { onDelete: (nodeId: string) => handleDeleteNodeRef.current(nodeId) }
          : {}),
      },
    }));

    const builtEdges: Edge[] = analysisData.topology.edges.map((e) => {
      const sourceNode = analysisData.topology.nodes.find((n) => n.id === e.source);
      const modelId = String(sourceNode?.data?.modelId || e.source);
      const tierColor = TIER_COLORS[guessTier(modelId)] || TIER_COLORS.default;
      return {
        ...e,
        animated: e.animated ?? true,
        style: { stroke: tierColor.edge, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: tierColor.edge,
          width: 16,
          height: 16,
        },
      };
    });

    return { builtNodes, builtEdges };
  }

  const initial = effectiveAnalysis
    ? buildFromAnalysis(effectiveAnalysis)
    : { builtNodes: [], builtEdges: [] };

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.builtEdges);

  // Update nodes/edges when analysis changes
  useEffect(() => {
    if (effectiveAnalysis) {
      const { builtNodes, builtEdges } = buildFromAnalysis(effectiveAnalysis);
      setNodes(builtNodes);
      setEdges(builtEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAnalysis, setNodes, setEdges]);

  // Auto-run analysis on first connect
  useEffect(() => {
    if (isConnected && !analysis && !analysisLoading && brainStatus?.configured) {
      runAnalysis();
    }
  }, [isConnected, analysis, analysisLoading, brainStatus, runAnalysis]);

  // ─── Handlers (using refs to avoid stale closures) ──────

  function handleDeleteNode(nodeId: string) {
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  }
  handleDeleteNodeRef.current = handleDeleteNode;

  function handleSlotChange(agentNodeId: string, slotId: string, modelId: string) {
    if (isConnected && brainStatus?.configured) {
      quickOp({
        action: "assign-model",
        agentId: agentNodeId.replace("agent-", ""),
        slot: slotId,
        modelId,
      });
    }
    // Optimistically update the node
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === agentNodeId && n.type === "agentConfig") {
          const nodeData = n.data as AgentNodeData;
          return {
            ...n,
            data: {
              ...nodeData,
              slots: nodeData.slots.map((s) =>
                s.id === slotId ? { ...s, currentValue: modelId } : s
              ),
            },
          };
        }
        return n;
      })
    );
  }
  handleSlotChangeRef.current = handleSlotChange;

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.targetHandle) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (!sourceNode || sourceNode.type !== "modelNode") return;

      const modelId = (sourceNode.data as ModelNodeData).modelId;
      const tier = guessTier(modelId);
      const tierColor = TIER_COLORS[tier];

      // Remove existing edges to same slot
      setEdges((eds) => eds.filter((e) => e.targetHandle !== connection.targetHandle));

      const newEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.targetHandle}`,
        animated: true,
        style: { stroke: tierColor.edge, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: tierColor.edge,
          width: 16,
          height: 16,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));

      // Trigger slot change on the agent node (via ref to avoid stale closure)
      if (connection.target) {
        handleSlotChangeRef.current(connection.target, connection.targetHandle, modelId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, setEdges]
  );

  // ─── File viewer ──────────────────────────────────────────

  const DEMO_FILE_CONTENT: Record<string, string> = {
    "SOUL.md": `# Agent Persona\n\nYou are a helpful AI assistant named Atlas.\nYou are friendly, concise, and professional.\n\n## Core Values\n- Be honest and transparent\n- Prioritize user safety\n- Admit when you don't know something\n\n## Communication Style\n- Use bullet points for lists\n- Keep code examples concise\n- Ask clarifying questions before making assumptions`,
    "USER.md": `# User Profile\n\nName: Demo User\nTimezone: UTC+8\nLanguage: English (prefers bilingual CN/EN)\n\n## Preferences\n- Prefers concise responses\n- Working on a SaaS product\n- Uses VS Code + Terminal\n- Primary stack: TypeScript, React, Node.js\n\n## Current Projects\n- Building a real-time dashboard\n- Migrating from REST to GraphQL\n- Setting up CI/CD pipeline\n\n## Pet Peeves\n- Overly verbose explanations\n- Unnecessary code comments\n- Suggesting deprecated packages`,
    "MEMORY.md": `# Session Memory\n\n## Recent Topics\n- Discussed API rate limiting strategy\n- Reviewed database migration plan\n- Fixed CORS issue on production\n\n## Learned Preferences\n- Prefers pnpm over npm\n- Uses Tailwind CSS, not styled-components`,
    "IDENTITY.md": `# Identity\n\nAgent Name: Atlas\nVersion: 0.4.2\nCreated: 2026-01-15\n\n## Capabilities\n- Code generation and review\n- Architecture planning\n- Debugging assistance\n- Documentation writing`,
    "AGENTS.md": `# Multi-Agent Configuration\n\n## Coding Agent\nPrimary: Claude Sonnet 4.6 (best code quality)\nFallback: DeepSeek V3 (cost-effective alternative)\nHeartbeat: Qwen 2.5 Coder (local, free)\n\n## Orchestrator\nPrimary: Claude Opus 4.6 (complex reasoning)\nFallback: GPT-4o (alternative reasoning)\nHeartbeat: Gemini 2.0 Flash (fast status checks)\n\n## Research Agent\nPrimary: Gemini 2.5 Pro (large context window)\nFallback: Claude Haiku 3.5 (fast, cheap)`,
    "TOOLS.md": `# Available Tools\n\n## File System\n- read_file: Read file contents\n- write_file: Write/create files\n- list_directory: List directory contents\n\n## Web\n- web_search: Search the internet\n- web_fetch: Fetch URL contents\n\n## Code\n- run_command: Execute shell commands\n- lint_code: Run linter on code\n\n## Deprecated (consider removing)\n- legacy_search: Old search API\n- parse_xml: Rarely used XML parser`,
    "HEARTBEAT.md": `# Heartbeat Configuration\n\nInterval: 30s\nModel: Uses cheapest available (local preferred)\nPurpose: Keep session alive, check for updates\n\n## Health Checks\n- Memory usage < 80%\n- Response time < 5s\n- API key validity`,
    "BOOTSTRAP.md": `# Bootstrap Sequence\n\n1. Load IDENTITY.md\n2. Load SOUL.md\n3. Load USER.md\n4. Load TOOLS.md\n5. Load AGENTS.md (if multi-agent)\n6. Load MEMORY.md (session context)\n7. Ready for user input`,
  };

  function handleViewFile(filename: string) {
    if (viewingFile === filename) {
      setViewingFile(null);
      return;
    }
    setViewingFile(filename);
    setFileContent(null);
    setLoadingFile(true);

    if (!isConnected) {
      setTimeout(() => {
        setFileContent(DEMO_FILE_CONTENT[filename] || "# Empty file\n\nNo content yet.");
        setLoadingFile(false);
      }, 300);
      return;
    }

    const { serverUrl, authToken } = useAppStore.getState();
    fetch(`${serverUrl}/api/files/${filename}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => setFileContent(data.content || "Empty file"))
      .catch(() => setFileContent("Failed to load file content"))
      .finally(() => setLoadingFile(false));
  }
  handleViewFileRef.current = handleViewFile;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Visual Config
          </h1>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {effectiveAnalysis?.summary || "Connect to analyze your OpenClaw installation"}
          </p>
          {!isConnected && (
            <span
              className="inline-flex items-center gap-1.5 mt-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)", fontFamily: "var(--font-display)" }}
            >
              DEMO MODE — connect to see your real config
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={runAnalysis}
              disabled={analysisLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <RefreshCw size={12} className={analysisLoading ? "animate-spin" : ""} />
              {analysisLoading ? "Analyzing..." : "Re-analyze"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: analysis summary + models */}
        <div
          className="w-56 shrink-0 flex flex-col"
          style={{ borderRight: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
        >
          <div className="p-3 flex-1 overflow-y-auto space-y-4">
            {/* Analysis status */}
            {analysisLoading && (
              <div className="flex items-center gap-2 px-2 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing config...</span>
              </div>
            )}

            {analysisError && (
              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "var(--accent-red-dim)", color: "var(--accent-red)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} />
                  <span className="font-semibold">Analysis Error</span>
                </div>
                <p style={{ color: "var(--text-secondary)" }}>{analysisError}</p>
              </div>
            )}

            {/* Agents summary */}
            {effectiveAnalysis && (
              <div>
                <h2
                  className="text-[10px] font-semibold tracking-widest mb-2 px-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
                >
                  AGENTS ({effectiveAnalysis.agents.length})
                </h2>
                <div className="space-y-1.5">
                  {effectiveAnalysis.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="px-2.5 py-2 rounded-lg"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                      <p className="text-[11px] font-medium">{agent.name}</p>
                      <p className="text-[9px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
                        {agent.configSource}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available models */}
            {effectiveAnalysis && effectiveAnalysis.availableModels.length > 0 && (
              <div>
                <h2
                  className="text-[10px] font-semibold tracking-widest mb-2 px-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
                >
                  AVAILABLE MODELS
                </h2>
                <div className="space-y-1">
                  {effectiveAnalysis.availableModels.map((m) => (
                    <div
                      key={m.id}
                      className="px-2.5 py-1.5 rounded-lg flex items-center gap-2"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: TIER_COLORS[guessTier(m.id)]?.edge || "var(--text-tertiary)" }}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium truncate">{m.name || m.id}</p>
                        <p className="text-[9px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
                          {m.source}
                        </p>
                      </div>
                      {m.recommended && (
                        <span
                          className="text-[8px] px-1 py-0.5 rounded shrink-0"
                          style={{ background: "var(--accent-green-dim)", color: "var(--accent-green)" }}
                        >
                          rec
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues count */}
            {effectiveAnalysis && effectiveAnalysis.issues.length > 0 && (
              <div>
                <h2
                  className="text-[10px] font-semibold tracking-widest mb-2 px-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--accent-red)" }}
                >
                  ISSUES ({effectiveAnalysis.issues.length})
                </h2>
                <div className="space-y-1">
                  {effectiveAnalysis.issues.slice(0, 3).map((issue) => (
                    <div
                      key={issue.id}
                      className="px-2.5 py-1.5 rounded-lg text-[10px]"
                      style={{
                        background: issue.severity === "critical" ? "var(--accent-red-dim)" : "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        color: issue.severity === "critical" ? "var(--accent-red)" : "var(--text-secondary)",
                      }}
                    >
                      {issue.title}
                    </div>
                  ))}
                  {effectiveAnalysis.issues.length > 3 && (
                    <a
                      href="/diagnose"
                      className="text-[10px] px-2.5 py-1"
                      style={{ color: "var(--accent-amber)" }}
                    >
                      +{effectiveAnalysis.issues.length - 3} more — view all
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Shared files */}
            {effectiveAnalysis && Object.keys(effectiveAnalysis.sharedFiles).length > 0 && (
              <div>
                <h2
                  className="text-[10px] font-semibold tracking-widest mb-2 px-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
                >
                  MEMORY FILES
                </h2>
                <div className="space-y-1">
                  {Object.entries(effectiveAnalysis.sharedFiles).map(([name, info]) => (
                    <button
                      key={name}
                      onClick={() => handleViewFile(name)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors"
                      style={{
                        background: viewingFile === name ? "var(--accent-amber-dim)" : "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText size={10} style={{ color: "var(--text-tertiary)" }} />
                        <span className="text-[10px] font-medium truncate">{name}</span>
                      </div>
                      <span
                        className="text-[9px] shrink-0"
                        style={{
                          color: info.tokens > 2000 ? "var(--accent-red)" : "var(--text-tertiary)",
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {info.tokens.toLocaleString()}t
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* React Flow canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{
              animated: true,
              style: { strokeWidth: 2, cursor: "pointer" },
            }}
            proOptions={{ hideAttribution: true }}
            style={{ background: "var(--bg-deep)" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="rgba(255,255,255,0.04)"
            />
            <Controls
              showInteractive={false}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
              }}
            />
            <MiniMap
              nodeStrokeWidth={3}
              maskColor="rgba(12, 14, 20, 0.85)"
              style={{
                background: "var(--bg-panel)",
                borderRadius: 10,
                border: "1px solid var(--border-subtle)",
              }}
              nodeColor={(node) => {
                if (node.type === "agentConfig") return "#f59e42";
                if (node.type === "fileNode") return "#5c6078";
                const data = node.data as ModelNodeData;
                return TIER_COLORS[data?.tier]?.edge || TIER_COLORS[guessTier(data?.modelId || "")]?.edge || "#5c6078";
              }}
            />
          </ReactFlow>
        </div>

        {/* Chat panel (right side, sibling of canvas) */}
        <ChatPanel />

        {/* Right panel: File viewer */}
        {viewingFile && (
          <div
            className="w-72 shrink-0 flex flex-col"
            style={{ borderLeft: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: "var(--accent-amber)" }} />
                <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>
                  {viewingFile}
                </span>
              </div>
              <button onClick={() => setViewingFile(null)}>
                <X size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {loadingFile ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <Loader2 size={12} className="animate-spin" />
                  Loading...
                </div>
              ) : (
                <pre
                  className="text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}
                >
                  {fileContent}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wrapper ─────────────────────────────────────────────────────

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
