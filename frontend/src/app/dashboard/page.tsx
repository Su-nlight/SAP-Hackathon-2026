"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  RefreshCw,
  Send,
  ShieldCheck,
  Activity,
  Globe2,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Building2
} from "lucide-react";

import { getNetworkHealth, getNetworkGraph } from "@/lib/api";
import type { NodePoint, RouteLink } from "@/components/Network3D";
import type { ChaosScenario } from "@/components/ChaosSimulator";
import AdminView from "@/components/Roles/AdminView";
import { useTheme } from "@/context/ThemeContext";

/* PROTECTED 3D GLOBE IMPORT — DO NOT ALTER PROPS OR SHADERS */
const Network3D = dynamic(() => import("@/components/Network3D"), { ssr: false });
const ChaosSimulator = dynamic(
  () => import("@/components/ChaosSimulator").then((m) => m.default),
  { ssr: false }
);

const SHIPMENT_FEED = [
  { id: "PO-88219", origin: "Rotterdam", dest: "New York", mat: "Semiconductor Wafers", carrier: "Hapag-Lloyd", status: "CRITICAL HOLD", delay: "+48h", value: "$4.2M" },
  { id: "PO-90142", origin: "Frankfurt", dest: "New York", mat: "Automotive ECU Modules", carrier: "Lufthansa Cargo", status: "NOMINAL", delay: "0h", value: "$1.8M" },
  { id: "PO-91008", origin: "Shanghai", dest: "Tokyo", mat: "Lithium Power Packs", carrier: "COSCO Line", status: "CONGESTED", delay: "+6h", value: "$3.1M" },
  { id: "PO-92411", origin: "Mumbai", dest: "Frankfurt", mat: "Active Medical APIs", carrier: "Emirates Cargo", status: "NOMINAL", delay: "0h", value: "$2.6M" },
];

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

function statusBadgeStyle(status: string) {
  const s = status.toUpperCase();
  if (s.includes("CRITICAL") || s.includes("BLOCKED") || s.includes("DISRUPTED")) {
    return {
      color: "var(--color-danger)",
      background: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)",
    };
  }
  if (s.includes("CONGESTED") || s.includes("DEGRADED")) {
    return {
      color: "var(--color-warning)",
      background: "color-mix(in srgb, var(--color-warning) 16%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-warning) 40%, transparent)",
    };
  }
  return {
    color: "var(--color-success)",
    background: "color-mix(in srgb, var(--color-success) 14%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)",
  };
}

const VALID_ROLES = ["Manager", "Operations", "Admin"];

