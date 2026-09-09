"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Leaf,
  DollarSign,
  X,
  Sparkles,
} from "lucide-react";

export interface ChaosScenario {
  id: string;
  title: string;
  category: "Industrial Strike" | "Geopolitical Bottleneck" | "Extreme Weather" | "Port Congestion";
  epicenter: string;
  targetNodeId: string;
  blockedRoute: [string, string];
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  description: string;
  financialRisk: string;
  carbonDelta: string;
  mttrManual: string;
  mttrSelfHeal: string;
  bypassStrategy: string;
}

export const CHAOS_SCENARIOS: ChaosScenario[] = [
  {
    id: "SCN-01",
    title: "Rotterdam Marine 48-Hour Crane Walkout",
    category: "Industrial Strike",
    epicenter: "Rotterdam (RTM)",
    targetNodeId: "RTM",
    blockedRoute: ["FRA", "RTM"],
    severity: "CRITICAL",
    description: "Union dockworkers strike halted container gantries. 3 Trans-Atlantic POs blocked at terminal.",
    financialRisk: "$480,000 SLA Penalty",
    carbonDelta: "-18% via Rail Bypass",
    mttrManual: "36 - 48 Hours",
    mttrSelfHeal: "850 ms",
    bypassStrategy: "Switch inland freight to Frankfurt Multimodal Rail Spine directly to European Air Hub.",
  },
  {
    id: "SCN-02",
    title: "Suez Gateway Vessel Grounding Delay",
    category: "Geopolitical Bottleneck",
    epicenter: "Dubai Logistics / Suez Corridor",
    targetNodeId: "DXB",
    blockedRoute: ["DXB", "FRA"],
    severity: "CRITICAL",
    description: "Ultra-large container vessel stalled in southern bypass lane. Middle-East to EU routes backed up.",
    financialRisk: "$1,250,000 Supply Penalty",
    carbonDelta: "+4% Air Cargo Burst",
    mttrManual: "72+ Hours",
    mttrSelfHeal: "1.2 Seconds",
    bypassStrategy: "Air-freight high-priority pharmaceutical cargo via Dubai World Central to Frankfurt.",
  },
  {
    id: "SCN-03",
    title: "Typhoon Shanghai Gale Force Standstill",
    category: "Extreme Weather",
    epicenter: "Shanghai Freight Hub (PVG)",
    targetNodeId: "PVG",
    blockedRoute: ["SIN", "PVG"],
    severity: "HIGH",
    description: "Category 4 tropical storm forces Shanghai Yangshan deepwater port crane lockouts.",
    financialRisk: "$320,000 Hold Penalty",
    carbonDelta: "-8% via South Hubs",
    mttrManual: "24 - 36 Hours",
    mttrSelfHeal: "620 ms",
    bypassStrategy: "Reroute Southeast Asian semiconductors through Singapore Mega Terminal to Tokyo Narita.",
  },
  {
    id: "SCN-04",
    title: "Panama Canal Drought Draft Restrictions",
    category: "Geopolitical Bottleneck",
    epicenter: "Santos / Latin Corridor (SSZ)",
    targetNodeId: "SSZ",
    blockedRoute: ["JFK", "SSZ"],
    severity: "MODERATE",
    description: "Low Gatun Lake water levels cap container tonnage. Extended 12-day anchorage queues.",
    financialRisk: "$190,000 Hold Penalty",
    carbonDelta: "+12% Intermodal Rail",
    mttrManual: "48+ Hours",
    mttrSelfHeal: "900 ms",
    bypassStrategy: "Divert South American cargo to US East Coast via multimodal rail links from Santos Port.",
  },
];

interface ChaosProps {
  darkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onInjectChaos: (scenario: ChaosScenario) => void;
}

