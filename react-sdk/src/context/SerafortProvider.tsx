import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SerafortContext, type SerafortContextValue } from "./SerafortContext";
import { SerafortHttpClient } from "../http/httpClient";
import { SDK_ENDPOINTS } from "../endpoints";
import type { PublishableKeyStatus, SerafortUser, SessionStatus } from "../types";

export interface SerafortProviderProps {
  /** Authentication backend origin, e.g. `"auth.acme.com"`. */
  domain: string;
  /** Publishable key identifying the calling application/tenant. */
  publishableKey: string;
  /** Proactive-refresh lead time before token expiry, in ms. Default 60_000. */
  refreshLeadTimeMs?: number;
  children: React.ReactNode;
}

function normalizeUser(raw: Record<string, unknown> | undefined | null): SerafortUser | null {
  if (!raw) return null;
  const id = (raw.id ?? raw.userId) as string | number | undefined;
  const email = raw.email as string | undefined;
  if (id === undefined || !email) return null;
  return {
    id,
    email,
    name: (raw.name as string) ?? (raw.fullName as string) ?? undefined,
    avatarUrl: raw.avatarUrl as string | undefined,
    roles: Array.isArray(raw.roles) ? (raw.roles as string[]) : undefined,
    organizationId: raw.organizationId as string | number | undefined,
    emailVerified: raw.emailVerified as boolean | undefined,
    mfaEnabled: (raw.mfaEnabled ?? raw.mfa_enabled) as boolean | undefined,
    raw,
  };
}

/**
 * `<SerafortProvider domain="auth.acme.com" publishableKey="pk_live_...">`
 *
 * Wraps the tree, resumes a session from the HttpOnly refresh cookie on mount
 * (the access token itself is memory-only and does not survive a reload — see
 * `http/tokenManager.ts`), and schedules a background proactive refresh ahead
 * of each access token's expiry so a long-lived tab never has to wait on a
 * blocking 401-triggered refresh mid-request.
 */
export function SerafortProvider({
  domain,
  publishableKey,
  refreshLeadTimeMs = 60_000,
  children,
}: SerafortProviderProps) {
  const http = useMemo(
    () => new SerafortHttpClient({ domain, publishableKey }),
    // A changed domain/publishableKey is a new tenant/app identity — rebuild the client.
    [domain, publishableKey],
  );

  const [user, setUser] = useState<SerafortUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [keyStatus, setKeyStatus] = useState<PublishableKeyStatus | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleBackgroundRefresh = useCallback(
    (expiresAt: number) => {
      clearRefreshTimer();
      const delay = Math.max(expiresAt - Date.now() - refreshLeadTimeMs, 5_000);
      refreshTimer.current = setTimeout(async () => {
        try {
          await http.refreshManager.attemptRefresh();
          const tokens = http.tokens.getTokens();
          if (tokens) scheduleBackgroundRefresh(tokens.expiresAt);
        } catch {
          // Terminal-failure path already clears tokens and flips status via the
          // onTerminalAuthFailure subscription below; nothing further to do here.
        }
      }, delay);
    },
    [http, refreshLeadTimeMs, clearRefreshTimer],
  );

  /**
   * Bootstrap check: is this `publishableKey` (and this page's origin) valid
   * for the backend? Called once on mount, before attempting to resume a
   * session — see `PublishableKeyService.publicStatus` on the
   * `Authentication` backend for the response shaping (never leaks the
   * internal tenant UUID or other tenants' allowed origins).
   */
  const validatePublishableKey = useCallback(async (): Promise<PublishableKeyStatus> => {
    try {
      const res = await http.post<{ data?: PublishableKeyStatus } & Record<string, unknown>>(
        SDK_ENDPOINTS.publishableKeys.resolve,
        { publishableKey },
      );
      const result = (res.data?.data ?? res.data) as PublishableKeyStatus | undefined;
      return result ?? { valid: false };
    } catch {
      // A network/5xx failure resolving the key is not proof the key itself
      // is invalid — fail open here rather than locking out a working key
      // over a transient outage of this one bootstrap call. Every subsequent
      // auth call still enforces the same check server-side via
      // `TenantMiddleware`, so this is not a security bypass, only an
      // optimistic UX default.
      return { valid: true };
    }
  }, [http, publishableKey]);

  const hydrateFromMe = useCallback(async () => {
    try {
      const res = await http.get<{ data?: Record<string, unknown> } & Record<string, unknown>>(
        SDK_ENDPOINTS.auth.me,
      );
      // v1 auth controllers wrap in { success, data, message, meta }.
      const rawUser = (res.data?.data ?? res.data) as Record<string, unknown>;
      setUser(normalizeUser(rawUser));
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [http]);

  // Resume session on mount: exchange the HttpOnly refresh cookie for an access
  // token, then hydrate the user. A 400 ("no refresh token presented") is the
  // normal state for a visitor who was never signed in, not an error.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const resolvedKeyStatus = await validatePublishableKey();
      if (cancelled) return;
      setKeyStatus(resolvedKeyStatus);

      if (!resolvedKeyStatus.valid || resolvedKeyStatus.originAllowed === false) {
        // Don't bother attempting a refresh/session resume against a key the
        // backend has already rejected — every call would 403 at
        // `TenantMiddleware` anyway, and this surfaces the real cause
        // (config error) instead of a misleading "unauthenticated".
        setStatus("invalid_key");
        return;
      }

      try {
        await http.refreshManager.attemptRefresh();
        if (cancelled) return;
        const tokens = http.tokens.getTokens();
        if (tokens) scheduleBackgroundRefresh(tokens.expiresAt);
        await hydrateFromMe();
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    })();

    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
    // `validatePublishableKey`/`hydrateFromMe`/`scheduleBackgroundRefresh`/
    // `clearRefreshTimer` are all memoized on `http` (directly or
    // transitively), so this effect still only re-runs when the client
    // identity (domain/publishableKey) actually changes.
  }, [http, validatePublishableKey, hydrateFromMe, scheduleBackgroundRefresh, clearRefreshTimer]);

  useEffect(() => http.onTerminalAuthFailure(() => {
    clearRefreshTimer();
    setUser(null);
    setStatus("unauthenticated");
  }), [http, clearRefreshTimer]);

  const signOut = useCallback(async () => {
    try {
      await http.post(SDK_ENDPOINTS.auth.logout);
    } catch {
      // Best-effort: clear local state regardless of network outcome.
    }
    clearRefreshTimer();
    http.tokens.clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, [http, clearRefreshTimer]);

  const completeSignIn = useCallback(
    (accessToken: string, expiresIn: number | undefined, rawUser: Record<string, unknown>) => {
      const expiresAt = Date.now() + (expiresIn ?? 3600) * 1000;
      http.tokens.setTokens({ accessToken, expiresAt });
      setUser(normalizeUser(rawUser));
      setStatus("authenticated");
      scheduleBackgroundRefresh(expiresAt);
    },
    [http, scheduleBackgroundRefresh],
  );

  const value: SerafortContextValue = useMemo(
    () => ({ http, user, status, keyStatus, signOut, completeSignIn }),
    [http, user, status, keyStatus, signOut, completeSignIn],
  );

  return <SerafortContext.Provider value={value}>{children}</SerafortContext.Provider>;
}
