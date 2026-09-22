import { useCallback, useMemo, useState } from "react";
import { useSerafortClient } from "../context/SerafortContext";
import { useSsoDiscovery } from "./useSsoDiscovery";
import { usePasskey } from "./usePasskey";
import { useMfaChallenge, type UseMfaChallengeResult } from "./useMfaChallenge";
import { SDK_ENDPOINTS } from "../endpoints";
import type { MfaLoginCompletionResponse, PendingMfaChallenge } from "../types";

export type SignInStep = "identifier" | "password" | "sso" | "mfa" | "complete";

export interface UseSignInResult {
  step: SignInStep;
  email: string;
  setEmail: (email: string) => void;
  /** SSO email-domain routing state — see `useSsoDiscovery`. */
  sso: ReturnType<typeof useSsoDiscovery>;
  isSubmitting: boolean;
  error: string | null;
  submitPassword: (password: string) => Promise<void>;
  submitPasskey: () => Promise<void>;
  isPasskeyBusy: boolean;
  redirectToSso: () => void;
  /** Populated once `step === 'mfa'`; `null` otherwise. */
  mfa: UseMfaChallengeResult | null;
  reset: () => void;
}

interface RawLoginResponse extends MfaLoginCompletionResponse {
  mfaRequired?: boolean;
  mfa_required?: boolean;
  mfaToken?: string;
  mfa_token?: string;
}

/**
 * Renderless sign-in state machine: `email` → SSO-domain check → password *or*
 * passkey *or* SSO redirect → optional MFA challenge → session established via
 * `SerafortProvider`'s `completeSignIn`. `@serafort/react-elements`'s `<SignIn/>` /
 * `<LoginBox/>` render this; nothing here touches the DOM.
 */
export function useSignIn(): UseSignInResult {
  const { http, completeSignIn } = useSerafortClient();
  const [email, setEmailState] = useState("");
  const [step, setStep] = useState<SignInStep>("identifier");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<PendingMfaChallenge | null>(null);

  const sso = useSsoDiscovery(email);
  const passkey = usePasskey();

  const setEmail = useCallback((next: string) => {
    setEmailState(next);
    setError(null);
    setStep((current) => (current === "identifier" ? "identifier" : current));
  }, []);

  const handleRawLoginResponse = useCallback(
    (body: RawLoginResponse) => {
      const mfaRequired = body.mfaRequired ?? body.mfa_required;
      if (mfaRequired) {
        setPendingChallenge({
          mfaToken: body.mfaToken ?? body.mfa_token,
          userId: body.userId ?? (body.user as { id?: string | number } | undefined)?.id,
        });
        setStep("mfa");
        return;
      }

      const accessToken = body.accessToken ?? body.access_token ?? body.token;
      const rawUser = (body.user as Record<string, unknown> | undefined) ?? {};
      if (accessToken) {
        completeSignIn(accessToken, body.expiresIn ?? body.expires_in, rawUser);
        setStep("complete");
      } else {
        setError("Sign-in completed but no session token was returned.");
      }
    },
    [completeSignIn],
  );

  const onMfaVerified = useCallback(
    (body: MfaLoginCompletionResponse) => {
      const accessToken = body.accessToken ?? body.access_token ?? body.token;
      const rawUser = (body.user as Record<string, unknown> | undefined) ?? {};
      if (accessToken) {
        completeSignIn(accessToken, body.expiresIn ?? body.expires_in, rawUser);
      }
      setPendingChallenge(null);
      setStep("complete");
    },
    [completeSignIn],
  );

  const mfa = useMemo(
    () => (step === "mfa" ? { pendingChallenge } : null),
    [step, pendingChallenge],
  );
  // useMfaChallenge must be called unconditionally per the rules of hooks; it is a
  // no-op (challenge = null) until `step === 'mfa'` populates `pendingChallenge`.
  const mfaChallenge = useMfaChallenge(mfa ? pendingChallenge : null, onMfaVerified);

  const submitPassword = useCallback(
    async (password: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await http.post<{ data?: RawLoginResponse } & RawLoginResponse>(SDK_ENDPOINTS.auth.login, {
          email,
          password,
        });
        // v1 auth controllers wrap in { success, data, message, meta }.
        const body = (res.data?.data ?? res.data) as RawLoginResponse;
        handleRawLoginResponse(body);
      } catch (err) {
        setError((err as Error)?.message || "Login failed. Please check your credentials.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [http, email, handleRawLoginResponse],
  );

  const submitPasskey = useCallback(async () => {
    setError(null);
    const body = await passkey.authenticateWithPasskey(email || undefined);
    if (body) {
      handleRawLoginResponse(body as RawLoginResponse);
    } else if (passkey.error) {
      setError(passkey.error);
    }
  }, [passkey, email, handleRawLoginResponse]);

  const redirectToSso = useCallback(() => {
    const url = sso.redirectUrl();
    if (url && typeof window !== "undefined") {
      window.location.assign(url);
    }
  }, [sso]);

  const reset = useCallback(() => {
    setEmailState("");
    setStep("identifier");
    setError(null);
    setPendingChallenge(null);
  }, []);

  const derivedStep: SignInStep =
    step === "identifier" && sso.result.status === "found" ? "sso" : step === "identifier" ? "password" : step;

  return {
    step: derivedStep,
    email,
    setEmail,
    sso,
    isSubmitting,
    error,
    submitPassword,
    submitPasskey,
    isPasskeyBusy: passkey.isBusy,
    redirectToSso,
    mfa: step === "mfa" ? mfaChallenge : null,
    reset,
  };
}
