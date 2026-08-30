"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Radio, Send, CheckCircle2, RotateCcw, AlertOctagon } from "lucide-react";
import {
  DisruptionEventDTO,
  approveDisruption,
  ingestAlert,
  listDisruptions,
  resolveDisruption,
} from "@/app/lib/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/PageHeader";

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

type Filter = "all" | "active" | "resolved";

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === "active") {
    return {
      color: "var(--color-danger)",
      background: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)",
    };
  }
  if (s === "pending_review") {
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

export default function DisruptionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [events, setEvents] = useState<DisruptionEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "all" ? undefined : filter;
      const data = await listDisruptions(status);
      setEvents(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not reach the disruptions service.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void load();
  }, [load]);

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const result = await ingestAlert(rawText.trim());
      setIngestResult(
        result.narrative || "Alert parsed and queued for review."
      );
      setRawText("");
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not parse this alert.";
      setIngestResult(`⚠️ ${message}`);
    } finally {
      setIngesting(false);
    }
  }

  async function handleApprove(id: string) {
    setActionBusyId(id);
    try {
      await approveDisruption(id);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Approval failed.";
      setError(message);
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleResolve(id: string) {
    setActionBusyId(id);
    try {
      await resolveDisruption(id);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Resolve failed.";
      setError(message);
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="Disruptions"
        description="Live disruption feed from the deterministic healing engine — approve, resolve, or ingest a new raw alert."
        action={
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-xl border text-[11px] font-bold"
            style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
          >
            {(["all", "active", "resolved"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg capitalize transition"
                style={
                  filter === f
                    ? { background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))", color: "#fff" }
                    : textMuted
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-4 flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto">
        {/* Raw alert ingestion */}
        <form onSubmit={handleIngest} className="glass-card p-4 flex flex-col gap-3 shrink-0">
          <div className="text-xs font-extrabold flex items-center gap-2" style={textMain}>
            <Radio className="w-4 h-4" style={primary} />
            Ingest Raw Alert (Natural Language)
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder='e.g. "Suez canal blocked by grounded vessel, full closure"'
              className="glass-input flex-1 rounded-xl px-4 py-2.5 text-xs focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={ingesting}
              className="btn-primary px-4 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {ingesting ? "Parsing..." : "Ingest"}
            </button>
          </div>
          {ingestResult && (
            <div className="text-[11px] font-mono p-2.5 rounded-lg" style={{ ...textMuted, background: "color-mix(in srgb, var(--color-bg-alt) 55%, transparent)" }}>
              {ingestResult}
            </div>
          )}
        </form>

        {/* List */}
        <div className="glass-card flex-1 min-h-0 flex flex-col">
          <div className="p-4 pb-2 text-xs font-extrabold flex items-center gap-2 shrink-0" style={textMain}>
            <AlertOctagon className="w-4 h-4" style={{ color: "var(--color-danger)" }} />
            Event Log
          </div>

          {loading && <LoadingState label="Loading disruptions..." />}
          {error && <ErrorState message={error} />}

          {!loading && !error && (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[10px] font-bold border-b" style={{ ...textMuted, borderColor: "var(--color-border)" }}>
                    <th className="pb-2 pt-1">ID</th>
                    <th className="pb-2 pt-1">TYPE</th>
                    <th className="pb-2 pt-1">TARGET</th>
                    <th className="pb-2 pt-1">SEVERITY</th>
                    <th className="pb-2 pt-1">STARTED</th>
                    <th className="pb-2 pt-1">STATUS</th>
                    <th className="pb-2 pt-1 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="py-2.5 font-bold" style={primary}>{ev.id}</td>
                      <td className="py-2.5" style={textMain}>{ev.type}</td>
                      <td className="py-2.5" style={textMuted}>{ev.target_type}:{ev.target_id}</td>
                      <td className="py-2.5 uppercase" style={textMuted}>{ev.severity}</td>
                      <td className="py-2.5" style={textMuted}>{new Date(ev.start_time).toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase" style={statusStyle(ev.status)}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(ev.id)}
                            disabled={actionBusyId === ev.id || ev.status === "resolved"}
                            title="Approve recommended action"
                            className="p-1.5 rounded-lg border disabled:opacity-30"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-success)" }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleResolve(ev.id)}
                            disabled={actionBusyId === ev.id || ev.status === "resolved"}
                            title="Mark resolved"
                            className="p-1.5 rounded-lg border disabled:opacity-30"
                            style={{ borderColor: "var(--color-border)", ...primary }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center" style={textMuted}>
                        No {filter !== "all" ? filter : ""} disruptions on record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}