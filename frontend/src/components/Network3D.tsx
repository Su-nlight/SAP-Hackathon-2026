// @ts-nocheck
"use client";

import React, { useRef, useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, useTexture, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/* =====================================================================
   Types
   ===================================================================== */
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

export interface EarthTextures {
  day: string;
  night: string;
  specular: string;
  clouds: string;
}

const TEX_BASE = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/";
const DEFAULT_TEXTURES: EarthTextures = {
  day: TEX_BASE + "earth_atmos_2048.jpg",
  night: TEX_BASE + "earth_lights_2048.png",
  specular: TEX_BASE + "earth_specular_2048.jpg",
  clouds: TEX_BASE + "earth_clouds_1024.png",
};

const DEFAULT_NODES: NodePoint[] = [
  { id: "FRA", name: "Frankfurt Hub", city: "Frankfurt", lat: 50.11, lng: 8.68, status: "active", capacity: 0.88 },
  { id: "RTM", name: "Rotterdam Port", city: "Rotterdam", lat: 51.92, lng: 4.47, status: "disrupted", capacity: 0.14 },
  { id: "SIN", name: "Singapore Gateway", city: "Singapore", lat: 1.35, lng: 103.82, status: "active", capacity: 0.91 },
  { id: "SUEZ", name: "Suez Canal Corridor", city: "Suez", lat: 29.97, lng: 32.55, status: "disrupted", capacity: 0.22 },
  { id: "NYC", name: "New York Port", city: "New York", lat: 40.71, lng: -74.0, status: "active", capacity: 0.85 },
  { id: "DXB", name: "Dubai Logistics", city: "Dubai", lat: 25.2, lng: 55.27, status: "degraded", capacity: 0.62 },
  { id: "SHA", name: "Shanghai Port", city: "Shanghai", lat: 31.23, lng: 121.47, status: "active", capacity: 0.96 },
  { id: "BOM", name: "Mumbai Hub", city: "Mumbai", lat: 19.07, lng: 72.87, status: "active", capacity: 0.82 },
  { id: "TYO", name: "Tokyo Terminal", city: "Tokyo", lat: 35.67, lng: 139.65, status: "active", capacity: 0.94 },
];

const DEFAULT_ROUTES: RouteLink[] = [
  { from: "SHA", to: "SIN", status: "active", carrier: "Maersk" },
  { from: "SIN", to: "SUEZ", status: "blocked", carrier: "Hapag-Lloyd" },
  { from: "SUEZ", to: "RTM", status: "blocked", carrier: "MSC" },
  { from: "RTM", to: "FRA", status: "active", carrier: "DB Schenker" },
  { from: "FRA", to: "NYC", status: "active", carrier: "Lufthansa Cargo" },
  { from: "DXB", to: "FRA", status: "congested", carrier: "Emirates Cargo" },
  { from: "BOM", to: "DXB", status: "active", carrier: "Air India Cargo" },
  { from: "SHA", to: "TYO", status: "active", carrier: "ONE Line" },
];

const RADIUS = 2.5;
const AXIAL_TILT = THREE.MathUtils.degToRad(23.4);
const SUN_DIR = new THREE.Vector3(5, 1.6, 3).normalize();
const DEFAULT_CAM_DIST = 6.4;
const EARTH_SPIN = 0.07;
const CLOUD_DRIFT = 0.012;

const NODE_COLOR = { active: "#2dd4bf", degraded: "#fbbf24", disrupted: "#fb4f7a" };
const ROUTE_COLOR = { active: "#38bdf8", congested: "#fbbf24", blocked: "#fb4f7a" };
const STATUS_LABEL = { active: "Active", degraded: "Degraded", disrupted: "Disrupted" };
const ROUTE_LABEL = { active: "Active", congested: "Congested", blocked: "Blocked" };

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
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

function sanitizeNodes(nodes: NodePoint[]): { valid: NodePoint[]; dropped: number } {
  const seen = new Set<string>();
  const valid: NodePoint[] = [];
  let dropped = 0;
  for (const n of nodes || []) {
    const ok =
      n &&
      typeof n.id === "string" &&
      Number.isFinite(n.lat) && Number.isFinite(n.lng) &&
      Math.abs(n.lat) <= 90 && Math.abs(n.lng) <= 180;
    if (!ok || seen.has(n.id)) { dropped++; continue; }
    seen.add(n.id);
    valid.push(n);
  }
  return { valid, dropped };
}

function sanitizeRoutes(routes: RouteLink[], ids: Set<string>): RouteLink[] {
  const seen = new Set<string>();
  const out: RouteLink[] = [];
  for (const r of routes || []) {
    if (!r || !ids.has(r.from) || !ids.has(r.to) || r.from === r.to) continue;
    const key = `${r.from}>${r.to}>${r.carrier ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (!mq) return;
      const update = () => setReduced(Boolean(mq.matches));
      update();
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
      } else if (typeof mq.addListener === "function") {
        mq.addListener(update);
        return () => mq.removeListener(update);
      }
    } catch {
      // Graceful fallback
    }
  }, []);
  return reduced;
}

function tangentQuat(pos: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
}

interface Ctrl {
  paused: boolean;
  speed: number;
  hovering: boolean;
  targetSpin: number | null;
  focusDist: number | null;
  showClouds: boolean;
  rate: number;
}

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  uniform float ambient;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(n, sunDir);
    float day = smoothstep(-0.12, 0.25, ndl);

    vec3 dayCol = texture2D(dayMap, vUv).rgb;
    vec3 nightCol = texture2D(nightMap, vUv).rgb;
    float spec = texture2D(specMap, vUv).r;

    vec3 lit = dayCol * (ambient + (1.0 - ambient) * max(ndl, 0.0));
    vec3 H = normalize(sunDir + V);
    float s = pow(max(dot(n, H), 0.0), 40.0) * spec * day * 0.85;
    vec3 nightSide = dayCol * 0.03 + nightCol * 1.25;

    vec3 col = mix(nightSide, lit, day) + vec3(s);

    float tw = smoothstep(-0.05, 0.12, ndl) * (1.0 - smoothstep(0.12, 0.4, ndl));
    col += vec3(0.95, 0.4, 0.15) * tw * 0.07;

    float f = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    col += vec3(0.25, 0.5, 1.0) * f * 0.3 * day;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 glow;
  uniform float strength;
  varying vec3 vNormal;
  void main() {
    float i = pow(max(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    gl_FragColor = vec4(glow, 1.0) * i * strength;
  }
`;

class SafeBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn("[Network3D] render fallback:", err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function TexturedEarth({ textures, isDark, ctrl }: { textures: EarthTextures; isDark: boolean; ctrl: React.MutableRefObject<Ctrl> }) {
  const [day, night, spec, clouds] = useTexture([textures.day, textures.night, textures.specular, textures.clouds]);
  const cloudRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  useEffect(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    [day, night, spec, clouds].forEach((t) => {
      t.anisotropy = aniso;
      t.needsUpdate = true;
    });
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    clouds.colorSpace = THREE.SRGBColorSpace;
  }, [day, night, spec, clouds, gl]);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: day },
      nightMap: { value: night },
      specMap: { value: spec },
      sunDir: { value: SUN_DIR.clone() },
      ambient: { value: isDark ? 0.07 : 0.22 },
    }),
    [day, night, spec, isDark]
  );

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.033);
    if (cloudRef.current) cloudRef.current.rotation.y += dt * CLOUD_DRIFT * ctrl.current.speed * ctrl.current.rate;
    if (cloudRef.current) cloudRef.current.visible = ctrl.current.showClouds;
  });

  return (
    <>
      <mesh
        onClick={(e) => e.stopPropagation()}
        onPointerOver={(e) => e.stopPropagation()}
        userData={{ earthSurface: true }}
      >
        <sphereGeometry args={[RADIUS, 54, 54]} />
        <shaderMaterial vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} />
      </mesh>
      <mesh ref={cloudRef} raycast={() => null}>
        <sphereGeometry args={[RADIUS * 1.011, 40, 40]} />
        <meshStandardMaterial
          map={clouds}
          transparent
          opacity={isDark ? 0.55 : 0.7}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </>
  );
}

