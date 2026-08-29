// @ts-nocheck
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Send,
  ShieldCheck,
  Activity,
  Globe2,
  Radio,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Flame,
} from "lucide-react";

import type { NodePoint, RouteLink } from "@/components/Network3D";
import OperationsView from "@/components/Roles/OperationsView";
import CustomerView from "@/components/Roles/CustomerView";
import AdminView from "@/components/Roles/AdminView";

const Network3D = dynamic(() => import("@/components/Network3D"), { ssr: false });
const Logo3D = dynamic(() => import("@/components/logo"), { ssr: false });
const ChaosSimulator = dynamic(() => import("@/components/ChaosSimulator").then((mod) => mod.default), {
  ssr: false,
});

type Role = "Manager" | "Operations" | "Customer" | "Admin";

const ROLE_ITEMS: Record<Role, string[]> = {
  Manager: ["Dashboard", "Disruptions", "Network Map", "AI Recovery", "Shipments", "Analytics"],
  Operations: ["Dashboard", "Live Fleet", "Route Control", "Lane Matrix", "Incident Stream"],
  Customer: ["Track Consignment", "Milestone Progress", "Delivery Specs", "SLA Protection"],
  Admin: ["SAP Integration", "System Health", "Audit Trail", "Security Keyrings"],
};

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

