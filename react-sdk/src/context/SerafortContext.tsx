import { createContext, useContext } from "react";
import type { PublishableKeyStatus, SerafortUser, SessionStatus } from "../types";
import type { SerafortHttpClient } from "../http/httpClient";

export interface SerafortContextValue {
  http: SerafortHttpClient;
  user: SerafortUser | null;
  status: SessionStatus;
  /** Result of the publishable-key bootstrap resolution; `null` while `status === "loading"`. */
  keyStatus: PublishableKeyStatus | null;
  signOut: () => Promise<void>;
  /** Internal setter, called once a sign-in/passkey/MFA/SSO flow completes with a session. */
  completeSignIn: (accessToken: string, expiresIn: number | undefined, rawUser: Record<string, unknown>) => void;
}

export const SerafortContext = createContext<SerafortContextValue | null>(null);

export function useSerafortClient(): SerafortContextValue {
  const ctx = useContext(SerafortContext);
  if (!ctx) {
    throw new Error(
      "[@serafort/react-sdk] This hook must be used inside <SerafortProvider domain=... publishableKey=...>.",
    );
  }
  return ctx;
}
