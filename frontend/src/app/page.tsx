"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const Logo3D = dynamic(() => import("@/components/logo"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface MeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: string;
}

interface RippleWave {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export default function LandingAuthPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });
  const ripplesRef = useRef<RippleWave[]>([]);

  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);
  const cursorOrbitRef = useRef<HTMLDivElement | null>(null);
  const cursorTrailRef = useRef<HTMLDivElement | null>(null);
  const cursorTarget = useRef({ x: -100, y: -100 });
  const cursorRingPos = useRef({ x: -100, y: -100 });
  const cursorOrbitPos = useRef({ x: -100, y: -100 });
  const cursorTrailPos = useRef({ x: -100, y: -100 });
  const cursorVelocity = useRef({ vx: 0, vy: 0 });
  const isHoveringInteractive = useRef(false);
  const isPointerDown = useRef(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const tiltTarget = useRef({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const tiltCurrent = useRef({ rx: 0, ry: 0, gx: 50, gy: 50 });

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorVelocity.current = {
        vx: e.clientX - cursorTarget.current.x,
        vy: e.clientY - cursorTarget.current.y,
      };
      cursorTarget.current = { x: e.clientX, y: e.clientY };
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest(
        "button, a, input, [role='tab'], [role='button'], .cursor-pointer"
      );
      isHoveringInteractive.current = Boolean(interactive);
    };

    const onDown = () => {
      isPointerDown.current = true;
    };

    const onUp = () => {
      isPointerDown.current = false;
    };

    const onLeave = () => {
      cursorTarget.current = { x: -100, y: -100 };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  useEffect(() => {
    let rafId: number;
    let angle = 0;

    const animateFrame = () => {
      const cur = tiltCurrent.current;
      const tgt = tiltTarget.current;

      cur.rx += (tgt.rx - cur.rx) * 0.085;
      cur.ry += (tgt.ry - cur.ry) * 0.085;
      cur.gx += (tgt.gx - cur.gx) * 0.12;
      cur.gy += (tgt.gy - cur.gy) * 0.12;

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(${cur.rx.toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg)`;
      }
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(300px circle at ${cur.gx.toFixed(1)}% ${cur.gy.toFixed(1)}%, ${
          isDark ? "rgba(0, 245, 212, 0.08)" : "rgba(255, 255, 255, 0.6)"
        }, transparent 70%)`;
      }

      const ct = cursorTarget.current;
      const cr = cursorRingPos.current;
      const co = cursorOrbitPos.current;
      const ctr = cursorTrailPos.current;

      cr.x += (ct.x - cr.x) * 0.2;
      cr.y += (ct.y - cr.y) * 0.2;

      co.x += (ct.x - co.x) * 0.14;
      co.y += (ct.y - co.y) * 0.14;

      ctr.x += (ct.x - ctr.x) * 0.075;
      ctr.y += (ct.y - ctr.y) * 0.075;

      angle = (angle + (isHoveringInteractive.current ? 4.2 : 1.8)) % 360;

      const speed = Math.min(28, Math.hypot(cursorVelocity.current.vx, cursorVelocity.current.vy));
      const stretch = 1 + speed * 0.012;
      const moveAngle =
        Math.atan2(cursorVelocity.current.vy, cursorVelocity.current.vx) * (180 / Math.PI);
      cursorVelocity.current.vx *= 0.85;
      cursorVelocity.current.vy *= 0.85;

      const hoverScale = isPointerDown.current
        ? 0.72
        : isHoveringInteractive.current
        ? 1.75
        : 1;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${ct.x}px, ${ct.y}px, 0) translate(-50%, -50%) rotate(${moveAngle.toFixed(1)}deg) scale(${
          isPointerDown.current
            ? 1.6
            : isHoveringInteractive.current
            ? 0.45
            : `${stretch.toFixed(2)}, ${(1 / Math.sqrt(stretch)).toFixed(2)}`
        })`;
      }
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${cr.x.toFixed(2)}px, ${cr.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${hoverScale})`;
      }
      if (cursorOrbitRef.current) {
        cursorOrbitRef.current.style.transform = `translate3d(${co.x.toFixed(2)}px, ${co.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg) scale(${
          isPointerDown.current ? 0.65 : isHoveringInteractive.current ? 1.55 : 1
        })`;
      }
      if (cursorTrailRef.current) {
        cursorTrailRef.current.style.transform = `translate3d(${ctr.x.toFixed(2)}px, ${ctr.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${
          isHoveringInteractive.current ? 2.1 : 1.15
        })`;
      }

      rafId = requestAnimationFrame(animateFrame);
    };
    rafId = requestAnimationFrame(animateFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isDark]);

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

    const nodeCount = Math.min(82, Math.floor((width * height) / 17500));
    const paletteDark = ["#00f5d4", "#00bbf9", "#ff2a85", "#9b5de5"];
    const paletteLight = ["#e11d48", "#d97706", "#be185d", "#f59e0b"];
    const palette = isDark ? paletteDark : paletteLight;

    const nodes: MeshNode[] = Array.from({ length: nodeCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.52,
      vy: (Math.random() - 0.5) * 0.52,
      radius: Math.random() * 1.9 + 1.1,
      hue: palette[i % palette.length],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        const dxMouse = pointerRef.current.x - n.x;
        const dyMouse = pointerRef.current.y - n.y;
        const distMouse = Math.hypot(dxMouse, dyMouse);

        if (distMouse < 210 && distMouse > 1) {
          const force = (210 - distMouse) / 210;
          n.x -= (dxMouse / distMouse) * force * 1.15;
          n.y -= (dyMouse / distMouse) * force * 1.15;
        }

        if (distMouse < 175) {
          const pointerAlpha = (1 - distMouse / 175) * (isDark ? 0.36 : 0.2);
          ctx.beginPath();
          ctx.strokeStyle = isDark
            ? `rgba(255, 42, 133, ${pointerAlpha})`
            : `rgba(217, 119, 6, ${pointerAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(pointerRef.current.x, pointerRef.current.y);
          ctx.stroke();
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 145) {
            const alpha = (1 - dist / 145) * (isDark ? 0.25 : 0.14);
            ctx.beginPath();
            ctx.strokeStyle = isDark
              ? `rgba(0, 245, 212, ${alpha})`
              : `rgba(225, 29, 72, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.hue;
        ctx.shadowBlur = isDark ? 14 : 6;
        ctx.shadowColor = n.hue;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 6.5;
        r.alpha *= 0.945;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(0, 245, 212, ${r.alpha})`
          : `rgba(225, 29, 72, ${r.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (r.alpha < 0.015) {
          ripples.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDark]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    ripplesRef.current.push({
      x: e.clientX,
      y: e.clientY,
      radius: 10,
      alpha: isDark ? 0.55 : 0.35,
    });
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    tiltTarget.current = {
      rx: -(normY - 0.5) * 10,
      ry: (normX - 0.5) * 10,
      gx: normX * 100,
      gy: normY * 100,
    };
  };

  const handleCardMouseLeave = () => {
    tiltTarget.current = { rx: 0, ry: 0, gx: 50, gy: 50 };
  };

  const handleMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.18;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.26;
    setBtnOffset({ x, y });
  };

  const handleMagneticLeave = () => {
    setBtnOffset({ x: 0, y: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "signin" ? "/v1/auth/login" : "/v1/auth/register";
      const body =
        mode === "signin"
          ? { username: username.trim(), password }
          : { username: username.trim(), password, full_name: fullName.trim() || username.trim() };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Invalid credentials.");
      }

      if (data.access_token || data.token) {
        localStorage.setItem("token", data.access_token || data.token);
      }
      router.push("/hub");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Authentication service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const titleTop = "SELFHEAL";
  const titleBottom = "COMMAND";

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={handleStageClick}
      className="min-h-screen w-full relative overflow-hidden flex flex-col justify-between transition-colors duration-700 selection:bg-cyan-400/30 selection:text-cyan-200 md:cursor-none"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 50% -15%, #0c1738 0%, #03060f 62%, #010205 100%)"
          : "var(--bg-gradient)",
        color: "var(--color-text)",
      }}
    >
      <style jsx>{`
        @media (pointer: fine) {
          .custom-cursor-scope,
          .custom-cursor-scope * {
            cursor: none !important;
          }
        }
        @keyframes horizonScroll {
          0% {
            background-position: 0px 0px, 0px 0px;
          }
          100% {
            background-position: 0px 76px, 0px 76px;
          }
        }
        @keyframes conicSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes conicSpinReverse {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        @keyframes auroraFlow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes lightSweep {
          0% {
            transform: translateX(-150%) skewX(-22deg);
          }
          100% {
            transform: translateX(320%) skewX(-22deg);
          }
        }
        @keyframes liquidMorph {
          0%, 100% {
            border-radius: 44% 56% 68% 32% / 46% 44% 56% 54%;
            transform: translate3d(0px, 0px, 0px) scale(1);
            opacity: 0.26;
          }
          50% {
            border-radius: 66% 34% 48% 52% / 34% 32% 68% 66%;
            transform: translate3d(22px, -18px, 0px) scale(1.13);
            opacity: 0.42;
          }
        }
        @keyframes ringRotateSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes ringRotateReverse {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        @keyframes conduitDash {
          0% {
            stroke-dashoffset: 240;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes ambientScan {
          0% {
            top: -8%;
            opacity: 0;
          }
          20% {
            opacity: 0.4;
          }
          80% {
            opacity: 0.4;
          }
          100% {
            top: 108%;
            opacity: 0;
          }
        }
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(-50%) translateX(0px);
          }
          50% {
            transform: translateY(calc(-50% - 12px)) translateX(6px);
          }
        }
        .cyber-horizon {
          background-image: linear-gradient(
              to right,
              ${isDark ? "rgba(0, 245, 212, 0.13)" : "rgba(225, 29, 72, 0.09)"} 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              ${isDark ? "rgba(255, 42, 133, 0.13)" : "rgba(217, 119, 6, 0.09)"} 1px,
              transparent 1px
            );
          background-size: 76px 76px;
          transform: perspective(540px) rotateX(66deg) scale(1.9);
          transform-origin: center bottom;
          animation: horizonScroll 3s linear infinite;
        }
        .text-aurora {
          background-size: 220% 220%;
          animation: auroraFlow 6s ease infinite;
        }
        .card-border-orbit {
          animation: conicSpin 6.5s linear infinite;
        }
        .card-border-counter {
          animation: conicSpinReverse 11s linear infinite;
        }
        .cta-sweep {
          animation: lightSweep 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .orb-drift {
          animation: liquidMorph 11s ease-in-out infinite;
        }
        .gyro-wrap {
          animation: floatSlow 9s ease-in-out infinite;
        }
        .gyro-outer {
          animation: ringRotateSlow 32s linear infinite;
        }
        .gyro-inner {
          animation: ringRotateReverse 21s linear infinite;
        }
        .conduit-pulse {
          stroke-dasharray: 48 192;
          animation: conduitDash 3s linear infinite;
        }
        .scan-beam {
          animation: ambientScan 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Multi-Layer Orbital & Elastic Custom Cursor */}
      <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block" aria-hidden="true">
        {/* Ambient Chromatic Aura Trail */}
        <div
          ref={cursorTrailRef}
          className="fixed top-0 left-0 w-16 h-16 rounded-full blur-lg opacity-35 will-change-transform"
          style={{
            background: isDark
              ? "radial-gradient(circle, #00f5d4 0%, #00bbf9 45%, #ff2a85 80%, transparent 100%)"
              : "radial-gradient(circle, var(--color-primary) 0%, var(--color-secondary) 75%, transparent 100%)",
          }}
        />

        {/* Rotating Orbital Satellite Ring */}
        <div
          ref={cursorOrbitRef}
          className="fixed top-0 left-0 w-12 h-12 rounded-full will-change-transform"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full overflow-visible">
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke={isDark ? "rgba(255, 42, 133, 0.55)" : "color-mix(in srgb, var(--color-secondary) 55%, transparent)"}
              strokeWidth="1"
              strokeDasharray="6 10 2 10"
            />
            <circle
              cx="24"
              cy="3"
              r="2.2"
              fill={isDark ? "#00f5d4" : "var(--color-primary)"}
            />
            <circle
              cx="24"
              cy="45"
              r="1.8"
              fill={isDark ? "#ff2a85" : "var(--color-secondary)"}
            />
          </svg>
        </div>

        {/* Frosted Precision Iris Ring */}
        <div
          ref={cursorRingRef}
          className="fixed top-0 left-0 w-8 h-8 rounded-full border backdrop-blur-[1px] transition-[border-color,background-color] duration-200 will-change-transform"
          style={{
            borderColor: isDark
              ? "rgba(0, 245, 212, 0.8)"
              : "color-mix(in srgb, var(--color-primary) 75%, transparent)",
            backgroundColor: isDark
              ? "rgba(0, 245, 212, 0.06)"
              : "color-mix(in srgb, var(--color-primary) 7%, transparent)",
            boxShadow: isDark
              ? "0 0 16px rgba(0, 245, 212, 0.3), inset 0 0 8px rgba(255, 42, 133, 0.2)"
              : "0 0 10px color-mix(in srgb, var(--color-primary) 20%, transparent)",
          }}
        />

        {/* Velocity-Stretching Core Spark */}
        <div
          ref={cursorDotRef}
          className="fixed top-0 left-0 w-2 h-2 rounded-full will-change-transform"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #ffffff 0%, #00f5d4 100%)"
              : "var(--color-primary)",
            boxShadow: isDark
              ? "0 0 10px #00f5d4, 0 0 22px #ff2a85"
              : "0 0 10px var(--color-primary)",
          }}
        />
      </div>

      {/* Interactive Physics Particle Mesh */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
        aria-hidden="true"
      />

      {/* Interactive Cursor Spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: isDark
            ? `radial-gradient(640px circle at ${mousePos.x}% ${mousePos.y}%, rgba(0, 245, 212, 0.14), rgba(255, 42, 133, 0.07) 42%, transparent 72%)`
            : `radial-gradient(640px circle at ${mousePos.x}% ${mousePos.y}%, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Subtle Ambient Scanline Sweep */}
      <div
        className="pointer-events-none fixed inset-x-0 h-[1px] z-0 scan-beam"
        style={{
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(0, 245, 212, 0.45), rgba(255, 42, 133, 0.45), transparent)"
            : "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent)",
        }}
        aria-hidden="true"
      />

      {/* Morphing Atmospheric Orbs */}
      <div
        className="pointer-events-none absolute -top-40 left-[4%] w-[580px] h-[580px] blur-[165px] orb-drift"
        style={{ background: isDark ? "#00f5d4" : "var(--color-primary)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-44 right-[4%] w-[620px] h-[620px] blur-[175px] orb-drift"
        style={{ background: isDark ? "#ff2a85" : "var(--color-secondary)", animationDelay: "5.5s" }}
        aria-hidden="true"
      />

      {/* Perspective Horizon Grid */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44vh] z-0 opacity-75 cyber-horizon"
        style={{
          maskImage: "linear-gradient(to top, #000 15%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to top, #000 15%, transparent 95%)",
        }}
        aria-hidden="true"
      />

      {/* Wrapper enforcing custom cursor across interactive children */}
      <div className="custom-cursor-scope relative z-10 flex flex-col justify-between min-h-screen w-full">
        {/* Clean Emblem-Only Top Bar */}
        <header
          className={`relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div onClick={(e) => e.stopPropagation()} className="relative group cursor-pointer">
            <div
              className="absolute -inset-2.5 rounded-full blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: isDark
                  ? "linear-gradient(120deg, #00f5d4, #ff2a85)"
                  : "var(--color-primary)",
              }}
            />
            <div className="relative transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-12 group-hover:scale-110">
              <Logo3D darkMode={isDark} />
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Architectural Stage */}
        <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
          {/* Left: Sculptural Staggered Typography & Gyroscopic Conduit */}
          <div className="lg:col-span-7 relative flex flex-col justify-center">
            <div
              className="pointer-events-none absolute -left-20 top-1/2 w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] opacity-40 gyro-wrap"
              aria-hidden="true"
            >
              <svg viewBox="0 0 460 460" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="neonRingA" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? "#00f5d4" : "#e11d48"} stopOpacity="0.95" />
                    <stop offset="50%" stopColor={isDark ? "#00bbf9" : "#f59e0b"} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={isDark ? "#ff2a85" : "#d97706"} stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                <g className="gyro-outer" style={{ transformOrigin: "230px 230px" }}>
                  <circle
                    cx="230"
                    cy="230"
                    r="195"
                    fill="none"
                    stroke="url(#neonRingA)"
                    strokeWidth="1.25"
                    strokeDasharray="22 12 4 12"
                  />
                  <circle cx="230" cy="35" r="4" fill={isDark ? "#00f5d4" : "#e11d48"} />
                  <circle cx="230" cy="425" r="3" fill={isDark ? "#00bbf9" : "#f59e0b"} />
                </g>

                <g className="gyro-inner" style={{ transformOrigin: "230px 230px" }}>
                  <circle
                    cx="230"
                    cy="230"
                    r="146"
                    fill="none"
                    stroke="url(#neonRingA)"
                    strokeWidth="1"
                    strokeDasharray="48 18"
                  />
                  <circle cx="376" cy="230" r="3.5" fill={isDark ? "#ff2a85" : "#d97706"} />
                </g>

                <line
                  x1="230"
                  y1="230"
                  x2="660"
                  y2="230"
                  stroke={isDark ? "rgba(0, 245, 212, 0.14)" : "rgba(225, 29, 72, 0.12)"}
                  strokeWidth="1"
                />
                <line
                  x1="230"
                  y1="230"
                  x2="660"
                  y2="230"
                  stroke={isDark ? "#00f5d4" : "#e11d48"}
                  strokeWidth="1.75"
                  className="conduit-pulse"
                />
              </svg>
            </div>

            <div className="relative z-10 space-y-5">
              <div
                className={`flex items-center gap-3.5 transition-all duration-1000 ease-out ${
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
                }`}
              >
                <span
                  className="h-[2px] w-12 rounded-full transition-all duration-700"
                  style={{
                    background: isDark
                      ? "linear-gradient(90deg, #00f5d4, #ff2a85)"
                      : "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                  }}
                />
                <span
                  className="text-[11px] font-mono font-bold uppercase tracking-[0.38em]"
                  style={{ color: isDark ? "#00f5d4" : "var(--color-primary)" }}
                >
                  AUTONOMOUS INTELLIGENCE
                </span>
              </div>

              <h1
                className="text-5xl sm:text-7xl xl:text-[5.75rem] font-black tracking-tight leading-[0.95] uppercase select-none"
                style={{ perspective: "900px" }}
              >
                <span className="block overflow-hidden pb-1">
                  {titleTop.split("").map((char, i) => (
                    <span
                      key={i}
                      className="inline-block transition-all duration-700 ease-[cubic-bezier(0.22,1.35,0.36,1)] hover:-translate-y-2 hover:scale-105"
                      style={{
                        transitionDelay: `${120 + i * 40}ms`,
                        opacity: mounted ? 1 : 0,
                        transform: mounted
                          ? "translateY(0) rotateX(0deg)"
                          : "translateY(115%) rotateX(-70deg)",
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>

                <span className="block overflow-hidden pb-2">
                  {titleBottom.split("").map((char, i) => (
                    <span
                      key={i}
                      className="inline-block bg-clip-text text-transparent text-aurora transition-all duration-700 ease-[cubic-bezier(0.22,1.35,0.36,1)] hover:-translate-y-2 hover:scale-105"
                      style={{
                        transitionDelay: `${380 + i * 42}ms`,
                        opacity: mounted ? 1 : 0,
                        transform: mounted
                          ? "translateY(0) rotateX(0deg)"
                          : "translateY(115%) rotateX(-70deg)",
                        backgroundImage: isDark
                          ? "linear-gradient(110deg, #00f5d4 0%, #00bbf9 38%, #ff2a85 75%, #00f5d4 100%)"
                          : "linear-gradient(115deg, var(--color-primary) 10%, var(--color-secondary) 90%)",
                        filter: isDark ? "drop-shadow(0 0 28px rgba(0, 245, 212, 0.25))" : "none",
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </h1>

              <p
                className={`text-sm sm:text-base max-w-md font-light tracking-wide leading-relaxed transition-all duration-1000 delay-500 ease-out ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ color: "var(--color-text-muted)" }}
              >
                Adaptive global logistics orchestrated in real time.
              </p>
            </div>
          </div>

          {/* Right: Lerp-Smoothed 3D Specular Glass Terminal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`lg:col-span-5 w-full max-w-[420px] mx-auto lg:ml-auto transition-all duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"
            }`}
            style={{ perspective: "1300px" }}
          >
            <div
              ref={cardRef}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="relative p-[1.5px] rounded-[28px] overflow-hidden shadow-2xl will-change-transform"
              style={{
                boxShadow: isDark
                  ? "0 35px 80px -15px rgba(0, 245, 212, 0.22), 0 0 50px -12px rgba(255, 42, 133, 0.22)"
                  : "0 30px 65px -15px rgba(0, 0, 0, 0.12)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-[-130%] card-border-orbit opacity-95"
                style={{
                  background: isDark
                    ? "conic-gradient(from 0deg, #00f5d4, #00bbf9, #ff2a85, transparent 52%, #00f5d4)"
                    : "conic-gradient(from 0deg, var(--color-primary), var(--color-secondary), transparent 58%, var(--color-primary))",
                }}
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-[-130%] card-border-counter opacity-50"
                style={{
                  background: isDark
                    ? "conic-gradient(from 180deg, #9b5de5, transparent 48%, #00f5d4, transparent 85%)"
                    : "conic-gradient(from 180deg, var(--color-secondary), transparent 50%, var(--color-primary), transparent 85%)",
                }}
                aria-hidden="true"
              />

              <div
                className="relative p-8 sm:p-9 rounded-[26.5px] backdrop-blur-2xl overflow-hidden"
                style={{
                  background: isDark ? "rgba(5, 9, 20, 0.91)" : "rgba(255, 250, 248, 0.93)",
                }}
              >
                <div
                  ref={glareRef}
                  className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                  aria-hidden="true"
                />

                <span
                  className="pointer-events-none absolute top-3.5 left-3.5 w-3 h-3 border-t border-l opacity-75"
                  style={{ borderColor: isDark ? "#00f5d4" : "var(--color-primary)" }}
                />
                <span
                  className="pointer-events-none absolute top-3.5 right-3.5 w-3 h-3 border-t border-r opacity-75"
                  style={{ borderColor: isDark ? "#ff2a85" : "var(--color-secondary)" }}
                />
                <span
                  className="pointer-events-none absolute bottom-3.5 left-3.5 w-3 h-3 border-b border-l opacity-75"
                  style={{ borderColor: isDark ? "#ff2a85" : "var(--color-secondary)" }}
                />
                <span
                  className="pointer-events-none absolute bottom-3.5 right-3.5 w-3 h-3 border-b border-r opacity-75"
                  style={{ borderColor: isDark ? "#00f5d4" : "var(--color-primary)" }}
                />

                <div className="relative z-10 mb-7">
                  <h2 className="text-2xl font-black tracking-tight">
                    {mode === "signin" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p
                    className="text-xs mt-1 tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {mode === "signin"
                      ? "Enter your credentials to continue."
                      : "Register your operator profile."}
                  </p>
                </div>

                <div
                  className="relative z-10 grid grid-cols-2 p-1 rounded-xl border mb-6"
                  style={{
                    background: isDark
                      ? "rgba(2, 4, 10, 0.82)"
                      : "color-mix(in srgb, var(--color-bg-alt) 65%, transparent)",
                    borderColor: isDark ? "rgba(0, 245, 212, 0.2)" : "var(--color-border)",
                  }}
                  role="tablist"
                >
                  <div
                    className="pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                      left: mode === "signin" ? "4px" : "calc(50%)",
                      background: isDark
                        ? "linear-gradient(90deg, #00f5d4, #00bbf9)"
                        : "linear-gradient(120deg, var(--color-primary), var(--color-secondary))",
                      boxShadow: isDark ? "0 0 22px rgba(0, 245, 212, 0.4)" : "none",
                    }}
                  />

                  {(
                    [
                      ["signin", "Sign In"],
                      ["register", "Create Account"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={mode === key}
                      onClick={() => {
                        setMode(key);
                        setError(null);
                      }}
                      className="relative z-10 py-2 text-xs font-bold tracking-wide rounded-lg transition-colors duration-300 cursor-pointer"
                      style={{
                        color:
                          mode === key
                            ? isDark
                              ? "#02050c"
                              : "#ffffff"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {error && (
                  <div
                    role="alert"
                    className="relative z-10 mb-5 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all duration-300"
                    style={{
                      color: isDark ? "#ff2a85" : "var(--color-danger)",
                      background: isDark
                        ? "rgba(255, 42, 133, 0.1)"
                        : "color-mix(in srgb, var(--color-danger) 12%, transparent)",
                      borderColor: isDark
                        ? "rgba(255, 42, 133, 0.45)"
                        : "color-mix(in srgb, var(--color-danger) 40%, transparent)",
                    }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      mode === "register" ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <label
                      htmlFor="full-name"
                      className="block text-[11px] font-semibold mb-1.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Full Name
                    </label>
                    <div className="relative group">
                      <User
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform duration-300 group-focus-within:scale-115"
                        style={{ color: isDark ? "#00f5d4" : "var(--color-text-muted)" }}
                        aria-hidden="true"
                      />
                      <input
                        id="full-name"
                        type="text"
                        tabIndex={mode === "register" ? 0 : -1}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all duration-300 focus:scale-[1.015]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="block text-[11px] font-semibold mb-1.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Email or Username
                    </label>
                    <div className="relative group">
                      <Mail
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform duration-300 group-focus-within:scale-115"
                        style={{ color: isDark ? "#00f5d4" : "var(--color-text-muted)" }}
                        aria-hidden="true"
                      />
                      <input
                        id="username"
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="name@company.com"
                        className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all duration-300 focus:scale-[1.015]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-[11px] font-semibold mb-1.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Password
                    </label>
                    <div className="relative group">
                      <Lock
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform duration-300 group-focus-within:scale-115"
                        style={{ color: isDark ? "#ff2a85" : "var(--color-text-muted)" }}
                        aria-hidden="true"
                      />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="glass-input w-full rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none transition-all duration-300 focus:scale-[1.015]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-125 cursor-pointer"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    onMouseMove={handleMagneticMove}
                    onMouseLeave={handleMagneticLeave}
                    className="group relative w-full py-3.5 mt-3 rounded-xl text-xs font-extrabold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-50 cursor-pointer overflow-hidden"
                    style={{
                      transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)`,
                      background: isDark
                        ? "linear-gradient(90deg, #00f5d4 0%, #00bbf9 50%, #ff2a85 100%)"
                        : "linear-gradient(120deg, var(--color-primary), var(--color-secondary))",
                      color: isDark ? "#02050c" : "#ffffff",
                      boxShadow: isDark
                        ? "0 0 34px rgba(0, 245, 212, 0.42)"
                        : "0 10px 24px color-mix(in srgb, var(--color-primary) 35%, transparent)",
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-y-0 w-20 bg-white/45 blur-md cta-sweep"
                      aria-hidden="true"
                    />

                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Authenticating…</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10">
                          {mode === "signin" ? "Sign In" : "Create Account"}
                        </span>
                        <ArrowRight
                          className="relative z-10 w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-2"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>

        {/* Whisper-Minimal Footer */}
        <footer
          className={`relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between text-[11px] tracking-[0.25em] uppercase transition-opacity duration-1000 delay-700 ${
            mounted ? "opacity-50" : "opacity-0"
          }`}
          style={{ color: "var(--color-text-muted)" }}
        >
          <span>Autonomous Supply Chain</span>
          <span>v2.6</span>
        </footer>
      </div>
    </div>
  );
}