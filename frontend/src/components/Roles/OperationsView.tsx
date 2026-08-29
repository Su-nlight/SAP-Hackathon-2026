"use client";

import React, { useState } from "react";
import { Truck, AlertTriangle, ArrowRightLeft, CheckCircle2, Clock, MapPin, Gauge } from "lucide-react";

interface OperationsProps {
  darkMode: boolean;
}

const LIVE_DISPATCHES = [
  { id: "DISP-101", carrier: "DB Schenker", origin: "FRA Terminal", dest: "RTM Seaport", mode: "Rail", status: "Rerouted", speed: "78 km/h", eta: "2h 15m" },
  { id: "DISP-102", carrier: "Lufthansa Cargo", origin: "FRA Hub", dest: "JFK Airport", mode: "Air", status: "In Flight", speed: "840 km/h", eta: "4h 10m" },
  { id: "DISP-103", carrier: "Maersk Line", origin: "SIN Gateway", dest: "PVG Port", mode: "Ocean", status: "Delayed (Congestion)", speed: "14 knots", eta: "18h 40m" },
  { id: "DISP-104", carrier: "Emirates SkyCargo", origin: "DXB Logistics", dest: "FRA Hub", mode: "Air", status: "On Schedule", speed: "810 km/h", eta: "3h 20m" },
];

export default function OperationsView({ darkMode }: OperationsProps) {
  const [selectedRoute, setSelectedRoute] = useState(LIVE_DISPATCHES[0]);

  const getStatusBadge = (status: string) => {
    if (status.includes("Delayed")) {
      return darkMode
        ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
        : "bg-amber-50 text-amber-800 border-amber-200 font-bold";
    }
    if (status.includes("Rerouted")) {
      return darkMode
        ? "bg-blue-950/60 text-blue-300 border-blue-800/60"
        : "bg-blue-50 text-blue-700 border-blue-200 font-bold";
    }
    return darkMode
      ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
      {/* Route Management & Live Telemetry (Col 8) */}
      <div className="col-span-8 flex flex-col gap-4 min-h-0">
        <div className={`flex-1 border rounded-2xl p-5 flex flex-col backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-sm font-extrabold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                <Truck className="w-4 h-4 text-blue-600" />
                Live Fleet & Carrier Dispatch Control
              </div>
              <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Real-time active freight monitoring across multi-modal lanes
              </div>
            </div>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
              darkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              4 ACTIVE CARRIERS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b pb-2 text-[10px] font-bold ${darkMode ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-200"}`}>
                  <th className="pb-2">DISPATCH ID</th>
                  <th className="pb-2">CARRIER</th>
                  <th className="pb-2">CORRIDOR</th>
                  <th className="pb-2">MODE</th>
                  <th className="pb-2">SPEED / RATE</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right">ETA</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-[11px] ${darkMode ? "divide-slate-800/60" : "divide-slate-100"}`}>
                {LIVE_DISPATCHES.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedRoute(d)}
                    className={`cursor-pointer transition ${
                      selectedRoute.id === d.id
                        ? darkMode ? "bg-blue-600/20 text-white" : "bg-blue-50/80 text-slate-900 font-semibold"
                        : darkMode ? "hover:bg-slate-800/40 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <td className="py-3 font-bold text-blue-600">{d.id}</td>
                    <td className="py-3 font-sans font-semibold">{d.carrier}</td>
                    <td className="py-3">{d.origin} → {d.dest}</td>
                    <td className="py-3">{d.mode}</td>
                    <td className="py-3">{d.speed}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] border tracking-tight ${getStatusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-bold ${darkMode ? "text-slate-200" : "text-slate-900"}`}>{d.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lane Health Matrix */}
        <div className={`h-40 border rounded-2xl p-4 flex flex-col backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="text-xs font-bold mb-3 flex items-center justify-between">
            <span className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
              <Gauge className="w-4 h-4 text-emerald-600" />
              Corridor Capacity & Congestion Indices
            </span>
            <span className="text-[10px] font-mono text-slate-400">UPDATED REAL-TIME</span>
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1 font-mono text-xs">
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold">FRA → RTM RAIL SPINE</div>
              <div className="text-emerald-600 font-bold text-base">94% Nominal</div>
              <div className="text-[10px] text-slate-400">Latency: 0.8h delay risk</div>
            </div>
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold">RTM SEAPORT BERTH</div>
              <div className="text-rose-600 font-bold text-base">15% Congested</div>
              <div className="text-[10px] text-slate-400">Crane Strike Active</div>
            </div>
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold">SIN → PVG OCEAN WAY</div>
              <div className="text-amber-600 font-bold text-base">62% Moderate</div>
              <div className="text-[10px] text-slate-400">Port Waiting: +6h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Corridor Override & Telemetry Action Deck (Col 4) */}
      <div className="col-span-4 flex flex-col gap-4 min-h-0">
        <div className={`border rounded-2xl p-5 flex flex-col gap-3.5 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="text-xs font-extrabold flex items-center justify-between">
            <span className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Manual Corridor Override
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
              darkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              OPERATIONS TIER 2
            </span>
          </div>

          <div className={`border p-3.5 rounded-xl space-y-2.5 font-mono text-xs ${
            darkMode ? "bg-[#040812] border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Selected Unit:</span>
              <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{selectedRoute.id}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Carrier Partner:</span>
              <span className={`font-semibold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{selectedRoute.carrier}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Transit Lane:</span>
              <span className="text-blue-600 font-bold">{selectedRoute.origin} → {selectedRoute.dest}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Active Speed:</span>
              <span className="text-emerald-600 font-bold">{selectedRoute.speed}</span>
            </div>
          </div>

          <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25">
            <ArrowRightLeft className="w-4 h-4" />
            Reroute to Secondary Multi-Modal Spine
          </button>
        </div>

        {/* Operational Incident Feed */}
        <div className={`flex-1 border rounded-2xl p-5 flex flex-col min-h-0 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="text-xs font-extrabold mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              Live Operations Incident Stream
            </span>
            <span className="text-[10px] font-mono text-slate-400">REST STREAM</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 text-xs font-mono pr-1">
            <div className={`p-3 rounded-xl border ${darkMode ? "bg-[#040812] border-rose-900/40 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
              <div className="font-bold text-[11px] mb-0.5">⚠️ RTM Marine Crane Outage</div>
              <div className="text-[10px] opacity-90">Shift operations to Rail terminal #4 at Frankfurt.</div>
            </div>
            <div className={`p-3 rounded-xl border ${darkMode ? "bg-[#040812] border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
              <div className="font-bold text-[11px] mb-0.5">ℹ️ Frankfurt Rail Cleared</div>
              <div className="text-[10px] opacity-90">Blockage lifted on south track. Full throughput restored.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}