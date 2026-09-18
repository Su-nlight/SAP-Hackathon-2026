"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";
import type { NodePoint, RouteLink } from "../../components/Network3D";

const Network3D = dynamic(() => import("../../components/Network3D"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-3 font-mono text-xs"
      style={{ color: "var(--color-text-muted)" }}
    >
      <div
        className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
      />
      <span>Synchronizing topology engine…</span>
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface NetworkHealth {
  node_count: number;
  edge_count: number;
  active_disruptions: number;
  healthy: boolean;
  sap?: { connected: boolean; provider: string; plants: number; customers: number };
}

interface DisruptionEvent {
  id: string;
  type: string;
  target_type: string;
  target_id: string;
  severity: string;
  start_time: string;
  status: string;
  raw_text?: string;
  manual_review?: boolean;
}

interface RouteAlternative {
  route_id: string;
  path: string[];
  total_time_hours: number;
  total_cost_per_ton: number;
  total_risk: number;
  total_co2_per_ton: number;
  feasibility: string;
}

interface HealDecision {
  action: string;
  reason: string;
  alternatives: RouteAlternative[];
  affected_shipment_ids: string[];
}

interface AgentState {
  thread_id: string;
  disruption_id: string;
  status: string;
  awaiting_approval: boolean;
  narrative?: string;
  decision?: HealDecision | null;
}

const QUICK_ACTIONS = [
  { label: "Suez Canal Stoppage", query: "Suez Canal blocked by grounded container vessel" },
  { label: "Rotterdam Dock Strike", query: "Port strike halts all dock crane operations at Rotterdam" },
  { label: "Shanghai Typhoon Warning", query: "Severe typhoon forces terminal shutdown at Shanghai deepwater hub" },
];

const textMain = { color: "var(--color-text)" };
const textMuted = { color: "var(--color-text-muted)" };
const surfaceInset = {
  background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)",
  borderColor: "var(--color-border)",
};

function severityStyle(severity: string) {
  const tone = severity === "FULL" ? "danger" : "warning";
  return {
    color: `var(--color-${tone})`,
    background: `color-mix(in srgb, var(--color-${tone}) 12%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-${tone}) 35%, transparent)`,
  };
}

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<"incidents" | "nodes">("incidents");
  const [searchFilter, setSearchFilter] = useState("");
  const [health, setHealth] = useState<NetworkHealth | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: NodePoint[]; edges: RouteLink[] }>({ nodes: [], edges: [] });
  const [disruptions, setDisruptions] = useState<DisruptionEvent[]>([]);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<AgentState | null>(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);

  const [alertInput, setAlertInput] = useState("");
  const [loadingIngest, setLoadingIngest] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedDisruptionId;

  const ensureAuthToken = async (): Promise<string | null> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) return t;
    try {
      const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "acme_admin", password: "admin123" }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.access_token) {
          localStorage.setItem("token", d.access_token);
          return d.access_token;
        }
      }
    } catch {
      /* fall through to unauthenticated request */
    }
    return null;
  };

  const getHeaders = async () => {
    const token = await ensureAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadBaseData = useCallback(async () => {
    try {
      const [hRes, gRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/v1/network/health`),
        fetch(`${API_BASE}/v1/network/graph`),
        fetch(`${API_BASE}/v1/disruptions?status=active`),
      ]);

      if (hRes.ok) setHealth(await hRes.json());
      if (gRes.ok) {
        const gData = await gRes.json();
        const rawNodes = gData.nodes || [];
        const rawEdges = gData.edges || [];

        const formattedNodes: NodePoint[] = rawNodes.map((n: Record<string, unknown>) => {
          const rawStatus = String(n.status || "").toLowerCase();
          const validStatus: NodePoint["status"] =
            rawStatus === "disrupted"
              ? "disrupted"
              : rawStatus === "degraded" || rawStatus === "warning"
              ? "degraded"
              : "active";

          return {
            id: String(n.id || n.node_id || ""),
            name: String(n.name || n.label || n.id || n.node_id || "Node"),
            lat: Number(n.lat ?? n.latitude ?? (n.coordinates as number[])?.[1] ?? 0),
            lng: Number(n.lng ?? n.lon ?? n.longitude ?? (n.coordinates as number[])?.[0] ?? 0),
            type: (n.type as any) || "hub",
            status: validStatus,
          };
        });

        const formattedRoutes: RouteLink[] = rawEdges.map((e: Record<string, unknown>, i: number) => ({
          id: String(e.id || `route-${i}`),
          from: String(e.from || e.source || e.from_node || ""),
          to: String(e.to || e.target || e.to_node || ""),
          status: (e.status as any) || "active",
        }));

        setGraphData({ nodes: formattedNodes, edges: formattedRoutes });
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        const list: DisruptionEvent[] = dData.disruptions || [];
        setDisruptions(list);
        if (list.length > 0 && !selectedIdRef.current) {
          setSelectedDisruptionId(list[0].id);
        }
      }
    } catch {
      setErrorToast("Offline: cannot reach the backend service on 127.0.0.1:8000.");
    }
  }, []);

  useEffect(() => {
    loadBaseData();
    const sse = new EventSource(`${API_BASE}/v1/events/stream`);

    const resetHeartbeat = () => {
      setStreamActive(true);
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
      heartbeatTimer.current = setTimeout(() => setStreamActive(false), 20000);
    };

    sse.addEventListener("heartbeat", resetHeartbeat);
    sse.addEventListener("disruption.created", (e: MessageEvent) => {
      resetHeartbeat();
      try {
        const payload = JSON.parse(e.data);
        const event: DisruptionEvent = payload.data;
        setDisruptions((prev) => [event, ...prev.filter((d) => d.id !== event.id)]);
        fetch(`${API_BASE}/v1/network/health`).then((r) => {
          if (r.ok) r.json().then(setHealth);
        });
      } catch {
        /* malformed event payload — ignore */
      }
    });

    sse.addEventListener("plan.approved", (e: MessageEvent) => {
      resetHeartbeat();
      try {
        const payload = JSON.parse(e.data);
        setActivePlan((prev) => (prev?.disruption_id === payload.data.disruption_id ? null : prev));
        loadBaseData();
      } catch {
        /* malformed event payload — ignore */
      }
    });

    sse.addEventListener("network.healed", (e: MessageEvent) => {
      resetHeartbeat();
      try {
        const payload = JSON.parse(e.data);
        const event: DisruptionEvent = payload.data;
        setDisruptions((prev) => prev.filter((d) => d.id !== event.id));
        fetch(`${API_BASE}/v1/network/health`).then((r) => {
          if (r.ok) r.json().then(setHealth);
        });
      } catch {
        /* malformed event payload — ignore */
      }
    });

    sse.onerror = () => setStreamActive(false);

    return () => {
      sse.close();
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
    };
  }, [loadBaseData]);

  const handleIngest = async (queryText: string) => {
    if (!queryText.trim() || queryText.length < 3) return;
    setLoadingIngest(true);
    setErrorToast(null);

    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/v1/disruptions/ingest`, {
        method: "POST",
        headers,
        body: JSON.stringify({ raw_text: queryText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Disruption ingestion failed.");

      setAlertInput("");
      loadBaseData();

      if (data.awaiting_approval) {
        setSelectedDisruptionId(data.disruption_id);
        setActivePlan({
          thread_id: data.thread_id,
          disruption_id: data.disruption_id,
          status: "awaiting_approval",
          awaiting_approval: true,
          narrative: data.narrative,
          decision: data.decision,
        });
        setSelectedRouteIdx(0);
      }
    } catch (err) {
      setErrorToast(err instanceof Error ? err.message : "Execution failed.");
    } finally {
      setLoadingIngest(false);
    }
  };

  const inspectDisruption = async (id: string) => {
    setSelectedDisruptionId(id);
    setErrorToast(null);
    let state: AgentState | null = null;

    try {
      const res = await fetch(`${API_BASE}/v1/disruptions/${id}/state`);
      if (res.ok) state = await res.json();
    } catch {
      /* no agent state for this disruption — fall back to a local view */
    }

    if (state) {
      setActivePlan(state);
      setSelectedRouteIdx(0);
    } else {
      const event = disruptions.find((d) => d.id === id);
      setActivePlan({
        thread_id: `ad-hoc-${id}`,
        disruption_id: id,
        status: event?.status || "active",
        awaiting_approval: false,
        narrative: event?.raw_text || `Live monitoring active on target node ${event?.target_id || id}.`,
        decision: null,
      });
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!activePlan) return;
    setActionLoading(true);
    setErrorToast(null);

    try {
      const headers = await getHeaders();
      const payload: { approved: boolean; feedback?: string } = { approved };
      if (feedback.trim()) payload.feedback = feedback.trim();

      const res = await fetch(`${API_BASE}/v1/disruptions/${activePlan.disruption_id}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 503) {
        setErrorToast("Plan written to SAP memory. Archive timed out, safe to recheck.");
        setActionLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Mitigation action rejected.");

      setFeedback("");
      setActivePlan(null);
      loadBaseData();
    } catch (err) {
      setErrorToast(err instanceof Error ? err.message : "Mitigation action rejected.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    const q = searchFilter.toLowerCase();
    return disruptions.filter(
      (d) =>
        d.target_id.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        (d.raw_text && d.raw_text.toLowerCase().includes(q))
    );
  }, [disruptions, searchFilter]);

  const filteredNodes = useMemo(() => {
    const q = searchFilter.toLowerCase();
    return graphData.nodes.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
  }, [graphData.nodes, searchFilter]);

  const selectedAlt = activePlan?.decision?.alternatives?.[selectedRouteIdx] || null;

  return (
    <div
      className="flex flex-col lg:flex-row h-screen w-full overflow-hidden font-sans antialiased"
      style={{ background: "var(--bg-gradient)", ...textMain }}
    >
      {/* Workspace panel */}
      <section
        className="w-full lg:w-[460px] lg:shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 glass z-20"
        style={{ borderColor: "var(--color-border)" }}
        aria-label="Operations workspace"
      >
        {/* Brand */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs text-white"
              style={{ background: "linear-gradient(120deg, var(--color-primary), var(--color-secondary))" }}
              aria-hidden="true"
            >
              SC
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase flex items-center gap-2" style={textMain}>
                <span translate="no">SelfHeal SC</span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    color: "var(--color-primary)",
                    background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                    borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
                  }}
                >
                  OPERATIONS
                </span>
              </h1>
              <p className="text-[10px] font-mono" style={textMuted}>
                Autonomous control tower
              </p>
            </div>
          </div>

          <Link
            href="/hub"
            className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg glass transition hover:opacity-80"
            style={textMuted}
          >
            ← Hub
          </Link>
        </div>

        {/* Metrics */}
        <div
          className="grid grid-cols-3 border-b divide-x shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="p-3" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-[9px] uppercase tracking-wider font-mono" style={textMuted}>
              Total Nodes
            </div>
            <div
              className="text-base font-bold font-mono mt-0.5 flex items-center gap-1.5 tabular-nums"
              style={textMain}
            >
              {health?.node_count ?? graphData.nodes.length}
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--color-success)" }}
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="p-3" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-[9px] uppercase tracking-wider font-mono" style={textMuted}>
              Active Delays
            </div>
            <div
              className="text-base font-bold font-mono mt-0.5 tabular-nums"
              style={{ color: disruptions.length ? "var(--color-warning)" : "var(--color-success)" }}
            >
              {disruptions.length}
            </div>
          </div>
          <div className="p-3" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-[9px] uppercase tracking-wider font-mono" style={textMuted}>
              SAP Status
            </div>
            <div
              className="text-[11px] font-bold font-mono mt-1 flex items-center gap-1"
              style={{ color: health?.sap?.connected === false ? "var(--color-warning)" : "var(--color-success)" }}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {health?.sap?.connected === false ? "Degraded" : "Online"}
            </div>
          </div>
        </div>

        {/* Ingest */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5"
              style={textMuted}
            >
              <Zap className="w-3 h-3" style={{ color: "var(--color-warning)" }} aria-hidden="true" />
              Ingest Disruption
            </h2>
            <span className="text-[9px] font-mono" style={textMuted}>
              FastAPI LangGraph
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleIngest(alertInput);
            }}
            className="relative flex items-center"
          >
            <label htmlFor="alert-input" className="sr-only">
              Describe a disruption to ingest
            </label>
            <input
              id="alert-input"
              name="rawAlert"
              type="text"
              autoComplete="off"
              value={alertInput}
              onChange={(e) => setAlertInput(e.target.value)}
              placeholder="e.g. Suez Canal blockage, Hamburg port strike…"
              disabled={loadingIngest}
              className="glass-input w-full rounded-xl pl-3 pr-24 py-2 text-xs font-mono focus:outline-none"
            />
            <button
              type="submit"
              disabled={loadingIngest || alertInput.trim().length < 3}
              className="absolute right-1 px-3 py-1 btn-primary rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
            >
              {loadingIngest ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <Send className="w-2.5 h-2.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
            <span className="text-[9px] font-mono uppercase shrink-0" style={textMuted}>
              Presets:
            </span>
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleIngest(q.query)}
                disabled={loadingIngest}
                className="text-[9px] font-mono px-2 py-0.5 rounded-lg border whitespace-nowrap transition hover:opacity-80 disabled:opacity-40"
                style={{ ...surfaceInset, ...textMuted }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs + filter */}
        <div
          className="px-4 pt-3 pb-2 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="flex items-center gap-1 p-0.5 rounded-lg border"
            style={surfaceInset}
            role="tablist"
            aria-label="Workspace view"
          >
            {([
              ["incidents", `Disruptions (${disruptions.length})`],
              ["nodes", `Nodes (${graphData.nodes.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className="px-3 py-1 text-[11px] font-bold rounded-md transition"
                style={
                  activeTab === key
                    ? {
                        background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                        color: "#fff",
                      }
                    : textMuted
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-40 shrink-0">
            <label htmlFor="workspace-search" className="sr-only">
              Filter list
            </label>
            <Search
              className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2"
              style={textMuted}
              aria-hidden="true"
            />
            <input
              id="workspace-search"
              name="workspaceSearch"
              type="search"
              autoComplete="off"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search…"
              className="glass-input w-full rounded-lg pl-6 pr-2 py-1 text-[10px] font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
          {activeTab === "incidents" &&
            (filteredIncidents.length === 0 ? (
              <p className="text-center py-12 text-xs" style={textMuted}>
                {disruptions.length === 0
                  ? "No active disruptions. The network is running nominally."
                  : "No disruptions match this filter."}
              </p>
            ) : (
              filteredIncidents.map((d) => {
                const isSelected = selectedDisruptionId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => inspectDisruption(d.id)}
                    aria-pressed={isSelected}
                    className="w-full text-left p-3 rounded-xl border transition"
                    style={
                      isSelected
                        ? {
                            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                            borderColor: "color-mix(in srgb, var(--color-primary) 45%, transparent)",
                          }
                        : surfaceInset
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: "var(--color-danger)" }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-bold font-mono truncate" style={textMain}>
                          {d.type}
                        </span>
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border shrink-0"
                        style={severityStyle(d.severity)}
                      >
                        {d.severity}
                      </span>
                    </div>

                    <div className="text-[11px] mt-1.5 font-mono flex items-center justify-between gap-2">
                      <span style={textMuted} className="truncate">
                        Target:{" "}
                        <strong style={textMain} className="font-semibold">
                          {d.target_id}
                        </strong>
                      </span>
                      <span style={textMuted} className="shrink-0">
                        {d.status}
                      </span>
                    </div>

                    {d.raw_text && (
                      <p
                        className="text-[10px] mt-1.5 line-clamp-2 leading-relaxed p-1.5 rounded-lg border"
                        style={{ ...surfaceInset, ...textMuted }}
                      >
                        {d.raw_text}
                      </p>
                    )}
                  </button>
                );
              })
            ))}

          {activeTab === "nodes" &&
            (filteredNodes.length === 0 ? (
              <p className="text-center py-12 text-xs" style={textMuted}>
                No nodes match this filter.
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredNodes.map((n) => (
                  <li
                    key={n.id}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-mono"
                    style={surfaceInset}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate" style={textMain}>
                        {n.name}
                      </div>
                      <div className="text-[10px] truncate" style={textMuted}>
                        {n.id}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded border"
                        style={{
                          color: "var(--color-success)",
                          background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
                          borderColor: "color-mix(in srgb, var(--color-success) 35%, transparent)",
                        }}
                      >
                        {n.status}
                      </span>
                      <div className="text-[9px] mt-0.5 tabular-nums" style={textMuted}>
                        {n.lat.toFixed(2)}°, {n.lng.toFixed(2)}°
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
        </div>

        {/* Connectivity */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-xs font-mono shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${streamActive ? "animate-pulse" : ""}`}
              style={{ background: streamActive ? "var(--color-success)" : "var(--color-text-muted)" }}
              aria-hidden="true"
            />
            <span className="text-[10px]" style={textMuted} aria-live="polite">
              {streamActive ? "Event stream active" : "Reconnecting…"}
            </span>
          </span>
          <span className="text-[10px]" style={textMuted}>
            Tenant: EU-WEST-PROD
          </span>
        </div>
      </section>

      {/* Globe + mitigation dock */}
      <section className="flex-1 relative flex flex-col min-w-0 min-h-0">
        {errorToast && (
          <div
            role="alert"
            aria-live="polite"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 text-xs px-4 py-2 rounded-xl glass-strong shadow-2xl flex items-center gap-3 max-w-[90%]"
            style={{
              color: "var(--color-danger)",
              borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)",
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{errorToast}</span>
            <button
              onClick={() => setErrorToast(null)}
              aria-label="Dismiss error"
              className="ml-2 shrink-0 transition hover:opacity-70"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex-1 w-full relative min-h-[320px]">
          <Network3D nodes={graphData.nodes as any} routes={graphData.edges as any} darkMode={true} />

          <div
            className="absolute top-4 right-4 p-3 rounded-xl glass text-[10px] space-y-1.5 pointer-events-none font-mono z-10"
            aria-hidden="true"
          >
            <div className="text-[9px] font-bold uppercase tracking-widest" style={textMuted}>
              Network Telemetry
            </div>
            {[
              ["Nominal corridor", "var(--color-success)"],
              ["Warning sector", "var(--color-warning)"],
              ["Critical disruption", "var(--color-danger)"],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2" style={textMain}>
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {activePlan && (
          <div
            className="border-t glass-strong flex flex-col xl:flex-row z-20 shrink-0 max-h-[60vh] xl:h-72 overflow-y-auto xl:overflow-visible"
            style={{ borderColor: "var(--color-border)" }}
            aria-label="Mitigation plan"
          >
            {/* Assessment */}
            <div
              className="w-full xl:w-80 xl:shrink-0 border-b xl:border-b-0 xl:border-r p-4 flex flex-col justify-between gap-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h2
                    className="text-[10px] font-bold font-mono tracking-widest uppercase"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Agent Reasoning
                  </h2>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0"
                    style={{
                      color: "var(--color-primary)",
                      background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                      borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
                    }}
                  >
                    {activePlan.status}
                  </span>
                </div>
                <h3 className="text-xs font-bold mb-2" style={textMain}>
                  {activePlan.decision?.action || "Analyzing route alternatives"}
                </h3>
                <div className="p-2.5 rounded-xl border max-h-32 overflow-y-auto" style={surfaceInset}>
                  <p className="text-xs leading-relaxed" style={textMain}>
                    {activePlan.narrative || activePlan.decision?.reason || "Synthesizing mitigation scenarios…"}
                  </p>
                </div>
              </div>

              {activePlan.awaiting_approval && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval(false)}
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded-xl border text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
                    style={{
                      color: "var(--color-danger)",
                      background: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                      borderColor: "color-mix(in srgb, var(--color-danger) 35%, transparent)",
                    }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproval(true)}
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded-xl btn-primary text-xs font-semibold disabled:opacity-50"
                  >
                    {actionLoading ? "Writing to SAP…" : "Approve & Apply"}
                  </button>
                </div>
              )}
            </div>

            {/* Route matrix */}
            <div
              className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-3 border-b xl:border-b-0 xl:border-r"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-[10px] font-bold font-mono tracking-widest uppercase" style={textMuted}>
                    Alternative Route Matrix
                  </h2>
                  <span className="text-[9px] font-mono shrink-0" style={textMuted}>
                    Select a row to preview
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <caption className="sr-only">Alternative reroute options with time, cost, and carbon impact</caption>
                    <thead>
                      <tr className="border-b text-[10px]" style={{ borderColor: "var(--color-border)", ...textMuted }}>
                        <th scope="col" className="pb-1.5 font-semibold">Option</th>
                        <th scope="col" className="pb-1.5 font-semibold">Corridor</th>
                        <th scope="col" className="pb-1.5 font-semibold">Transit</th>
                        <th scope="col" className="pb-1.5 font-semibold">Cost / Ton</th>
                        <th scope="col" className="pb-1.5 font-semibold">CO₂</th>
                        <th scope="col" className="pb-1.5 font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {activePlan.decision?.alternatives?.map((alt, idx) => {
                        const isSel = selectedRouteIdx === idx;
                        return (
                          <tr
                            key={alt.route_id}
                            tabIndex={0}
                            role="button"
                            aria-pressed={isSel}
                            aria-label={`Route ${alt.route_id} via ${alt.path.join(" to ")}`}
                            onClick={() => setSelectedRouteIdx(idx)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedRouteIdx(idx);
                              }
                            }}
                            className="cursor-pointer transition"
                            style={
                              isSel
                                ? {
                                    background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                                    ...textMain,
                                    fontWeight: 600,
                                  }
                                : textMuted
                            }
                          >
                            <td className="py-2.5 font-bold" style={{ color: "var(--color-primary)" }}>
                              {alt.route_id}
                            </td>
                            <td className="py-2.5 text-[11px] truncate max-w-[16rem]" style={textMain}>
                              {alt.path.join(" → ")}
                            </td>
                            <td className="py-2.5 tabular-nums">{alt.total_time_hours} hrs</td>
                            <td className="py-2.5 tabular-nums">${alt.total_cost_per_ton}</td>
                            <td className="py-2.5 tabular-nums">{alt.total_co2_per_ton} kg</td>
                            <td className="py-2.5">
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded border"
                                style={
                                  alt.feasibility === "OPTIMAL"
                                    ? {
                                        color: "var(--color-success)",
                                        background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
                                        borderColor: "color-mix(in srgb, var(--color-success) 35%, transparent)",
                                      }
                                    : { ...surfaceInset, ...textMuted }
                                }
                              >
                                {alt.feasibility}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {activePlan.awaiting_approval && (
                <div>
                  <label htmlFor="operator-feedback" className="sr-only">
                    Operator guidance or rejection rationale
                  </label>
                  <input
                    id="operator-feedback"
                    name="operatorFeedback"
                    type="text"
                    autoComplete="off"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional operator guidance or rejection rationale…"
                    className="glass-input w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Variance */}
            <div className="w-full xl:w-72 xl:shrink-0 p-4 flex flex-col justify-between gap-3">
              <div>
                <h2 className="text-[10px] font-bold font-mono tracking-widest uppercase mb-2" style={textMuted}>
                  Projected Variance
                </h2>
                {selectedAlt ? (
                  <div className="space-y-2 text-xs font-mono">
                    {[
                      { icon: Clock, label: "Transit time", value: `${selectedAlt.total_time_hours} hrs`, color: "var(--color-primary)" },
                      { icon: TrendingDown, label: "Cost per ton", value: `$${selectedAlt.total_cost_per_ton}`, color: "var(--color-success)" },
                      { icon: Activity, label: "Risk index", value: selectedAlt.total_risk.toFixed(2), color: "var(--color-warning)" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="p-2 rounded-xl border flex justify-between items-center gap-2"
                        style={surfaceInset}
                      >
                        <span className="flex items-center gap-1.5 min-w-0" style={textMuted}>
                          <row.icon className="w-3.5 h-3.5 shrink-0" style={{ color: row.color }} aria-hidden="true" />
                          <span className="truncate">{row.label}</span>
                        </span>
                        <span className="font-bold tabular-nums shrink-0" style={textMain}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-4" style={textMuted}>
                    Select a route to see its projected impact.
                  </p>
                )}
              </div>

              <div
                className="text-[10px] font-mono border-t pt-2 flex items-center justify-between gap-2"
                style={{ borderColor: "var(--color-border)", ...textMuted }}
              >
                <span>SAP S/4HANA write-back</span>
                <span className="font-bold" style={{ color: "var(--color-success)" }}>
                  Armed
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}