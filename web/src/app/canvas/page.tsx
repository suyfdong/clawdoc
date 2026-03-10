"use client";

import { useAppStore } from "@/lib/store";
import { useState, useCallback, useRef, useEffect, useMemo, DragEvent } from "react";
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
  LayoutDashboard,
  Cpu,
  Brain,
  Zap,
  Shield,
  Check,
  Loader2,
  GripVertical,
  X,
  FileText,
  Eye,
  Sparkles,
  ArrowRight,
  Settings2,
  Globe,
  Server,
  Plug,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────

const AVAILABLE_MODELS = [
  // Anthropic
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", tier: "premium", cost: "~$15 / $75" },
  { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", tier: "balanced", cost: "~$3 / $15" },
  { id: "anthropic/claude-haiku-3-5", name: "Claude Haiku 3.5", tier: "budget", cost: "~$0.25 / $1.25" },
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", tier: "premium", cost: "~$2.50 / $10" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "budget", cost: "~$0.15 / $0.60" },
  { id: "openai/gpt-4.1", name: "GPT-4.1", tier: "premium", cost: "~$2 / $8" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", tier: "budget", cost: "~$0.40 / $1.60" },
  // Google
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "premium", cost: "~$1.25 / $10" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "budget", cost: "~$0.15 / $0.60" },
  // DeepSeek
  { id: "deepseek/deepseek-v3", name: "DeepSeek V3", tier: "balanced", cost: "~$0.27 / $1.10" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", tier: "balanced", cost: "~$0.55 / $2.19" },
  // xAI
  { id: "xai/grok-3", name: "Grok 3", tier: "premium", cost: "~$3 / $15" },
  // Local / Free
  { id: "ollama/llama3", name: "Ollama Llama 3", tier: "free", cost: "Free" },
  { id: "ollama/mistral", name: "Ollama Mistral", tier: "free", cost: "Free" },
  { id: "ollama/qwen2.5", name: "Ollama Qwen 2.5", tier: "free", cost: "Free" },
  { id: "ollama/deepseek-r1", name: "Ollama DeepSeek R1", tier: "free", cost: "Free" },
];

const TIER_COLORS: Record<string, { text: string; bg: string; edge: string }> = {
  premium: { text: "var(--accent-purple)", bg: "var(--accent-purple-dim)", edge: "#a78bfa" },
  balanced: { text: "var(--accent-blue)", bg: "var(--accent-blue-dim)", edge: "#5b9cf5" },
  budget: { text: "var(--accent-green)", bg: "var(--accent-green-dim)", edge: "#4ecdc4" },
  free: { text: "var(--text-secondary)", bg: "var(--bg-elevated)", edge: "#5c6078" },
};

type SlotId = "primary" | "fallback" | "heartbeat";

const SLOTS: { id: SlotId; label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }[] = [
  { id: "primary", label: "Primary Model", icon: Zap },
  { id: "fallback", label: "Fallback", icon: Shield },
  { id: "heartbeat", label: "Heartbeat", icon: Brain },
];

// ─── Custom Nodes ────────────────────────────────────────────────

interface AgentNodeData {
  label: string;
  subtitle: string;
  slots: Record<SlotId, string | null>;
  [key: string]: unknown;
}

function AgentConfigNode({ data }: NodeProps<Node<AgentNodeData>>) {
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

      {/* Slots */}
      <div className="p-4 space-y-2.5">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const assigned = data.slots[slot.id];
          const model = assigned ? AVAILABLE_MODELS.find((m) => m.id === assigned) : null;
          const tierColor = model ? TIER_COLORS[model.tier] : null;

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
                    className="text-[11px] tracking-wider"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {slot.label.toUpperCase()}
                  </p>
                  {model ? (
                    <p className="text-sm font-medium truncate" style={{ color: tierColor?.text }}>
                      {model.name}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                      Connect a model
                    </p>
                  )}
                </div>
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
        <span>Applies to all agents unless overridden</span>
      </div>
    </div>
  );
}

interface ModelNodeData {
  modelId: string;
  name: string;
  tier: string;
  cost: string;
  onDelete?: (nodeId: string) => void;
  [key: string]: unknown;
}

function ModelNode({ id, data }: NodeProps<Node<ModelNodeData>>) {
  const tierColor = TIER_COLORS[data.tier] || TIER_COLORS.free;

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
      {/* Delete button */}
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
        {data.modelId.startsWith("anthropic") ? (
          <Sparkles size={16} style={{ color: tierColor.text }} />
        ) : data.modelId.startsWith("openai") ? (
          <Globe size={16} style={{ color: tierColor.text }} />
        ) : data.modelId.startsWith("google") ? (
          <Zap size={16} style={{ color: tierColor.text }} />
        ) : data.modelId.startsWith("deepseek") || data.modelId.startsWith("xai") ? (
          <Brain size={16} style={{ color: tierColor.text }} />
        ) : (
          <Server size={16} style={{ color: tierColor.text }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{data.name}</p>
        <p className="text-[11px]" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
          {data.cost}
        </p>
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
  onView: (filename: string) => void;
  [key: string]: unknown;
}

function FileNode({ data }: NodeProps<Node<FileNodeData>>) {
  const isHeavy = data.tokens > 2000;
  return (
    <div
      className="rounded-xl px-5 py-3.5 cursor-pointer transition-all"
      onClick={() => data.onView(data.filename)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isHeavy ? "rgba(239,100,97,0.3)" : "var(--border-subtle)"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        minWidth: 180,
      }}
    >
      <div className="flex items-center gap-2">
        <FileText size={16} style={{ color: isHeavy ? "var(--accent-red)" : "var(--text-tertiary)" }} />
        <span className="text-sm font-medium">{data.filename}</span>
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

// ─── Sidebar Model Card ─────────────────────────────────────────

function SidebarModelCard({ model }: { model: (typeof AVAILABLE_MODELS)[0] }) {
  const tierColor = TIER_COLORS[model.tier];

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("application/clawdoc-model", JSON.stringify(model));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all group"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tierColor.edge + "66";
        e.currentTarget.style.background = "var(--bg-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.background = "var(--bg-card)";
      }}
    >
      <GripVertical
        size={12}
        style={{ color: "var(--text-tertiary)" }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">{model.name}</p>
        <p
          className="text-[10px]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
        >
          {model.cost}
        </p>
      </div>
      <span
        className="text-[9px] px-1.5 py-0.5 rounded capitalize shrink-0"
        style={{ background: tierColor.bg, color: tierColor.text }}
      >
        {model.tier}
      </span>
    </div>
  );
}

// ─── Main Canvas (inner, needs ReactFlowProvider) ────────────────

function CanvasInner() {
  const { connectionStatus, serverInfo, applyOperation } = useAppStore();
  const isConnected = connectionStatus === "connected";
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Extract current config (use demo data when disconnected)
  const config = serverInfo?.config as Record<string, unknown> | null;
  const agentsConfig = config?.agents as Record<string, unknown> | undefined;
  const defaultsConfig = agentsConfig?.defaults as Record<string, unknown> | undefined;
  const modelConfig = defaultsConfig?.model as Record<string, unknown> | undefined;

  const currentPrimary = (modelConfig?.primary as string) || (isConnected ? null : "anthropic/claude-sonnet-4-6");
  const currentFallbacks = (modelConfig?.fallbacks as string[]) || (isConnected ? [] : ["anthropic/claude-haiku-3-5"]);
  const currentHeartbeat = (modelConfig?.heartbeat as string) || (isConnected ? null : "ollama/llama3");

  // Demo bootstrap files when disconnected
  const bootstrapFiles = serverInfo?.bootstrapFiles || (!isConnected ? {
    "SOUL.md": { exists: true, estimatedTokens: 1250 },
    "USER.md": { exists: true, estimatedTokens: 3800 },
    "MEMORY.md": { exists: true, estimatedTokens: 820 },
  } as Record<string, { exists: boolean; estimatedTokens: number }> : null);

  // Track pending slot assignments (from edge connections)
  const [slotAssignments, setSlotAssignments] = useState<Record<SlotId, string | null>>({
    primary: null,
    fallback: null,
    heartbeat: null,
  });

  // Merged view: pending override or current
  const effectiveSlots: Record<SlotId, string | null> = {
    primary: slotAssignments.primary || currentPrimary,
    fallback: slotAssignments.fallback || currentFallbacks[0] || null,
    heartbeat: slotAssignments.heartbeat || currentHeartbeat,
  };

  const hasPendingChanges = Object.values(slotAssignments).some((v) => v !== null);
  const [showHelp, setShowHelp] = useState(true);

  // Stable ref for delete handler (needed in buildInitialState before hooks)
  const deleteNodeRef = useRef<(nodeId: string) => void>(() => {});

  // ─── Build initial nodes & edges ────────────────────────────

  const buildInitialState = useCallback(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Agent config node (center)
    initialNodes.push({
      id: "agent-config",
      type: "agentConfig",
      position: { x: 400, y: 100 },
      data: { label: "Default Agent Config", subtitle: "All agents inherit this", slots: effectiveSlots },
      draggable: true,
    });

    // Place model nodes that are currently assigned
    const assignedModels = new Set<string>();
    let modelY = 60;

    const placeAssigned = (modelId: string | null, slotId: SlotId) => {
      if (!modelId || assignedModels.has(modelId)) return;
      assignedModels.add(modelId);

      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!model) return;

      const nodeId = `model-${modelId}`;
      initialNodes.push({
        id: nodeId,
        type: "modelNode",
        position: { x: 50, y: modelY },
        data: { modelId: model.id, name: model.name, tier: model.tier, cost: model.cost, onDelete: (id: string) => deleteNodeRef.current(id) },
        draggable: true,
      });

      const tierColor = TIER_COLORS[model.tier];
      initialEdges.push({
        id: `edge-${nodeId}-${slotId}`,
        source: nodeId,
        target: "agent-config",
        targetHandle: slotId,
        animated: true,
        style: { stroke: tierColor?.edge || "#f59e42", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: tierColor?.edge || "#f59e42", width: 16, height: 16 },
      });

      modelY += 90;
    };

    placeAssigned(effectiveSlots.primary, "primary");
    placeAssigned(effectiveSlots.fallback, "fallback");
    placeAssigned(effectiveSlots.heartbeat, "heartbeat");

    // Bootstrap file nodes (below agent)
    if (bootstrapFiles) {
      let fileX = 380;
      Object.entries(bootstrapFiles)
        .filter(([, info]) => info.exists)
        .forEach(([name, info]) => {
          initialNodes.push({
            id: `file-${name}`,
            type: "fileNode",
            position: { x: fileX, y: 440 },
            data: {
              filename: name,
              tokens: info.estimatedTokens || 0,
              exists: info.exists,
              onView: handleViewFile,
            },
            draggable: true,
          });
          fileX += 200;
        });
    }

    return { initialNodes, initialEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverInfo, bootstrapFiles, currentPrimary, currentFallbacks, currentHeartbeat]);

  const { initialNodes, initialEdges } = useMemo(() => buildInitialState(), [buildInitialState]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ─── Delete a model node and its edges ──────────────────────

  const handleDeleteNode = useCallback((nodeId: string) => {
    setEdges((eds) => {
      const edgesToRemove = eds.filter((e) => e.source === nodeId);
      edgesToRemove.forEach((e) => {
        if (e.targetHandle) {
          setSlotAssignments((prev) => ({ ...prev, [e.targetHandle as SlotId]: null }));
        }
      });
      return eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
    });
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  }, [setEdges, setNodes]);

  // Assign to ref so buildInitialState closures can use it
  deleteNodeRef.current = handleDeleteNode;

  // ─── Delete an edge (click to remove) ──────────────────────

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (edge.targetHandle) {
      setSlotAssignments((prev) => ({ ...prev, [edge.targetHandle as SlotId]: null }));
    }
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    if (edge.targetHandle) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === "agent-config") {
            return {
              ...n,
              data: {
                ...n.data,
                slots: { ...(n.data as AgentNodeData).slots, [edge.targetHandle as SlotId]: null },
              },
            };
          }
          return n;
        })
      );
    }
  }, [setEdges, setNodes]);

  // Update agent node data when slots change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === "agent-config") {
          return { ...n, data: { ...n.data, slots: effectiveSlots } };
        }
        return n;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSlots.primary, effectiveSlots.fallback, effectiveSlots.heartbeat]);

  // ─── Edge connection handler ────────────────────────────────

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.targetHandle) return;

      const slotId = connection.targetHandle as SlotId;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (!sourceNode || sourceNode.type !== "modelNode") return;

      const modelId = (sourceNode.data as ModelNodeData).modelId;
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      const tierColor = model ? TIER_COLORS[model.tier] : null;

      // Remove existing edges to same slot
      setEdges((eds) => eds.filter((e) => e.targetHandle !== slotId));

      // Add new edge
      const newEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${slotId}`,
        animated: true,
        style: { stroke: tierColor?.edge || "#f59e42", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: tierColor?.edge || "#f59e42",
          width: 16,
          height: 16,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setSlotAssignments((prev) => ({ ...prev, [slotId]: modelId }));
    },
    [nodes, setEdges]
  );

  // ─── Drag from sidebar → drop on canvas ─────────────────────

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/clawdoc-model");
      if (!raw) return;

      const model = JSON.parse(raw) as (typeof AVAILABLE_MODELS)[0];
      const nodeId = `model-${model.id}`;

      // Don't create duplicate
      if (nodes.find((n) => n.id === nodeId)) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: nodeId,
        type: "modelNode",
        position,
        data: { modelId: model.id, name: model.name, tier: model.tier, cost: model.cost, onDelete: (id: string) => deleteNodeRef.current(id) },
        draggable: true,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, screenToFlowPosition, setNodes]
  );

  // ─── File viewer ────────────────────────────────────────────

  const DEMO_FILE_CONTENT: Record<string, string> = {
    "SOUL.md": `# Agent Persona\n\nYou are a helpful AI assistant named Atlas.\nYou are friendly, concise, and professional.\n\n## Core Values\n- Be honest and transparent\n- Prioritize user safety\n- Admit when you don't know something\n\n## Communication Style\n- Use clear, simple language\n- Break complex topics into steps\n- Ask clarifying questions when needed`,
    "USER.md": `# User Profile\n\nName: Demo User\nTimezone: UTC+8\nLanguage: English (primary), Chinese\n\n## Preferences\n- Prefers concise responses\n- Likes code examples with explanations\n- Working on a SaaS product\n- Uses VS Code + Terminal\n\n## Context\n- Running OpenClaw on Ubuntu 22.04 (Tencent Cloud)\n- 3 active agents: research, coding, social-media\n- Monthly budget target: $50\n- Primary stack: TypeScript, React, Node.js`,
    "MEMORY.md": `# Session Memory\n\n## Recent Topics\n- Discussed API rate limiting strategies\n- Reviewed database migration plan\n\n## Key Decisions\n- Using Redis for caching\n- Switched from Opus to Sonnet for cost savings`,
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function handleViewFile(filename: string) {
    if (viewingFile === filename) {
      setViewingFile(null);
      return;
    }
    setViewingFile(filename);
    setFileContent(null);
    setLoadingFile(true);

    if (!isConnected) {
      // Demo mode: show mock content
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

  // ─── Apply changes ─────────────────────────────────────────

  const handleApply = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      const ops: Promise<unknown>[] = [];
      if (slotAssignments.primary) {
        ops.push(applyOperation("set-primary-model", { model: slotAssignments.primary }));
      }
      if (slotAssignments.fallback) {
        ops.push(applyOperation("set-fallback-models", { models: [slotAssignments.fallback] }));
      }
      if (slotAssignments.heartbeat) {
        ops.push(applyOperation("set-heartbeat-model", { model: slotAssignments.heartbeat }));
      }
      await Promise.all(ops);
      setApplyResult({ ok: true, message: "Configuration updated successfully!" });
      setSlotAssignments({ primary: null, fallback: null, heartbeat: null });
    } catch {
      setApplyResult({ ok: false, message: "Failed to apply changes." });
    } finally {
      setApplying(false);
      setTimeout(() => setApplyResult(null), 4000);
    }
  };

  // ─── Render ─────────────────────────────────────────────────

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
            Drag models from the sidebar → drop on canvas → connect to agent slots
          </p>
          {!isConnected && (
            <span
              className="inline-flex items-center gap-1.5 mt-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)", fontFamily: "var(--font-display)" }}
            >
              DEMO MODE — connect to apply changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {applyResult && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs animate-fade-in-up"
              style={{
                background: applyResult.ok ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
                color: applyResult.ok ? "var(--accent-green)" : "var(--accent-red)",
              }}
            >
              {applyResult.ok ? <Check size={12} /> : <X size={12} />}
              {applyResult.message}
            </div>
          )}
          {hasPendingChanges && (
            <button
              onClick={isConnected ? handleApply : undefined}
              disabled={applying || !isConnected}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: !isConnected
                  ? "var(--bg-elevated)"
                  : applying
                    ? "var(--bg-elevated)"
                    : "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                color: !isConnected
                  ? "var(--text-tertiary)"
                  : applying
                    ? "var(--text-tertiary)"
                    : "var(--bg-deep)",
                boxShadow: (!isConnected || applying) ? "none" : "var(--shadow-glow-amber)",
                cursor: !isConnected ? "not-allowed" : "pointer",
              }}
              title={!isConnected ? "Connect to your OpenClaw instance first" : ""}
            >
              {applying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Applying...
                </>
              ) : !isConnected ? (
                <>
                  <Check size={14} />
                  Connect to Apply
                </>
              ) : (
                <>
                  <Check size={14} />
                  Apply Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: model library */}
        <div
          className="w-60 shrink-0 flex flex-col"
          style={{ borderRight: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
        >
          <div className="p-3 flex-1 overflow-y-auto space-y-4">
            {/* Models section */}
            <div>
              <h2
                className="text-[10px] font-semibold tracking-widest mb-2 px-1"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
              >
                MODELS — DRAG TO CANVAS
              </h2>
              <p className="text-[9px] px-1 mb-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
                Prices are est. per 1M input/output tokens
              </p>
              <div className="space-y-1.5">
                {AVAILABLE_MODELS.map((model) => (
                  <SidebarModelCard key={model.id} model={model} />
                ))}
              </div>
            </div>

            {/* Bootstrap files */}
            {bootstrapFiles && (
              <div>
                <h2
                  className="text-[10px] font-semibold tracking-widest mb-2 px-1"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
                >
                  MEMORY FILES
                </h2>
                <div className="space-y-1.5">
                  {Object.entries(bootstrapFiles)
                    .filter(([, info]) => info.exists)
                    .map(([name, info]) => (
                      <button
                        key={name}
                        onClick={() => handleViewFile(name)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors"
                        style={{
                          background: viewingFile === name ? "var(--accent-amber-dim)" : "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={12} style={{ color: "var(--text-tertiary)" }} />
                          <span className="text-[11px] font-medium truncate">{name}</span>
                        </div>
                        <span
                          className="text-[10px] shrink-0"
                          style={{
                            color: (info.estimatedTokens || 0) > 2000 ? "var(--accent-red)" : "var(--text-tertiary)",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {info.estimatedTokens?.toLocaleString()}t
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Connect CTA in demo mode */}
          {!isConnected && (
            <a
              href="/"
              className="mx-3 mb-3 px-3 py-2.5 rounded-lg flex items-center gap-2 text-[11px] font-medium transition-colors text-center"
              style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-amber-glow)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-amber-dim)")}
            >
              <Plug size={12} />
              <span>Connect your OpenClaw to apply changes for real</span>
            </a>
          )}

          {/* Pending changes indicator */}
          {hasPendingChanges && isConnected && (
            <div
              className="mx-3 mb-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px]"
              style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}
            >
              <ArrowRight size={10} />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>

        {/* React Flow canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={handleEdgeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
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
                return TIER_COLORS[data?.tier]?.edge || "#5c6078";
              }}
            />
          </ReactFlow>

          {/* Help overlay */}
          {showHelp && (
            <div
              className="absolute top-4 right-4 z-10 rounded-xl p-4 animate-fade-in-up"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                maxWidth: 260,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  How to use
                </p>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-0.5 rounded"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <div className="flex gap-2">
                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>1</span>
                  <span><strong>Drag</strong> a model from the left panel onto the canvas</span>
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>2</span>
                  <span><strong>Connect</strong> by dragging from the model&apos;s <span style={{ color: "var(--accent-green)" }}>right dot</span> to an agent <span style={{ color: "var(--accent-blue)" }}>left dot</span></span>
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>3</span>
                  <span><strong>Remove</strong> — hover a model and click the <span style={{ color: "var(--accent-red)" }}>red X</span>, or click a connection line to delete it</span>
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>4</span>
                  <span><strong>Apply</strong> — click the Apply button (when connected to your OpenClaw)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: File viewer */}
        {viewingFile && (
          <div
            className="w-80 shrink-0 flex flex-col"
            style={{ borderLeft: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: "var(--accent-amber)" }} />
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "var(--font-display)" }}
                >
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
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-display)",
                  }}
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

// ─── Wrapper with ReactFlowProvider ─────────────────────────────

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
