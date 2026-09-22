import { useCallback, useState } from "react";
import { useSerafortClient } from "../context/SerafortContext";
import { SDK_ENDPOINTS } from "../endpoints";
import type { MfaLoginCompletionResponse, MfaMethodType, PendingMfaChallenge } from "../types";

export interface UseMfaChallengeResult {
  method: MfaMethodType;
  setMethod: (method: MfaMethodType) => void;
  code: string;
  setCode: (code: string) => void;
  isSubmitting: boolean;
  error: string | null;
  /** Verifies `code` against the active `method` and completes the pending sign-in on success. */
  verify: () => Promise<boolean>;
  /** Only meaningful for `method === 'sms'`. */
  resendSms: () => Promise<void>;
  isResendingSms: boolean;
}

/**
 * Headless state machine for the **login-time** MFA challenge issued when
 * `POST auth.login` answers `{ mfaRequired: true, userId }` (see
 * `useSignIn.ts`). Distinct from step-up (an already-signed-in session
 * elevating for a sensitive action) and from TOTP *enrollment*
 * (`/api/auth/mfa/setup` + `/verify`, exposed directly by `<UserProfile/>`
 * rather than through this hook) — mirrors the split in the internal module's
 * `mfa.service.ts` between `verifyLogin`/`recoveryVerify`/`sms.verifyLogin`
 * (this hook) and `setupTotp`/`confirmTotp`/`stepUp.*` (enrollment/step-up,
 * out of scope here).
 */
export function useMfaChallenge(
  challenge: PendingMfaChallenge | null,
  onVerified: (body: MfaLoginCompletionResponse) => void,
): UseMfaChallengeResult {
  const { http } = useSerafortClient();
  const [method, setMethod] = useState<MfaMethodType>("totp");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingSms, setIsResendingSms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useCallback(
    () => ({
      mfa_token: challenge?.mfaToken,
      userId: challenge?.userId,
      code,
    }),
    [challenge, code],
  );

  const verify = useCallback(async () => {
    if (!challenge) {
      setError("No pending MFA challenge.");
      return false;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const endpoint =
        method === "totp"
          ? SDK_ENDPOINTS.auth.mfa.verifyLogin
          : method === "sms"
            ? SDK_ENDPOINTS.auth.mfa.sms.verifyLogin
            : SDK_ENDPOINTS.auth.mfa.recoveryVerify;

      const res = await http.post<MfaLoginCompletionResponse>(endpoint, payload());
      onVerified(res.data);
      setCode("");
      return true;
    } catch (err) {
      setError((err as Error)?.message || "Invalid verification code. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [challenge, method, payload, http, onVerified]);

  const resendSms = useCallback(async () => {
    setIsResendingSms(true);
    setError(null);
    try {
      await http.post(SDK_ENDPOINTS.auth.mfa.sms.sendCode);
    } catch (err) {
      setError((err as Error)?.message || "Could not resend the code.");
    } finally {
      setIsResendingSms(false);
    }
  }, [http]);

  return { method, setMethod, code, setCode, isSubmitting, error, verify, resendSms, isResendingSms };
}