export default function DashboardPage() {
  const [role, setRole] = useState<Role>("Manager");
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(true);
  const [nodes, setNodes] = useState<NodePoint[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<RouteLink[]>(INITIAL_ROUTES);
  const [selectedNode, setSelectedNode] = useState<NodePoint | null>(INITIAL_NODES[1]);
  const [isHealing, setIsHealing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "⚡ CRITICAL DISRUPTION DETECTED: 48-hr crane operator walkout at Rotterdam (RTM). Blocked routes detected on Trans-Atlantic lines. Suggested deterministic mitigation: Multi-modal reroute via Frankfurt rail spine.",
    },
  ]);

  const getStatusBadge = (status: string) => {
    if (status.includes("CRITICAL")) {
      return darkMode
        ? "bg-rose-950/70 text-rose-300 border-rose-800/60"
        : "bg-rose-50 text-rose-700 border-rose-200 font-bold";
    }
    if (status.includes("CONGESTED")) {
      return darkMode
        ? "bg-amber-950/70 text-amber-300 border-amber-800/60"
        : "bg-amber-50 text-amber-700 border-amber-200 font-bold";
    }
    return darkMode
      ? "bg-emerald-950/70 text-emerald-300 border-emerald-800/60"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  };

  function handleInjectScenario(scn: any) {
    setIsChaosOpen(false);

    setNodes((prev) =>
      prev.map((n) => (n.id === scn.targetNodeId ? { ...n, status: "disrupted", capacity: 0.12 } : n))
    );
    setRoutes((prev) =>
      prev.map((r) =>
        r.from === scn.blockedRoute[0] && r.to === scn.blockedRoute[1] ? { ...r, status: "blocked" } : r
      )
    );

    const target = nodes.find((n) => n.id === scn.targetNodeId) || null;
    setSelectedNode(target);

    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        text: `🔥 CHAOS SIMULATION INJECTED [${scn.id}]: ${scn.title}. Epicenter: ${scn.epicenter}. At-Risk Financial Penalty: ${scn.financialRisk}. Proposed Strategy: ${scn.bypassStrategy}`,
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
        {
          role: "agent",
          text: "✅ AUTONOMOUS RECOVERY COMPLETE: Deterministic bypass executed in 850 ms. Network flow restored to 94.2% nominal.",
        },
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
        { role: "agent", text: `🔍 RAG AUDIT PRECEDENT: Historical record confirms Force-Majeure Clause 14.1 applies to "${txt}". 100% liquidated damages waived.` },
      ]);
    }, 550);
  }

  return (
    <div className={`h-screen w-screen flex overflow-hidden font-sans select-none transition-colors duration-300 ${
      darkMode ? "bg-[#060c18] text-slate-100" : "bg-[#f4f7fb] text-slate-900"
    }`}>
      {/* Dynamic Chaos Modal */}
      {isChaosOpen && (
        <ChaosSimulator
          darkMode={darkMode}
          isOpen={isChaosOpen}
          onClose={() => setIsChaosOpen(false)}
          onInjectChaos={handleInjectScenario}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`w-64 border-r flex flex-col shrink-0 backdrop-blur-2xl transition-colors duration-300 ${
        darkMode ? "bg-[#0a1426]/90 border-slate-800/90" : "bg-white/90 border-slate-200 shadow-md"
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800/80" : "border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <Logo3D darkMode={darkMode} />
            <div>
              <div className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                SELFHEAL NEXUS
              </div>
              <div className={`text-[10px] font-mono font-bold ${darkMode ? "text-indigo-400" : "text-blue-600"}`}>
                3D DIGITAL TWIN
              </div>
            </div>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded-xl border transition shadow-sm ${
              darkMode ? "bg-slate-900 border-slate-750 text-amber-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
            }`}
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Switcher */}
        <div className={`p-3.5 border-b ${darkMode ? "border-slate-800/80" : "border-slate-200"}`}>
          <div className={`text-[10px] font-mono font-bold uppercase mb-2 flex justify-between ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            <span>PORTAL ROLE</span>
            <span className="text-blue-500 font-bold">{role}</span>
          </div>
          <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            {(["Manager", "Operations", "Customer", "Admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setActiveTab(ROLE_ITEMS[r][0]);
                }}
                className={`text-[11px] py-1.5 rounded-lg font-bold transition ${
                  role === r
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : darkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            {role} Modules
          </div>
          {ROLE_ITEMS[role].map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === item
                  ? darkMode
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm"
                    : "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>{item}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>
          ))}
        </nav>

        {/* Tenant Meta */}
        <div className={`p-3.5 border-t text-[11px] font-mono flex items-center justify-between ${
          darkMode ? "border-slate-800/80 bg-[#040812]/60 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"
        }`}>
          <div>
            <div className={`text-[9px] font-bold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>ENTERPRISE TENANT</div>
            <div className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-900"}`}>EU-WEST-PROD</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"></span>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 p-4 gap-4">
        {/* Top Operational Bar */}
        <header className={`h-14 border rounded-2xl px-6 flex items-center justify-between backdrop-blur-xl shrink-0 transition-colors duration-300 ${
          darkMode ? "bg-[#0a1426]/70 border-slate-800/80" : "bg-white/80 border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold uppercase ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{role}</span>
            <span className="opacity-30 font-bold">/</span>
            <span className={`text-sm font-extrabold ${darkMode ? "text-white" : "text-slate-900"}`}>{activeTab}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* Chaos Simulator Trigger Button */}
            <button
              onClick={() => setIsChaosOpen(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                darkMode
                  ? "bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50"
                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>CHAOS SIMULATOR</span>
            </button>

            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-500" />
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Nodes:</span>
              <strong className={darkMode ? "text-white" : "text-slate-900"}>10 Monitored</strong>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Flow Rate:</span>
              <strong className="text-emerald-500">94.2%</strong>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${
              darkMode ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50" : "text-emerald-700 bg-emerald-50 border-emerald-300"
            }`}>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              HEURISTIC ENGINE ONLINE
            </div>
          </div>
        </header>

        {/* Dynamic Role Views */}
        {role === "Operations" ? (
          <OperationsView darkMode={darkMode} />
        ) : role === "Customer" ? (
          <CustomerView darkMode={darkMode} />
        ) : role === "Admin" ? (
          <AdminView darkMode={darkMode} />
        ) : (
          /* Default: Manager View (3D Twin + Disruption Table + RAG Intelligence) */
          <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
            {/* 3D Visualizer & PO Ledger (Col 8) */}
            <div className="col-span-8 flex flex-col gap-4 h-full min-h-0">
              <div className={`flex-1 relative min-h-0 rounded-2xl border backdrop-blur-xl overflow-hidden transition-colors duration-300 ${
                darkMode ? "bg-[#0b1528] border-slate-800/90 shadow-2xl" : "bg-[#edf4fb] border-slate-200 shadow-md"
              }`}>
                <Network3D
                  nodes={nodes}
                  routes={routes}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                  darkMode={darkMode}
                />
              </div>

              <div className={`h-44 border rounded-2xl p-4 flex flex-col shrink-0 backdrop-blur-xl transition-colors duration-300 ${
                darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className={`text-xs font-extrabold mb-2.5 flex items-center justify-between ${darkMode ? "text-white" : "text-slate-900"}`}>
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Active Monitored Purchase Orders
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${darkMode ? "text-indigo-400" : "text-blue-600"}`}>
                    S/4HANA ODATA FEED
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto text-xs font-mono">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`text-[10px] font-bold border-b pb-2 ${darkMode ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-200"}`}>
                        <th className="pb-2">PO ID</th>
                        <th className="pb-2">CORRIDOR</th>
                        <th className="pb-2">COMMODITY</th>
                        <th className="pb-2">CARRIER</th>
                        <th className="pb-2">STATUS</th>
                        <th className="pb-2 text-right">IMPACT</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-[11px] font-semibold ${darkMode ? "divide-slate-800/50" : "divide-slate-100"}`}>
                      {SHIPMENT_FEED.map((s) => (
                        <tr key={s.id} className={darkMode ? "hover:bg-slate-800/40" : "hover:bg-blue-50/50"}>
                          <td className="py-2 text-blue-600 font-bold">{s.id}</td>
                          <td className={`py-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{s.origin} → {s.dest}</td>
                          <td className={`py-2 font-sans ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{s.mat}</td>
                          <td className={`py-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{s.carrier}</td>
                          <td className="py-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] border tracking-tight ${getStatusBadge(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className={`py-2 text-right font-bold ${s.delay !== "0h" ? "text-rose-600" : "text-emerald-600"}`}>{s.delay}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Target Telemetry & Decision Archive (Col 4) */}
            <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
              <div className={`border rounded-2xl p-4 flex flex-col gap-3.5 shrink-0 backdrop-blur-xl transition-colors duration-300 ${
                darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`text-xs font-extrabold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Target Node Telemetry
                  </div>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md uppercase border ${getStatusBadge(selectedNode?.status === "disrupted" ? "CRITICAL" : "NOMINAL")}`}>
                    {selectedNode?.status || "STANDBY"}
                  </span>
                </div>

                {selectedNode && (
                  <div className={`border p-3.5 rounded-xl text-xs space-y-2.5 font-mono ${
                    darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex justify-between">
                      <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Node Identifier:</span>
                      <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{selectedNode.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Coordinates:</span>
                      <span className="text-blue-600 font-bold">{selectedNode.lat.toFixed(2)}°N, {selectedNode.lng.toFixed(2)}°E</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Throughput:</span>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-24 rounded-full h-2 overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                          <div
                            className={`h-full transition-all duration-500 ${
                              selectedNode.capacity < 0.4 ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : "bg-emerald-500"
                            }`}
                            style={{ width: `${selectedNode.capacity * 100}%` }}
                          ></div>
                        </div>
                        <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{Math.round(selectedNode.capacity * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleHealAction}
                  disabled={isHealing || selectedNode?.status === "active"}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-[0.98]"
                >
                  <RefreshCw className={`w-4 h-4 ${isHealing ? "animate-spin" : ""}`} />
                  {isHealing ? "Calculating Optimal Reroute..." : "Execute Autonomous Healing Reroute"}
                </button>
              </div>

              <div className={`flex-1 border rounded-2xl p-4 flex flex-col min-h-0 backdrop-blur-xl transition-colors duration-300 ${
                darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className={`text-xs font-extrabold mb-2.5 flex items-center justify-between uppercase ${darkMode ? "text-slate-300" : "text-slate-800"}`}>
                  <span className="flex items-center gap-2 text-blue-600">
                    <ShieldCheck className="w-4 h-4" /> Decision Archive Intelligence
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                    darkMode ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50" : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}>
                    RAG LIVE
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl leading-relaxed ${
                        m.role === "user"
                          ? darkMode
                            ? "bg-blue-600/20 text-blue-200 border border-blue-500/40 ml-auto max-w-[88%]"
                            : "bg-blue-50 text-blue-900 border border-blue-200 ml-auto max-w-[88%]"
                          : darkMode
                          ? "bg-[#040812] text-slate-300 border border-slate-800 font-mono text-[11px]"
                          : "bg-slate-50 text-slate-700 border border-slate-200 font-mono text-[11px]"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendQuery} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Query past resolutions, fallback SLA penalties..."
                    className={`flex-1 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 font-sans ${
                      darkMode ? "bg-[#040812] border-slate-800 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition shadow-md shadow-blue-600/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}