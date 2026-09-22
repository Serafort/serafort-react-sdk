// @serafort/react-elements — styled, drop-in Serafort auth components (MUI v7).
// Wrap your app in @serafort/react-sdk's <SerafortProvider> first; these components
// consume its hooks and render nothing without it.

export { SignIn } from "./components/SignIn";
export type { SignInProps } from "./components/SignIn";

export { LoginBox } from "./components/LoginBox";
export type { LoginBoxProps } from "./components/LoginBox";

export { SignUp } from "./components/SignUp";
export type { SignUpProps } from "./components/SignUp";

export { SignUpBox } from "./components/SignUpBox";
export type { SignUpBoxProps } from "./components/SignUpBox";

export { MfaChallenge } from "./components/MfaChallenge";
export type { MfaChallengeProps } from "./components/MfaChallenge";

export { UserProfile } from "./components/UserProfile";

export { SerafortThemeProvider } from "./components/SerafortThemeProvider";
export type { SerafortThemeProviderProps } from "./components/SerafortThemeProvider";

// Re-exported for convenience so a consumer of @serafort/react-elements alone (without
// a direct @serafort/react-sdk dependency in their own package.json) still gets the
// provider and hooks from a single import.
export {
  SerafortProvider,
  useSession,
  useUser,
  useSignIn,
  useSignUp,
  useSsoDiscovery,
  usePasskey,
  useMfaChallenge,
} from "@serafort/react-sdk";
export type {
  SerafortProviderProps,
  SerafortUser,
  SessionStatus,
  UseSignInResult,
  SignInStep,
  UseSignUpResult,
  SignUpStep,
} from "@serafort/react-sdk";
