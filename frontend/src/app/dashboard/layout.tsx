"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Layers, ChevronRight, Radio, Lock } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Role, ROLE_NAV, sectionTitleForPath } from "@/lib/dashboard-nav";

const Logo3D = dynamic(() => import("@/components/logo"), { ssr: false });

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

const VALID_ROLES: Role[] = ["Manager", "Operations", "Customer", "Admin"];

function isRole(value: string | null): value is Role {
  return VALID_ROLES.includes(value as Role);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role");
  const [role, setRole] = useState<Role>(isRole(initialRole) ? initialRole : "Manager");

  return (
    <div
      className="h-screen w-screen flex overflow-hidden font-sans select-none transition-colors duration-300"
      style={{ background: "var(--bg-gradient)", color: "var(--color-text)" }}
    >
      {/* Modular Sidebar Navigation */}
      <aside
        className="w-64 glass-strong border-r flex flex-col shrink-0 transition-colors duration-300"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Brand Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <Logo3D darkMode={isDark} />
            <div>
              <div
                className="text-xs font-black tracking-wider uppercase bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
              >
                SELFHEAL NEXUS
              </div>
              <div className="text-[10px] font-mono font-bold" style={primary}>
                3D DIGITAL TWIN
              </div>
            </div>
          </div>

          <ThemeToggle />
        </div>

        {/* Role Selector */}
        <div className="p-3.5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="text-[10px] font-mono font-bold uppercase mb-2 flex justify-between" style={textMuted}>
            <span>PORTAL ROLE</span>
            <span className="font-bold" style={primary}>{role}</span>
          </div>
          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border"
            style={{ background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)", borderColor: "var(--color-border)" }}
          >
            {VALID_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="text-[11px] py-1.5 rounded-lg font-bold transition"
                style={
                  role === r
                    ? { background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))", color: "#fff" }
                    : textMuted
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-mono font-bold uppercase px-2.5 py-1" style={textMuted}>
            {role} Modules
          </div>
          {ROLE_NAV[role]?.map((item) => {
            const isActive = item.href === pathname;
            const content = (
              <>
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.href ? (
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                ) : (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1"
                    style={{ ...textMuted, borderColor: "var(--color-border)" }}
                  >
                    <Lock className="w-2.5 h-2.5" /> SOON
                  </span>
                )}
              </>
            );

            const className =
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition";
            const style = isActive
              ? {
                  background: "color-mix(in srgb, var(--color-primary) 16%, transparent)",
                  color: "var(--color-primary)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)",
                }
              : { ...textMuted, border: "1px solid transparent" };

            return item.href ? (
              <Link key={item.label} href={item.href} className={className} style={style}>
                {content}
              </Link>
            ) : (
              <button key={item.label} disabled className={`${className} opacity-50 cursor-not-allowed`} style={style}>
                {content}
              </button>
            );
          })}
        </nav>

        {/* Tenant Meta */}
        <div
          className="p-3.5 border-t text-[11px] font-mono flex items-center justify-between"
          style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-bg-alt) 50%, transparent)", ...textMuted }}
        >
          <div>
            <div className="text-[9px] font-bold" style={textMuted}>ENTERPRISE TENANT</div>
            <div className="font-bold" style={textMain}>EU-WEST-PROD</div>
          </div>
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "var(--color-success)", boxShadow: "0 0 10px var(--color-success)" }}
          />
        </div>
      </aside>

      {/* Main Workstation Shell */}
      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 glass border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-300"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold uppercase" style={textMuted}>{role}</span>
            <span className="opacity-30 font-bold">/</span>
            <span className="text-sm font-extrabold" style={textMain}>{sectionTitleForPath(pathname)}</span>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold"
            style={{
              color: "var(--color-success)",
              background: "color-mix(in srgb, var(--color-success) 14%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)",
            }}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            HEURISTIC ENGINE ONLINE
          </div>
        </header>

        {/* Injected Inner Page */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col">{children}</div>
      </main>
    </div>
  );
}