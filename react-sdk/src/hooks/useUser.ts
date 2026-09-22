import { useSerafortClient } from "../context/SerafortContext";
import type { SerafortUser } from "../types";

export interface UseUserResult {
  user: SerafortUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

/**
 * ```tsx
 * const { user, isLoaded } = useUser()
 * ```
 */
export function useUser(): UseUserResult {
  const { user, status } = useSerafortClient();
  return { user, isLoaded: status !== "loading", isSignedIn: status === "authenticated" };
}
