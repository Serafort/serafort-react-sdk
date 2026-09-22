/**
 * SDK_ENDPOINTS — backend paths this SDK calls.
 *
 * Deliberately duplicated from `boilerplate/packages/api-contracts/src/endpoints.ts`
 * (`API_ENDPOINTS.auth` / `API_ENDPOINTS.user`) rather than importing that package.
 * `@cap/api-contracts` is a `workspace:*` package wired for this monorepo's internal
 * app; a third-party app installing `@serafort/react-sdk` from npm outside this workspace
 * has no way to resolve a `workspace:*` dependency. Keeping a small, self-contained
 * copy of only the paths this SDK actually uses is what makes the package installable
 * standalone. If the backend renames one of these routes, update both copies —
 * `node scripts/sync-contracts.mjs --check-dtos` (run from the workspace root) does
 * not currently check this package, since it lives outside the internal contract
 * surface on purpose.
 *
 * Paths mirror the canonical `/api/v1/*` surface documented in the root CLAUDE.md
 * wherever a v1 twin exists; legacy `/api/auth/*` otherwise.
 */
export const SDK_ENDPOINTS = {
  /**
   * Publishable-key bootstrap. Unauthenticated, standalone (not nested under
   * `middleware.tenant()` backend-side — see the route comment in
   * `start/routes.ts`), called before any session exists. Resolves whether
   * this SDK instance's `publishableKey` is valid and whether the current
   * page's origin is allowed to use it, without ever receiving the internal
   * tenant UUID — see `PublishableKeyService.publicStatus` on the backend.
   */
  publishableKeys: {
    resolve: "/api/v1/public/publishable-keys/resolve",
  },
  auth: {
    register: "/api/v1/auth/register",
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
    refresh: "/api/v1/auth/refresh",
    me: "/api/v1/auth/me",
    session: "/api/auth/session",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
    sso: {
      discover: "/api/auth/sso/discover",
      samlRedirect: (organizationId: string | number) =>
        `/api/auth/sso/saml/redirect?organizationId=${organizationId}`,
      oidcRedirect: (clientId: string | number) =>
        `/api/auth/sso/oidc/redirect?clientId=${clientId}`,
    },
    social: {
      redirect: (provider: string) => `/api/auth/social/${provider}/redirect`,
      exchange: "/api/auth/social/exchange",
    },
    passkey: {
      registerStart: "/api/v1/auth/passkey/register/options",
      registerFinish: "/api/v1/auth/passkey/register/verify",
      loginStart: "/api/v1/auth/passkey/authenticate/options",
      loginFinish: "/api/v1/auth/passkey/authenticate/verify",
    },
    mfa: {
      verifyLogin: "/api/auth/mfa/verify-login",
      recoveryVerify: "/api/auth/mfa/recovery-verify",
      setup: "/api/auth/mfa/setup",
      verify: "/api/auth/mfa/verify",
      disable: "/api/auth/mfa/disable",
      recoveryCodes: "/api/auth/mfa/recovery-codes",
      regenerateBackupCodes: "/api/auth/mfa/regenerate-backup-codes",
      sms: {
        sendCode: "/api/auth/mfa/sms/send-code",
        verify: "/api/auth/mfa/sms/verify",
        disable: "/api/auth/mfa/sms/disable",
        verifyLogin: "/api/auth/mfa/sms/verify-login",
      },
    },
    sessions: "/api/auth/sessions",
    revokeSession: (sessionId: string) => `/api/auth/sessions/${sessionId}`,
    revokeAllSessions: "/api/auth/sessions/revoke-all",
  },
  user: {
    changePassword: "/api/user/change-password",
    passkeys: {
      index: "/api/user/passkeys",
      update: (id: string | number) => `/api/user/passkeys/${id}`,
      destroy: (id: string | number) => `/api/user/passkeys/${id}`,
    },
    mfa: {
      methods: "/api/user/mfa/methods",
    },
  },
} as const;
