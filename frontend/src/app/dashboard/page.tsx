"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  RefreshCw,
  Send,
  ShieldCheck,
  Activity,
  Globe2,
  Sparkles,
  Flame,
} from "lucide-react";

import type { NodePoint, RouteLink } from "@/components/Network3D";
import type { ChaosScenario } from "@/components/ChaosSimulator";
import OperationsView from "@/components/Roles/OperationsView";
import CustomerView from "@/components/Roles/CustomerView";
import AdminView from "@/components/Roles/AdminView";
import { useTheme } from "@/context/ThemeContext";

const Network3D = dynamic(() => import("@/components/Network3D"), { ssr: false });
const ChaosSimulator = dynamic(
  () => import("@/components/ChaosSimulator").then((mod) => mod.default),
  { ssr: false }
);

const INITIAL_NODES: NodePoint[] = [
  { id: "FRA", name: "Frankfurt Multimodal Hub", city: "FRA", lat: 50.11, lng: 8.68, status: "active", capacity: 0.95 },
  { id: "RTM", name: "Rotterdam Marine Port", city: "RTM", lat: 51.92, lng: 4.47, status: "disrupted", capacity: 0.15 },
  { id: "SIN", name: "Singapore Mega Terminal", city: "SIN", lat: 1.35, lng: 103.81, status: "active", capacity: 0.92 },
  { id: "PVG", name: "Shanghai Freight Centre", city: "PVG", lat: 31.23, lng: 121.47, status: "degraded", capacity: 0.58 },
  { id: "JFK", name: "New York Port Gateway", city: "JFK", lat: 40.71, lng: -74.0, status: "active", capacity: 0.88 },
  { id: "BOM", name: "Mumbai JNPT Port", city: "BOM", lat: 19.07, lng: 72.87, status: "active", capacity: 0.82 },
  { id: "DXB", name: "Dubai Logistics Hub", city: "DXB", lat: 25.27, lng: 55.29, status: "active", capacity: 0.94 },
  { id: "HND", name: "Tokyo Terminal", city: "HND", lat: 35.54, lng: 139.77, status: "active", capacity: 0.91 },
  { id: "SSZ", name: "Santos Port", city: "SSZ", lat: -23.96, lng: -46.33, status: "active", capacity: 0.79 },
  { id: "LAX", name: "Los Angeles Gateway", city: "LAX", lat: 33.74, lng: -118.27, status: "active", capacity: 0.86 },
];

const INITIAL_ROUTES: RouteLink[] = [
  { from: "FRA", to: "RTM", status: "blocked" },
  { from: "RTM", to: "JFK", status: "blocked" },
  { from: "FRA", to: "JFK", status: "active" },
  { from: "SIN", to: "PVG", status: "congested" },
  { from: "BOM", to: "DXB", status: "active" },
  { from: "DXB", to: "FRA", status: "active" },
  { from: "SIN", to: "BOM", status: "active" },
  { from: "PVG", to: "HND", status: "active" },
  { from: "HND", to: "LAX", status: "active" },
  { from: "JFK", to: "SSZ", status: "active" },
  { from: "LAX", to: "JFK", status: "active" },
  { from: "SSZ", to: "FRA", status: "active" },
];

