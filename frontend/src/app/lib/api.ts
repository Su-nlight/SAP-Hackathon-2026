import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface LoginPayload {
  username: string;
  password: string;
}

export interface CurrentUser {
  username: string;
  company_id: string;
  roles: string[];
}

/**
 * Fetches the authenticated user's profile from GET /v1/auth/me,
 * used to resolve which role(s) the signed-in user actually has.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/v1/auth/me');
  return data;
}

export interface RegisterPayload {
  username: string;
  email: string;
  company_id: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Authenticates against POST /v1/auth/login (implemented in the backend)
 * and persists the returned bearer token to localStorage.
 */
export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/v1/auth/login', payload);
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

/**
 * Registers a new account against POST /v1/auth/register.
 * NOTE: this endpoint does not exist in the current backend yet
 * (only /v1/auth/login and /v1/auth/me are implemented) — add a
 * matching route in backend/app/api/routers/auth.py to make this live.
 */
export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/v1/auth/register', payload);
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

/* ---------------------------------------------------------------- */
/* Disruptions                                                       */
/* ---------------------------------------------------------------- */

export interface DisruptionEventDTO {
  id: string;
  type: string;
  target_type: 'node' | 'edge';
  target_id: string;
  severity: string;
  start_time: string;
  expected_end: string | null;
  impact_delay_hours: number;
  capacity_factor: number;
  source: string;
  raw_text: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  manual_review: boolean;
}

export async function listDisruptions(
  status?: 'active' | 'resolved'
): Promise<DisruptionEventDTO[]> {
  const { data } = await api.get<{ disruptions: DisruptionEventDTO[] }>(
    '/v1/disruptions',
    { params: status ? { status } : {} }
  );
  return data.disruptions;
}

export async function ingestAlert(raw_text: string) {
  const { data } = await api.post('/v1/disruptions/ingest', { raw_text });
  return data;
}

export async function approveDisruption(eventId: string, feedback?: string) {
  const { data } = await api.post(`/v1/disruptions/${eventId}/approve`, {
    approved: true,
    feedback,
  });
  return data;
}

export async function resolveDisruption(eventId: string) {
  const { data } = await api.post(`/v1/disruptions/${eventId}/resolve`);
  return data;
}

/* ---------------------------------------------------------------- */
/* Network                                                            */
/* ---------------------------------------------------------------- */

export interface NetworkNodeDTO {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  status: string;
  metadata: Record<string, unknown>;
}

export interface NetworkEdgeDTO {
  id: string;
  source: string;
  target: string;
  mode: string;
  status?: string;
}

export async function getNetworkGraph(): Promise<{
  nodes: NetworkNodeDTO[];
  edges: NetworkEdgeDTO[];
}> {
  const { data } = await api.get('/v1/network/graph');
  return data;
}

export interface NetworkHealthDTO {
  node_count: number;
  edge_count: number;
  active_disruptions: number;
  disruption_ids: string[];
  offline_nodes: string[];
  offline_edges: string[];
  healthy: boolean;
  sap: {
    connected: boolean;
    provider: string;
    last_sync: string | null;
    plants: number;
    customers: number;
  };
}

export async function getNetworkHealth(): Promise<NetworkHealthDTO> {
  const { data } = await api.get('/v1/network/health');
  return data;
}

/* ---------------------------------------------------------------- */
/* Routes (AI Recovery)                                              */
/* ---------------------------------------------------------------- */

export interface ShipmentInput {
  id: string;
  origin: string;
  destination: string;
  cargo_tons: number;
  deadline: string; // ISO datetime
  budget_per_ton: number;
  priority: 'low' | 'standard' | 'high' | 'critical';
}

export interface RouteAlternativeDTO {
  route_id: string;
  path: string[];
  legs: Array<{
    edge_id: string;
    mode: string;
    source: string;
    target: string;
    distance_km: number;
    time_hours: number;
    cost_per_ton: number;
  }>;
  total_time_hours: number;
  total_cost_per_ton: number;
  total_risk: number;
  total_co2_per_ton: number;
  composite_weight: number;
  delta_time_hours: number | null;
  delta_cost_per_ton: number | null;
  feasibility: 'feasible' | 'infeasible';
  infeasible_reasons: string[];
}

export async function optimizeRoute(shipment: ShipmentInput, k = 3) {
  const { data } = await api.post<{
    shipment_id: string;
    active_disruptions: string[];
    alternatives: RouteAlternativeDTO[];
  }>('/v1/routes/optimize', { shipment, k });
  return data;
}

/* ---------------------------------------------------------------- */
/* Scenarios (Analytics)                                              */
/* ---------------------------------------------------------------- */

export interface ScenarioSummary {
  id: string;
  name?: string;
  description?: string;
  steps?: Array<Record<string, unknown>>;
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const { data } = await api.get<{ scenarios: ScenarioSummary[] }>('/v1/scenarios');
  return data.scenarios;
}

export async function runScenario(scenario_id: string) {
  const { data } = await api.post('/v1/scenarios/run', { scenario_id });
  return data;
}