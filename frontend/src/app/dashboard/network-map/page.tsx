"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Globe2, Server, ShieldCheck, WifiOff } from "lucide-react";
import { NodePoint, RouteLink } from "@/components/Network3D";
import {
  NetworkEdgeDTO,
  NetworkHealthDTO,
  NetworkNodeDTO,
  getNetworkGraph,
  getNetworkHealth,
} from "@/app/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { PageHeader, LoadingState, ErrorState } from "@/components/PageHeader";

const Network3D = dynamic(() => import("@/components/Network3D"), { ssr: false });

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

function toNodeStatus(status: string): NodePoint["status"] {
  if (status === "offline") return "disrupted";
  if (status === "degraded") return "degraded";
  return "active";
}

function toNodeCapacity(status: string): number {
  if (status === "offline") return 0.12;
  if (status === "degraded") return 0.5;
  return 0.88;
}

function toEdgeStatus(status: string | undefined): RouteLink["status"] {
  if (status === "offline" || status === "blocked") return "blocked";
  if (status === "degraded" || status === "congested") return "congested";
  return "active";
}

function mapNodes(nodes: NetworkNodeDTO[]): NodePoint[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    city: n.id,
    lat: n.lat,
    lng: n.lon,
    status: toNodeStatus(n.status),
    capacity: toNodeCapacity(n.status),
  }));
}

function mapEdges(edges: NetworkEdgeDTO[]): RouteLink[] {
  return edges.map((e) => ({
    from: e.source,
    to: e.target,
    status: toEdgeStatus(e.status),
    carrier: e.mode,
  }));
}

export default function NetworkMapPage() {
  const { isDark } = useTheme();
  const [rawNodes, setRawNodes] = useState<NetworkNodeDTO[]>([]);
  const [rawEdges, setRawEdges] = useState<NetworkEdgeDTO[]>([]);
  const [health, setHealth] = useState<NetworkHealthDTO | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [graph, h] = await Promise.all([getNetworkGraph(), getNetworkHealth()]);
      setRawNodes(graph.nodes);
      setRawEdges(graph.edges);
      setHealth(h);
      setSelectedId((prev) => prev ?? graph.nodes[0]?.id ?? null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not reach the network service.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void load();
  }, [load]);

  const nodes = useMemo(() => mapNodes(rawNodes), [rawNodes]);
  const routes = useMemo(() => mapEdges(rawEdges), [rawEdges]);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="Network Map"
        description="Live topology pulled from /v1/network/graph, rendered on the 3D digital twin."
      />

      {loading && <LoadingState label="Loading network graph…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <>
          {/* Health strip */}
          {health && (
            <div className="px-4 pb-2 flex flex-wrap items-center gap-4 text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4" style={primary} aria-hidden="true" />
                <span style={textMuted}>Nodes:</span>
                <strong style={textMain}>{health.node_count}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" style={primary} aria-hidden="true" />
                <span style={textMuted}>Edges:</span>
                <strong style={textMain}>{health.edge_count}</strong>
              </div>
              <div className="flex items-center gap-2">
                {health.healthy ? (
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--color-success)" }} aria-hidden="true" />
                ) : (
                  <WifiOff className="w-4 h-4" style={{ color: "var(--color-danger)" }} aria-hidden="true" />
                )}
                <span style={textMuted}>Status:</span>
                <strong style={{ color: health.healthy ? "var(--color-success)" : "var(--color-danger)" }}>
                  {health.healthy ? "Healthy" : `${health.active_disruptions} active disruption(s)`}
                </strong>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold"
                style={
                  health.sap.connected
                    ? { color: "var(--color-success)", borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)" }
                    : { color: "var(--color-text-muted)", borderColor: "var(--color-border)" }
                }
              >
                SAP {health.sap.connected ? "CONNECTED" : "OFFLINE"} · {health.sap.provider}
              </div>
            </div>
          )}

          <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
            {/* 3D Visualizer */}
            <div
              className="col-span-12 lg:col-span-8 relative min-h-[320px] lg:min-h-0 rounded-2xl border glass overflow-hidden transition-colors duration-300"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Network3D
                nodes={nodes}
                routes={routes}
                selectedNode={selectedNode}
                onSelectNode={(n) => setSelectedId(n?.id ?? null)}
                darkMode={isDark}
              />
            </div>

            {/* Node list */}
            <div className="col-span-12 lg:col-span-4 glass-card p-4 flex flex-col min-h-[260px] lg:min-h-0">
              <div className="text-xs font-extrabold mb-2.5" style={textMain}>
                All Nodes ({nodes.length})
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {nodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition"
                    style={
                      selectedId === n.id
                        ? {
                            background: "color-mix(in srgb, var(--color-primary) 16%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)",
                          }
                        : { border: "1px solid transparent" }
                    }
                  >
                    <div>
                      <div className="font-bold" style={textMain}>{n.name}</div>
                      <div className="font-mono text-[10px]" style={textMuted}>
                        {n.id} · {n.lat.toFixed(1)}°, {n.lng.toFixed(1)}°
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border shrink-0"
                      style={
                        n.status === "disrupted"
                          ? { color: "var(--color-danger)", borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)" }
                          : n.status === "degraded"
                          ? { color: "var(--color-warning)", borderColor: "color-mix(in srgb, var(--color-warning) 40%, transparent)" }
                          : { color: "var(--color-success)", borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)" }
                      }
                    >
                      {n.status}
                    </span>
                  </button>
                ))}
                {nodes.length === 0 && (
                  <p className="text-xs" style={textMuted}>No nodes returned by the network service.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}