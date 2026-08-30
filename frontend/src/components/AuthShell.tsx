"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-10">
      {/* animated gradient blobs */}
      <div
        className="blob w-72 h-72 -top-10 -left-10"
        style={{ background: "var(--color-accent)" }}
      />
      <div
        className="blob w-80 h-80 top-1/3 -right-16"
        style={{ background: "var(--color-secondary)", animationDelay: "3s" }}
      />
      <div
        className="blob w-64 h-64 bottom-0 left-1/4"
        style={{ background: "var(--color-primary)", animationDelay: "6s" }}
      />

      <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center glass"
            style={{ color: "var(--color-primary)" }}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span
            className="font-bold text-sm tracking-wide group-hover:opacity-80 transition"
            style={{ color: "var(--color-text)" }}
          >
            SelfHeal SC
          </span>
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 sm:p-10">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              color: "var(--color-primary)",
              background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
            }}
          >
            {eyebrow}
          </span>
          <h1
            className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            {subtitle}
          </p>

          <div className="mt-7">{children}</div>
        </div>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Autonomous Self-Healing Supply Chain System
        </p>
      </div>
    </main>
  );
}