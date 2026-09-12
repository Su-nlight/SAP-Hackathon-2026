"use client";

import React, { useState } from "react";
import { Truck, AlertTriangle, ArrowRightLeft, Gauge } from "lucide-react";

const LIVE_DISPATCHES = [
  { id: "DISP-101", carrier: "DB Schenker", origin: "FRA Terminal", dest: "RTM Seaport", mode: "Rail", status: "Rerouted", speed: "78 km/h", eta: "2h 15m" },
  { id: "DISP-102", carrier: "Lufthansa Cargo", origin: "FRA Hub", dest: "JFK Airport", mode: "Air", status: "In Flight", speed: "840 km/h", eta: "4h 10m" },
  { id: "DISP-103", carrier: "Maersk Line", origin: "SIN Gateway", dest: "PVG Port", mode: "Ocean", status: "Delayed (Congestion)", speed: "14 knots", eta: "18h 40m" },
  { id: "DISP-104", carrier: "Emirates SkyCargo", origin: "DXB Logistics", dest: "FRA Hub", mode: "Air", status: "On Schedule", speed: "810 km/h", eta: "3h 20m" },
];

const CORRIDORS = [
  { label: "FRA → RTM RAIL SPINE", value: "94% Nominal", note: "0.8h delay risk", tone: "success" as const },
  { label: "RTM SEAPORT BERTH", value: "15% Congested", note: "Crane strike active", tone: "danger" as const },
  { label: "SIN → PVG OCEAN WAY", value: "62% Moderate", note: "Port waiting: +6h", tone: "warning" as const },
];

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };

function statusStyle(status: string) {
  if (status.includes("Delayed")) {
    return {
      color: "var(--color-warning)",
      background: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
    };
  }
  if (status.includes("Rerouted")) {
    return {
      color: "var(--color-primary)",
      background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
    };
  }
  return {
    color: "var(--color-success)",
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-success) 35%, transparent)",
  };
}

function toneColor(tone: "success" | "danger" | "warning") {
  return `var(--color-${tone})`;
}

export default function OperationsView() {
  const [selectedRoute, setSelectedRoute] = useState(LIVE_DISPATCHES[0]);

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
      {/* Route Management & Live Telemetry */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
        <div className="flex-1 glass-card p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2" style={textMain}>
                <Truck className="w-4 h-4" style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                Live Fleet & Carrier Dispatch Control
              </div>
              <div className="text-xs" style={textMuted}>
                Real-time active freight monitoring across multi-modal lanes
              </div>
            </div>
            <span
              className="text-xs font-mono font-bold px-3 py-1 rounded-full border"
              style={{
                color: "var(--color-success)",
                background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-success) 35%, transparent)",
              }}
            >
              4 ACTIVE CARRIERS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b pb-2 text-[10px] font-bold" style={{ ...textMuted, borderColor: "var(--color-border)" }}>
                  <th className="pb-2">DISPATCH ID</th>
                  <th className="pb-2">CARRIER</th>
                  <th className="pb-2">CORRIDOR</th>
                  <th className="pb-2">MODE</th>
                  <th className="pb-2">SPEED / RATE</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                {LIVE_DISPATCHES.map((d) => {
                  const isSelected = selectedRoute.id === d.id;
                  return (
                    <tr
                      key={d.id}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      aria-label={`Select dispatch ${d.id}, ${d.carrier}, ${d.origin} to ${d.dest}`}
                      onClick={() => setSelectedRoute(d)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedRoute(d);
                        }
                      }}
                      className="cursor-pointer transition focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        ...(isSelected
                          ? { background: "color-mix(in srgb, var(--color-primary) 14%, transparent)", ...textMain, fontWeight: 600 }
                          : textMuted),
                        ["--tw-ring-color" as string]: "var(--color-primary)",
                      }}
                    >
                      <td className="py-3 font-bold" style={{ color: "var(--color-primary)" }}>{d.id}</td>
                      <td className="py-3 font-sans font-semibold" style={textMain}>{d.carrier}</td>
                      <td className="py-3">{d.origin} → {d.dest}</td>
                      <td className="py-3">{d.mode}</td>
                      <td className="py-3">{d.speed}</td>
                      <td className="py-3">
                        <span
                          className="px-2.5 py-1 rounded-md text-[10px] border tracking-tight"
                          style={statusStyle(d.status)}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold" style={textMain}>{d.eta}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lane Health Matrix */}
        <div className="glass-card p-4 flex flex-col">
          <div className="text-xs font-bold mb-3 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2" style={textMain}>
              <Gauge className="w-4 h-4" style={{ color: "var(--color-success)" }} aria-hidden="true" />
              Corridor Capacity & Congestion Indices
            </span>
            <span className="text-[10px] font-mono" style={textMuted}>UPDATED REAL-TIME</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            {CORRIDORS.map((c) => (
              <div
                key={c.label}
                className="p-3 rounded-xl border flex flex-col justify-between gap-1"
                style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
              >
                <div className="text-[10px] font-semibold" style={textMuted}>{c.label}</div>
                <div className="font-bold text-base" style={{ color: toneColor(c.tone) }}>{c.value}</div>
                <div className="text-[10px]" style={textMuted}>{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Corridor Override & Incident Feed */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
        <div className="glass-card p-5 flex flex-col gap-3.5">
          <div className="text-xs font-extrabold flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2" style={textMain}>
              <ArrowRightLeft className="w-4 h-4" style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              Manual Corridor Override
            </span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold"
              style={{
                color: "var(--color-primary)",
                background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
              }}
            >
              OPERATIONS TIER 2
            </span>
          </div>

          <div
            className="border p-3.5 rounded-xl space-y-2.5 font-mono text-xs"
            style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
          >
            <div className="flex justify-between">
              <span style={textMuted}>Selected Unit:</span>
              <span className="font-bold" style={textMain}>{selectedRoute.id}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Carrier Partner:</span>
              <span className="font-semibold" style={textMain}>{selectedRoute.carrier}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Transit Lane:</span>
              <span className="font-bold" style={{ color: "var(--color-primary)" }}>{selectedRoute.origin} → {selectedRoute.dest}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Active Speed:</span>
              <span className="font-bold" style={{ color: "var(--color-success)" }}>{selectedRoute.speed}</span>
            </div>
          </div>

          <button className="w-full py-3 btn-primary font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition">
            <ArrowRightLeft className="w-4 h-4" aria-hidden="true" />
            Reroute to Secondary Multi-Modal Spine
          </button>
        </div>

        {/* Operational Incident Feed */}
        <div className="flex-1 glass-card p-5 flex flex-col min-h-0">
          <div className="text-xs font-extrabold mb-3 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2" style={{ color: "var(--color-danger)" }}>
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Live Operations Incident Stream
            </span>
            <span className="text-[10px] font-mono" style={textMuted}>REST STREAM</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 text-xs font-mono pr-1">
            <div
              className="p-3 rounded-xl border"
              style={{
                color: "var(--color-danger)",
                background: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)",
              }}
            >
              <div className="font-bold text-[11px] mb-0.5">RTM Marine Crane Outage</div>
              <div className="text-[10px] opacity-90">Shift operations to Rail terminal #4 at Frankfurt.</div>
            </div>
            <div
              className="p-3 rounded-xl border"
              style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)", ...textMain }}
            >
              <div className="font-bold text-[11px] mb-0.5">Frankfurt Rail Cleared</div>
              <div className="text-[10px] opacity-90" style={textMuted}>Blockage lifted on south track. Full throughput restored.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
