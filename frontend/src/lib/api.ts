import { createClient } from "@/lib/supabase/client";
import { guestApiRequest } from "@/lib/guest-store";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_URL = (configuredApiUrl ?? (process.env.NODE_ENV === "development" ? "http://localhost:4000/api" : "")).replace(/\/$/, "");

type ApiError = Error & { status?: number; details?: unknown; issues?: unknown };

function notifyDataChanged(method: string) {
  if (method !== "GET" && typeof window !== "undefined") {
    window.dispatchEvent(new Event("budgetnest:data-changed"));
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("The API URL is not configured. Set NEXT_PUBLIC_API_URL for this environment.");

  const method = (init.method ?? "GET").toUpperCase();
  const supabase = createClient();
  if (!supabase) {
    const result = await guestApiRequest<T>(path, init);
    notifyDataChanged(method);
    return result;
  }

  // A missing, expired, or unreadable local session should not block guest mode.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const result = await guestApiRequest<T>(path, init);
    notifyDataChanged(method);
    return result;
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
    const payload = await response.json().catch(() => null) as { error?: string; details?: unknown; issues?: unknown } | null;
    const error = new Error(payload?.error ?? `API request failed (${response.status}).`) as ApiError;
    error.status = response.status;
    error.details = payload?.details;
    error.issues = payload?.issues;
    throw error;
  }

  if (response.status === 204) {
    notifyDataChanged(method);
    return undefined as T;
  }
  const result = await response.json() as T;
  notifyDataChanged(method);
  return result;
}
