// @ts-nocheck
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Cpu, 
  KeyRound, 
  User, 
  Mail, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Sparkles,
  Lock
} from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "SAP Global Logistics",
    role: "Operations",
    sapId: "SAP-USER-" + Math.floor(1000 + Math.random() * 9000),
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [provisioned, setProvisioned] = useState(false);

  const roles = [
    { id: "Manager", name: "Executive Manager", badge: "Decision Engine", col: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
    { id: "Operations", name: "Operations Controller", badge: "Mission Control", col: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
    { id: "Customer", name: "Consignment Client", badge: "Tracking & SLAs", col: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10" },
    { id: "Admin", name: "SAP System Admin", badge: "Infrastructure", col: "border-purple-500/40 text-purple-400 bg-purple-500/10" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate S/4HANA OData user provision & local state sync
    setTimeout(() => {
      setLoading(false);
      setProvisioned(true);
      setTimeout(() => {
        router.push(`/dashboard?role=${formData.role}`);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 relative overflow-hidden flex flex-col justify-between selection:bg-cyan-500/30 font-sans">
      
      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.14] pointer-events-none" 
        style={{
          backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-cyan-600/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/[0.08] bg-[#050811]/70 backdrop-blur-2xl px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="13.5" stroke="#C79A4B" strokeWidth="1" />
            <circle cx="15" cy="15" r="9.5" stroke="#C79A4B" strokeWidth="1" opacity="0.5" />
            <text x="15" y="19.5" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill="#C79A4B">
              P
            </text>
          </svg>
          <div>
            <span
              style={{ fontFamily: "var(--font-display)" }}
              className="text-[15px] tracking-[0.14em] uppercase text-[#F2F3F5]"
            >
              Pulse // S4
            </span>
            <p className="text-[10px] text-[#4A5160] tracking-tight">SAP Digital Twin</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400">Already registered?</span>
          <Link
            href="/dashboard"
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-semibold"
          >
            <span>Direct Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Sign Up Card */}
      <main className="relative z-10 max-w-2xl w-full mx-auto px-6 py-8 flex flex-col items-center">
        
        {/* Banner Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/[0.07] border border-cyan-500/20 text-cyan-300 text-xs font-mono mb-4 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>S/4HANA Autonomous Identity Provisioning</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1 text-center">
          Provision Persona Workspace
        </h1>
        <p className="text-xs text-slate-400 font-mono mb-6 text-center">
          Configure real-time role credentials and initialize telemetry access
        </p>

        {/* Form Container */}
        <div className="w-full rounded-2xl bg-[#080e1b]/80 border border-white/[0.08] backdrop-blur-2xl p-6 shadow-2xl relative">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Persona Role Selection */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block mb-2">
                Select Workspace Persona
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      formData.role === r.id
                        ? `${r.col} border-opacity-100 shadow-md`
                        : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-white">{r.name}</span>
                      {formData.role === r.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[9px] font-mono tracking-wider opacity-80">{r.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Tanisha Chauhan"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="tanisha@sap-twin.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SAP ID & Company Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Enterprise Unit
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Assigned SAP User ID
                </label>
                <div className="relative">
                  <Cpu className="w-3.5 h-3.5 text-cyan-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled
                    value={formData.sapId}
                    className="w-full pl-9 pr-3 py-2 bg-cyan-500/[0.05] border border-cyan-500/20 rounded-lg text-xs font-mono text-cyan-300 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Access Key Password */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Workspace Encryption Key (Password)
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || provisioned}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {provisioned ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>INITIALIZED • LAUNCHING WORKSPACE...</span>
                  </>
                ) : loading ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin text-slate-950" />
                    <span>SYNCHRONIZING WITH S/4HANA VAULT...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-slate-950" />
                    <span>PROVISION & ENTER WORKSPACE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#050811]/90 backdrop-blur-xl px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
        <div className="text-[11px] text-[#4A5160]">
          SAP Enterprise Hackathon 2026 · Team Autonomous Twin
        </div>
        <div className="text-slate-500">
          TLS 1.3 • AES-256 Encrypted OData
        </div>
      </footer>
    </div>
  );
}