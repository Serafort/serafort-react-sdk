/**
 * Public types for `@serafort/react-sdk`.
 *
 * Kept intentionally loose (`Record<string, unknown>` escape hatches) rather than
 * importing `@cap/shared-types`' `IAuth`, for the same standalone-publishability
 * reason documented in `endpoints.ts`: this package must type-check and run outside
 * the pnpm workspace, so it cannot depend on a `workspace:*` package.
 */

export interface SerafortConfig {
  /** Authentication backend origin, e.g. `"auth.acme.com"` or `"https://auth.acme.com"`. */
  domain: string;
  /**
   * Publishable (public, non-secret) key identifying the calling application/tenant.
   * Sent on every request as `X-Serafort-Publishable-Key`.
   *
   * The Authentication service resolves tenant identity from this header via
   * `PublishableKeyService`/`TenantMiddleware` (Redis-cached, DB-backed
   * `publishable_keys` table) — see `app/services/publishable_key_service.ts`
   * in the `Authentication` repo. `<SerafortProvider>` calls
   * `SDK_ENDPOINTS.publishableKeys.resolve` on mount to confirm the key (and
   * this page's origin) are valid before attempting to resume/establish a
   * session; see `status === "invalid_key"`.
   */
  publishableKey: string;
  /** Proactive refresh lead time before token expiry, in ms. Default 60_000. */
  refreshLeadTimeMs?: number;
}

export interface SerafortUser {
  id: string | number;
  email: string;
  name?: string;
  avatarUrl?: string;
  roles?: string[];
  organizationId?: string | number;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  /** Full backend payload, for fields this narrow type doesn't surface. */
  raw: Record<string, unknown>;
}

/**
 * `"invalid_key"` — the publishable key itself was rejected (malformed,
 * unknown, revoked, or this page's origin is not on the key's allow-list).
 * Distinct from `"unauthenticated"` (a valid key/origin, just no session
 * yet) so a consuming app can show a configuration error instead of a
 * sign-in form.
 */
export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "invalid_key";

/** Result of resolving this SDK instance's publishable key against the backend. */
export interface PublishableKeyStatus {
  valid: boolean;
  environment?: "live" | "test";
  /** Whether this page's `Origin` is on the key's configured allow-list. */
  originAllowed?: boolean;
}

export interface SsoDiscoveryResult {
  status: "idle" | "checking" | "found" | "none" | "error";
  provider?: "saml" | "oidc" | "password";
  organizationId?: string | number;
  clientId?: string | number;
}

export type MfaMethodType = "totp" | "sms" | "recovery";

/** Carries the signed login-time MFA challenge issued by `POST auth.login`. */
export interface PendingMfaChallenge {
  mfaToken?: string;
  userId?: string | number;
  /** Which methods the backend advertised as available for this challenge, if known. */
  availableMethods?: MfaMethodType[];
}

export interface MfaLoginCompletionResponse {
  token?: string;
  access_token?: string;
  accessToken?: string;
  expires_in?: number;
  expiresIn?: number;
  user?: Record<string, unknown>;
  userId?: string | number;
  verified?: boolean;
  success?: boolean;
  message?: string;
}

export interface PasskeyItem {
  id: string;
  name: string;
  createdAt?: string;
  lastUsedAt?: string | null;
  deviceType?: string;
  transports?: string[];
}

export interface SessionListItem {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  lastActiveAt?: string;
  current?: boolean;
}

export class SerafortApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;
  raw?: unknown;

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>, raw?: unknown) {
    super(message);
    this.name = "SerafortApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.raw = raw;
  }
}
