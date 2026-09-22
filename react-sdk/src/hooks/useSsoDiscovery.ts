import { useCallback, useEffect, useRef, useState } from "react";
import { useSerafortClient } from "../context/SerafortContext";
import { SDK_ENDPOINTS } from "../endpoints";
import type { SsoDiscoveryResult } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;

interface RawSsoResponse {
  provider?: "saml" | "oidc" | "password";
  organizationId?: string | number;
  clientId?: string | number;
}

/**
 * Debounced `name@acme.com` → SSO-domain lookup, hitting the same
 * `GET /api/auth/sso/discover?email=...` endpoint the internal sign-in screen
 * uses (`authService.discoverSso`). Renderless: returns state plus a manual
 * trigger, for `@serafort/react-elements`'s `<SignIn/>` to render a
 * "Continue with Okta/SAML" affordance once `status === 'found'`.
 */
export function useSsoDiscovery(email: string, debounceMs = 500) {
  const { http } = useSerafortClient();
  const [result, setResult] = useState<SsoDiscoveryResult>({ status: "idle" });
  const requestIdRef = useRef(0);

  const check = useCallback(
    async (candidate: string) => {
      if (!EMAIL_PATTERN.test(candidate)) {
        setResult({ status: "idle" });
        return;
      }
      const requestId = ++requestIdRef.current;
      setResult({ status: "checking" });
      try {
        const res = await http.get<RawSsoResponse>(SDK_ENDPOINTS.auth.sso.discover, {
          params: { email: candidate },
        });
        if (requestId !== requestIdRef.current) return; // superseded by a newer keystroke
        if (res.data?.provider === "saml" || res.data?.provider === "oidc") {
          setResult({
            status: "found",
            provider: res.data.provider,
            organizationId: res.data.organizationId,
            clientId: res.data.clientId,
          });
        } else {
          setResult({ status: "none" });
        }
      } catch {
        if (requestId === requestIdRef.current) setResult({ status: "error" });
      }
    },
    [http],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      void check(email);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [email, debounceMs, check]);

  const redirectUrl = useCallback((): string | null => {
    if (result.status !== "found") return null;
    if (result.provider === "saml" && result.organizationId !== undefined) {
      return `${http.baseURL}${SDK_ENDPOINTS.auth.sso.samlRedirect(result.organizationId)}`;
    }
    if (result.provider === "oidc" && result.clientId !== undefined) {
      return `${http.baseURL}${SDK_ENDPOINTS.auth.sso.oidcRedirect(result.clientId)}`;
    }
    return null;
  }, [result, http.baseURL]);

  return { result, redirectUrl, checkNow: check };
}
