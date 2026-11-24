const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

export interface ApiResponse<T> {
  data: T | null;
  meta: {
    request_id: string;
    page?: number;
    page_size?: number;
    total?: number;
  };
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

import { getDemoFallback } from "./demo-fallback";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const isBrowser = typeof window !== "undefined";
  const primaryBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? (isBrowser ? "" : "http://backend:8000");
  const primaryUrl = `${primaryBase}${API_PREFIX}${endpoint}`;

  // Read token from localStorage if in browser
  let authHeader: Record<string, string> = {};
  if (isBrowser) {
    const token = localStorage.getItem("aiops_token");
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...authHeader,
    ...((options.headers as Record<string, string>) || {}),
  };

  // 1. Try direct API base
  try {
    const res = await fetch(primaryUrl, {
      ...options,
      headers: defaultHeaders,
      credentials: "include",
    });

    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      throw new ApiError(
        `Server returned HTTP ${res.status}: ${res.statusText || "Error"}`,
        `HTTP_${res.status}`
      );
    }

    if (!res.ok || json.error) {
      const err = json.error || {
        code: `HTTP_${res.status}`,
        message: `Request failed with status ${res.status}`,
      };
      throw new ApiError(err.message, err.code, err.details);
    }
    return json;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    // 2. If in browser and direct request had network failure, try Next.js proxy rewrite
    if (isBrowser) {
      try {
        const proxyUrl = `/api/v1${endpoint}`;
        const proxyRes = await fetch(proxyUrl, {
          ...options,
          headers: defaultHeaders,
          credentials: "include",
        });
        const proxyJson: ApiResponse<T> = await proxyRes.json();
        if (proxyRes.ok && !proxyJson.error) {
          return proxyJson;
        }
      } catch {
        // Continue to fallback
      }
    }

    // 3. Fallback to interactive client-side demo data if backend is not reachable (e.g. GitHub Pages)
    // Strictly fail-closed for authentication routes: never fake credentials or session state
    if (endpoint.startsWith("/auth/")) {
      throw new ApiError(
        "Authentication service is currently unreachable. Please ensure the backend server is running.",
        "SERVICE_UNAVAILABLE"
      );
    }

    const fallback = getDemoFallback(endpoint, options);
    if (fallback) {
      return fallback as ApiResponse<T>;
    }

    throw new ApiError(
      err.message || "Network request failed or server is unreachable",
      "NETWORK_ERROR"
    );
  }
}
