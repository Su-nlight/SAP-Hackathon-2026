"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Lock, User, Eye, EyeOff, ArrowRight, Loader2, Mail, Building2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { login, register } from "@/app/lib/api";

type Mode = "signin" | "signup";

const inputClass =
  "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm glass-input transition-all";
const labelClass = "text-xs font-semibold mb-1.5 block";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelStyle = { color: "var(--color-text-muted)" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await login({ username, password });
      } else {
        await register({ username, email, company_id: companyId, password });
      }
      router.push("/hub");
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Incorrect username or password.");
        } else if (err.response?.status === 404 && mode === "signup") {
          setError(
            "Self-service account creation isn't available yet. Ask your SAP administrator for access."
          );
        } else {
          setError(
            (err.response?.data as { detail?: string } | undefined)?.detail ??
              "Something went wrong. Please try again."
          );
        }
      } else {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="SelfHeal SC"
      title={mode === "signin" ? "Sign In" : "Create Account"}
      subtitle={
        mode === "signin"
          ? "Access your autonomous supply chain console."
          : "Set up access for your organization."
      }
    >
      <div
        className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border mb-6"
        style={{
          background: "color-mix(in srgb, var(--color-bg-alt) 60%, transparent)",
          borderColor: "var(--color-border)",
        }}
        role="tablist"
        aria-label="Authentication mode"
      >
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className="text-xs py-2 rounded-lg font-bold transition"
            style={
              mode === m
                ? {
                    background:
                      "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                    color: "#fff",
                  }
                : labelStyle
            }
          >
            {m === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="username" className={labelClass} style={labelStyle}>
            Username
          </label>
          <div className="relative">
            <User
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={labelStyle}
              aria-hidden="true"
            />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. acme_admin"
              className={inputClass}
            />
          </div>
        </div>

        {mode === "signup" && (
          <>
            <div>
              <label htmlFor="email" className={labelClass} style={labelStyle}>
                Work Email
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                  style={labelStyle}
                  aria-hidden="true"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="companyId" className={labelClass} style={labelStyle}>
                Company ID
              </label>
              <div className="relative">
                <Building2
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                  style={labelStyle}
                  aria-hidden="true"
                />
                <input
                  id="companyId"
                  name="companyId"
                  type="text"
                  autoComplete="organization"
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="e.g. acme"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label htmlFor="password" className={labelClass} style={labelStyle}>
            Password
          </label>
          <div className="relative">
            <Lock
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={labelStyle}
              aria-hidden="true"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              spellCheck={false}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={labelStyle}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="text-xs font-medium px-3 py-2.5 rounded-xl"
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
          className="w-full py-2.5 rounded-xl btn-primary font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              {mode === "signin" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            <>
              {mode === "signin" ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
