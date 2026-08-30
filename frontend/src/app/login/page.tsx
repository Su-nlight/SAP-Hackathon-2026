"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { login } from "@/app/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response
          ?.data?.detail || "Invalid credentials. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Secure Console Access"
      title="Welcome back"
      subtitle="Sign in to monitor and heal your supply chain in real time."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}
          >
            Username
          </label>
          <div className="mt-1.5 relative">
            <User
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="acme_admin"
              className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}
          >
            Password
          </label>
          <div className="mt-1.5 relative">
            <Lock
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input w-full rounded-xl pl-10 pr-11 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{ color: "var(--color-text-muted)" }}
          >
            <input type="checkbox" className="accent-current" />
            Remember me
          </label>
          <button
            type="button"
            className="font-semibold hover:underline"
            style={{ color: "var(--color-primary)" }}
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <div
            className="text-xs font-semibold rounded-xl px-3.5 py-2.5"
            style={{
              color: "var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}