const SHIPMENT_FEED = [
  { id: "PO-88219", origin: "Rotterdam", dest: "New York", mat: "Semiconductor Wafers", carrier: "Hapag-Lloyd", status: "CRITICAL HOLD", delay: "+48h" },
  { id: "PO-90142", origin: "Frankfurt", dest: "New York", mat: "Automotive ECU Modules", carrier: "Lufthansa Cargo", status: "NOMINAL", delay: "0h" },
  { id: "PO-91008", origin: "Shanghai", dest: "Tokyo", mat: "Lithium Power Packs", carrier: "COSCO Line", status: "CONGESTED", delay: "+6h" },
  { id: "PO-92411", origin: "Mumbai", dest: "Frankfurt", mat: "Active Medical APIs", carrier: "Emirates Cargo", status: "NOMINAL", delay: "0h" },
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

const VALID_ROLES = ["Manager", "Operations", "Customer", "Admin"];

export default function DashboardOverviewPage() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role = VALID_ROLES.includes(roleParam || "") ? (roleParam as string) : "Manager";

  const [nodes, setNodes] = useState<NodePoint[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<RouteLink[]>(INITIAL_ROUTES);
  const [selectedNode, setSelectedNode] = useState<NodePoint | null>(INITIAL_NODES[1]);
  const [isHealing, setIsHealing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "⚡ CRITICAL DISRUPTION DETECTED: 48-hr crane operator walkout at Rotterdam (RTM). Suggested deterministic mitigation: Multi-modal reroute via Frankfurt rail spine.",
    },
  ]);

  function handleInjectScenario(scn: ChaosScenario) {
    setIsChaosOpen(false);
    setNodes((prev) => prev.map((n) => (n.id === scn.targetNodeId ? { ...n, status: "disrupted", capacity: 0.12 } : n)));
    setRoutes((prev) =>
      prev.map((r) => (r.from === scn.blockedRoute[0] && r.to === scn.blockedRoute[1] ? { ...r, status: "blocked" } : r))
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
      setNodes((prev) => prev.map((n) => (selectedNode && n.id === selectedNode.id ? { ...n, status: "active", capacity: 0.94 } : n)));
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

  if (role === "Operations") return <OperationsView />;
  if (role === "Customer") return <CustomerView />;
  if (role === "Admin") return <AdminView />;

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-0 gap-4">
      {isChaosOpen && (
        <ChaosSimulator
          darkMode={isDark}
          isOpen={isChaosOpen}
          onClose={() => setIsChaosOpen(false)}
          onInjectChaos={handleInjectScenario}
        />
      )}

      {/* Dynamic Action Sub-header */}
      <div
        className="glass border rounded-2xl px-5 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="font-bold uppercase" style={textMain}>{role}</span>
          <span className="opacity-30">/</span>
          <span className="font-semibold" style={primary}>Dynamic Operations Hub</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => setIsChaosOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border"
            style={{
              color: "var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-danger) 35%, transparent)",
            }}
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
            <span>CHAOS SIMULATOR</span>
          </button>

          <div className="flex items-center gap-1.5" style={textMuted}>
            <Globe2 className="w-4 h-4" style={primary} aria-hidden="true" />
            <span>Nodes:</span>
            <strong style={textMain}>10 Monitored</strong>
          </div>
          <div className="flex items-center gap-1.5" style={textMuted}>
            <Activity className="w-4 h-4" style={{ color: "var(--color-success)" }} aria-hidden="true" />
            <span>Flow:</span>
            <strong style={{ color: "var(--color-success)" }}>94.2%</strong>
          </div>
        </div>
      </div>

      {/* Grid Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Column: 3D Twin & Orders */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 h-full min-h-0">
          <div
            className="flex-1 relative min-h-[300px] rounded-2xl border glass-strong shadow-xl overflow-hidden"
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

          <div
            className="h-44 glass border rounded-2xl p-4 flex flex-col shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="text-xs font-extrabold mb-2.5 flex items-center justify-between" style={textMain}>
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={primary} />
                Active Monitored Purchase Orders
              </span>
              <span className="text-[10px] font-mono font-bold" style={primary}>
                S/4HANA ODATA FEED
              </span>
            </div>
            <div className="flex-1 overflow-y-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold border-b pb-2" style={{ borderColor: "var(--color-border)", ...textMuted }}>
                    <th className="pb-2">PO ID</th>
                    <th className="pb-2">CORRIDOR</th>
                    <th className="pb-2">COMMODITY</th>
                    <th className="pb-2">CARRIER</th>
                    <th className="pb-2">STATUS</th>
                    <th className="pb-2 text-right">IMPACT</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-semibold" style={{ borderColor: "var(--color-border)" }}>
                  {SHIPMENT_FEED.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="py-2 font-bold" style={primary}>{s.id}</td>
                      <td className="py-2" style={textMain}>{s.origin} → {s.dest}</td>
                      <td className="py-2 font-sans" style={textMuted}>{s.mat}</td>
                      <td className="py-2" style={textMuted}>{s.carrier}</td>
                      <td className="py-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] border font-bold" style={statusBadgeStyle(s.status)}>
                          {s.status}
                        </span>
                      </td>
                      <td
                        className="py-2 text-right font-bold"
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

        {/* Right Column: Telemetry & Decision Archive */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full min-h-0">
          <div
            className="glass border rounded-2xl p-4 flex flex-col gap-3.5 shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold flex items-center gap-2" style={textMain}>
                <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-danger)" }} />
                Target Node Telemetry
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md uppercase border font-bold" style={statusBadgeStyle(selectedNode?.status || "active")}>
                {selectedNode?.status || "STANDBY"}
              </span>
            </div>

            {selectedNode && (
              <div
                className="border p-3.5 rounded-xl text-xs space-y-2.5 font-mono"
                style={{ background: "color-mix(in srgb, var(--color-bg-alt) 50%, transparent)", borderColor: "var(--color-border)" }}
              >
                <div className="flex justify-between">
                  <span style={textMuted}>Node Identifier:</span>
                  <span className="font-bold" style={textMain}>{selectedNode.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={textMuted}>Coordinates:</span>
                  <span className="font-bold" style={primary}>{selectedNode.lat.toFixed(2)}°N, {selectedNode.lng.toFixed(2)}°E</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span style={textMuted}>Throughput:</span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-24 rounded-full h-2 overflow-hidden bg-white/10">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${(selectedNode.capacity ?? 0) * 100}%`,
                          background: (selectedNode.capacity ?? 0) < 0.4 ? "var(--color-danger)" : "var(--color-success)",
                        }}
                      />
                    </div>
                    <span className="font-bold" style={textMain}>{Math.round((selectedNode.capacity ?? 0) * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleHealAction}
              disabled={isHealing || selectedNode?.status === "active"}
              className="w-full py-3 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-40"
              style={{
                background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                boxShadow: "0 4px 14px color-mix(in srgb, var(--color-primary) 30%, transparent)",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isHealing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isHealing ? "Calculating Optimal Reroute…" : "Execute Autonomous Healing Reroute"}
            </button>
          </div>

          <div
            className="flex-1 glass border rounded-2xl p-4 flex flex-col min-h-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="text-xs font-extrabold mb-2.5 flex items-center justify-between uppercase">
              <span className="flex items-center gap-2" style={primary}>
                <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Decision Archive Intelligence
              </span>
              <span
                className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border"
                style={{
                  color: "var(--color-success)",
                  background: "color-mix(in srgb, var(--color-success) 14%, transparent)",
                  borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)",
                }}
              >
                RAG LIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl leading-relaxed border"
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

            <form onSubmit={handleSendQuery} className="mt-3 flex gap-2">
              <label htmlFor="decision-query" className="sr-only">
                Query past resolutions
              </label>
              <input
                id="decision-query"
                type="text"
                name="decisionQuery"
                autoComplete="off"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Query past resolutions, fallback SLA penalties…"
                className="flex-1 border rounded-xl px-4 py-2.5 text-xs focus:outline-none font-sans"
                style={{
                  background: "color-mix(in srgb, var(--color-bg-alt) 50%, transparent)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
              <button
                type="submit"
                aria-label="Send query"
                className="p-2.5 text-white rounded-xl transition"
                style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}