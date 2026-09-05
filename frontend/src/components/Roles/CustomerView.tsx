"use client";

import React, { useState } from "react";
import { Search, PackageCheck, ShieldCheck, CheckCircle2 } from "lucide-react";

const CUSTOMER_ORDERS = [
  {
    id: "TRK-88219",
    item: "Semiconductor Wafers 300mm",
    units: "2,400 Units",
    origin: "Rotterdam Marine Port",
    dest: "New York Hub",
    estDelivery: "Tomorrow at 14:00 EST",
    timeline: [
      { title: "Order Picked & Manifest Created", time: "Aug 28, 08:30", completed: true },
      { title: "Port RTM Strike Bypass Activated", time: "Aug 29, 09:15", completed: true },
      { title: "Transferred to FRA Multimodal Rail", time: "Aug 29, 14:00", completed: true },
      { title: "Trans-Atlantic Air Cargo Flight", time: "Aug 29, 21:00", completed: false },
      { title: "Final Destination Delivery (JFK)", time: "Aug 30, 14:00", completed: false },
    ],
  },
];

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const successStyle = { color: "var(--color-success)" };

export default function CustomerView() {
  const [searchTerm, setSearchTerm] = useState("TRK-88219");
  const order = CUSTOMER_ORDERS[0];

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
      {/* Search & Timeline */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
        <div className="glass-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2" style={textMain}>
                <PackageCheck className="w-4 h-4" style={successStyle} aria-hidden="true" />
                Live Shipment Tracker
              </div>
              <div className="text-xs" style={textMuted}>
                Real-time visibility into multi-modal transit and SLA protection
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
              SLA GUARANTEED
            </span>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <label htmlFor="tracking-search" className="sr-only">
              Tracking number or purchase order
            </label>
            <div className="flex-1 relative">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={textMuted}
                aria-hidden="true"
              />
              <input
                id="tracking-search"
                type="text"
                name="tracking"
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter tracking # or purchase order…"
                className="glass-input rounded-xl pl-9 pr-3 py-2.5 text-xs w-full font-mono focus:outline-none"
              />
            </div>
            <button type="submit" className="px-5 py-2.5 btn-primary font-bold rounded-xl text-xs transition">
              Track Order
            </button>
          </form>
        </div>

        {/* Milestone Timeline */}
        <div className="flex-1 glass-card p-6 flex flex-col overflow-y-auto">
          <div className="text-xs font-extrabold mb-6 flex items-center justify-between flex-wrap gap-2" style={textMain}>
            <span>Milestone Progress Timeline</span>
            <span className="font-mono text-[11px] font-bold" style={successStyle}>AUTOMATIC REROUTE ACTIVE</span>
          </div>

          <div className="space-y-6 relative">
            <div
              className="absolute left-3 top-2 bottom-2 w-0.5"
              style={{ background: "var(--color-border)" }}
              aria-hidden="true"
            />
            {order.timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={
                    step.completed
                      ? { background: "var(--color-success)", color: "#fff", boxShadow: "0 0 10px color-mix(in srgb, var(--color-success) 60%, transparent)" }
                      : { background: "color-mix(in srgb, var(--color-bg-alt) 70%, transparent)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-bold" style={step.completed ? textMain : textMuted}>
                    {step.title}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={textMuted}>{step.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Package Specs & Guarantee */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
        <div className="glass-card p-5 flex flex-col gap-4">
          <div className="text-xs font-extrabold flex items-center gap-2" style={{ color: "var(--color-primary)" }}>
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Consignment Specification
          </div>

          <div
            className="border p-4 rounded-xl space-y-3 font-mono text-xs"
            style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
          >
            <div className="flex justify-between">
              <span style={textMuted}>Consignment:</span>
              <span className="font-bold text-right" style={textMain}>{order.item}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Quantity:</span>
              <span className="font-semibold" style={textMain}>{order.units}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Delivery Est:</span>
              <span className="font-bold" style={successStyle}>{order.estDelivery}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Route Origin:</span>
              <span style={textMain}>{order.origin}</span>
            </div>
            <div className="flex justify-between">
              <span style={textMuted}>Destination:</span>
              <span style={textMain}>{order.dest}</span>
            </div>
          </div>

          <div
            className="p-3.5 rounded-xl border text-xs leading-relaxed"
            style={{
              color: "var(--color-success)",
              background: "color-mix(in srgb, var(--color-success) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-success) 30%, transparent)",
            }}
          >
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> SLA Compensation Protection Active
            </div>
            Autonomous reroute executed via Frankfurt multimodal corridor. Zero penalty will be applied.
          </div>
        </div>
      </div>
    </div>
  );
}
