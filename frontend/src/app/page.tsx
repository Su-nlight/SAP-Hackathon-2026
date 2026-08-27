"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Activity, Cpu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  {
    icon: Activity,
    title: "Live Disruption Radar",
    desc: "Natural language alert parsing and automatic impact mapping.",
  },
  {
    icon: Cpu,
    title: "Deterministic Healing",
    desc: "Algorithmic route generation with time and cost penalty balancing.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded Decision RAG",
    desc: "Isolated enterprise namespaces for verifiable decision auditing.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full flex flex-col overflow-hidden">
      {/* animated gradient blobs */}
      <div
        className="blob w-96 h-96 -top-20 -left-20"
        style={{ background: "var(--color-accent)" }}
      />
      <div
        className="blob w-[28rem] h-[28rem] top-1/4 -right-24"
        style={{ background: "var(--color-secondary)", animationDelay: "3s" }}
      />
      <div
        className="blob w-72 h-72 bottom-0 left-1/3"
        style={{ background: "var(--color-primary)", animationDelay: "6s" }}
      />

      <header className="relative z-10 px-6 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center glass"
            style={{ color: "var(--color-primary)" }}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span
            className="font-bold text-lg tracking-wide"
            style={{ color: "var(--color-text)" }}
          >
            SelfHeal SC
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="btn-primary text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center flex flex-col items-center flex-1">
        <span
          className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6"
          style={{
            color: "var(--color-primary)",
            background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
          }}
        >
          Autonomous Supply Chain Operations
        </span>
        <h1
          className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight"
          style={{ color: "var(--color-text)" }}
        >
          Self-Healing Logistics, Powered by AI
        </h1>
        <p
          className="mt-6 text-lg max-w-2xl"
          style={{ color: "var(--color-text-muted)" }}
        >
          Automate disruption detection, evaluate multi-modal rerouting
          options deterministically, and query past operational decisions
          with tenant-isolated RAG.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary flex items-center gap-2 font-semibold px-6 py-3 rounded-xl transition"
          >
            Launch Console <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="glass flex items-center gap-2 font-semibold px-6 py-3 rounded-xl transition hover:scale-[1.02]"
            style={{ color: "var(--color-text)" }}
          >
            Create an Account
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left w-full">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-5">
              <Icon
                className="w-6 h-6 mb-3"
                style={{ color: "var(--color-primary)" }}
              />
              <h3
                className="font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                {title}
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer
        className="relative z-10 py-6 text-center text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        Autonomous Self-Healing Supply Chain System
      </footer>
    </main>
  );
}