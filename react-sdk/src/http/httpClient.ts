import type { SerafortConfig } from "../types";
import { SerafortApiError } from "../types";
import { SDK_ENDPOINTS } from "../endpoints";
import { TokenManager } from "./tokenManager";
import { TokenRefreshManager } from "./tokenRefreshManager";

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  headers?: Record<string, string>;
  _retry?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export const PUBLISHABLE_KEY_HEADER = "X-Serafort-Publishable-Key";

function resolveBaseUrl(domain: string): string {
  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain.replace(/\/$/, "");
  }
  return `https://${domain}`;
}

/**
 * Minimal fetch wrapper for `@serafort/react-sdk`, modeled on `FetchClient` in
 * `boilerplate/packages/platform-store/src/services/api/api.client.ts`:
 * proactive refresh when the token is within its expiry buffer, a single
 * 401-triggered retry-after-refresh, `credentials: "include"` so the HttpOnly
 * refresh cookie is sent cross-origin (the embedding app's domain must be an
 * allowed CORS origin with `SameSite=None; Secure` on that cookie — an
 * Authentication-service/infra prerequisite, not something this client can
 * configure from the browser).
 *
 * v1 auth endpoints (login, refresh, me, register, logout) return
 * `{ success, data, message, meta }`; this client's callers read
 * `response.data.data` for those, matching the root CLAUDE.md contract-surface
 * note. Legacy and MFA/passkey endpoints return flat bodies and are read as
 * `response.data` directly.
 */
export class SerafortHttpClient {
  readonly baseURL: string;
  readonly tokens = new TokenManager();
  readonly refreshManager: TokenRefreshManager;
  private terminalErrorHandlers = new Set<() => void>();

  constructor(private config: SerafortConfig) {
    this.baseURL = resolveBaseUrl(config.domain);
    this.refreshManager = new TokenRefreshManager(
      this.baseURL,
      this.tokens,
      `serafort_token_refresh_${config.publishableKey}`,
      () => this.terminalErrorHandlers.forEach((h) => h()),
    );
  }

  onTerminalAuthFailure(handler: () => void): () => void {
    this.terminalErrorHandlers.add(handler);
    return () => this.terminalErrorHandlers.delete(handler);
  }

  async request<T = unknown>(endpoint: string, method: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    let url = `${this.baseURL}${endpoint}`;
    if (config.params) {
      const search = new URLSearchParams();
      Object.entries(config.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) search.append(k, String(v));
      });
      const qs = search.toString();
      if (qs) url += `${url.includes("?") ? "&" : "?"}${qs}`;
    }

    const headers = new Headers(config.headers);
    headers.set("Accept", "application/json");
    if (!headers.has("Content-Type") && config.data !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    headers.set(PUBLISHABLE_KEY_HEADER, this.config.publishableKey);

    const isRefreshCall = endpoint.includes(SDK_ENDPOINTS.auth.refresh);
    if (!isRefreshCall) {
      const tokens = this.tokens.getTokens();
      if (tokens) {
        if (this.tokens.isTokenExpired()) {
          try {
            const newToken = this.refreshManager.isRefreshInProgress()
              ? await new Promise<string>((resolve, reject) => this.refreshManager.queueRequest(resolve, reject))
              : await this.refreshManager.attemptRefresh();
            headers.set("Authorization", `Bearer ${newToken}`);
          } catch {
            // Fall through unauthenticated; the request may still be a public one.
          }
        } else {
          headers.set("Authorization", `Bearer ${tokens.accessToken}`);
        }
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: config.data !== undefined ? JSON.stringify(config.data) : undefined,
    });

    const body = await this.parseBody(response);

    if (!response.ok) {
      if (
        response.status === 401 &&
        !config._retry &&
        !isRefreshCall &&
        !endpoint.includes(SDK_ENDPOINTS.auth.login)
      ) {
        try {
          const newToken = this.refreshManager.isRefreshInProgress()
            ? await new Promise<string>((resolve, reject) => this.refreshManager.queueRequest(resolve, reject))
            : await this.refreshManager.attemptRefresh();
          return this.request<T>(endpoint, method, {
            ...config,
            _retry: true,
            headers: { ...config.headers, Authorization: `Bearer ${newToken}` },
          });
        } catch {
          // fall through to throw below
        }
      }

      const message =
        (body as { message?: string; error?: string })?.message ||
        (body as { error?: string })?.error ||
        `Request failed with status ${response.status}`;
      const errors = (body as { errors?: Record<string, string[]> })?.errors;
      throw new SerafortApiError(message, response.status, String(response.status), errors, body);
    }

    return { data: body as T, status: response.status, ok: response.ok };
  }

  private async parseBody(response: Response): Promise<unknown> {
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  get<T = unknown>(url: string, config?: RequestConfig) {
    return this.request<T>(url, "GET", config);
  }
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>(url, "POST", { ...config, data });
  }
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>(url, "PUT", { ...config, data });
  }
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>(url, "PATCH", { ...config, data });
  }
  delete<T = unknown>(url: string, config?: RequestConfig) {
    return this.request<T>(url, "DELETE", config);
  }
}