function ProceduralEarth({ isDark }: { isDark: boolean }) {
  const { landGeo, oceanGeo } = useMemo(() => {
    const land: number[] = [];
    const ocean: number[] = [];
    for (let i = 0; i < 9000; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const lat = 90 - (phi * 180) / Math.PI;
      const lng = (theta * 180) / Math.PI - 180;
      const r = RADIUS * 1.002;
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi);
      if (isLand(lat, lng)) land.push(x, y, z);
      else if (Math.random() < 0.06) ocean.push(x, y, z);
    }
    const l = new THREE.BufferGeometry();
    l.setAttribute("position", new THREE.Float32BufferAttribute(land, 3));
    const o = new THREE.BufferGeometry();
    o.setAttribute("position", new THREE.Float32BufferAttribute(ocean, 3));
    return { landGeo: l, oceanGeo: o };
  }, []);

  useEffect(() => () => { landGeo.dispose(); oceanGeo.dispose(); }, [landGeo, oceanGeo]);

  return (
    <>
      <mesh onClick={(e) => e.stopPropagation()} onPointerOver={(e) => e.stopPropagation()}>
        <sphereGeometry args={[RADIUS * 0.99, 40, 40]} />
        <meshStandardMaterial color={isDark ? "#07101d" : "#dbeafe"} roughness={0.5} metalness={0.6} />
      </mesh>
      <points geometry={landGeo}>
        <pointsMaterial size={0.036} color={isDark ? "#3b9fb8" : "#0284c7"} sizeAttenuation transparent opacity={0.9} />
      </points>
      <points geometry={oceanGeo}>
        <pointsMaterial size={0.016} color={isDark ? "#38bdf8" : "#93c5fd"} sizeAttenuation transparent opacity={0.3} />
      </points>
    </>
  );
}

