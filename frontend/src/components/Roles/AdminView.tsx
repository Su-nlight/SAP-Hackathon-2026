"use client";

import React, { useState } from "react";
import { Server, Key, RefreshCw, Lock } from "lucide-react";

const AUDIT_LOGS = [
  { id: "LOG-4091", event: "Auto-Healer Triggered", target: "PO-88219 (FRA Rail Bypass)", user: "SYSTEM/DAEMON", time: "14:22:01", status: "SUCCESS" },
  { id: "LOG-4090", event: "OData Feed Synced", target: "SAP S/4HANA (EU-WEST)", user: "ODATA_CONNECTOR", time: "14:20:00", status: "200 OK" },
  { id: "LOG-4089", event: "Disruption Detected", target: "Rotterdam Port (RTM Strike)", user: "WEATHER_API", time: "14:15:33", status: "CRITICAL" },
  { id: "LOG-4088", event: "Tenant Key Rotated", target: "PROD_CLIENT_KEY", user: "ADMIN_ROOT", time: "12:00:10", status: "ENCRYPTED" },
];

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };

function statusStyle(status: string) {
  if (status.includes("CRITICAL")) {
    return {
      color: "var(--color-danger)",
      background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-danger) 35%, transparent)",
    };
  }
  if (status.includes("ENCRYPTED")) {
    return {
      color: "var(--color-secondary)",
      background: "color-mix(in srgb, var(--color-secondary) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-secondary) 35%, transparent)",
    };
  }
  return {
    color: "var(--color-success)",
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-success) 35%, transparent)",
  };
}

export default function AdminView() {
  const [isSyncing, setIsSyncing] = useState(false);

  function triggerSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 900);
  }

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
      {/* System Connectors & OData Health */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
        <div className="glass-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2" style={textMain}>
                <Server className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                SAP S/4HANA & OData Gateway Integration
              </div>
              <div className="text-xs" style={textMuted}>
                Tenant health, database telemetry, and ERP sync pipeline
              </div>
            </div>
            <button
              onClick={triggerSync}
              className="px-4 py-2 btn-primary font-bold rounded-xl text-xs flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isSyncing ? "Syncing…" : "Sync S/4HANA Feed"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div
              className="p-3.5 rounded-xl border"
              style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
            >
              <div className="text-[10px] font-semibold" style={textMuted}>DATABASE LATENCY</div>
              <div className="font-bold text-base mt-1" style={{ color: "var(--color-success)" }}>12 ms</div>
              <div className="text-[10px]" style={textMuted}>PostgreSQL Cloud</div>
            </div>
            <div
              className="p-3.5 rounded-xl border"
              style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
            >
              <div className="text-[10px] font-semibold" style={textMuted}>SAP ODATA PROTOCOL</div>
              <div className="font-bold text-base mt-1" style={{ color: "var(--color-primary)" }}>v4.0.1 Live</div>
              <div className="text-[10px]" style={textMuted}>REST stream valid</div>
            </div>
            <div
              className="p-3.5 rounded-xl border"
              style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
            >
              <div className="text-[10px] font-semibold" style={textMuted}>SECURITY PROTOCOL</div>
              <div className="font-bold text-base mt-1" style={{ color: "var(--color-secondary)" }}>mTLS + OAuth2</div>
              <div className="text-[10px]" style={textMuted}>Zero-trust active</div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 glass-card p-5 flex flex-col min-h-0">
          <div className="text-xs font-extrabold mb-3 flex items-center justify-between" style={textMain}>
            <span>Immutable System Audit Trail</span>
            <span className="text-[10px] font-mono" style={textMuted}>REST LOG PIPE</span>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b pb-2 text-[10px] font-bold" style={{ ...textMuted, borderColor: "var(--color-border)" }}>
                  <th className="pb-2">LOG ID</th>
                  <th className="pb-2">EVENT</th>
                  <th className="pb-2">TARGET / CONTEXT</th>
                  <th className="pb-2">ACTOR</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                {AUDIT_LOGS.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 font-bold" style={{ color: "var(--color-primary)" }}>{log.id}</td>
                    <td className="py-2.5 font-sans font-semibold" style={textMain}>{log.event}</td>
                    <td className="py-2.5" style={textMuted}>{log.target}</td>
                    <td className="py-2.5" style={textMuted}>{log.user}</td>
                    <td className="py-2.5">
                      <span
                        className="px-2.5 py-0.5 rounded-md text-[10px] border tracking-tight"
                        style={statusStyle(log.status)}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold" style={textMuted}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tenant Security & Config */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
        <div className="glass-card p-5 flex flex-col gap-4">
          <div className="text-xs font-extrabold flex items-center gap-2" style={{ color: "var(--color-secondary)" }}>
            <Key className="w-4 h-4" aria-hidden="true" />
            Tenant Keyrings & Secrets
          </div>

          <div
            className="border p-4 rounded-xl space-y-3 font-mono text-xs"
            style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)", ...textMain }}
          >
            <div className="flex justify-between">
              <span style={textMuted}>Tenant ID:</span>
              <span className="font-bold" style={textMain}>SAP-PROD-EU-9921</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>API Key:</span>
              <span className="font-bold" style={{ color: "var(--color-secondary)" }}>••••••••••••94f2</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Vector Store:</span>
              <span className="font-bold" style={{ color: "var(--color-success)" }}>ChromaDB Sync</span>
            </div>
          </div>

          <button
            className="w-full py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition glass hover:opacity-80"
            style={textMain}
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Rotate Production Secrets
          </button>
        </div>
      </div>
    </div>
  );
}
