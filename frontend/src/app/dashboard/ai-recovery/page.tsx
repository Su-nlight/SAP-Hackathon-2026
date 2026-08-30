"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Zap, Loader2, Route, Clock, DollarSign, Leaf, ShieldAlert } from "lucide-react";
import {
  NetworkNodeDTO,
  RouteAlternativeDTO,
  getNetworkGraph,
  optimizeRoute,
} from "@/app/lib/api";
import { PageHeader, ErrorState } from "@/components/PageHeader";

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

type Priority = "low" | "standard" | "high" | "critical";

function defaultDeadline(): string {
  const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16); // datetime-local format
}

export default function AiRecoveryPage() {
  const [nodes, setNodes] = useState<NetworkNodeDTO[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);

  const [shipmentId, setShipmentId] = useState("PO-SIM-001");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoTons, setCargoTons] = useState(20);
  const [budgetPerTon, setBudgetPerTon] = useState(450);
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [priority, setPriority] = useState<Priority>("high");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<RouteAlternativeDTO[] | null>(null);
  const [activeDisruptions, setActiveDisruptions] = useState<string[]>([]);

  const loadNodes = useCallback(async () => {
    setNodesLoading(true);
    try {
      const graph = await getNetworkGraph();
      setNodes(graph.nodes);
      if (graph.nodes.length >= 2) {
        setOrigin((prev) => prev || graph.nodes[0].id);
        setDestination((prev) => prev || graph.nodes[1].id);
      }
    } catch {
      // node picker is a convenience — form still works with manual IDs
    } finally {
      setNodesLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void loadNodes();
  }, [loadNodes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) {
      setError("Select both an origin and a destination node.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setAlternatives(null);
    try {
      const result = await optimizeRoute(
        {
          id: shipmentId || "PO-SIM-001",
          origin,
          destination,
          cargo_tons: cargoTons,
          deadline: new Date(deadline).toISOString(),
          budget_per_ton: budgetPerTon,
          priority,
        },
        3
      );
      setAlternatives(result.alternatives);
      setActiveDisruptions(result.active_disruptions);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Route optimization failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto">
      <PageHeader
        title="AI Recovery"
        description="Compute deterministic top-k reroute alternatives for a shipment via /v1/routes/optimize."
      />

      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Shipment form */}
        <form onSubmit={handleSubmit} className="col-span-4 glass-card p-4 flex flex-col gap-3.5 h-fit">
          <div className="text-xs font-extrabold flex items-center gap-2" style={textMain}>
            <Zap className="w-4 h-4" style={primary} />
            Shipment Parameters
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Shipment ID</label>
            <input
              type="text"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2 text-xs mt-1 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Origin</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                disabled={nodesLoading}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs mt-1 font-mono"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.id} — {n.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Destination</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={nodesLoading}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs mt-1 font-mono"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.id} — {n.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Cargo (tons)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={cargoTons}
                onChange={(e) => setCargoTons(Number(e.target.value))}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Budget / ton</label>
              <input
                type="number"
                min={0}
                step={1}
                value={budgetPerTon}
                onChange={(e) => setBudgetPerTon(Number(e.target.value))}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2 text-xs mt-1 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase" style={textMuted}>Priority</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {(["low", "standard", "high", "critical"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="text-[10px] py-1.5 rounded-lg font-bold capitalize border transition"
                  style={
                    priority === p
                      ? { background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))", color: "#fff", borderColor: "transparent" }
                      : { ...textMuted, borderColor: "var(--color-border)" }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
            {submitting ? "Computing alternatives..." : "Compute Reroute Alternatives"}
          </button>

          {error && <ErrorState message={error} />}
        </form>

        {/* Results */}
        <div className="col-span-8 flex flex-col gap-3">
          {activeDisruptions.length > 0 && (
            <div
              className="glass-card p-3 flex items-center gap-2 text-xs font-mono"
              style={{ color: "var(--color-warning)" }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Computed against {activeDisruptions.length} active disruption(s): {activeDisruptions.join(", ")}
            </div>
          )}

          {alternatives === null && !submitting && (
            <div className="glass-card p-8 text-center text-xs" style={textMuted}>
              Submit the shipment form to compute deterministic reroute alternatives.
            </div>
          )}

          {alternatives?.length === 0 && (
            <div className="glass-card p-8 text-center text-xs" style={textMuted}>
              No feasible alternatives were found for this shipment.
            </div>
          )}

          {alternatives?.map((alt, i) => (
            <div key={alt.route_id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: i === 0 ? "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" : "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)",
                      color: i === 0 ? "#fff" : "var(--color-text-muted)",
                    }}
                  >
                    {i === 0 ? "RECOMMENDED" : `ALT ${i + 1}`}
                  </span>
                  <span className="font-mono text-xs font-bold" style={textMain}>{alt.route_id}</span>
                </div>
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border"
                  style={
                    alt.feasibility === "feasible"
                      ? { color: "var(--color-success)", borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)" }
                      : { color: "var(--color-danger)", borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)" }
                  }
                >
                  {alt.feasibility}
                </span>
              </div>

              <div className="text-xs font-mono mb-3" style={textMuted}>
                {alt.path.join(" → ")}
              </div>

              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1.5" style={textMuted}><Clock className="w-3.5 h-3.5" /> Time</div>
                  <div className="font-bold mt-0.5" style={textMain}>{alt.total_time_hours.toFixed(1)}h</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5" style={textMuted}><DollarSign className="w-3.5 h-3.5" /> Cost/ton</div>
                  <div className="font-bold mt-0.5" style={textMain}>${alt.total_cost_per_ton.toFixed(0)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5" style={textMuted}><ShieldAlert className="w-3.5 h-3.5" /> Risk</div>
                  <div className="font-bold mt-0.5" style={textMain}>{(alt.total_risk * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5" style={textMuted}><Leaf className="w-3.5 h-3.5" /> CO₂/ton</div>
                  <div className="font-bold mt-0.5" style={textMain}>{alt.total_co2_per_ton.toFixed(1)}kg</div>
                </div>
              </div>

              {(alt.delta_time_hours !== null || alt.delta_cost_per_ton !== null) && (
                <div className="mt-2.5 text-[11px] font-mono" style={textMuted}>
                  Δ vs baseline: {alt.delta_time_hours !== null && `${alt.delta_time_hours > 0 ? "+" : ""}${alt.delta_time_hours.toFixed(1)}h`}
                  {alt.delta_cost_per_ton !== null && ` · ${alt.delta_cost_per_ton > 0 ? "+" : ""}$${alt.delta_cost_per_ton.toFixed(0)}/ton`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}