import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types — existing
// ---------------------------------------------------------------------------

export interface AgentInfo {
  id: string;
  name: string;
  config: Record<string, unknown> | null;
  hasSession: boolean;
}

export interface FileInfo {
  exists: boolean;
  size?: number;
  modified?: string;
  lines?: number;
  estimatedTokens?: number;
}

export interface DiagnosisIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fix: {
    path: string;
    suggestion: string;
  };
}

export interface DiagnosisResult {
  score: number;
  grade: string;
  issues: DiagnosisIssue[];
  summary: string;
}

export interface ServerInfo {
  openclawDir: string;
  version: string;
  agents: AgentInfo[];
  config: Record<string, unknown> | null;
  configRaw: string | null;
  bootstrapFiles: Record<string, FileInfo>;
}

// ---------------------------------------------------------------------------
// Types — LLM Brain (new)
// ---------------------------------------------------------------------------

export interface AnalyzedAgent {
  id: string;
  name: string;
  model: {
    primary: string | null;
    fallbacks: string[];
    heartbeat: string | null;
  };
  configSource: string;
  hasOwnSoul: boolean;
  slots: Array<{
    id: string;
    label: string;
    currentValue: string | null;
  }>;
}

export interface AnalysisResult {
  version: string;
  summary: string;
  agents: AnalyzedAgent[];
  availableModels: Array<{
    id: string;
    name: string;
    source: string;
    recommended: boolean;
  }>;
  sharedFiles: Record<string, { tokens: number; shared: boolean; path: string }>;
  topology: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
      animated?: boolean;
    }>;
  };
  issues: DiagnosisIssue[];
}

export interface BrainStatus {
  configured: boolean;
  model: string | null;
  maxTokens: number | null;
  configPath: string;
}

