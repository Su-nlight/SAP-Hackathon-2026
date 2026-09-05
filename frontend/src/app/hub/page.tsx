"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Cpu, Globe2, Zap, ShieldCheck, ArrowRight, LogOut } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const Logo3D = dynamic(() => import("@/components/logo"), { ssr: false });
const Network3D = dynamic(() => import("@/components/Network3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});

interface RoleCard {
  title: string;
  role: string;
  tag: string;
  desc: string;
  available: boolean;
}

const ROLE_CARDS: RoleCard[] = [
  {
    title: "Executive Manager",
    role: "Manager",
    tag: "KPIs & Costs",
    desc: "Financial exposure, disruption impact, and high-stakes recovery decisions.",
    available: true,
  },
  {
    title: "Operations Controller",
    role: "Operations",
    tag: "Fleet & Routing",
    desc: "Live shipment tracking, route management, and network monitoring.",
    available: false,
  },
  {
    title: "Consignment Client",
    role: "Customer",
    tag: "Tracking",
    desc: "Shipment status, delivery updates, and live map tracking.",
    available: false,
  },
  {
    title: "SAP System Admin",
    role: "Admin",
    tag: "Integration",
    desc: "SAP system sync, integration monitoring, and audit log review.",
    available: false,
  },
];

const STATUS_ITEMS = [
  { label: "S/4HANA Sync", value: "Online", icon: Cpu },
  { label: "Network Telemetry", value: "Streaming", icon: Globe2 },
  { label: "Chaos Simulator", value: "Standby", icon: Zap },
  { label: "Event Log", value: "Recording", icon: ShieldCheck },
];

export default function HubLaunchPage() {
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col"
      style={{ background: "var(--bg-gradient)", color: "var(--color-text)" }}
    >
      {/* Ambient network visualization, restrained opacity so it reads as texture, not noise */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
        <Network3D />
      </div>

      <header
        className="relative z-10 w-full glass border-b px-6 py-3.5 flex items-center justify-between"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <Logo3D darkMode={isDark} />
          <div>
            <div
              className="text-xs font-black tracking-wider uppercase bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
            >
              SelfHeal SC
            </div>
            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              Autonomous Supply Chain Console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs font-semibold transition hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign Out
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 flex flex-col items-center flex-grow w-full">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center leading-tight mb-3">
          Choose Your Console
        </h1>
        <p
          className="max-w-xl text-sm text-center mb-10"
          style={{ color: "var(--color-text-muted)" }}
        >
          Each role has its own view of the network. Select the one that matches your work.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-10">
          {ROLE_CARDS.map((item) =>
            item.available ? (
              <Link
                key={item.role}
                href={`/dashboard?role=${item.role}`}
                className="group relative p-5 rounded-2xl glass-card transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
              >
                <RoleCardBody item={item} />
              </Link>
            ) : (
              <div
                key={item.role}
                aria-disabled="true"
                className="relative p-5 rounded-2xl glass-card opacity-60 flex flex-col justify-between cursor-not-allowed"
              >
                <RoleCardBody item={item} />
              </div>
            )
          )}
        </div>

        <div
          className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-2xl glass"
        >
          {STATUS_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-2 rounded-xl"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                  color: "var(--color-primary)",
                }}
              >
                <item.icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
                  {item.label}
                </div>
                <div className="text-xs font-bold">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer
        className="relative z-10 w-full glass border-t px-6 py-2.5 text-[11px] text-center"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        SAP Enterprise Hackathon 2026 · Team Autonomous Twin
      </footer>
    </div>
  );
}

function RoleCardBody({ item }: { item: RoleCard }) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{
              color: "var(--color-primary)",
              background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
            }}
          >
            {item.tag}
          </span>
          {!item.available && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
              style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
            >
              SOON
            </span>
          )}
        </div>
        <h3 className="text-base font-bold mb-1.5">{item.title}</h3>
        <p className="text-xs leading-snug" style={{ color: "var(--color-text-muted)" }}>
          {item.desc}
        </p>
      </div>

      {item.available && (
        <div
          className="flex items-center justify-between pt-3 mt-3 border-t text-xs font-semibold"
          style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}
        >
          <span>Enter Console</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </div>
      )}
    </>
  );
}
