import { SDK_ENDPOINTS } from "../endpoints";
import { TokenManager } from "./tokenManager";

/**
 * On-demand + cross-tab token refresh, modeled on `TokenRefreshManager` in
 * `boilerplate/packages/platform-store/src/services/api/api.client.ts`.
 *
 * Reused behaviour, not reinvented:
 *  - single-flight: concurrent callers await the same in-flight refresh
 *  - `BroadcastChannel` cross-tab sync, so N tabs don't each hit the refresh
 *    endpoint and race the backend's refresh-token rotation
 *  - `400` ("Refresh token is required") is treated as "anonymous visitor", not
 *    an error — only `401`/`403` (a refresh token that existed but is no longer
 *    valid) is a terminal auth failure
 */
const NO_SESSION_STATUS = 400;

export class TokenRefreshManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;
  private noSessionDetected = false;
  private channel: BroadcastChannel | null = null;
  private queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

  constructor(
    private baseURL: string,
    private tokens: TokenManager,
    private channelName: string,
    private onTerminalFailure: () => void,
  ) {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(channelName);
        this.channel.onmessage = (event: MessageEvent) => {
          if (!event.data) return;
          if (event.data.type === "REFRESH_SUCCESS" && event.data.token) {
            this.isRefreshing = false;
            this.refreshPromise = null;
            this.processQueue(null, event.data.token);
          } else if (event.data.type === "REFRESH_FAILURE") {
            this.isRefreshing = false;
            this.refreshPromise = null;
            this.processQueue(new Error(event.data.error || "Cross-tab refresh failure"), null);
          }
        };
      } catch {
        // BroadcastChannel unavailable (e.g. some WebViews); single-tab refresh still works.
      }
    }
  }

  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  queueRequest(resolve: (t: string) => void, reject: (e: unknown) => void): void {
    this.queue.push({ resolve, reject });
  }

  private processQueue(error: unknown, token: string | null): void {
    this.queue.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else if (token) resolve(token);
    });
    this.queue = [];
  }

  private broadcast(message: { type: string; token?: string; error?: string }): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // ignore
    }
  }

  async attemptRefresh(): Promise<string> {
    if (this.noSessionDetected && this.tokens.hasTokens()) {
      this.noSessionDetected = false;
    }
    if (this.noSessionDetected) {
      throw Object.assign(new Error("No session to refresh"), { status: NO_SESSION_STATUS });
    }
    if (this.refreshPromise) return this.refreshPromise;

    const hadSession = this.tokens.hasTokens();
    this.broadcast({ type: "REFRESH_STARTED" });

    this.refreshPromise = (async () => {
      this.isRefreshing = true;
      try {
        const response = await fetch(`${this.baseURL}${SDK_ENDPOINTS.auth.refresh}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          const err = new Error(`Refresh failed with status ${response.status}`);
          (err as unknown as { status: number }).status = response.status;
          throw err;
        }

        const data = (await response.json()) as { access_token?: string; expires_in?: number };
        const accessToken = data.access_token;
        if (!accessToken) throw new Error("No access token in refresh response");

        const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
        this.tokens.setTokens({ accessToken, expiresAt });
        this.processQueue(null, accessToken);
        this.broadcast({ type: "REFRESH_SUCCESS", token: accessToken });
        return accessToken;
      } catch (error) {
        const status = (error as { status?: number }).status;
        const isNoSession = status === NO_SESSION_STATUS && !hadSession;
        const isAuthFailure = status === NO_SESSION_STATUS || status === 401 || status === 403;

        if (isNoSession) {
          this.noSessionDetected = true;
          this.tokens.clearTokens();
          this.processQueue(error, null);
          throw error;
        }
        if (isAuthFailure) {
          this.tokens.clearTokens();
          this.onTerminalFailure();
          this.processQueue(error, null);
          this.broadcast({ type: "REFRESH_FAILURE", error: (error as Error)?.message });
          throw error;
        }
        this.processQueue(error, null);
        this.broadcast({ type: "REFRESH_FAILURE", error: (error as Error)?.message });
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}
