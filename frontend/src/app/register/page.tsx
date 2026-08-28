"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Building2,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { register } from "@/app/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (!username.trim() || !email.trim() || !companyId.trim() || !password) {
      return "Please fill in every field.";
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        company_id: companyId.trim(),
        password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      if (status === 404) {
        setError(
          "Registration isn't wired up on the backend yet — add a POST /v1/auth/register route to enable this."
        );
      } else {
        setError(detail || "Could not create your account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create Tenant Account"
      title="Get started"
      subtitle="Set up console access for your enterprise tenant."
    >
      {success ? (
        <div
          className="flex flex-col items-center text-center gap-3 py-6"
          style={{ color: "var(--color-text)" }}
        >
          <CheckCircle2
            className="w-10 h-10"
            style={{ color: "var(--color-success)" }}
          />
          <p className="font-semibold">Account created! Redirecting…</p>
        </div>
      ) : (
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
                placeholder="jane_operator"
                className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Work email
            </label>
            <div className="mt-1.5 relative">
              <Mail
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Company / tenant ID
            </label>
            <div className="mt-1.5 relative">
              <Building2
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="acme"
                className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  autoComplete="new-password"
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

            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Confirm
              </label>
              <div className="mt-1.5 relative">
                <Lock
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div
              className="text-xs font-semibold rounded-xl px-3.5 py-2.5"
              style={{
                color: "var(--color-danger)",
                background:
                  "color-mix(in srgb, var(--color-danger) 12%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
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
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}

      {!success && (
        <p
          className="mt-6 text-center text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold hover:underline"
            style={{ color: "var(--color-primary)" }}
          >
            Sign in
          </Link>
        </p>
      )}
    </AuthShell>
  );
}