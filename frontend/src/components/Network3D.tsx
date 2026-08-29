// @ts-nocheck
"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

export interface NodePoint {
  id: string;
  name: string;
  city?: string;
  lat: number;
  lng: number;
  status: "active" | "degraded" | "disrupted";
  capacity?: number;
}

export interface RouteLink {
  from: string;
  to: string;
  status: "active" | "congested" | "blocked";
  carrier?: string;
}

const DEFAULT_NODES: NodePoint[] = [
  { id: "FRA", name: "Frankfurt Hub", city: "Frankfurt", lat: 50.11, lng: 8.68, status: "active", capacity: 0.88 },
  { id: "RTM", name: "Rotterdam Port", city: "Rotterdam", lat: 51.92, lng: 4.47, status: "active", capacity: 0.94 },
  { id: "SIN", name: "Singapore Gateway", city: "Singapore", lat: 1.35, lng: 103.82, status: "active", capacity: 0.91 },
  { id: "SUEZ", name: "Suez Canal Corridor", city: "Suez", lat: 29.97, lng: 32.55, status: "disrupted", capacity: 0.22 },
  { id: "NYC", name: "New York Port", city: "New York", lat: 40.71, lng: -74.0, status: "active", capacity: 0.85 },
  { id: "DXB", name: "Dubai Air Cargo Hub", city: "Dubai", lat: 25.2, lng: 55.27, status: "degraded", capacity: 0.62 },
  { id: "SHA", name: "Shanghai Port", city: "Shanghai", lat: 31.23, lng: 121.47, status: "active", capacity: 0.96 },
];

const DEFAULT_ROUTES: RouteLink[] = [
  { from: "SHA", to: "SIN", status: "active", carrier: "Maersk" },
  { from: "SIN", to: "SUEZ", status: "blocked", carrier: "Hapag-Lloyd" },
  { from: "SUEZ", to: "RTM", status: "blocked", carrier: "MSC" },
  { from: "RTM", to: "FRA", status: "active", carrier: "DB Schenker" },
  { from: "FRA", to: "NYC", status: "active", carrier: "Lufthansa Cargo" },
  { from: "DXB", to: "FRA", status: "congested", carrier: "Emirates SkyCargo" },
];

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function isLand(lat: number, lng: number): boolean {
  if (lat > 15 && lat < 72 && lng > -168 && lng < -52) return true;
  if (lat > -56 && lat < 13 && lng > -82 && lng < -34) return true;
  if (lat > 35 && lat < 71 && lng > -10 && lng < 42) return true;
  if (lat > -35 && lat < 37 && lng > -18 && lng < 52) return true;
  if (lat > 5 && lat < 75 && lng > 42 && lng < 152) return true;
  if (lat > -44 && lat < -10 && lng > 113 && lng < 154) return true;
  return false;
}

/* ---------------- Transit Arc ---------------- */

function TransitArc({
  p1,
  p2,
  status,
  isDark,
}: {
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  status: "active" | "congested" | "blocked";
  isDark: boolean;
}) {
  const dotRef = useRef<THREE.Mesh>(null);
  const prog = useRef(Math.random());

  const { curve, pts } = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const d = p1.distanceTo(p2);
    mid.normalize().multiplyScalar(2.55 + Math.min(d * 0.28, 1.2));
    const c = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    return { curve: c, pts: c.getPoints(44) };
  }, [p1, p2]);

  const color =
    status === "blocked"
      ? "#f43f5e"
      : status === "congested"
      ? "#f59e0b"
      : isDark
      ? "#38bdf8"
      : "#2563eb";

  useFrame((_, delta) => {
    if (dotRef.current) {
      prog.current = (prog.current + delta * 0.35) % 1;
      dotRef.current.position.copy(curve.getPoint(prog.current));
    }
  });

  return (
    <group>
      <Line
        points={pts}
        color={color}
        lineWidth={status === "blocked" ? 2.6 : 1.8}
        transparent
        opacity={status === "blocked" ? 0.4 : 0.85}
      />
      {status !== "blocked" && (
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshBasicMaterial color={isDark ? "#ffffff" : "#1d4ed8"} />
        </mesh>
      )}
    </group>
  );
}

/* ---------------- Orbital Scan Rings ---------------- */

function OrbitalScanRing({ isDark }: { isDark: boolean }) {
  const ring1 = useRef<THREE.Group>(null);
  const ring2 = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ring1.current) ring1.current.rotation.z += delta * 0.1;
    if (ring2.current) ring2.current.rotation.y -= delta * 0.08;
  });

  return (
    <>
      <group ref={ring1} rotation={[Math.PI / 3.5, 0, 0]}>
        <mesh>
          <ringGeometry args={[3.25, 3.265, 96]} />
          <meshBasicMaterial
            color={isDark ? "#38bdf8" : "#3b82f6"}
            side={THREE.DoubleSide}
            transparent
            opacity={isDark ? 0.35 : 0.45}
          />
        </mesh>
      </group>
      <group ref={ring2} rotation={[0, Math.PI / 4, Math.PI / 6]}>
        <mesh>
          <ringGeometry args={[3.45, 3.46, 96]} />
          <meshBasicMaterial
            color={isDark ? "#a855f7" : "#8b5cf6"}
            side={THREE.DoubleSide}
            transparent
            opacity={isDark ? 0.25 : 0.35}
          />
        </mesh>
      </group>
    </>
  );
}

