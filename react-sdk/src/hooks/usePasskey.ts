import { useCallback, useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useSerafortClient } from "../context/SerafortContext";
import { SDK_ENDPOINTS } from "../endpoints";
import type { MfaLoginCompletionResponse, PasskeyItem } from "../types";

export interface UsePasskeyResult {
  isBusy: boolean;
  error: string | null;
  /** Registers a new passkey for the *currently signed-in* user (management flow). */
  registerPasskey: (friendlyName?: string) => Promise<boolean>;
  /**
   * Authenticates with an existing passkey (sign-in flow, no session required yet).
   * Returns the raw login-completion body on success so `useSignIn` can hand it to
   * `completeSignIn`.
   */
  authenticateWithPasskey: (email?: string) => Promise<MfaLoginCompletionResponse | null>;
  listPasskeys: () => Promise<PasskeyItem[]>;
  renamePasskey: (id: string, name: string) => Promise<boolean>;
  deletePasskey: (id: string) => Promise<boolean>;
}

/**
 * Headless WebAuthn state machine wrapping `@simplewebauthn/browser`, the same
 * library `boilerplate/packages/modules/auth`'s sign-in flow and passkey
 * management screen already use — see
 * `.../authentication-core/screens/signin/hooks/useSignInFlow.ts` (login) and
 * `.../mfa-orchestrator/services/mfa.service.ts` (`mfaService.passkeys.*`,
 * management). This hook wires both the login path (register/authenticate
 * against `/api/v1/auth/passkey/*`) and the management path
 * (`/api/user/passkeys*`) so `@serafort/react-elements`'s `<SignIn/>` and
 * `<UserProfile/>` can both consume it.
 */
export function usePasskey(): UsePasskeyResult {
  const { http } = useSerafortClient();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerPasskey = useCallback(
    async (friendlyName?: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const optionsRes = await http.post<PublicKeyCredentialCreationOptionsJSON>(
          SDK_ENDPOINTS.auth.passkey.registerStart,
        );
        const attestation = await startRegistration({ optionsJSON: optionsRes.data });
        await http.post(SDK_ENDPOINTS.auth.passkey.registerFinish, { ...attestation, friendlyName });
        return true;
      } catch (err) {
        if ((err as { name?: string })?.name !== "NotAllowedError") {
          setError((err as Error)?.message || "Passkey registration failed.");
        }
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [http],
  );

  const authenticateWithPasskey = useCallback(
    async (email?: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const optionsRes = await http.post<PublicKeyCredentialRequestOptionsJSON>(
          SDK_ENDPOINTS.auth.passkey.loginStart,
          email ? { email } : {},
        );
        const assertion = await startAuthentication({ optionsJSON: optionsRes.data });
        const verifyRes = await http.post<MfaLoginCompletionResponse>(
          SDK_ENDPOINTS.auth.passkey.loginFinish,
          assertion,
        );
        return verifyRes.data;
      } catch (err) {
        if ((err as { name?: string })?.name !== "NotAllowedError") {
          setError((err as Error)?.message || "Passkey sign-in failed.");
        }
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [http],
  );

  const listPasskeys = useCallback(async () => {
    const res = await http.get<PasskeyItem[]>(SDK_ENDPOINTS.user.passkeys.index);
    return res.data ?? [];
  }, [http]);

  const renamePasskey = useCallback(
    async (id: string, name: string) => {
      try {
        await http.put(SDK_ENDPOINTS.user.passkeys.update(id), { name });
        return true;
      } catch (err) {
        setError((err as Error)?.message || "Could not rename passkey.");
        return false;
      }
    },
    [http],
  );

  const deletePasskey = useCallback(
    async (id: string) => {
      try {
        await http.delete(SDK_ENDPOINTS.user.passkeys.destroy(id));
        return true;
      } catch (err) {
        setError((err as Error)?.message || "Could not remove passkey.");
        return false;
      }
    },
    [http],
  );

  return {
    isBusy,
    error,
    registerPasskey,
    authenticateWithPasskey,
    listPasskeys,
    renamePasskey,
    deletePasskey,
  };
}
