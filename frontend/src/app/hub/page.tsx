"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Cpu, Globe2, Zap, ShieldCheck, ArrowRight, LogOut, BarChart3, Navigation, ShieldAlert } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const Logo3D = dynamic(() => import("@/components/logo"), { ssr: false });
const Network3D = dynamic<any>(() => import("@/components/Network3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: "var(--bg-gradient)" }} />,
});

interface RoleCard {
  title: string;
  role: string;
  tag: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  darkAccent: string;
  lightAccent: string;
  iconTone: string;
  available: boolean;
  href?: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    title: "Executive Manager",
    role: "Manager",
    tag: "Financial Exposure & KPIs",
    desc: "Evaluate disruption financial impact, SLA liability risks, and authorize automated recovery workflows.",
    icon: BarChart3,
    darkAccent: "from-sky-500/20 to-blue-600/10 border-sky-500/30",
    lightAccent: "from-rose-500/10 to-amber-500/5 border-rose-300/60",
    iconTone: "var(--color-primary)",
    available: true,
    href: "/dashboard?role=Manager",
  },
  {
    title: "Operations Controller",
    role: "Operations",
    tag: "Active Network Routing",
    desc: "Real-time multimodal corridor monitoring, carrier capacity tracking, and disruption reroute triggers.",
    icon: Navigation,
    darkAccent: "from-teal-500/20 to-emerald-600/10 border-teal-500/30",
    lightAccent: "from-teal-500/10 to-emerald-500/5 border-teal-300/60",
    iconTone: "var(--color-success)",
    available: true,
    href: "/operations",
  },
  {
    title: "SAP System Admin",
    role: "Admin",
    tag: "ERP Sync & Keyring",
    desc: "Manage S/4HANA OData pipeline synchronization, key rotation, and inspect immutable recovery logs.",
    icon: ShieldAlert,
    darkAccent: "from-indigo-500/20 to-purple-600/10 border-indigo-500/30",
    lightAccent: "from-amber-500/10 to-rose-500/5 border-amber-300/60",
    iconTone: "var(--color-secondary)",
    available: true,
    href: "/dashboard?role=Admin",
  },
];

const STATUS_ITEMS = [
  { label: "S/4HANA Sync", value: "Online", icon: Cpu, color: "var(--color-success)" },
  { label: "Network Telemetry", value: "Streaming", icon: Globe2, color: "var(--color-primary)" },
  { label: "Chaos Simulator", value: "Standby", icon: Zap, color: "var(--color-warning)" },
  { label: "Event Log", value: "Recording", icon: ShieldCheck, color: "var(--color-secondary)" },
];

export default function HubLaunchPage() {
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col justify-between transition-colors duration-300 selection:bg-sky-500/30"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 50% 20%, #061126 0%, #02050c 100%)"
          : "var(--bg-gradient)",
        color: "var(--color-text)",
      }}
    >
      {/* Cinematic ambient globe */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none scale-105 transition-opacity duration-500 ${
          isDark ? "opacity-40" : "opacity-30"
        }`}
      >
        <Network3D
          ambientOnly={true}
          showHubList={false}
          showControls={false}
          darkMode={isDark}
        />
      </div>

      {/* Top Navigation */}
      <header
        className="relative z-10 w-full glass border-b px-6 py-4 flex items-center justify-between transition-colors duration-300"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <Logo3D darkMode={isDark} />
          <div>
            <div
              className="text-sm font-black tracking-widest uppercase bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
            >
              SelfHeal SC
            </div>
            <div className="text-[10px] font-mono tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Autonomous Supply Chain Console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border glass text-xs font-semibold transition hover:opacity-85"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign Out
          </Link>
        </div>
      </header>

      {/* Main Console Selection */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col items-center justify-center flex-grow w-full">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono mb-4 tracking-wider uppercase font-bold"
          style={{
            color: "var(--color-primary)",
            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
          }}
        >
          Autonomous Operational Matrix
        </div>

        <h1
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-center leading-tight mb-3"
          style={{ color: "var(--color-text)" }}
        >
          Choose Your Console
        </h1>
        <p className="max-w-xl text-sm text-center mb-10" style={{ color: "var(--color-text-muted)" }}>
          Select an authorized operational workspace to enter the autonomous twin network.
        </p>

        {/* 3 Balanced Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-10">
          {ROLE_CARDS.map((item) => (
            <Link
              key={item.role}
              href={item.href || `/dashboard?role=${item.role}`}
              className={`group relative p-6 rounded-2xl border glass-card bg-gradient-to-b ${
                isDark ? item.darkAccent : item.lightAccent
              } transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl border flex items-center justify-center"
                    style={{
                      background: "color-mix(in srgb, var(--color-bg-alt) 70%, transparent)",
                      borderColor: "var(--color-border)",
                      color: item.iconTone,
                    }}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border font-semibold"
                    style={{
                      background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {item.role}
                  </span>
                </div>

                <div className="text-[11px] font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                  {item.tag}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-text)" }}>
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  {item.desc}
                </p>
              </div>

              <div
                className="flex items-center justify-between pt-4 mt-6 border-t text-xs font-semibold"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                <span>Launch Console</span>
                <ArrowRight
                  className="w-4 h-4 group-hover:translate-x-1.5 transition-transform"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
            </Link>
          ))}
        </div>

        {/* System Telemetry Bar */}
        <div
          className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl border glass"
          style={{ borderColor: "var(--color-border)" }}
        >
          {STATUS_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-2">
              <div
                className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--color-bg-alt) 75%, transparent)",
                  borderColor: "var(--color-border)",
                  color: item.color,
                }}
              >
                <item.icon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>
                  {item.label}
                </div>
                <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 w-full border-t px-6 py-3 text-[11px] font-mono text-center glass"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        SAP Enterprise Hackathon 2026 · Team Autonomous Twin
      </footer>
    </div>
  );
}