/* ---------------- Pulsing alert ring for at-risk hubs ---------------- */

function AlertRing({ position, color }: { position: THREE.Vector3; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current = (t.current + delta * 0.7) % 1;
    const scale = 1 + t.current * 2.2;
    if (ref.current) {
      ref.current.scale.setScalar(scale);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.65 * (1 - t.current));
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <ringGeometry args={[0.09, 0.115, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ---------------- Camera intro sweep ---------------- */

function CameraRig({ targetPos }: { targetPos: [number, number, number] }) {
  const { camera } = require("@react-three/fiber").useThree();
  const startedAt = useRef(0);
  const from = useRef(new THREE.Vector3(0, 5.5, 11));
  const to = useRef(new THREE.Vector3(...targetPos));

  useFrame((state) => {
    if (startedAt.current === 0) startedAt.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startedAt.current;
    const duration = 2.2;
    if (elapsed < duration) {
      const t = 1 - Math.pow(1 - elapsed / duration, 3); // ease-out cubic
      camera.position.lerpVectors(from.current, to.current, t);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

/* ---------------- Digital Globe ---------------- */

function DigitalGlobe({
  nodes = [],
  routes = [],
  selectedNode = null,
  onSelectNode = () => {},
  setHovered = () => {},
  isDark = true,
}: {
  nodes?: NodePoint[];
  routes?: RouteLink[];
  selectedNode?: NodePoint | null;
  onSelectNode?: (n: NodePoint) => void;
  setHovered?: (n: NodePoint | null) => void;
  isDark?: boolean;
}) {
  const globeRef = useRef<THREE.Group>(null);
  const radius = 2.5;

  useFrame((_, delta) => {
    if (globeRef.current && !selectedNode) {
      globeRef.current.rotation.y += delta * 0.05;
    }
  });

  const nodeMap = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    (nodes || []).forEach((n) => m.set(n.id, latLngToVec3(n.lat, n.lng, radius)));
    return m;
  }, [nodes]);

  const { landGeo, oceanGeo } = useMemo(() => {
    const landCoords: number[] = [];
    const oceanCoords: number[] = [];
    const totalSamples = 14000;

    for (let i = 0; i < totalSamples; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2 * Math.PI;
      const phi = Math.acos(2 * v - 1);
      const lat = 90 - (phi * 180) / Math.PI;
      const lng = (theta * 180) / Math.PI - 180;
      const r = radius * 1.002;
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi);

      if (isLand(lat, lng)) {
        landCoords.push(x, y, z);
      } else if (Math.random() < 0.05) {
        oceanCoords.push(x, y, z);
      }
    }

    const lG = new THREE.BufferGeometry();
    lG.setAttribute("position", new THREE.Float32BufferAttribute(landCoords, 3));
    const oG = new THREE.BufferGeometry();
    oG.setAttribute("position", new THREE.Float32BufferAttribute(oceanCoords, 3));
    return { landGeo: lG, oceanGeo: oG };
  }, [radius]);

  return (
    <group ref={globeRef}>
      {/* Oceanic Core Sphere */}
      <mesh>
        <sphereGeometry args={[radius * 0.99, 64, 64]} />
        <meshStandardMaterial
          color={isDark ? "#0f1f38" : "#dbeafe"}
          emissive={isDark ? "#071326" : "#bfdbfe"}
          emissiveIntensity={isDark ? 0.7 : 0.3}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Subtle Coordinate Grid Lines */}
      <mesh>
        <sphereGeometry args={[radius * 1.001, 32, 16]} />
        <meshBasicMaterial
          color={isDark ? "#1e3a8a" : "#93c5fd"}
          wireframe
          transparent
          opacity={isDark ? 0.22 : 0.3}
        />
      </mesh>

      {/* High-Contrast Continental Matrix */}
      <points geometry={landGeo}>
        <pointsMaterial
          size={0.038}
          color={isDark ? "#38ef7d" : "#0284c7"}
          sizeAttenuation
          transparent
          opacity={0.95}
        />
      </points>

      {/* Ocean Depth Particles */}
      <points geometry={oceanGeo}>
        <pointsMaterial
          size={0.016}
          color={isDark ? "#38bdf8" : "#60a5fa"}
          sizeAttenuation
          transparent
          opacity={isDark ? 0.4 : 0.5}
        />
      </points>

      {/* Atmospheric Rim Glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.12, 32, 32]} />
        <meshBasicMaterial
          color={isDark ? "#3b82f6" : "#60a5fa"}
          transparent
          opacity={isDark ? 0.08 : 0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Orbital Scan Rings */}
      <OrbitalScanRing isDark={isDark} />

      {/* Transit Arcs */}
      {(routes || []).map((r, i) => {
        const p1 = nodeMap.get(r.from);
        const p2 = nodeMap.get(r.to);
        if (!p1 || !p2) return null;
        return <TransitArc key={i} p1={p1} p2={p2} status={r.status} isDark={isDark} />;
      })}

      {/* Hub Beacons + Alert Rings */}
      {(nodes || []).map((n) => {
        const pos = nodeMap.get(n.id);
        if (!pos) return null;
        const color =
          n.status === "disrupted" ? "#f43f5e" : n.status === "degraded" ? "#f59e0b" : "#10b981";

        return (
          <group key={n.id}>
            <group position={pos}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(n);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = "pointer";
                  setHovered(n);
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "auto";
                  setHovered(null);
                }}
              >
                <sphereGeometry args={[0.085, 18, 18]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isDark ? 3.0 : 1.8}
                />
              </mesh>
            </group>
            {n.status !== "active" && <AlertRing position={pos} color={color} />}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- Root export ---------------- */

export default function Network3D({
  nodes = DEFAULT_NODES,
  routes = DEFAULT_ROUTES,
  selectedNode = null,
  onSelectNode = () => {},
  darkMode = true,
}: {
  nodes?: NodePoint[];
  routes?: RouteLink[];
  selectedNode?: NodePoint | null;
  onSelectNode?: (n: NodePoint) => void;
  darkMode?: boolean;
}) {
  const [hovered, setHovered] = useState<NodePoint | null>(null);

  const finalNodes = nodes && nodes.length > 0 ? nodes : DEFAULT_NODES;
  const finalRoutes = routes && routes.length > 0 ? routes : DEFAULT_ROUTES;

  return (
    <div
      className={`w-full h-full relative overflow-hidden rounded-2xl transition-colors duration-300 ${
        darkMode ? "bg-[#0b1528]" : "bg-[#edf4fb]"
      }`}
    >
      <Canvas camera={{ position: [0, 5.5, 11], fov: 44 }}>
        <ambientLight intensity={darkMode ? 0.7 : 0.9} />
        <pointLight position={[14, 14, 14]} intensity={2.2} color={darkMode ? "#38bdf8" : "#2563eb"} />
        <pointLight position={[-14, -14, -14]} intensity={0.6} color="#818cf8" />
        {darkMode && (
          <Stars radius={90} depth={45} count={2500} factor={3.5} saturation={0} fade speed={1} />
        )}

        <CameraRig targetPos={[0, 1.2, 6.4]} />

        <DigitalGlobe
          nodes={finalNodes}
          routes={finalRoutes}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          setHovered={setHovered}
          isDark={darkMode}
        />

        <OrbitControls enablePan={false} minDistance={3.5} maxDistance={9} rotateSpeed={0.6} />

        <EffectComposer>
          <Bloom
            intensity={darkMode ? 0.9 : 0.4}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={darkMode ? 0.7 : 0.3} />
        </EffectComposer>
      </Canvas>

      {/* Floating HUD Tooltip */}
      {hovered && (
        <div
          className={`absolute top-4 left-4 z-20 pointer-events-none p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all ${
            darkMode
              ? "bg-[#0f172a]/95 border-cyan-500/40 text-white shadow-cyan-950/50"
              : "bg-white/95 border-blue-200 text-slate-900 shadow-blue-900/10"
          }`}
        >
          <div className="text-[10px] font-mono font-bold tracking-wider text-blue-500 uppercase">
            HUB TELEMETRY
          </div>
          <div className="text-sm font-bold mt-0.5">{hovered.name}</div>
          <div className="flex gap-4 text-xs mt-1.5 opacity-90">
            <span>
              Status:{" "}
              <strong
                className={
                  hovered.status === "disrupted"
                    ? "text-rose-500"
                    : hovered.status === "degraded"
                    ? "text-amber-500"
                    : "text-emerald-500"
                }
              >
                {hovered.status?.toUpperCase() || "NOMINAL"}
              </strong>
            </span>
            {hovered.capacity !== undefined && (
              <span>
                Capacity: <strong className="font-mono">{Math.round(hovered.capacity * 100)}%</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Legend Badge */}
      <div
        className={`absolute bottom-4 left-4 z-10 flex items-center gap-4 px-3.5 py-1.5 rounded-xl border backdrop-blur-md text-xs font-semibold ${
          darkMode
            ? "bg-[#070e1c]/85 border-slate-750 text-slate-200"
            : "bg-white/90 border-blue-200 text-slate-700 shadow-sm"
        }`}
      >
        <span className="flex items-center gap-1.5 text-emerald-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span> Nominal
        </span>
        <span className="flex items-center gap-1.5 text-amber-500">
          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span> Congested
        </span>
        <span className="flex items-center gap-1.5 text-rose-500">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping"></span> Disrupted
        </span>
      </div>
    </div>
  );
}