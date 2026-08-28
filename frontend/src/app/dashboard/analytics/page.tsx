"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, PlayCircle, Loader2, ListTree, CheckCircle2 } from "lucide-react";
import { ScenarioSummary, listScenarios, runScenario } from "@/app/lib/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/PageHeader";

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

interface RunLogEntry {
  scenarioName: string;
  injectedCount: number;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listScenarios();
      setScenarios(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not reach the scenario service.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void load();
  }, [load]);

  async function handleRun(scenarioId: string) {
    setRunningId(scenarioId);
    try {
      const result = await runScenario(scenarioId);
      setRunLog((prev) => [
        {
          scenarioName: result.name ?? scenarioId,
          injectedCount: Array.isArray(result.injected) ? result.injected.length : 0,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Scenario run failed.";
      setError(message);
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto">
      <PageHeader
        title="Analytics"
        description="Canned disruption playbooks — replay a scenario end-to-end via /v1/scenarios/run."
      />

      {loading && <LoadingState label="Loading scenario library..." />}
      {error && <ErrorState message={error} />}

      {!loading && (
        <div className="p-4 grid grid-cols-12 gap-4">
          {/* Scenario library */}
          <div className="col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
            {scenarios.map((s) => (
              <div key={s.id} className="glass-card p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold" style={textMain}>
                  <BarChart3 className="w-4 h-4" style={primary} />
                  {s.name ?? s.id}
                </div>
                <p className="text-[11px] leading-relaxed flex-1" style={textMuted}>
                  {s.description ?? "No description provided."}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono flex items-center gap-1" style={textMuted}>
                    <ListTree className="w-3 h-3" />
                    {s.steps?.length ?? 0} step(s)
                  </span>
                  <button
                    onClick={() => handleRun(s.id)}
                    disabled={runningId === s.id}
                    className="btn-primary px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {runningId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                    {runningId === s.id ? "Running..." : "Run Scenario"}
                  </button>
                </div>
              </div>
            ))}
            {scenarios.length === 0 && !error && (
              <div className="glass-card p-8 text-center text-xs col-span-2" style={textMuted}>
                No scenarios found in the scenario library.
              </div>
            )}
          </div>

          {/* Run log */}
          <div className="col-span-4 glass-card p-4 flex flex-col min-h-0">
            <div className="text-xs font-extrabold mb-2.5" style={textMain}>Session Run Log</div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {runLog.map((entry, i) => (
                <div
                  key={i}
                  className="text-[11px] font-mono p-2.5 rounded-lg flex items-start gap-2"
                  style={{ background: "color-mix(in srgb, var(--color-bg-alt) 55%, transparent)" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} />
                  <div>
                    <div className="font-bold" style={textMain}>{entry.scenarioName}</div>
                    <div style={textMuted}>{entry.injectedCount} event(s) injected · {entry.timestamp}</div>
                  </div>
                </div>
              ))}
              {runLog.length === 0 && (
                <p className="text-xs" style={textMuted}>Run a scenario to see it logged here.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}