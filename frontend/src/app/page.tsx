// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Cpu, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Terminal,
  Activity,
  Fingerprint,
  Radio,
  Zap,
  Eye,
  EyeOff,
  Flame,
  Binary,
  Compass,
  Radar
} from "lucide-react";

// Interactive Cyberpunk Particle Grid Canvas
function MatrixCyberCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Generate floating digital nodes
    const particleCount = 55;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      size: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? "rgba(34, 211, 238, " : "rgba(99, 102, 241, ",
      alpha: Math.random() * 0.7 + 0.3,
    }));

    const render = () => {
      ctx.fillStyle = "rgba(4, 7, 17, 0.22)";
      ctx.fillRect(0, 0, width, height);

      // Draw connective data links
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.18 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ")";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#38bdf8";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}

export default function CyberAuthExperience() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [authProgress, setAuthProgress] = useState(0);

  // Live Hexadecimal Encryption stream
  const [hexData, setHexData] = useState("0x7F...INIT");
  useEffect(() => {
    const int = setInterval(() => {
      const bytes = Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()
      ).join(":");
      setHexData(`0x${bytes}`);
    }, 200);
    return () => clearInterval(int);
  }, []);

  // Real-time terminal activity logs
  const [logs, setLogs] = useState<string[]>([
    "[KERNEL] Initializing Neural Core v2.6 // S4 S/4HANA...",
    "[ODATA] Event Broker Bridge established on port 8443",
    "[CIPHER] TLS_AES_256_GCM_SHA384 handshake verified",
    "[TWIN_MESH] 6 Global Hubs Streaming telemetry: Nominal",
    "[SECURITY] Awaiting operator biometric / passphrase clearance..."
  ]);

  const [formData, setFormData] = useState({
    fullName: "Tanisha Chauhan",
    email: "tanisha@sap-twin.com",
    company: "SAP Global Enterprise",
    role: "Operations",
    password: "••••••••••••",
  });

  const roles = [
    {
      id: "Operations",
      title: "Operations Controller",
      badge: "Mission Control",
      metric: "99.4% SLA",
      borderGlow: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
      accent: "bg-emerald-400",
      shadow: "shadow-[0_0_15px_rgba(16,185,129,0.25)]",
    },
    {
      id: "Manager",
      title: "Executive Manager",
      badge: "Decision Engine",
      metric: "$2.4M Shield",
      borderGlow: "border-blue-500/60 bg-blue-500/10 text-blue-300",
      accent: "bg-blue-400",
      shadow: "shadow-[0_0_15px_rgba(59,130,246,0.25)]",
    },
    {
      id: "Customer",
      title: "Consignment Client",
      badge: "Tracking & SLAs",
      metric: "12 Live Runs",
      borderGlow: "border-cyan-500/60 bg-cyan-500/10 text-cyan-300",
      accent: "bg-cyan-400",
      shadow: "shadow-[0_0_15px_rgba(6,182,212,0.25)]",
    },
    {
      id: "Admin",
      title: "SAP System Admin",
      badge: "Infrastructure",
      metric: "<38ms Sync",
      borderGlow: "border-purple-500/60 bg-purple-500/10 text-purple-300",
      accent: "bg-purple-400",
      shadow: "shadow-[0_0_15px_rgba(168,85,247,0.25)]",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthProgress(15);

    setLogs((prev) => [
      ...prev,
      `[AUTH_REQ] Dispatching token for [${formData.email}]...`,
      `[ROUTING] Binding workspace persona: ${formData.role}`,
    ]);

    const timer1 = setTimeout(() => {
      setAuthProgress(65);
      setLogs((prev) => [...prev, "[CIPHER] Validating SHA-256 Signature Vault..."]);
    }, 500);

    const timer2 = setTimeout(() => {
      setAuthProgress(100);
      setLoading(false);
      setSuccess(true);
      setLogs((prev) => [...prev, "[SUCCESS] S/4HANA OData Core Handshake Confirmed (200 OK)"]);
      setTimeout(() => {
        router.push("/hub");
      }, 900);
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  };

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 font-sans relative overflow-hidden">
      
      {/* Dynamic Animated Canvas Particle Web */}
      <MatrixCyberCanvas />

      {/* Cyber Scanning Laser Line */}
      <motion.div
        animate={{ y: ["0vh", "100vh"] }}
        transition={{ repeat: Infinity, duration: 6.5, ease: "linear" }}
        className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-35 z-0 pointer-events-none shadow-[0_0_15px_#22d3ee]"
      />

      {/* Ambient Pulsing Glow Orbs */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-purple-600/15 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Cyber Navigation Bar */}
      <header className="relative z-10 w-full border-b border-white/[0.08] bg-[#040711]/80 backdrop-blur-2xl px-6 py-3 flex items-center justify-between">
        
        {/* Header Logo with gold rings */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="flex items-center gap-3"
        >
          <div className="relative">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="13.5" stroke="#C79A4B" strokeWidth="1" />
              <circle cx="15" cy="15" r="9.5" stroke="#C79A4B" strokeWidth="1" opacity="0.5" />
              <text x="15" y="19.5" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill="#C79A4B">
                P
              </text>
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: "var(--font-display)" }} className="text-[15px] tracking-[0.14em] uppercase text-[#F2F3F5] font-bold">
                Pulse // S4
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                CORE ACCESS
              </span>
            </div>
            <p className="text-[10px] text-[#4A5160] tracking-tight font-mono">SAP S/4HANA Neural Gateway</p>
          </div>
        </motion.div>

        {/* Live Hex & Waveform HUD */}
        <div className="hidden md:flex items-center gap-6 px-4 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Binary className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-slate-400">CIPHER:</span>
            <span className="text-cyan-300 font-bold">{hexData}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-slate-400">STATUS:</span>
            <span className="text-emerald-400 font-semibold">GATEWAY READY</span>
          </div>
        </div>

        {/* Top Right Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all font-mono text-xs font-semibold hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSignUp ? "SWITCH TO LOGIN" : "PROVISION ACCESS"}</span>
          </button>
        </div>
      </header>

      {/* Main Double-Pane Interactive Cyber Console */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Pane: Animated HUD, Audio Waveforms & Terminal */}
        <motion.div 
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 flex flex-col justify-between space-y-5"
        >
          <div>
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono mb-3 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Multi-Modal Autonomous Supply Chain Twin 2026</span>
            </div>

            {/* Glowing Animated Headline */}
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12] mb-3">
              Autonomous Logistics <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.3)]">
                Neural Gateway Portal
              </span>
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mb-4">
              Real-time SAP S/4HANA OData bridges, automated chaos mitigation triggers, and cryptographic SLA ledger execution.
            </p>
          </div>

          {/* Real-time Oscilloscope Audio-wave HUD visual */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md">
              <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                <span>SAP SYNC</span>
                <span className="text-emerald-400 font-bold">&lt;38ms</span>
              </div>
              <div className="h-6 flex items-end gap-1">
                {[40, 65, 30, 85, 95, 45, 70, 50, 90, 60].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.4}%`, `${h}%`, `${h * 0.5}%`] }}
                    transition={{ repeat: Infinity, duration: 1.2 + (i % 3) * 0.3, ease: "easeInOut" }}
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-sm"
                  />
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md">
              <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                <span>TWIN LOAD</span>
                <span className="text-cyan-400 font-bold">99.8%</span>
              </div>
              <div className="h-6 flex items-end gap-1">
                {[55, 35, 75, 45, 80, 60, 95, 35, 70, 85].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.5}%`, `${h}%`, `${h * 0.3}%`] }}
                    transition={{ repeat: Infinity, duration: 1.5 + (i % 4) * 0.2, ease: "easeInOut" }}
                    className="flex-1 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-sm"
                  />
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md">
              <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                <span>SLA SHIELD</span>
                <span className="text-purple-400 font-bold">VALID</span>
              </div>
              <div className="h-6 flex items-end gap-1">
                {[70, 50, 85, 40, 65, 90, 45, 75, 60, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.6}%`] }}
                    transition={{ repeat: Infinity, duration: 1.3 + (i % 2) * 0.4, ease: "easeInOut" }}
                    className="flex-1 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-sm"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Animated Matrix Terminal Feed */}
          <div className="rounded-xl bg-[#060b17]/95 border border-white/10 p-3.5 font-mono text-[11px] shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>DAEMON_STREAM // S4_KERNEL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500/80 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
            </div>

            <div className="space-y-1.5 text-slate-300 h-24 overflow-y-auto scrollbar-none">
              {logs.map((l, i) => (
                <div key={i} className="flex items-center gap-2 opacity-90 text-[10px]">
                  <span className="text-cyan-500 font-bold">&gt;</span>
                  <span className="text-slate-300">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Pane: Cyber Form Console */}
        <motion.div 
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none"
        >
          <div className="rounded-2xl bg-[#080e1d]/90 border border-white/[0.12] backdrop-blur-2xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/60 relative overflow-hidden">
            
            {/* Top Glowing Laser Border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]" />

            {/* Form Mode Selector */}
            <div className="flex items-center p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                  !isSignUp 
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                  isSignUp 
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                PROVISION ACCESS
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Persona Selector with Mini Metric Chips */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Workspace Persona
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        formData.role === r.id
                          ? `${r.borderGlow} ${r.shadow}`
                          : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-white leading-tight">{r.title}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${formData.role === r.id ? r.accent : "bg-white/20"}`} />
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono opacity-80 mt-1">
                        <span>{r.badge}</span>
                        <span className="font-bold text-white px-1 rounded bg-white/10">{r.metric}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic SignUp Fields */}
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    key="signup-extra"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Operator Full Name
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Enterprise Plant / Division
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email / Operator ID */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Enterprise Work ID / Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Passphrase / Key */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Cryptographic Key / Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg text-xs font-mono text-white placeholder-slate-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Progress bar during authentication */}
              {loading && (
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${authProgress}%` }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_#38bdf8]"
                  />
                </div>
              )}

              {/* Main Animated Submit Trigger */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black font-mono text-xs tracking-wider uppercase transition-all shadow-[0_0_22px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950 animate-bounce" />
                      <span>CLEARANCE GRANTED • ENTERING 3D TWIN HUB...</span>
                    </>
                  ) : loading ? (
                    <>
                      <Cpu className="w-4 h-4 animate-spin text-slate-950" />
                      <span>AUTHENTICATING ODATA CERTIFICATE...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-slate-950" />
                      <span>{isSignUp ? "PROVISION & LAUNCH HUB" : "AUTHENTICATE & ENTER HUB"}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Modern Compact Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#040711]/90 backdrop-blur-xl px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#4A5160] font-mono gap-2">
        <div>SAP Enterprise Hackathon 2026 · Team Autonomous Twin</div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400">TLS 1.3 Certified</span>
          <span>•</span>
          <span>AES-256 S/4HANA OData Core</span>
        </div>
      </footer>
    </div>
  );
}