export interface ProposedChange {
  file: string;
  description: string;
  content: string;
  diff?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  proposedChanges?: ProposedChange[] | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface AppState {
  // Connection
  serverUrl: string;
  authToken: string;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;

  // Server data
  serverInfo: ServerInfo | null;
  diagnosis: DiagnosisResult | null;
  brainStatus: BrainStatus | null;

  // LLM Analysis
  analysis: AnalysisResult | null;
  analysisLoading: boolean;
  analysisError: string | null;

  // Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  proposedChanges: ProposedChange[] | null;

  // Actions — connection
  setServerUrl: (url: string) => void;
  setAuthToken: (token: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshInfo: () => Promise<void>;

  // Actions — LLM brain
  configureBrain: (apiKey: string, model?: string) => Promise<{ ok: boolean; message: string }>;
  fetchBrainStatus: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  quickOp: (params: Record<string, unknown>) => Promise<{
    valid: boolean;
    message: string;
    proposed_changes?: ProposedChange[];
  }>;
  applyProposedChanges: (changes?: ProposedChange[]) => Promise<{
    ok: boolean;
    message: string;
  }>;
  clearChat: () => void;
  clearProposedChanges: () => void;

  // Actions — legacy (kept for pages not yet migrated)
  runDiagnosis: () => Promise<void>;
  applyOperation: (
    operation: string,
    params: Record<string, unknown>
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  updateFile: (
    filename: string,
    content: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch(
  serverUrl: string,
  authToken: string,
  path: string,
  options?: RequestInit
) {
  const res = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Read an SSE stream and call onEvent for each parsed event.
 */
async function readSSE(
  serverUrl: string,
  authToken: string,
  path: string,
  body: unknown,
  onEvent: (event: Record<string, unknown>) => void
) {
  const res = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent(data);
        } catch {
          // Skip malformed events
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  serverUrl: "",
  authToken: "",
  connectionStatus: "disconnected",
  connectionError: null,
  serverInfo: null,
  diagnosis: null,
  brainStatus: null,
  analysis: null,
  analysisLoading: false,
  analysisError: null,
  chatMessages: [],
  chatLoading: false,
  proposedChanges: null,

  // --- Connection actions ---

  setServerUrl: (url) => set({ serverUrl: url.replace(/\/$/, "") }),
  setAuthToken: (token) => set({ authToken: token.trim() }),

  connect: async () => {
    const { serverUrl, authToken } = get();
    if (!serverUrl || !authToken) {
      set({ connectionError: "Server URL and auth token are required" });
      return;
    }

    set({ connectionStatus: "connecting", connectionError: null });

    try {
      await fetch(`${serverUrl}/api/health`);
      const info = await apiFetch(serverUrl, authToken, "/api/info");
      set({
        connectionStatus: "connected",
        serverInfo: info,
        connectionError: null,
      });
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "clawdoc_connection",
          JSON.stringify({ serverUrl, authToken })
        );
      }
      // Auto-fetch brain status after connecting
      get().fetchBrainStatus();
    } catch (err) {
      set({
        connectionStatus: "error",
        connectionError:
          err instanceof Error ? err.message : "Connection failed",
      });
    }
  },

  disconnect: () => {
    set({
      connectionStatus: "disconnected",
      serverInfo: null,
      diagnosis: null,
      brainStatus: null,
      analysis: null,
      analysisLoading: false,
      analysisError: null,
      chatMessages: [],
      chatLoading: false,
      proposedChanges: null,
      connectionError: null,
    });
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("clawdoc_connection");
    }
  },

  refreshInfo: async () => {
    const { serverUrl, authToken, connectionStatus } = get();
    if (connectionStatus !== "connected") return;
    try {
      const info = await apiFetch(serverUrl, authToken, "/api/info");
      set({ serverInfo: info });
    } catch {
      // Silently fail
    }
  },

  // --- LLM Brain actions ---

  configureBrain: async (apiKey, model) => {
    const { serverUrl, authToken } = get();
    try {
      const result = await apiFetch(serverUrl, authToken, "/api/brain/configure", {
        method: "POST",
        body: JSON.stringify({ apiKey, model }),
      });
      // Refresh brain status after configuring
      await get().fetchBrainStatus();
      return result;
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Configuration failed",
      };
    }
  },

  fetchBrainStatus: async () => {
    const { serverUrl } = get();
    if (!serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/brain/status`);
      if (res.ok) {
        const status = await res.json();
        set({ brainStatus: status });
      }
    } catch {
      // Silently fail
    }
  },

  runAnalysis: async () => {
    const { serverUrl, authToken, connectionStatus } = get();
    if (connectionStatus !== "connected") return;

    set({ analysisLoading: true, analysisError: null });

    try {
      await readSSE(serverUrl, authToken, "/api/analyze", {}, (event) => {
        if (event.type === "analysis") {
          set({ analysis: event.data as AnalysisResult });
        } else if (event.type === "error") {
          set({ analysisError: event.message as string });
        }
      });
    } catch (err) {
      set({
        analysisError: err instanceof Error ? err.message : "Analysis failed",
      });
    } finally {
      set({ analysisLoading: false });
    }
  },

  sendChatMessage: async (message) => {
    const { serverUrl, authToken, chatMessages } = get();

    const userMsg: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    set({
      chatMessages: [...chatMessages, userMsg],
      chatLoading: true,
      proposedChanges: null,
    });

    try {
      let assistantContent = "";
      let proposedChanges: ProposedChange[] | null = null;

      await readSSE(
        serverUrl,
        authToken,
        "/api/chat",
        {
          message,
          history: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        (event) => {
          if (event.type === "response") {
            assistantContent = event.content as string;
            proposedChanges = (event.proposedChanges as ProposedChange[]) || null;
          }
        }
      );

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: assistantContent,
        proposedChanges,
        timestamp: Date.now(),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMsg],
        proposedChanges,
      }));
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Chat failed"}`,
        timestamp: Date.now(),
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, errorMsg],
      }));
    } finally {
      set({ chatLoading: false });
    }
  },

  quickOp: async (params) => {
    const { serverUrl, authToken } = get();
    try {
      const result = await apiFetch(serverUrl, authToken, "/api/quick-op", {
        method: "POST",
        body: JSON.stringify(params),
      });
      if (result.proposed_changes) {
        set({ proposedChanges: result.proposed_changes });
      }
      return result;
    } catch (err) {
      return {
        valid: false,
        message: err instanceof Error ? err.message : "Operation failed",
      };
    }
  },

  applyProposedChanges: async (changes) => {
    const { serverUrl, authToken, proposedChanges } = get();
    const toApply = changes || proposedChanges;
    if (!toApply || toApply.length === 0) {
      return { ok: false, message: "No changes to apply" };
    }

    try {
      const result = await apiFetch(
        serverUrl,
        authToken,
        "/api/apply-changes",
        {
          method: "POST",
          body: JSON.stringify({ changes: toApply }),
        }
      );
      // Clear proposed changes and refresh
      set({ proposedChanges: null });
      get().refreshInfo();
      // Re-run analysis to reflect new state
      get().runAnalysis();
      return result;
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Apply failed",
      };
    }
  },

  clearChat: () => set({ chatMessages: [], proposedChanges: null }),
  clearProposedChanges: () => set({ proposedChanges: null }),

  // --- Legacy actions (kept for compatibility with diagnose/templates/wizard pages) ---

  runDiagnosis: async () => {
    // Legacy: use analysis issues instead of old /api/diagnose
    const { analysis, runAnalysis } = get();
    if (!analysis) {
      await runAnalysis();
    }
    const currentAnalysis = get().analysis;
    if (currentAnalysis) {
      // Convert analysis issues to DiagnosisResult format
      const issues = currentAnalysis.issues;
      const score = Math.max(0, 100 - issues.length * 12);
      set({
        diagnosis: {
          score,
          grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
          issues,
          summary: currentAnalysis.summary,
        },
      });
    }
  },

  applyOperation: async (operation, params) => {
    // Legacy: route through quickOp
    const result = await get().quickOp({
      action: operation,
      params,
    });
    if (result.proposed_changes) {
      const applyResult = await get().applyProposedChanges(result.proposed_changes);
      return applyResult;
    }
    return {
      ok: result.valid,
      message: result.message,
      error: result.valid ? undefined : result.message,
    };
  },

  updateFile: async (filename, content) => {
    const { serverUrl, authToken } = get();
    try {
      const result = await apiFetch(
        serverUrl,
        authToken,
        `/api/files/${filename}`,
        {
          method: "PUT",
          body: JSON.stringify({ content }),
        }
      );
      get().refreshInfo();
      return result;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Update failed",
      };
    }
  },
}));
