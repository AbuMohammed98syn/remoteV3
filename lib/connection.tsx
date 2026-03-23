/**
 * RemoteCtrl – WebSocket Connection Context
 * Manages the full lifecycle: connect → handshake → auth → messaging → disconnect
 */
import React, {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected';

export interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  networkOut2?: number;
  networkInTotal?: number;
  networkOutTotal?: number;
  pcName?: string;
  os?: string;
  uptime?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  ip: string;
  port: string;
  password?: string;
  lastConnected?: number;
}

interface ConnectionContextValue {
  status: ConnectionStatus;
  connect: (ip: string, port: string, name: string, password?: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  ws: WebSocket | null;
  currentProfile: ConnectionProfile | null;
  systemStats: SystemStats | null;
  processes: ProcessInfo[];
  profiles: ConnectionProfile[];
  deleteProfile: (id: string) => void;
  lastError: string | null;
  authRequired: boolean;
  authenticate: (password: string) => void;
  latency: number | null;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const PROFILES_KEY = 'rc_profiles';

async function loadProfiles(): Promise<ConnectionProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveProfiles(profiles: ConnectionProfile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch { /* ignore */ }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimeRef = useRef<number>(0);
  const pendingPasswordRef = useRef<string | undefined>(undefined);

  // Load saved profiles on mount
  useEffect(() => {
    loadProfiles().then(setProfiles);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const stopPing = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const startPing = useCallback((socket: WebSocket) => {
    stopPing();
    pingTimerRef.current = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        socket.send(JSON.stringify({ type: 'ping', data: {} }));
      }
    }, 5000);
  }, [stopPing]);

  const cleanupSocket = useCallback(() => {
    stopPing();
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, [stopPing]);

  // ── Message handler ────────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (socket: WebSocket, password: string | undefined) =>
      (event: MessageEvent) => {
        let msg: { type: string; data?: Record<string, unknown> };
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'connected': {
            const needsAuth = Boolean(msg.data?.auth_required);
            if (needsAuth) {
              setStatus('authenticating');
              setAuthRequired(true);
              if (password) {
                // Auto-authenticate with provided password
                socket.send(JSON.stringify({ type: 'authenticate', data: { password } }));
              }
            } else {
              setStatus('connected');
              setLastError(null);
              startPing(socket);
            }
            break;
          }

          case 'auth_success':
            setStatus('connected');
            setAuthRequired(false);
            setLastError(null);
            startPing(socket);
            break;

          case 'auth_failed':
            setLastError('كلمة المرور خاطئة');
            setStatus('disconnected');
            setAuthRequired(false);
            cleanupSocket();
            break;

          case 'auth_required':
            setStatus('authenticating');
            setAuthRequired(true);
            break;

          case 'pong':
            setLatency(Date.now() - pingTimeRef.current);
            break;

          case 'system_stats':
            if (msg.data) {
              setSystemStats(msg.data as unknown as SystemStats);
            }
            break;

          case 'processes_list':
            if (Array.isArray(msg.data)) {
              setProcesses(msg.data as unknown as ProcessInfo[]);
            }
            break;

          default:
            break;
        }
      },
    [startPing, cleanupSocket],
  );

  // ── connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(
    async (ip: string, port: string, name: string, password?: string) => {
      cleanupSocket();
      setStatus('connecting');
      setLastError(null);
      setSystemStats(null);
      setProcesses([]);
      pendingPasswordRef.current = password;

      const url = `ws://${ip}:${port}`;

      try {
        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
          // Server will send 'connected' message immediately after open
        };

        socket.onmessage = handleMessage(socket, password);

        socket.onerror = () => {
          setLastError(`تعذّر الاتصال بـ ${ip}:${port}`);
          setStatus('disconnected');
          cleanupSocket();
        };

        socket.onclose = (e) => {
          if (status !== 'disconnected') {
            if (e.code !== 1000) {
              setLastError('انقطع الاتصال بالخادم');
            }
            setStatus('disconnected');
            setSystemStats(null);
            stopPing();
          }
          wsRef.current = null;
        };

        // Save profile
        const profile: ConnectionProfile = {
          id: `${ip}:${port}`,
          name: name || ip,
          ip,
          port,
          password,
          lastConnected: Date.now(),
        };
        setCurrentProfile(profile);

        setProfiles((prev) => {
          const filtered = prev.filter((p) => p.id !== profile.id);
          const updated = [profile, ...filtered].slice(0, 10);
          saveProfiles(updated);
          return updated;
        });
      } catch (err) {
        setLastError(`خطأ في الاتصال: ${String(err)}`);
        setStatus('disconnected');
      }
    },
    [cleanupSocket, handleMessage, stopPing, status],
  );

  // ── disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    cleanupSocket();
    setStatus('disconnected');
    setCurrentProfile(null);
    setSystemStats(null);
    setProcesses([]);
    setLastError(null);
    setAuthRequired(false);
    setLatency(null);
  }, [cleanupSocket]);

  // ── sendMessage ───────────────────────────────────────────────────────────

  const sendMessage = useCallback((type: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  // ── authenticate ──────────────────────────────────────────────────────────

  const authenticate = useCallback((password: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'authenticate', data: { password } }));
    }
  }, []);

  // ── deleteProfile ─────────────────────────────────────────────────────────

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveProfiles(updated);
      return updated;
    });
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => cleanupSocket(), [cleanupSocket]);

  return (
    <ConnectionContext.Provider
      value={{
        status,
        connect,
        disconnect,
        sendMessage,
        ws: wsRef.current,
        currentProfile,
        systemStats,
        processes,
        profiles,
        deleteProfile,
        lastError,
        authRequired,
        authenticate,
        latency,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used inside <ConnectionProvider>');
  return ctx;
}
