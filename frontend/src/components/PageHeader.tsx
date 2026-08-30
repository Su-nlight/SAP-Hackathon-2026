"use client";

import React from "react";
import { Loader2, AlertCircle } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 pt-4 pb-1 flex items-start justify-between gap-4 shrink-0">
      <div>
        <h1 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
          {title}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 text-xs font-mono px-4 py-3"
      style={{ color: "var(--color-text-muted)" }}
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 text-xs font-semibold px-4 py-3 mx-4 rounded-xl"
      style={{
        color: "var(--color-danger)",
        background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
      }}
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}