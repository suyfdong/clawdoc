import { create } from "zustand";

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

  // Actions
  setServerUrl: (url: string) => void;
  setAuthToken: (token: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshInfo: () => Promise<void>;
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

export const useAppStore = create<AppState>((set, get) => ({
  serverUrl: "",
  authToken: "",
  connectionStatus: "disconnected",
  connectionError: null,
  serverInfo: null,
  diagnosis: null,

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
      // Health check (no auth needed)
      await fetch(`${serverUrl}/api/health`);
      // Fetch full info
      const info = await apiFetch(serverUrl, authToken, "/api/info");
      set({
        connectionStatus: "connected",
        serverInfo: info,
        connectionError: null,
      });
      // Persist connection
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "clawdoc_connection",
          JSON.stringify({ serverUrl, authToken })
        );
      }
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
      // Silently fail, don't disconnect
    }
  },

  runDiagnosis: async () => {
    const { serverUrl, authToken } = get();
    const result = await apiFetch(serverUrl, authToken, "/api/diagnose");
    set({ diagnosis: result });
  },

  applyOperation: async (operation, params) => {
    const { serverUrl, authToken } = get();
    try {
      const result = await apiFetch(serverUrl, authToken, "/api/apply", {
        method: "POST",
        body: JSON.stringify({ operation, params }),
      });
      // Refresh info after change
      get().refreshInfo();
      return result;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Operation failed",
      };
    }
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
