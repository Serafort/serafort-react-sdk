// @serafort/react-sdk — headless core for Serafort embedded authentication.
// No MUI/styling dependency; see @serafort/react-elements for the styled components
// (<SignIn/> / <LoginBox/> / <UserProfile/>) built on top of these primitives.

export { SerafortProvider } from "./context/SerafortProvider";
export type { SerafortProviderProps } from "./context/SerafortProvider";
export { useSerafortClient } from "./context/SerafortContext";
export type { SerafortContextValue } from "./context/SerafortContext";

export { useSession } from "./hooks/useSession";
export type { UseSessionResult } from "./hooks/useSession";

export { useUser } from "./hooks/useUser";
export type { UseUserResult } from "./hooks/useUser";

export { useSignIn } from "./hooks/useSignIn";
export type { UseSignInResult, SignInStep } from "./hooks/useSignIn";

export { useSignUp } from "./hooks/useSignUp";
export type { UseSignUpResult, SignUpStep } from "./hooks/useSignUp";

export { useSsoDiscovery } from "./hooks/useSsoDiscovery";

export { usePasskey } from "./hooks/usePasskey";
export type { UsePasskeyResult } from "./hooks/usePasskey";

export { useMfaChallenge } from "./hooks/useMfaChallenge";
export type { UseMfaChallengeResult } from "./hooks/useMfaChallenge";

export { SDK_ENDPOINTS } from "./endpoints";
export { SerafortHttpClient, PUBLISHABLE_KEY_HEADER } from "./http/httpClient";

export type {
  SerafortConfig,
  SerafortUser,
  SessionStatus,
  SsoDiscoveryResult,
  MfaMethodType,
  PendingMfaChallenge,
  MfaLoginCompletionResponse,
  PasskeyItem,
  SessionListItem,
} from "./types";
export { SerafortApiError } from "./types";
