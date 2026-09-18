import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
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

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>("/v1/auth/me");
  return data;
}

export interface RegisterPayload {
  username: string;
  email: string;
  company_id: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<{ access_token: string }> {
  const { data } = await api.post<{ access_token: string }>("/v1/auth/login", payload);
  if (typeof window !== "undefined" && data.access_token) {
    localStorage.setItem("token", data.access_token);
  }
  return data;
}

export async function register(payload: RegisterPayload): Promise<void> {
  await api.post("/v1/auth/register", payload);
}