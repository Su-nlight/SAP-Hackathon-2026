"use client";

import React, { useState } from "react";
import { Database, ShieldAlert, Key, Server, RefreshCw, CheckCircle2, Lock } from "lucide-react";

interface AdminProps {
  darkMode: boolean;
}

const AUDIT_LOGS = [
  { id: "LOG-4091", event: "Auto-Healer Triggered", target: "PO-88219 (FRA Rail Bypass)", user: "SYSTEM/DAEMON", time: "14:22:01", status: "SUCCESS" },
  { id: "LOG-4090", event: "OData Feed Synced", target: "SAP S/4HANA (EU-WEST)", user: "ODATA_CONNECTOR", time: "14:20:00", status: "200 OK" },
  { id: "LOG-4089", event: "Disruption Detected", target: "Rotterdam Port (RTM Strike)", user: "WEATHER_API", time: "14:15:33", status: "CRITICAL" },
  { id: "LOG-4088", event: "Tenant Key Rotated", target: "PROD_CLIENT_KEY", user: "ADMIN_ROOT", time: "12:00:10", status: "ENCRYPTED" },
];

export default function AdminView({ darkMode }: AdminProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  function triggerSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 900);
  }

  const getStatusBadge = (status: string) => {
    if (status.includes("CRITICAL")) {
      return darkMode
        ? "bg-rose-950/60 text-rose-300 border-rose-800/60"
        : "bg-rose-50 text-rose-700 border-rose-200 font-bold";
    }
    if (status.includes("ENCRYPTED")) {
      return darkMode
        ? "bg-purple-950/60 text-purple-300 border-purple-800/60"
        : "bg-purple-50 text-purple-700 border-purple-200 font-bold";
    }
    return darkMode
      ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
      {/* System Connectors & OData Health (Col 8) */}
      <div className="col-span-8 flex flex-col gap-4 min-h-0">
        <div className={`border rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm font-extrabold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                <Server className="w-4 h-4 text-blue-600" />
                SAP S/4HANA & OData Gateway Integration
              </div>
              <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Tenant health, database telemetry, and real-time ERP sync pipeline
              </div>
            </div>
            <button
              onClick={triggerSync}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-md shadow-blue-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing ERP..." : "Sync S/4HANA Feed"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div className={`p-3.5 rounded-xl border ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold">DATABASE LATENCY</div>
              <div className="text-emerald-600 font-bold text-base mt-1">12 ms</div>
              <div className="text-[10px] text-slate-400">PostgreSQL Cloud</div>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold">SAP ODATA PROTOCOL</div>
              <div className="text-blue-600 font-bold text-base mt-1">v4.0.1 Live</div>
              <div className="text-[10px] text-slate-400">REST Stream Valid</div>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? "bg-[#040812] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold">SECURITY PROTOCOL</div>
              <div className="text-purple-600 font-bold text-base mt-1">mTLS + OAuth2</div>
              <div className="text-[10px] text-slate-400">Zero-Trust Active</div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className={`flex-1 border rounded-2xl p-5 flex flex-col min-h-0 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className={`text-xs font-extrabold mb-3 flex items-center justify-between ${darkMode ? "text-white" : "text-slate-900"}`}>
            <span>Immutable System Audit Trail</span>
            <span className="text-[10px] font-mono text-slate-400">REST LOG PIPE</span>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b pb-2 text-[10px] font-bold ${darkMode ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-200"}`}>
                  <th className="pb-2">LOG ID</th>
                  <th className="pb-2">EVENT</th>
                  <th className="pb-2">TARGET / CONTEXT</th>
                  <th className="pb-2">ACTOR</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-[11px] ${darkMode ? "divide-slate-800/60" : "divide-slate-100"}`}>
                {AUDIT_LOGS.map((log) => (
                  <tr key={log.id} className={darkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}>
                    <td className="py-2.5 font-bold text-blue-600">{log.id}</td>
                    <td className={`py-2.5 font-sans font-semibold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{log.event}</td>
                    <td className={`py-2.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{log.target}</td>
                    <td className={`py-2.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{log.user}</td>
                    <td className="py-2.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] border tracking-tight ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className={`py-2.5 text-right font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tenant Security & Config (Col 4) */}
      <div className="col-span-4 flex flex-col gap-4 min-h-0">
        <div className={`border rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="text-xs font-extrabold flex items-center gap-2 text-purple-600">
            <Key className="w-4 h-4" />
            Tenant Keyrings & Secrets
          </div>

          <div className={`border p-4 rounded-xl space-y-3 font-mono text-xs ${
            darkMode ? "bg-[#040812] border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Tenant ID:</span>
              <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>SAP-PROD-EU-9921</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>API Key:</span>
              <span className="text-purple-600 font-bold">••••••••••••94f2</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>RAG Vector Store:</span>
              <span className="text-emerald-600 font-bold">ChromaDB Sync</span>
            </div>
          </div>

          <button className={`w-full py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition border ${
            darkMode ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm"
          }`}>
            <Lock className="w-3.5 h-3.5" />
            Rotate Production Secrets
          </button>
        </div>
      </div>
    </div>
  );
}