function Atmosphere({ isDark }: { isDark: boolean }) {
  const uniforms = useMemo(
    () => ({
      glow: { value: new THREE.Color(isDark ? "#4aa3ff" : "#60a5fa") },
      strength: { value: isDark ? 1.15 : 0.7 },
    }),
    [isDark]
  );
  return (
    <mesh scale={1.0} raycast={() => null}>
      <sphereGeometry args={[RADIUS * 1.07, 44, 44]} />
      <shaderMaterial
        vertexShader={ATMO_VERT}
        fragmentShader={ATMO_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function TransitArc({
  p1, p2, status, reduced,
}: {
  p1: THREE.Vector3; p2: THREE.Vector3; status: RouteLink["status"]; reduced: boolean;
}) {
  const dotA = useRef<THREE.Mesh>(null);
  const dotB = useRef<THREE.Mesh>(null);
  const progA = useRef(Math.random());
  const fade = useRef(0);

  const { curve, pts } = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const d = p1.distanceTo(p2);
    mid.normalize().multiplyScalar(RADIUS + 0.1 + Math.min(d * 0.3, 1.2));
    const c = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    return { curve: c, pts: c.getPoints(36) };
  }, [p1, p2]);

  const color = ROUTE_COLOR[status];
  const blocked = status === "blocked";

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.033);
    fade.current = Math.min(1, fade.current + dt * 1.4);
    if (blocked || reduced) return;
    const speed = status === "congested" ? 0.18 : 0.4;
    progA.current = (progA.current + dt * speed) % 1;
    const pB = (progA.current + 0.5) % 1;
    dotA.current?.position.copy(curve.getPoint(progA.current));
    dotB.current?.position.copy(curve.getPoint(pB));
    const s = 0.7 + 0.3 * fade.current;
    dotA.current?.scale.setScalar(s);
    dotB.current?.scale.setScalar(s);
  });

  return (
    <group>
      <Line
        points={pts}
        color={color}
        lineWidth={blocked ? 1.6 : 1.3}
        transparent
        opacity={blocked ? 0.4 : 0.7}
        dashed={blocked}
        dashSize={0.08}
        gapSize={0.06}
      />
      {!blocked && (
        <>
          <mesh ref={dotA}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh ref={dotB}>
            <sphereGeometry args={[0.022, 6, 6]} />
            <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}

function PulseRing({ position, color, reduced }: { position: THREE.Vector3; color: string; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random());
  const quat = useMemo(() => tangentQuat(position), [position]);

  useFrame((_, delta) => {
    if (!ref.current || reduced) return;
    const dt = Math.min(Math.max(delta, 0.001), 0.033);
    t.current = (t.current + dt * 0.6) % 1;
    ref.current.scale.setScalar(1 + t.current * 2.6);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - t.current);
  });

  return (
    <mesh ref={ref} position={position} quaternion={quat} raycast={() => null}>
      <ringGeometry args={[0.09, 0.115, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function NodeMarker({
  node, position, selected, onSelect, onHover, reduced,
}: {
  node: NodePoint; position: THREE.Vector3; selected: boolean;
  onSelect: (n: NodePoint) => void; onHover: (n: NodePoint | null) => void; reduced: boolean;
}) {
  const color = NODE_COLOR[node.status] ?? NODE_COLOR.active;
  const group = useRef<THREE.Group>(null);
  const norm = useMemo(() => position.clone().normalize(), [position]);
  const stemEnd = useMemo(() => position.clone().add(norm.clone().multiplyScalar(0.32)), [position, norm]);
  const quat = useMemo(() => tangentQuat(position), [position]);
  const scale = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.033);
    const target = selected ? 1.35 : 1;
    scale.current = THREE.MathUtils.damp(scale.current, target, 6, dt);
    group.current?.scale.setScalar(scale.current);
  });

  return (
    <group>
      <group ref={group} position={position}>
        <mesh
          onClick={(e) => { e.stopPropagation(); onSelect(node); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; onHover(node); }}
          onPointerOut={() => { document.body.style.cursor = "auto"; onHover(null); }}
        >
          <sphereGeometry args={[0.15, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh raycast={() => null}>
          <sphereGeometry args={[0.055, 14, 14]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
      <Line points={[position, stemEnd]} color={color} lineWidth={1.2} transparent opacity={0.6} />
      {selected && (
        <mesh position={position} quaternion={quat} raycast={() => null}>
          <ringGeometry args={[0.13, 0.15, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {node.status !== "active" && <PulseRing position={position} color={color} reduced={reduced} />}
    </group>
  );
}

function Globe({
  nodes, routes, selectedId, onSelect, onHover, isDark, textures, ctrl, reduced,
}: any) {
  const spinRef = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const isInitialized = useRef(false);
  const { camera } = useThree();

  const nodeMap = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    nodes.forEach((n: NodePoint) => m.set(n.id, latLngToVec3(n.lat, n.lng, RADIUS)));
    return m;
  }, [nodes]);

  useEffect(() => {
    if (!selectedId) { ctrl.current.targetSpin = null; return; }
    const p = nodeMap.get(selectedId);
    if (!p) return;
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), AXIAL_TILT).invert();
    const d = camera.position.clone().normalize().applyQuaternion(tilt);
    ctrl.current.targetSpin = Math.atan2(-d.z, d.x) - Math.atan2(-p.z, p.x);
    ctrl.current.focusDist = 5.2;
  }, [selectedId, nodeMap, camera, ctrl]);

  const rate = useRef(0.1);

  useFrame((_, delta) => {
    const c = ctrl.current;
    const g = spinRef.current;
    if (!g) return;

    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    const dt = Math.min(Math.max(delta, 0.001), 0.033);

    let target = 1;
    if (c.paused) target = 0;
    else {
      if (c.hovering) target = 0.3;
      else if (selectedId) target = 0.45;
      if (reduced) target *= 0.3;
    }
    rate.current = THREE.MathUtils.damp(rate.current, target, 2.5, dt);
    c.rate = rate.current;
    spin.current += dt * EARTH_SPIN * c.speed * rate.current;

    if (c.targetSpin !== null) {
      const diff = ((c.targetSpin - spin.current + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      spin.current += diff * (1 - Math.exp(-3 * dt));
      if (Math.abs(diff) < 0.01) c.targetSpin = null;
    }
    g.rotation.y = spin.current;

    if (c.focusDist !== null) {
      const dist = camera.position.length();
      const next = THREE.MathUtils.damp(dist, c.focusDist, 2.5, dt);
      camera.position.setLength(next);
      if (Math.abs(next - c.focusDist) < 0.02) c.focusDist = null;
    }
  });

  return (
    <group rotation={[0, 0, AXIAL_TILT]}>
      <group ref={spinRef}>
        <SafeBoundary fallback={<ProceduralEarth isDark={isDark} />}>
          <Suspense fallback={<ProceduralEarth isDark={isDark} />}>
            <TexturedEarth textures={textures} isDark={isDark} ctrl={ctrl} />
          </Suspense>
        </SafeBoundary>

        {routes.map((r: RouteLink) => {
          const p1 = nodeMap.get(r.from);
          const p2 = nodeMap.get(r.to);
          if (!p1 || !p2) return null;
          return <TransitArc key={`${r.from}>${r.to}>${r.carrier ?? ""}`} p1={p1} p2={p2} status={r.status} reduced={reduced} />;
        })}

        {nodes.map((n: NodePoint) => (
          <NodeMarker
            key={n.id}
            node={n}
            position={nodeMap.get(n.id)}
            selected={n.id === selectedId}
            onSelect={onSelect}
            onHover={onHover}
            reduced={reduced}
          />
        ))}
      </group>
      <Atmosphere isDark={isDark} />
    </group>
  );
}

const GAL_N = new THREE.Vector3(0.3, 0.8, 0.52).normalize();
const GAL_C = (() => {
  const v = new THREE.Vector3(0.9, 0.05, -0.35);
  return v.addScaledVector(GAL_N, -v.dot(GAL_N)).normalize();
})();
const f5 = (n: number) => n.toFixed(5);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStarLayer(count: number, rMin: number, rMax: number, bandFrac: number, sizeMin: number, sizeMax: number, seed: number) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const d = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const z = 2 * rnd() - 1;
    const ph = 2 * Math.PI * rnd();
    const s = Math.sqrt(1 - z * z);
    d.set(s * Math.cos(ph), z, s * Math.sin(ph));
    if (rnd() < bandFrac) d.addScaledVector(GAL_N, -d.dot(GAL_N) * 0.82).normalize();
    const r = rMin + (rMax - rMin) * rnd();
    pos.set([d.x * r, d.y * r, d.z * r], i * 3);

    const b = Math.pow(rnd(), 5);
    const intensity = 0.16 + 0.7 * b;
    const t = rnd();
    const c = t < 0.18 ? [0.62, 0.76, 1.0] : t < 0.62 ? [0.95, 0.97, 1.0] : t < 0.88 ? [1.0, 0.94, 0.82] : [1.0, 0.78, 0.6];
    col.set([c[0] * intensity, c[1] * intensity, c[2] * intensity], i * 3);
    size[i] = sizeMin + (sizeMax - sizeMin) * Math.pow(b, 0.6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  return g;
}

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPx;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx;
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = exp(-dot(c, c) * 16.0);
    gl_FragColor = vec4(vColor * a, 1.0);
    #include <colorspace_fragment>
  }
`;

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  const vec3 GN = vec3(${f5(GAL_N.x)}, ${f5(GAL_N.y)}, ${f5(GAL_N.z)});
  const vec3 GC = vec3(${f5(GAL_C.x)}, ${f5(GAL_C.y)}, ${f5(GAL_C.z)});

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    return 0.5 * vnoise(p) + 0.25 * vnoise(p * 2.03 + 1.7);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = dot(d, GN);
    float gc = pow(max(dot(d, GC), 0.0), 2.5);

    vec3 col = vec3(0.0011, 0.0019, 0.0055);
    float band = exp(-h * h / 0.035);
    if (band > 0.005) {
      float glow = band * (0.5 + 0.5 * gc);
      vec3 cool = vec3(0.30, 0.37, 0.58);
      vec3 warm = vec3(0.62, 0.52, 0.44);
      col += mix(cool, warm, gc) * glow * 0.045;
    }
    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

const DRIFT_RATE = 0.0012;

function SpaceBackground({ reduced, lowPerf }: { reduced: boolean; lowPerf: boolean }) {
  const domeRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Group>(null);
  const angle = useRef(0.6);
  const { gl } = useThree();

  const layers = useMemo(
    () => [
      { geo: buildStarLayer(2400, 300, 380, 0.5, 2.4, 4.0, 1337), count: 2400 },
      { geo: buildStarLayer(800, 120, 260, 0.3, 2.8, 5.0, 4242), count: 800 },
    ],
    []
  );
  const uniforms = useMemo(() => ({ uPx: { value: 1 } }), []);

  useEffect(() => () => layers.forEach((l) => l.geo.dispose()), [layers]);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.033);
    if (!reduced) angle.current += dt * DRIFT_RATE;
    uniforms.uPx.value = Math.min(gl.getPixelRatio(), 1.5);
    if (domeRef.current) {
      domeRef.current.position.copy(camera.position);
      domeRef.current.rotation.y = angle.current;
    }
    if (starsRef.current) starsRef.current.rotation.y = angle.current;
  });

  return (
    <>
      <mesh ref={domeRef} renderOrder={-10} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[450, 24, 16]} />
        <shaderMaterial
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          side={THREE.BackSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <group ref={starsRef}>
        {layers.map((l, i) => (
          <points key={i} geometry={l.geo} frustumCulled={false} renderOrder={-5} raycast={() => null}>
            <shaderMaterial
              vertexShader={STAR_VERT}
              fragmentShader={STAR_FRAG}
              uniforms={uniforms}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest
            />
          </points>
        ))}
      </group>
    </>
  );
}

/* =====================================================================
   Root component
   ===================================================================== */
export default function Network3D({
  nodes = DEFAULT_NODES,
  routes = DEFAULT_ROUTES,
  selectedNode = null,
  onSelectNode = () => {},
  onClearSelection,
  darkMode = true,
  dataSource,
  textures = DEFAULT_TEXTURES,
  spaceBackground = true,
  showHubList = false,
  showControls = true,
  ambientOnly = false,
}: {
  nodes?: NodePoint[];
  routes?: RouteLink[];
  selectedNode?: NodePoint | null;
  onSelectNode?: (n: NodePoint) => void;
  onClearSelection?: () => void;
  darkMode?: boolean;
  dataSource?: "live" | "simulated";
  textures?: EarthTextures;
  spaceBackground?: boolean;
  showHubList?: boolean;
  showControls?: boolean;
  ambientOnly?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const usingDefaults = !nodes || nodes.length === 0;
  const source = dataSource ?? (usingDefaults ? "simulated" : "live");

  const { finalNodes, finalRoutes, dropped } = useMemo(() => {
    const { valid, dropped } = sanitizeNodes(usingDefaults ? DEFAULT_NODES : nodes);
    const ids = new Set(valid.map((n) => n.id));
    const rs = sanitizeRoutes(!routes || routes.length === 0 ? (usingDefaults ? DEFAULT_ROUTES : []) : routes, ids);
    return { finalNodes: valid, finalRoutes: rs, dropped };
  }, [nodes, routes, usingDefaults]);

  const ctrl = useRef<Ctrl>({ paused: false, speed: 1, hovering: false, targetSpin: null, focusDist: null, showClouds: true, rate: 1 });
  const controlsRef = useRef<any>(null);

  const [hovered, setHovered] = useState<NodePoint | null>(null);
  const [localSel, setLocalSel] = useState<NodePoint | null>(selectedNode);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [clouds, setClouds] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NodePoint["status"]>("all");
  const [listOpen, setListOpen] = useState(true);
  const [dpr, setDpr] = useState(1.25);
  const [lowPerf, setLowPerf] = useState(false);

  useEffect(() => { setLocalSel(selectedNode ?? null); }, [selectedNode]);

  useEffect(() => {
    if (localSel && !finalNodes.some((n) => n.id === localSel.id)) setLocalSel(null);
  }, [finalNodes, localSel]);

  useEffect(() => { ctrl.current.paused = paused; }, [paused]);
  useEffect(() => { ctrl.current.speed = speed; }, [speed]);
  useEffect(() => { ctrl.current.showClouds = clouds; }, [clouds]);
  useEffect(() => { ctrl.current.hovering = !!hovered; }, [hovered]);
  useEffect(() => { setHovered(null); }, [finalNodes]);
  useEffect(() => () => { if (typeof document !== "undefined") document.body.style.cursor = "auto"; }, []);

  const select = useCallback((n: NodePoint) => { setLocalSel(n); onSelectNode?.(n); }, [onSelectNode]);
  const clear = useCallback(() => {
    setLocalSel(null);
    ctrl.current.targetSpin = null;
    onClearSelection?.();
  }, [onClearSelection]);

  const resetView = useCallback(() => {
    clear();
    ctrl.current.focusDist = DEFAULT_CAM_DIST;
    controlsRef.current?.reset?.();
  }, [clear]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [clear]);

  const selected = localSel ? finalNodes.find((n) => n.id === localSel.id) ?? localSel : null;
  const nodeById = useMemo(() => new Map(finalNodes.map((n) => [n.id, n])), [finalNodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return finalNodes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (!q) return true;
      return [n.id, n.name, n.city].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [finalNodes, query, statusFilter]);

  const connections = useMemo(() => {
    if (!selected) return [];
    return finalRoutes
      .filter((r) => r.from === selected.id || r.to === selected.id)
      .map((r) => {
        const outbound = r.from === selected.id;
        const other = nodeById.get(outbound ? r.to : r.from);
        return { ...r, outbound, otherName: other?.name ?? (outbound ? r.to : r.from) };
      });
  }, [selected, finalRoutes, nodeById]);

  const glass = darkMode
    ? "bg-[#050b14]/80 border-slate-700/60 text-slate-100"
    : "bg-white/90 border-sky-200 text-slate-800";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";
  const btn = darkMode
    ? "bg-slate-800/70 hover:bg-slate-700/80 border-slate-600/60 text-slate-100"
    : "bg-white hover:bg-sky-50 border-sky-200 text-slate-700";

  const fmtCap = (c?: number) => (c === undefined || c === null || !Number.isFinite(c) ? "n/a" : `${Math.round(c * 100)}%`);

  return (
    <div
      onPointerLeave={() => setHovered(null)}
      className={`w-full h-full relative overflow-hidden rounded-2xl transition-colors duration-300 ${
        spaceBackground ? "bg-[#01030a]" : darkMode ? "bg-[#02050c]" : "bg-[#eaf4fd]"
      }`}
    >
      <SafeBoundary
        fallback={
          <div className={`absolute inset-0 flex items-center justify-center p-6 text-sm ${muted}`}>
            3D view unavailable on this device (WebGL could not start).
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 1.2, DEFAULT_CAM_DIST], fov: 42, near: 0.1, far: 800 }}
          frameloop="always"
          dpr={[1, 1.25]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor onDecline={() => { setDpr(1); setLowPerf(true); }} onIncline={() => { setDpr(1.25); setLowPerf(false); }} />
          <ambientLight intensity={darkMode ? 0.15 : 0.5} />
          <directionalLight position={SUN_DIR.clone().multiplyScalar(20)} intensity={darkMode ? 2.2 : 1.6} />

          {spaceBackground ? (
            <>
              <color attach="background" args={["#01030a"]} />
              <SpaceBackground reduced={reduced} lowPerf={lowPerf} />
            </>
          ) : (
            darkMode && <Stars radius={120} depth={60} count={1600} factor={3.2} saturation={0} fade speed={reduced ? 0 : 0.6} />
          )}

          <Globe
            nodes={ambientOnly ? [] : finalNodes}
            routes={ambientOnly ? [] : finalRoutes}
            selectedId={selected?.id ?? null}
            onSelect={select}
            onHover={setHovered}
            isDark={darkMode}
            textures={textures}
            ctrl={ctrl}
            reduced={reduced}
          />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={3.6}
            maxDistance={9.5}
            rotateSpeed={0.55}
            zoomSpeed={0.7}
            autoRotate={false}
          />

          <EffectComposer multisampling={0}>
            <Bloom intensity={darkMode ? 0.45 : 0.2} luminanceThreshold={0.75} luminanceSmoothing={0.2} />
            <Vignette eskil={false} offset={0.25} darkness={darkMode ? 0.6 : 0.2} />
          </EffectComposer>
        </Canvas>
      </SafeBoundary>

      {/* ---------- Data-source badge ---------- */}
      {!ambientOnly && (
        <div
          className={`absolute top-3 right-3 z-20 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold tracking-wider uppercase backdrop-blur-md ${
            source === "live"
              ? darkMode ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-700"
              : darkMode ? "bg-amber-950/70 border-amber-500/40 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-700"
          }`}
          title={source === "live" ? "Data supplied by the application" : "Built-in sample data. Not live."}
        >
          {source === "live" ? "Live data" : "Simulated sample data"}
        </div>
      )}

      {/* ---------- Search / filter / list ---------- */}
      {showHubList && !ambientOnly && (
        <div className={`absolute top-3 left-3 z-20 w-60 max-w-[55%] rounded-xl border backdrop-blur-md ${glass}`}>
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold"
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
          >
            <span>Hubs ({filtered.length}/{finalNodes.length})</span>
            <span className={muted}>{listOpen ? "Hide" : "Show"}</span>
          </button>
          {listOpen && (
            <div className="px-3 pb-3 space-y-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hubs"
                aria-label="Search hubs"
                className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-sky-400 ${
                  darkMode ? "bg-slate-900/70 border-slate-700 placeholder-slate-500" : "bg-white border-sky-200 placeholder-slate-400"
                }`}
              />
              <div className="flex flex-wrap gap-1">
                {(["all", "active", "degraded", "disrupted"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={statusFilter === s}
                    className={`px-2 py-0.5 rounded-md border text-[10px] capitalize ${
                      statusFilter === s ? (darkMode ? "bg-sky-500/20 border-sky-400/60" : "bg-sky-100 border-sky-400") : btn
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <ul className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5" role="listbox" aria-label="Hubs">
                {filtered.length === 0 && <li className={`text-xs py-2 ${muted}`}>No hubs match.</li>}
                {filtered.map((n) => (
                  <li key={n.id}>
                    <button
                      role="option"
                      aria-selected={selected?.id === n.id}
                      onClick={() => select(n)}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(null)}
                      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        selected?.id === n.id
                          ? darkMode ? "bg-sky-500/20" : "bg-sky-100"
                          : darkMode ? "hover:bg-slate-800/70" : "hover:bg-sky-50"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: NODE_COLOR[n.status] }} />
                      <span className="truncate">{n.name}</span>
                      <span className={`ml-auto font-mono text-[10px] ${muted}`}>{n.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {dropped > 0 && (
                <div className="text-[10px] text-amber-400">{dropped} record(s) skipped: invalid or duplicate coordinates/id.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------- Hover tooltip ---------- */}
      {hovered && hovered.id !== selected?.id && !ambientOnly && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-2 rounded-xl border backdrop-blur-md shadow-xl ${glass}`}>
          <div className="text-sm font-semibold leading-tight">{hovered.name}</div>
          <div className="flex gap-3 text-[11px] mt-0.5">
            <span style={{ color: NODE_COLOR[hovered.status] }}>{STATUS_LABEL[hovered.status] ?? hovered.status}</span>
            <span className={muted}>Capacity {fmtCap(hovered.capacity)}</span>
          </div>
        </div>
      )}

      {/* ---------- Selected record panel ---------- */}
      {selected && !ambientOnly && (
        <aside
          className={`absolute bottom-14 right-3 z-20 w-64 max-w-[70%] rounded-xl border backdrop-blur-md shadow-2xl p-3.5 ${glass}`}
          aria-label="Selected hub details"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={`text-[10px] font-mono tracking-wider uppercase ${muted}`}>{selected.id}</div>
              <div className="text-sm font-semibold leading-tight">{selected.name}</div>
              {selected.city && <div className={`text-xs ${muted}`}>{selected.city}</div>}
            </div>
            <button onClick={clear} aria-label="Clear selection" className={`px-1.5 py-0.5 rounded-md border text-xs ${btn}`}>✕</button>
          </div>

          <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className={muted}>Status</dt>
            <dd className="font-semibold" style={{ color: NODE_COLOR[selected.status] }}>{STATUS_LABEL[selected.status] ?? selected.status}</dd>
            <dt className={muted}>Capacity</dt>
            <dd className="font-mono">{fmtCap(selected.capacity)}</dd>
            <dt className={muted}>Coordinates</dt>
            <dd className="font-mono">{selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}°</dd>
          </dl>

          <div className={`mt-3 text-[10px] font-mono tracking-wider uppercase ${muted}`}>Routes ({connections.length})</div>
          {connections.length === 0 ? (
            <div className={`text-xs mt-1 ${muted}`}>No routes recorded for this hub.</div>
          ) : (
            <ul className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {connections.map((c, i) => (
                <li key={i} className="text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ROUTE_COLOR[c.status] }} />
                  <span className="truncate">{c.outbound ? "→" : "←"} {c.otherName}</span>
                  <span className={`ml-auto text-[10px] shrink-0 ${muted}`}>
                    {c.carrier ?? "n/a"} · {ROUTE_LABEL[c.status] ?? c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* ---------- Controls ---------- */}
      {showControls && !ambientOnly && (
        <div className={`absolute bottom-3 right-3 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-md text-xs ${glass}`}>
          <button onClick={() => setPaused((p) => !p)} className={`px-2 py-0.5 rounded-md border ${btn}`} aria-pressed={paused}>
            {paused ? "Resume" : "Pause"}
          </button>
          <label className="flex items-center gap-1.5">
            <span className={muted}>Speed</span>
            <input
              type="range" min={0.25} max={3} step={0.25} value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              aria-label="Rotation speed" className="w-16 accent-sky-400"
            />
          </label>
          <button onClick={() => setClouds((c) => !c)} className={`px-2 py-0.5 rounded-md border ${btn}`} aria-pressed={clouds}>
            Clouds
          </button>
          <button onClick={resetView} className={`px-2 py-0.5 rounded-md border ${btn}`}>Reset</button>
        </div>
      )}

      {/* ---------- Legend ---------- */}
      {!ambientOnly && (
        <div className={`absolute bottom-3 left-3 z-10 flex flex-col gap-1 px-3 py-2 rounded-xl border backdrop-blur-md text-[11px] ${glass}`}>
          <div className="flex items-center gap-3">
            <span className={`${muted} font-mono uppercase text-[9px] w-10`}>Hubs</span>
            {(["active", "degraded", "disrupted"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLOR[s] }} /> {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className={`${muted} font-mono uppercase text-[9px] w-10`}>Routes</span>
            {(["active", "congested", "blocked"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-3 h-0.5" style={{ background: ROUTE_COLOR[s] }} /> {ROUTE_LABEL[s]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}