export default function DashboardOverviewPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role = VALID_ROLES.includes(roleParam || "") ? (roleParam as string) : "Manager";

  const [nodes, setNodes] = useState<NodePoint[]>([]);
  const [routes, setRoutes] = useState<RouteLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodePoint | null>(null);
  const [flowPct, setFlowPct] = useState<string>("94");
  const [isHealing, setIsHealing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "⚡ Network monitoring active. Standing by for telemetry and autonomous routing updates.",
    },
  ]);

  useEffect(() => {
    if (role === "Operations") {
      router.push("/operations");
      return;
    }

    Promise.all([
      getNetworkHealth().catch(() => null),
      getNetworkGraph().catch(() => null),
    ]).then(([h, g]) => {
      if (h) {
        const val = (h as any).network_reliability_pct ?? (h as any).health_score ?? (h as any).score;
        if (val !== undefined) setFlowPct(String(val));
      }

      if (g && Array.isArray((g as any).nodes) && (g as any).nodes.length > 0) {
        const mappedNodes: NodePoint[] = (g as any).nodes.map((n: any) => ({
          id: n.id || n.code || n.name,
          name: n.name || n.id,
          city: n.city || n.id,
          lat: Number(n.lat),
          lng: Number(n.lng ?? n.lon ?? 0),
          status: (n.status || "active").toLowerCase(),
          capacity: typeof n.capacity === "number" ? n.capacity : 0.85,
        }));
        setNodes(mappedNodes);
        setSelectedNode(mappedNodes[0] || null);

        if (Array.isArray((g as any).edges)) {
          const mappedRoutes: RouteLink[] = (g as any).edges.map((e: any) => ({
            from: e.from ?? e.source,
            to: e.to ?? e.target,
            status: (e.status || "active").toLowerCase(),
          }));
          setRoutes(mappedRoutes);
        }
      }
    });
  }, [role, router]);

  function handleInjectScenario(scn: ChaosScenario) {
    setIsChaosOpen(false);
    setNodes((prev) =>
      prev.map((n) => (n.id === scn.targetNodeId ? { ...n, status: "disrupted", capacity: 0.12 } : n))
    );
    setRoutes((prev) =>
      prev.map((r) =>
        r.from === scn.blockedRoute[0] && r.to === scn.blockedRoute[1] ? { ...r, status: "blocked" } : r
      )
    );
    setSelectedNode(nodes.find((n) => n.id === scn.targetNodeId) || null);
    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        text: `🔥 CHAOS SIMULATION: ${scn.title}. Epicenter: ${scn.epicenter}. At-Risk: ${scn.financialRisk}. Mitigation: ${scn.bypassStrategy}`,
      },
    ]);
  }

  function handleHealAction() {
    setIsHealing(true);
    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) => (selectedNode && n.id === selectedNode.id ? { ...n, status: "active", capacity: 0.94 } : n))
      );
      setRoutes((prev) => prev.map((r) => (r.status === "blocked" ? { ...r, status: "active" } : r)));
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "✅ AUTONOMOUS RECOVERY COMPLETE: Deterministic bypass executed in 850 ms. Flow restored to nominal." },
      ]);
      setIsHealing(false);
    }, 850);
  }

  function handleSendQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const txt = chatInput;
    setMessages((prev) => [...prev, { role: "user", text: txt }]);
    setChatInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: `🔍 RAG PRECEDENT: Force-Majeure Clause 14.1 applies to "${txt}". 100% liquidated damages waived.` },
      ]);
    }, 550);
  }

  if (role === "Operations") return null;
  if (role === "Admin") return <AdminView />;

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-0 gap-3.5">
      {isChaosOpen && (
        <ChaosSimulator
          darkMode={isDark}
          isOpen={isChaosOpen}
          onClose={() => setIsChaosOpen(false)}
          onInjectChaos={handleInjectScenario}
        />
      )}

      {/* Action Sub-header */}
      <div
        className="glass border rounded-xl px-4 py-2 flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2 text-xs font-mono">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span className="font-bold uppercase tracking-wider" style={textMain}>{role} COMMAND</span>
          <span className="opacity-30">/</span>
          <span className="font-semibold" style={primary}>Disruption & Risk Matrix</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setIsChaosOpen(true)}
            className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer hover:opacity-90"
            style={{
              color: "var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-danger) 35%, transparent)",
            }}
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
            <span>CHAOS SIMULATOR</span>
          </button>

          <div className="flex items-center gap-1.5 tabular-nums" style={textMuted}>
            <Globe2 className="w-4 h-4" style={primary} aria-hidden="true" />
            <span>Nodes:</span>
            <strong style={textMain}>{nodes.length || 9}</strong>
          </div>
          <div className="flex items-center gap-1.5 tabular-nums" style={textMuted}>
            <Activity className="w-4 h-4" style={{ color: "var(--color-success)" }} aria-hidden="true" />
            <span>Reliability:</span>
            <strong style={{ color: "var(--color-success)" }}>{flowPct}%</strong>
          </div>
        </div>
      </div>

      {/* Grid Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3.5 min-h-0">
        {/* Left Column: 3D Globe + Purchase Orders */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3.5 h-full min-h-0">
          {/* PROTECTED 3D GLOBE CONTAINER */}
          <div
            className="flex-1 relative min-h-[320px] rounded-2xl border glass-strong shadow-xl overflow-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Network3D
              nodes={nodes}
              routes={routes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              darkMode={isDark}
            />
          </div>

          {/* Active Orders Feed */}
          <div
            className="h-44 glass border rounded-xl p-3 flex flex-col shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="text-xs font-extrabold mb-2 flex items-center justify-between" style={textMain}>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={primary} />
                Monitored Purchase Orders (S/4HANA Feed)
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={primary}>
                LIVE TELEMETRY
              </span>
            </div>

            <div className="flex-1 overflow-y-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold border-b pb-1.5" style={{ borderColor: "var(--color-border)", ...textMuted }}>
                    <th className="pb-1.5">PO ID</th>
                    <th className="pb-1.5">CORRIDOR</th>
                    <th className="pb-1.5">COMMODITY</th>
                    <th className="pb-1.5">CARRIER</th>
                    <th className="pb-1.5">EXPOSURE</th>
                    <th className="pb-1.5">STATUS</th>
                    <th className="pb-1.5 text-right">IMPACT</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-semibold" style={{ borderColor: "var(--color-border)" }}>
                  {SHIPMENT_FEED.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2 font-bold tabular-nums" style={primary}>{s.id}</td>
                      <td className="py-2" style={textMain}>{s.origin} → {s.dest}</td>
                      <td className="py-2 font-sans font-normal" style={textMuted}>{s.mat}</td>
                      <td className="py-2" style={textMuted}>{s.carrier}</td>
                      <td className="py-2 tabular-nums" style={textMain}>{s.value}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] border font-bold" style={statusBadgeStyle(s.status)}>
                          {s.status}
                        </span>
                      </td>
                      <td
                        className="py-2 text-right font-bold tabular-nums"
                        style={{ color: s.delay !== "0h" ? "var(--color-danger)" : "var(--color-success)" }}
                      >
                        {s.delay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Node Diagnostics + Decision Engine */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3.5 h-full min-h-0">
          {/* Node Diagnostics */}
          <div
            className="glass border rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold flex items-center gap-1.5" style={textMain}>
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--color-danger)" }} />
                Target Node Telemetry
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md uppercase border font-bold" style={statusBadgeStyle(selectedNode?.status || "active")}>
                {selectedNode?.status || "STANDBY"}
              </span>
            </div>

            {selectedNode && (
              <div
                className="border p-3 rounded-lg text-xs space-y-2 font-mono"
                style={{ background: "color-mix(in srgb, var(--color-bg-alt) 50%, transparent)", borderColor: "var(--color-border)" }}
              >
                <div className="flex justify-between">
                  <span style={textMuted}>Hub Name:</span>
                  <span className="font-bold" style={textMain}>{selectedNode.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={textMuted}>Coordinates:</span>
                  <span className="font-bold tabular-nums" style={primary}>
                    {selectedNode.lat.toFixed(2)}°N, {selectedNode.lng.toFixed(2)}°E
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <span style={textMuted}>Capacity:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 rounded-full h-1.5 overflow-hidden bg-white/10">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${(selectedNode.capacity ?? 0) * 100}%`,
                          background: (selectedNode.capacity ?? 0) < 0.4 ? "var(--color-danger)" : "var(--color-success)",
                        }}
                      />
                    </div>
                    <span className="font-bold tabular-nums" style={textMain}>
                      {Math.round((selectedNode.capacity ?? 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleHealAction}
              disabled={isHealing || selectedNode?.status === "active"}
              className="w-full py-2.5 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer btn-primary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHealing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isHealing ? "Calculating Bypass..." : "Execute Autonomous Reroute"}
            </button>
          </div>

          {/* RAG Decision Archive Intelligence */}
          <div
            className="flex-1 glass border rounded-xl p-3.5 flex flex-col min-h-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="text-xs font-extrabold mb-2 flex items-center justify-between uppercase">
              <span className="flex items-center gap-1.5" style={primary}>
                <ShieldCheck className="w-4 h-4" /> Decision Archive Intelligence
              </span>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{
                  color: "var(--color-success)",
                  background: "color-mix(in srgb, var(--color-success) 14%, transparent)",
                  borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)",
                }}
              >
                RAG LIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg leading-relaxed border"
                  style={
                    m.role === "user"
                      ? {
                          background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                          color: "var(--color-text)",
                          borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
                          marginLeft: "auto",
                          maxWidth: "88%",
                        }
                      : {
                          background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)",
                          color: "var(--color-text-muted)",
                          borderColor: "var(--color-border)",
                          fontFamily: "monospace",
                          fontSize: "11px",
                        }
                  }
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendQuery} className="mt-2.5 flex gap-1.5">
              <label htmlFor="decision-query" className="sr-only">Query past resolutions</label>
              <input
                id="decision-query"
                type="text"
                autoComplete="off"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Query precedents, fallback penalties..."
                className="flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none font-sans"
                style={{
                  background: "color-mix(in srgb, var(--color-bg-alt) 50%, transparent)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
              <button
                type="submit"
                aria-label="Send query"
                className="p-2 text-white rounded-lg transition btn-primary cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}