import { useSerafortClient } from "../context/SerafortContext";
import type { SessionStatus } from "../types";

export interface UseSessionResult {
  status: SessionStatus;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
}

/**
 * ```tsx
 * const { signOut } = useSession()
 * ```
 */
export function useSession(): UseSessionResult {
  const { status, signOut } = useSerafortClient();
  return { status, isSignedIn: status === "authenticated", signOut };
}
