/**
 * In-memory access-token store, modeled on
 * `boilerplate/packages/platform-store/src/services/secureTokenManager.ts`.
 *
 * Same rationale as the internal app: the refresh token is a backend-set HttpOnly
 * cookie and is never readable from (or stored by) client JS. The access token
 * lives in memory only — not localStorage/sessionStorage — so it does not survive
 * a full page reload; `SerafortProvider` re-derives it on mount via a refresh-cookie
 * exchange (see `context/SerafortProvider.tsx`).
 */
export interface TokenData {
  accessToken: string;
  expiresAt: number;
}

export type TokenListener = (tokens: TokenData | null) => void;

export class TokenManager {
  private accessToken: string | null = null;
  private expiresAt: number | null = null;
  private listeners = new Set<TokenListener>();

  getTokens(): TokenData | null {
    if (!this.accessToken) return null;
    return { accessToken: this.accessToken, expiresAt: this.expiresAt || 0 };
  }

  setTokens(tokens: TokenData): void {
    this.accessToken = tokens.accessToken;
    this.expiresAt = tokens.expiresAt;
    this.notify();
  }

  clearTokens(): void {
    this.accessToken = null;
    this.expiresAt = null;
    this.notify();
  }

  hasTokens(): boolean {
    return this.accessToken !== null;
  }

  /** 5-minute buffer, matching the internal app's refresh threshold. */
  isTokenExpired(): boolean {
    if (!this.accessToken || !this.expiresAt) return true;
    const bufferMs = 5 * 60 * 1000;
    return Date.now() >= this.expiresAt - bufferMs;
  }

  subscribe(listener: TokenListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const tokens = this.getTokens();
    this.listeners.forEach((listener) => listener(tokens));
  }
}
