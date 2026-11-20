"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Server,
  Key,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  Check,
  Copy
} from "lucide-react";

interface AuditEntry {
  id: string;
  event: string;
  target: string;
  user: string;
  time: string;
  status: "SUCCESS" | "200 OK" | "CRITICAL" | "ENCRYPTED" | "MODIFIED";
}

const INITIAL_AUDIT_LOGS: AuditEntry[] = [
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
  if (status.includes("ENCRYPTED") || status.includes("MODIFIED")) {
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "all";

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [latency, setLatency] = useState(12);
  const [apiKey, setApiKey] = useState("••••••••••••94f2");
  const [copiedKey, setCopiedKey] = useState(false);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(INITIAL_AUDIT_LOGS);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "info" } | null>(null);

  function triggerSync() {
    setIsSyncing(true);
    setFeedback({ message: "Initiating live handshake with SAP S/4HANA OData Gateway...", type: "info" });

    setTimeout(() => {
      const newLatency = Math.floor(9 + Math.random() * 8);
      setLatency(newLatency);

      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const logId = `LOG-${Math.floor(4092 + Math.random() * 900)}`;

      setAuditLogs((prev) => [
        {
          id: logId,
          event: "Manual OData Feed Synced",
          target: "SAP S/4HANA (EU-WEST)",
          user: "ADMIN_ROOT",
          time: timeStr,
          status: "200 OK",
        },
        ...prev,
      ]);

      setIsSyncing(false);
      setFeedback({ message: `S/4HANA stream verified. Sync latency: ${newLatency} ms.`, type: "success" });
      setTimeout(() => setFeedback(null), 4500);
    }, 1100);
  }

  function triggerRotateKeys() {
    setIsRotating(true);
    setFeedback({ message: "Re-encrypting production secret keyrings...", type: "info" });

    setTimeout(() => {
      const newSuffix = Math.random().toString(16).substring(2, 6);
      setApiKey(`••••••••••••${newSuffix}`);

      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const logId = `LOG-${Math.floor(4092 + Math.random() * 900)}`;

      setAuditLogs((prev) => [
        {
          id: logId,
          event: "Tenant Keypair Rotated",
          target: "PROD_CLIENT_KEY",
          user: "ADMIN_ROOT",
          time: timeStr,
          status: "MODIFIED",
        },
        ...prev,
      ]);

      setIsRotating(false);
      setFeedback({ message: `Production secrets rotated successfully. Active hash: ...${newSuffix}`, type: "success" });
      setTimeout(() => setFeedback(null), 4500);
    }, 900);
  }

  function copyKeyToClipboard() {
    navigator.clipboard.writeText("sk_live_sap_prod_eu9921_fe09a34199");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.id.toLowerCase().includes(auditQuery.toLowerCase()) ||
      l.event.toLowerCase().includes(auditQuery.toLowerCase()) ||
      l.target.toLowerCase().includes(auditQuery.toLowerCase()) ||
      l.user.toLowerCase().includes(auditQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-3.5 min-h-0">
      {feedback && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border glass text-xs font-mono transition-all">
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span style={textMain}>{feedback.message}</span>
        </div>
      )}

      {/* Module Tabs Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass border" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => router.push("/dashboard?role=Admin&tab=all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "all" ? "bg-white/10 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            All Modules
          </button>
          <button
            onClick={() => router.push("/dashboard?role=Admin&tab=sync")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "sync" ? "bg-sky-500/20 text-sky-400 font-bold border border-sky-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            SAP Gateway Sync
          </button>
          <button
            onClick={() => router.push("/dashboard?role=Admin&tab=keyrings")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "keyrings" ? "bg-purple-500/20 text-purple-400 font-bold border border-purple-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Tenant Keyrings
          </button>
          <button
            onClick={() => router.push("/dashboard?role=Admin&tab=audit")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "audit" ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Audit Trail
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
          STATUS: <span className="text-emerald-400 font-bold">ONLINE (mTLS ENCRYPTED)</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3.5 min-h-0">
        {/* Module 1: S/4HANA OData */}
        {(activeTab === "all" || activeTab === "sync") && (
          <div className={`${activeTab === "sync" ? "col-span-12" : "col-span-12 lg:col-span-8"} flex flex-col gap-3.5 min-h-0`}>
            <div className="glass-card p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-sm font-extrabold flex items-center gap-2" style={textMain}>
                    <Server className="w-4 h-4 text-sky-400" />
                    SAP S/4HANA & OData Gateway Integration
                  </div>
                  <div className="text-xs" style={textMuted}>
                    Tenant health, database telemetry, and ERP sync pipeline
                  </div>
                </div>
                <button
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 btn-primary font-bold rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing Feed…" : "Sync S/4HANA Feed"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div
                  className="p-3 rounded-lg border transition-all"
                  style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
                >
                  <div className="text-[10px] font-semibold" style={textMuted}>DATABASE LATENCY</div>
                  <div className="font-bold text-base mt-1 flex items-center gap-2" style={{ color: "var(--color-success)" }}>
                    <span className="tabular-nums">{latency} ms</span>
                    {isSyncing && <span className="text-[10px] opacity-60">syncing...</span>}
                  </div>
                  <div className="text-[10px]" style={textMuted}>PostgreSQL Cloud</div>
                </div>
                <div
                  className="p-3 rounded-lg border"
                  style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
                >
                  <div className="text-[10px] font-semibold" style={textMuted}>SAP ODATA PROTOCOL</div>
                  <div className="font-bold text-base mt-1" style={{ color: "var(--color-primary)" }}>v4.0.1 Live</div>
                  <div className="text-[10px]" style={textMuted}>REST stream valid</div>
                </div>
                <div
                  className="p-3 rounded-lg border"
                  style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
                >
                  <div className="text-[10px] font-semibold" style={textMuted}>SECURITY PROTOCOL</div>
                  <div className="font-bold text-base mt-1" style={{ color: "var(--color-secondary)" }}>mTLS + OAuth2</div>
                  <div className="text-[10px]" style={textMuted}>Zero-trust active</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module 2: Keyrings */}
        {(activeTab === "all" || activeTab === "keyrings") && (
          <div className={`${activeTab === "keyrings" ? "col-span-12" : "col-span-12 lg:col-span-4"} flex flex-col gap-3.5 min-h-0`}>
            <div className="glass-card p-4 flex flex-col gap-3.5">
              <div className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: "var(--color-secondary)" }}>
                <Key className="w-4 h-4" />
                Tenant Keyrings & Secrets
              </div>

              <div
                className="border p-3.5 rounded-lg space-y-2.5 font-mono text-xs"
                style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)", ...textMain }}
              >
                <div className="flex justify-between items-center">
                  <span style={textMuted}>Tenant ID:</span>
                  <span className="font-bold tabular-nums" style={textMain}>SAP-PROD-EU-9921</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textMuted}>API Key:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wider" style={{ color: "var(--color-secondary)" }}>
                      {apiKey}
                    </span>
                    <button onClick={copyKeyToClipboard} className="p-1 rounded hover:bg-white/10 transition cursor-pointer">
                      {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textMuted}>Vector DB:</span>
                  <span className="font-bold" style={{ color: "var(--color-success)" }}>ChromaDB Sync</span>
                </div>
              </div>

              <button
                onClick={triggerRotateKeys}
                disabled={isRotating}
                className="w-full py-2.5 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition glass hover:opacity-80 disabled:opacity-50 cursor-pointer"
                style={textMain}
              >
                <Lock className={`w-3.5 h-3.5 ${isRotating ? "animate-pulse" : ""}`} />
                {isRotating ? "Generating Keypair…" : "Rotate Production Secrets"}
              </button>
            </div>
          </div>
        )}

        {/* Module 3: Immutable System Audit Trail */}
        {(activeTab === "all" || activeTab === "audit") && (
          <div className="col-span-12 flex flex-col gap-3.5 min-h-0 flex-1">
            <div className="flex-1 glass-card p-4 flex flex-col min-h-0">
              <div className="text-xs font-extrabold mb-2.5 flex items-center justify-between flex-wrap gap-2" style={textMain}>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Immutable System Audit Trail</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search log events, IDs…"
                      value={auditQuery}
                      onChange={(e) => setAuditQuery(e.target.value)}
                      className="pl-8 pr-3 py-1 rounded-lg border bg-black/20 dark:bg-slate-900/60 border-slate-700/60 text-xs font-mono outline-none text-slate-200 focus:border-sky-400"
                    />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded border border-slate-700/60 bg-slate-800/40 tabular-nums" style={textMuted}>
                    {filteredLogs.length} LOGS
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto font-mono text-xs pr-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b pb-1.5 text-[10px] font-bold" style={{ ...textMuted, borderColor: "var(--color-border)" }}>
                      <th className="pb-1.5">LOG ID</th>
                      <th className="pb-1.5">EVENT</th>
                      <th className="pb-1.5">TARGET / CONTEXT</th>
                      <th className="pb-1.5">ACTOR</th>
                      <th className="pb-1.5">STATUS</th>
                      <th className="pb-1.5 text-right">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2 font-bold tabular-nums" style={{ color: "var(--color-primary)" }}>{log.id}</td>
                        <td className="py-2 font-sans font-semibold" style={textMain}>{log.event}</td>
                        <td className="py-2" style={textMuted}>{log.target}</td>
                        <td className="py-2" style={textMuted}>{log.user}</td>
                        <td className="py-2">
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] border tracking-tight"
                            style={statusStyle(log.status)}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums" style={textMuted}>{log.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}