export default function ChaosSimulator({ darkMode, isOpen, onClose, onInjectChaos }: ChaosProps) {
  const [selectedScenario, setSelectedScenario] = useState<ChaosScenario>(CHAOS_SCENARIOS[0]);
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const t = setTimeout(() => setAnimating(true), 20);
      return () => clearTimeout(t);
    } else {
      setAnimating(false);
      const t = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!mounted) return null;

  const handleInject = () => {
    onInjectChaos(selectedScenario);
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === "CRITICAL") {
      return darkMode
        ? "bg-rose-950/50 text-rose-300 border-rose-800/60"
        : "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (severity === "HIGH") {
      return darkMode
        ? "bg-amber-950/50 text-amber-300 border-amber-800/60"
        : "bg-amber-50 text-amber-700 border-amber-200";
    }
    return darkMode
      ? "bg-blue-950/50 text-blue-300 border-blue-800/60"
      : "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ease-out ${
        animating ? "bg-slate-950/60 backdrop-blur-md opacity-100" : "bg-transparent backdrop-blur-none opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out transform ${
          animating ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        } ${
          darkMode
            ? "bg-[#0a1224]/95 border-slate-800/90 text-slate-100 shadow-slate-950/80"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60"
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              darkMode ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" : "bg-rose-50 text-rose-600 border border-rose-200"
            }`}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                Chaos & Disruption Simulation Lab
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  darkMode ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}>
                  Judge Demo Mode
                </span>
              </div>
              <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Stress-test the autonomous digital twin with catastrophic supply chain events
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition ${
              darkMode ? "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="grid grid-cols-12 flex-1 min-h-[420px]">
          {/* Left Column: Scenario Selectors (Col 5) */}
          <div className={`col-span-5 p-4 border-r flex flex-col gap-2 overflow-y-auto ${
            darkMode ? "border-slate-800 bg-[#060b18]/60" : "border-slate-200 bg-slate-50/60"
          }`}>
            <div className={`text-[10px] font-mono font-bold uppercase px-2 mb-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Select Disruption Event
            </div>
            {CHAOS_SCENARIOS.map((scn) => (
              <button
                key={scn.id}
                onClick={() => setSelectedScenario(scn)}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex flex-col gap-1.5 ${
                  selectedScenario.id === scn.id
                    ? darkMode
                      ? "bg-blue-600/15 border-blue-500/40 text-white shadow-sm"
                      : "bg-blue-50/80 border-blue-300 text-slate-900 shadow-sm"
                    : darkMode
                    ? "bg-[#0a1426]/40 border-slate-800 text-slate-300 hover:bg-slate-800/30"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold ${selectedScenario.id === scn.id ? "text-blue-500" : darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {scn.id}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getSeverityBadge(scn.severity)}`}>
                    {scn.severity}
                  </span>
                </div>
                <div className="text-xs font-bold leading-tight">{scn.title}</div>
                <div className={`text-[10px] font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Epicenter: <strong className={darkMode ? "text-slate-300" : "text-slate-700"}>{scn.epicenter}</strong>
                </div>
              </button>
            ))}
          </div>

          {/* Right Column: Deep Scenario Telemetry & Action (Col 7) */}
          <div className="col-span-7 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-500 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  INCIDENT TELEMETRY
                </div>
                <h3 className={`text-base font-extrabold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {selectedScenario.title}
                </h3>
                <p className={`text-xs mt-1.5 leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {selectedScenario.description}
                </p>
              </div>

              {/* Financial & Environmental ROI Matrix */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-[#060b18] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold mb-1">
                    <DollarSign className="w-3 h-3" /> AT-RISK EXPOSURE
                  </div>
                  <div className={`text-sm font-extrabold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                    {selectedScenario.financialRisk}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Penalties without mitigation</div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-[#060b18] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold mb-1">
                    <Leaf className="w-3 h-3" /> CARBON FOOTPRINT
                  </div>
                  <div className="text-sm font-extrabold text-emerald-500">
                    {selectedScenario.carbonDelta}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Optimized routing delta</div>
                </div>
              </div>

              {/* MTTR Benchmark Comparison Card */}
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-[#060b18] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <div className="text-[10px] font-mono font-bold text-blue-500 uppercase mb-2">
                  Resolution Velocity Benchmark (MTTR)
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Manual Escalation</div>
                    <div className="font-extrabold text-rose-500 text-sm mt-0.5">{selectedScenario.mttrManual}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 opacity-60" />
                  <div>
                    <div className="text-[10px] text-slate-400">SelfHeal Nexus Solver</div>
                    <div className="font-extrabold text-emerald-500 text-sm mt-0.5">{selectedScenario.mttrSelfHeal}</div>
                  </div>
                </div>
              </div>

              {/* Recommended Mitigation Plan */}
              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                darkMode ? "bg-blue-950/20 border-blue-900/40 text-blue-300" : "bg-blue-50/70 border-blue-200 text-blue-900"
              }`}>
                <strong className="block mb-1 font-bold">Recommended Mitigation Strategy:</strong>
                {selectedScenario.bypassStrategy}
              </div>
            </div>

            {/* Action Trigger Button */}
            <div className="pt-4">
              <button
                onClick={handleInject}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                Inject Disruption Into 3D Live Twin & Evaluate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}