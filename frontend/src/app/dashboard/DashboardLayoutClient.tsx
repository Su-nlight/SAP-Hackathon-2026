"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Layers, 
  ChevronRight, 
  Radio, 
  ShieldCheck, 
  Navigation2, 
  BarChart3, 
  Settings2,
  LogOut,
  Lock
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Role, ROLE_NAV, sectionTitleForPath } from "@/lib/dashboard-nav";

const Logo3D = dynamic(() => import("@/components/logo"), { ssr: false });

const textMuted = { color: "var(--color-text-muted)" };
const textMain = { color: "var(--color-text)" };
const primary = { color: "var(--color-primary)" };

const VALID_ROLES: Role[] = ["Manager", "Operations", "Admin"];
function isRole(value: string | null): value is Role {
  return VALID_ROLES.includes(value as Role);
}

const ROLE_META: Record<Role, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  Manager: { label: "Manager", icon: BarChart3 },
  Operations: { label: "Operations", icon: Navigation2 },
  Admin: { label: "Admin", icon: Settings2 },
};

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role");

  const [role, setRole] = useState<Role>(
    pathname.startsWith("/operations")
      ? "Operations"
      : isRole(initialRole)
      ? initialRole
      : "Manager"
  );

  useEffect(() => {
    if (pathname.startsWith("/operations")) {
      setRole("Operations");
    } else {
      const currentRoleParam = searchParams.get("role");
      if (isRole(currentRoleParam)) {
        setRole(currentRoleParam);
      } else if (pathname.startsWith("/dashboard")) {
        setRole("Manager");
      }
    }
  }, [pathname, searchParams]);

  const handleRoleChange = (selectedRole: Role) => {
    setRole(selectedRole);
    if (selectedRole === "Operations") {
      router.push("/operations");
    } else if (selectedRole === "Manager") {
      router.push("/dashboard?role=Manager");
    } else {
      router.push(`/dashboard?role=${selectedRole}`);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    router.push("/");
  };

  const fullCurrentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <div
      className="h-screen w-screen flex overflow-hidden font-sans select-none transition-colors duration-300"
      style={{ background: "var(--bg-gradient)", color: "var(--color-text)" }}
    >
      {/* Enterprise Sidebar */}
      <aside
        className="w-64 glass-strong border-r flex flex-col shrink-0 transition-colors duration-300 z-30"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Brand Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <Logo3D darkMode={isDark} />
            <div>
              <div
                className="text-xs font-black tracking-widest uppercase bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
              >
                SUPPLY CHAIN HEAL
              </div>
              <div className="text-[10px] font-mono tracking-wider font-semibold" style={primary}>
                ENTERPRISE TWIN
              </div>
            </div>
          </div>

          <ThemeToggle />
        </div>

        {/* Role Selector Grid */}
        <div className="p-3.5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase mb-2 flex justify-between" style={textMuted}>
            <span>WORKSPACE ROLE</span>
            <span className="font-bold" style={primary}>{role}</span>
          </div>

          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-xl border bg-black/10 dark:bg-white/[0.03]"
            style={{ borderColor: "var(--color-border)" }}
          >
            {VALID_ROLES.map((r) => {
              const Icon = ROLE_META[r].icon;
              const isSelected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`text-[11px] py-1.5 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    isSelected ? "shadow-sm" : "hover:text-white"
                  }`}
                  style={
                    isSelected
                      ? { background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#ffffff" }
                      : textMuted
                  }
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{r}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Sidebar Modules */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto font-sans">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 mb-1" style={textMuted}>
            {role} Modules
          </div>

          {ROLE_NAV[role]?.map((item) => {
            const isActive = item.href === fullCurrentPath || item.href === pathname;
            const content = (
              <>
                <div className="flex items-center gap-2.5">
                  <Layers className={`w-3.5 h-3.5 ${isActive ? "text-sky-400" : "opacity-60"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.href ? (
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "opacity-100 translate-x-0.5 text-sky-400" : "opacity-40"}`} />
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

            const baseClass = "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition";

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={baseClass}
                  style={
                    isActive
                      ? {
                          background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                          color: "var(--color-primary)",
                          border: "1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)",
                        }
                      : { ...textMuted, border: "1px solid transparent" }
                  }
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                disabled
                className={`${baseClass} opacity-40 cursor-not-allowed`}
                style={{ ...textMuted, border: "1px solid transparent" }}
              >
                {content}
              </button>
            );
          })}
        </nav>

        {/* Tenant Meta Footer */}
        <div
          className="p-3 border-t text-[11px] font-mono flex items-center justify-between"
          style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-bg-alt) 50%, transparent)", ...textMuted }}
        >
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider" style={textMuted}>S/4HANA TENANT</div>
            <div className="font-bold tabular-nums" style={textMain}>EU-WEST-PROD-01</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/hub"
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition hover:opacity-85"
              style={{
                borderColor: "var(--color-border)",
                background: "color-mix(in srgb, var(--color-bg-alt) 70%, transparent)",
                ...textMuted,
              }}
              title="Return to Launch Hub"
            >
              HUB
            </Link>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Main Workstation Shell */}
      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 glass border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-300 z-20"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={textMuted}>{role}</span>
            <span className="opacity-30 font-bold">/</span>
            <span className="text-sm font-extrabold tracking-tight" style={textMain}>{sectionTitleForPath(pathname)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold"
              style={{
                color: "var(--color-success)",
                background: "color-mix(in srgb, var(--color-success) 14%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)",
              }}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              HEURISTIC ENGINE ONLINE
            </div>

            {/* Hub-Style Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer hover:opacity-85"
              style={{
                borderColor: "var(--color-border)",
                background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)",
                color: "var(--color-text-muted)",
              }}
              aria-label="Sign out of console"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Injected Workstation Page */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col">{children}</div>
      </main>
    </div>
  );
}