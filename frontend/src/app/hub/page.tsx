// @ts-nocheck
"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Cpu, 
  Globe, 
  ArrowRight, 
  Radio, 
  Zap, 
  Terminal, 
  Radar,
  LogOut
} from "lucide-react";

const Network3D = dynamic(() => import("@/components/Network3D"), { 
  ssr: false,
  loading: () => <div className="w-full h-full" />
});

export default function HubLaunchPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    setMousePos({ x: clientX, y: clientY });
  };

  const roles = [
    {
      title: "Executive Manager",
      role: "Manager",
      tag: "KPIs & Costs",
      desc: "Autonomous financial exposure control & high-impact rerun decisions.",
      metric: "$2.4M Safe",
      metricLabel: "Risk Shield",
      color: "from-blue-500/25 via-indigo-600/10 to-transparent hover:border-blue-400/80 text-blue-400",
      accent: "bg-blue-500",
      glow: "hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]",
    },
    {
      title: "Operations Controller",
      role: "Operations",
      tag: "Fleet Radar",
      desc: "Live vessel corridor mapping, choke-point avoidance & dynamic ETA shifts.",
      metric: "99.4%",
      metricLabel: "Lane Health",
      color: "from-emerald-500/25 via-teal-600/10 to-transparent hover:border-emerald-400/80 text-emerald-400",
      accent: "bg-emerald-500",
      glow: "hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]",
    },
    {
      title: "Consignment Client",
      role: "Customer",
      tag: "Multi-Modal",
      desc: "Transparent consignment telemetry, real-time status & instant claim ledger.",
      metric: "12 Act.",
      metricLabel: "Live Freights",
      color: "from-cyan-500/25 via-sky-600/10 to-transparent hover:border-cyan-400/80 text-cyan-400",
      accent: "bg-cyan-500",
      glow: "hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]",
    },
    {
      title: "SAP System Admin",
      role: "Admin",
      tag: "S/4HANA Core",
      desc: "OData pipeline telemetry, IDoc event bridges & tamper-proof cryptographic audit log.",
      metric: "<38ms",
      metricLabel: "Sync Lag",
      color: "from-purple-500/25 via-fuchsia-600/10 to-transparent hover:border-purple-400/80 text-purple-400",
      accent: "bg-purple-500",
      glow: "hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]",
    },
  ];

  const liveFeeds = [
    { label: "S/4HANA Sync", val: "ONLINE", sub: "Latency 38ms", icon: Cpu, col: "text-emerald-400" },
    { label: "Digital Twin Mesh", val: "99.8%", sub: "6 Global Hubs", icon: Globe, col: "text-cyan-400" },
    { label: "Chaos Simulator", val: "ACTIVE", sub: "Autonomous Core", icon: Zap, col: "text-amber-400" },
    { label: "Event Ledger", val: "TAMPER-PROOF", sub: "SHA-256 Valid", icon: ShieldCheck, col: "text-purple-400" },
  ];

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[#050811] text-slate-100 relative overflow-hidden flex flex-col justify-between selection:bg-cyan-500/30 font-sans"
    >
      
      {/* 3D Visual Mesh Layer */}
      <div className="absolute inset-0 z-0 opacity-55 scale-105 pointer-events-none">
        <Network3D />
      </div>

      {/* Dynamic Spotlight Follower */}
      <div 
        className="pointer-events-none absolute -inset-px z-0 opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(14, 165, 233, 0.15), transparent 70%)`
        }}
      />

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.14] pointer-events-none" 
        style={{
          backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/[0.08] bg-[#050811]/70 backdrop-blur-2xl px-6 py-3.5 flex items-center justify-between">
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="13.5" stroke="#C79A4B" strokeWidth="1" />
            <circle cx="15" cy="15" r="9.5" stroke="#C79A4B" strokeWidth="1" opacity="0.5" />
            <text x="15" y="19.5" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill="#C79A4B">
              P
            </text>
          </svg>
          <div>
            <span style={{ fontFamily: "var(--font-display)" }} className="text-[15px] tracking-[0.14em] uppercase text-[#F2F3F5]">
              Pulse // S4
            </span>
            <p className="text-[10px] text-[#4A5160] tracking-tight">SAP Digital Twin</p>
          </div>
        </motion.div>

        {/* Live Status Strip */}
        <div className="hidden lg:flex items-center gap-5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
            <span className="text-slate-400">SAP ODATA:</span>
            <span className="text-emerald-400 font-semibold tracking-wide">SYNCED</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Radar className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-slate-400">CHAOS SIMULATOR:</span>
            <span className="text-cyan-300 font-semibold">STANDBY</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-all font-mono text-xs hover:border-rose-500/30"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign Out</span>
          </Link>
          <Link
            href="/dashboard"
            className="group relative flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 border border-cyan-500/40 transition-all font-mono text-xs font-semibold shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]"
          >
            <span>CONSOLE HUD</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-cyan-400" />
          </Link>
        </div>
      </header>

      {/* Main Interactive Persona Launchpad */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex flex-col items-center justify-center flex-grow">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono mb-4 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>Real-time Multi-Modal Twin • 6 Global Hubs Telemetry Connected</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-4xl text-center leading-[1.12] mb-3 font-sans">
          Self-Healing Logistics & <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-teal-200 to-indigo-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.25)]">
            Digital Supply Chain Twin
          </span>
        </h1>

        <p className="max-w-2xl text-slate-300 text-xs sm:text-sm text-center mb-8 leading-relaxed font-normal">
          Instant multi-modal rerouting, continuous S/4HANA telemetry synchronization, and automated cryptographic SLA claims. Select a persona console:
        </p>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
          {roles.map((item) => (
            <Link
              key={item.role}
              href={`/dashboard?role=${item.role}`}
              className={`group relative p-4 rounded-xl bg-gradient-to-b ${item.color} bg-[#080e1b]/80 backdrop-blur-2xl border border-white/[0.08] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between shadow-lg ${item.glow}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-slate-300">
                    {item.tag}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400">{item.metricLabel}</span>
                    <span className="text-[11px] font-bold font-mono px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/10">
                      {item.metric}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between mb-1.5">
                  <span>{item.title}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.accent} shadow-[0_0_6px_currentColor]`} />
                </h3>
                
                <p className="text-[11px] text-slate-400 leading-snug font-light mb-4">
                  {item.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-slate-300 group-hover:text-white transition-colors">
                <span className="flex items-center gap-1 text-[10px] text-cyan-400/90 font-medium">
                  <Terminal className="w-3 h-3" /> LAUNCH PORTAL
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Live Metrics Bar */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-[#091122]/70 border border-white/[0.08] backdrop-blur-xl shadow-2xl">
          {liveFeeds.map((feed, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-cyan-500/20 transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                <feed.icon className={`w-3.5 h-3.5 ${feed.col}`} />
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] text-slate-400 font-mono truncate">{feed.label}</div>
                <div className="text-xs font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                  <span>{feed.val}</span>
                  <span className="text-[9px] font-normal text-slate-400">({feed.sub})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#050811]/90 backdrop-blur-xl px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
        <div className="text-[11px] text-[#4A5160]">
          SAP Enterprise Hackathon 2026 · Team Autonomous Twin
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>Three.js Canvas</span>
          <span>Next.js 15 App Router</span>
          <span>Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}