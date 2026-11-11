import { createClient } from "@/lib/supabase/client";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_URL = (configuredApiUrl ?? (process.env.NODE_ENV === "development" ? "http://localhost:4000/api" : "")).replace(/\/$/, "");

type ApiError = Error & { status?: number };

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("The API URL is not configured. Set NEXT_PUBLIC_API_URL for this environment.");

  const supabase = createClient();
  if (!supabase) throw new Error("Supabase is not configured. Check your frontend environment variables.");

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    const error = new Error(payload?.error ?? `API request failed (${response.status}).`) as ApiError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
