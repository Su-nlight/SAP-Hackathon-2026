"use client";

import React, { useState } from "react";
import { Search, PackageCheck, MapPin, Calendar, Clock, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

interface CustomerProps {
  darkMode: boolean;
}

const CUSTOMER_ORDERS = [
  {
    id: "TRK-88219",
    item: "Semiconductor Wafers 300mm",
    units: "2,400 Units",
    status: "Rerouted via Rail (On Track)",
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

export default function CustomerView({ darkMode }: CustomerProps) {
  const [searchTerm, setSearchTerm] = useState("TRK-88219");
  const order = CUSTOMER_ORDERS[0];

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
      {/* Search & Timeline Card (Col 8) */}
      <div className="col-span-8 flex flex-col gap-4 min-h-0">
        <div className={`border rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm font-extrabold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Live Customer Shipment Tracker
              </div>
              <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Real-time visibility into multi-modal transit and automated SLA protections
              </div>
            </div>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
              darkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              SLA GUARANTEED
            </span>
          </div>

          <div className="flex gap-2">
            <div className={`flex-1 border rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 ${
              darkMode ? "bg-[#040812] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Tracking # or Purchase Order..."
                className="bg-transparent text-xs focus:outline-none w-full font-mono placeholder-slate-400"
              />
            </div>
            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/25">
              Track Order
            </button>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className={`flex-1 border rounded-2xl p-6 flex flex-col backdrop-blur-xl overflow-y-auto ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className={`text-xs font-extrabold mb-6 flex items-center justify-between ${darkMode ? "text-white" : "text-slate-900"}`}>
            <span>Milestone Progress Timeline</span>
            <span className="text-emerald-600 font-mono text-[11px] font-bold">AUTOMATIC REROUTE ACTIVE</span>
          </div>

          <div className={`space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 ${
            darkMode ? "before:bg-slate-800" : "before:bg-slate-200"
          }`}>
            {order.timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${
                  step.completed
                    ? "bg-emerald-500 shadow-[0_0_10px_#10b981]"
                    : darkMode
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-100 text-slate-400 border border-slate-300"
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${step.completed ? (darkMode ? "text-white" : "text-slate-900") : "text-slate-400"}`}>
                    {step.title}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{step.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Package Specs & Guarantee Guarantee (Col 4) */}
      <div className="col-span-4 flex flex-col gap-4 min-h-0">
        <div className={`border rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-xl ${
          darkMode ? "bg-[#0a1426]/85 border-slate-800/90 shadow-xl" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="text-xs font-extrabold flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-4 h-4" />
            Consignment Specification
          </div>

          <div className={`border p-4 rounded-xl space-y-3 font-mono text-xs ${
            darkMode ? "bg-[#040812] border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Consignment:</span>
              <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{order.item}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Quantity:</span>
              <span className={`font-semibold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{order.units}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Delivery Est:</span>
              <span className="text-emerald-600 font-bold">{order.estDelivery}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Route Origin:</span>
              <span className={darkMode ? "text-slate-300" : "text-slate-800"}>{order.origin}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Destination:</span>
              <span className={darkMode ? "text-slate-300" : "text-slate-800"}>{order.dest}</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            darkMode
              ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> SLA Compensation Protection Active
            </div>
            Autonomous reroute executed via Frankfurt multimodal corridor. Zero penalty will be applied.
          </div>
        </div>
      </div>
    </div>
  );
}