"use client";

import React, { useMemo, useState } from "react";
import { Search, Package, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

interface Shipment {
  id: string;
  origin: string;
  dest: string;
  mat: string;
  carrier: string;
  status: "CRITICAL HOLD" | "CONGESTED" | "NOMINAL";
  delay: string;
  eta: string;
}

const SHIPMENTS: Shipment[] = [
  { id: "PO-88219", origin: "Rotterdam", dest: "New York", mat: "Semiconductor Wafers", carrier: "Hapag-Lloyd", status: "CRITICAL HOLD", delay: "+48h", eta: "Aug 31, 2026" },
  { id: "PO-90142", origin: "Frankfurt", dest: "New York", mat: "Automotive ECU Modules", carrier: "Lufthansa Cargo", status: "NOMINAL", delay: "0h", eta: "Aug 29, 2026" },
  { id: "PO-91008", origin: "Shanghai", dest: "Tokyo", mat: "Lithium Power Packs", carrier: "COSCO Line", status: "CONGESTED", delay: "+6h", eta: "Sep 02, 2026" },
  { id: "PO-92411", origin: "Mumbai", dest: "Frankfurt", mat: "Active Medical APIs", carrier: "Emirates Cargo", status: "NOMINAL", delay: "0h", eta: "Aug 30, 2026" },
  { id: "PO-93087", origin: "Singapore", dest: "Los Angeles", mat: "Server Rack Assemblies", carrier: "Maersk Line", status: "CONGESTED", delay: "+9h", eta: "Sep 04, 2026" },
  { id: "PO-93540", origin: "Dubai", dest: "Santos", mat: "Industrial Sensors", carrier: "Emirates Cargo", status: "NOMINAL", delay: "0h", eta: "Sep 01, 2026" },
  { id: "PO-94112", origin: "Tokyo", dest: "Los Angeles", mat: "Precision Optics", carrier: "ONE Line", status: "NOMINAL", delay: "0h", eta: "Sep 03, 2026" },
];

function statusStyle(status: Shipment["status"]) {
  if (status === "CRITICAL HOLD") {
    return {
      color: "var(--color-danger)",
      background: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)",
    };
  }
  if (status === "CONGESTED") {
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

export default function ShipmentsPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHIPMENTS;
    return SHIPMENTS.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.dest.toLowerCase().includes(q) ||
        s.mat.toLowerCase().includes(q) ||
        s.carrier.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="Shipments"
        description="Monitored purchase orders across all active corridors."
        action={
          <div className="relative">
            <label htmlFor="shipment-search" className="sr-only">
              Search purchase orders
            </label>
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={textMuted} aria-hidden="true" />
            <input
              id="shipment-search"
              type="text"
              name="shipmentSearch"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PO, corridor, carrier…"
              className="glass-input rounded-xl pl-8 pr-3 py-2 text-xs w-64 focus:outline-none font-sans"
            />
          </div>
        }
      />

      <div className="px-4 pt-2">
        <div
          className="flex items-center gap-2 text-[11px] font-mono px-3 py-2 rounded-xl"
          style={{ ...textMuted, background: "color-mix(in srgb, var(--color-bg-alt) 55%, transparent)" }}
        >
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Simulated ledger — the backend doesn&apos;t expose a shipments endpoint yet. Wire this to a
          real S/4HANA OData feed (or a new <code>/v1/shipments</code> route) when it&apos;s ready.
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0">
        <div className="glass-card h-full flex flex-col">
          <div className="p-4 pb-2 text-xs font-extrabold flex items-center gap-2 shrink-0" style={textMain}>
            <Package className="w-4 h-4" style={primary} aria-hidden="true" />
            Purchase Order Ledger ({filtered.length})
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] font-bold border-b" style={{ ...textMuted, borderColor: "var(--color-border)" }}>
                  <th className="pb-2 pt-1">PO ID</th>
                  <th className="pb-2 pt-1">CORRIDOR</th>
                  <th className="pb-2 pt-1">COMMODITY</th>
                  <th className="pb-2 pt-1">CARRIER</th>
                  <th className="pb-2 pt-1">ETA</th>
                  <th className="pb-2 pt-1">STATUS</th>
                  <th className="pb-2 pt-1 text-right">IMPACT</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 font-bold" style={primary}>{s.id}</td>
                    <td className="py-2.5" style={textMain}>{s.origin} → {s.dest}</td>
                    <td className="py-2.5 font-sans" style={textMain}>{s.mat}</td>
                    <td className="py-2.5" style={textMuted}>{s.carrier}</td>
                    <td className="py-2.5" style={textMuted}>{s.eta}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={statusStyle(s.status)}>
                        {s.status}
                      </span>
                    </td>
                    <td
                      className="py-2.5 text-right font-bold"
                      style={{ color: s.delay !== "0h" ? "var(--color-danger)" : "var(--color-success)" }}
                    >
                      {s.delay}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center" style={textMuted}>
                      No shipments match &ldquo;{query}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}