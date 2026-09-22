import { useCallback, useState } from "react";
import { useSerafortClient } from "../context/SerafortContext";
import { SDK_ENDPOINTS } from "../endpoints";
import { SerafortApiError } from "../types";

export type SignUpStep = "form" | "verify-email";

export interface UseSignUpResult {
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  step: SignUpStep;
  isSubmitting: boolean;
  error: string | null;
  submit: (password: string) => Promise<void>;
  reset: () => void;
}

/**
 * Renderless sign-up state machine, mirroring `useSignIn`'s shape.
 *
 * Unlike sign-in, `POST auth.register` never returns a session — the backend
 * requires email verification first (`requireEmailVerification: true`, see
 * `ApiV1AuthController.register`), so this hook never calls
 * `completeSignIn`. It only tracks whether the account was created and moves
 * to a `"verify-email"` step; the consuming app is responsible for what
 * happens after that (e.g. routing to sign-in once the user verifies).
 */
export function useSignUp(): UseSignUpResult {
  const { http } = useSerafortClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmailState] = useState("");
  const [step, setStep] = useState<SignUpStep>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEmail = useCallback((next: string) => {
    setEmailState(next);
    setError(null);
  }, []);

  const submit = useCallback(
    async (password: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        // The backend always requires email verification before a session
        // can be established (see `ApiV1AuthController.register`), so there
        // is no token here to complete sign-in with — only the next step.
        await http.post(SDK_ENDPOINTS.auth.register, { email, password, firstName, lastName });
        setStep("verify-email");
      } catch (err) {
        const message =
          err instanceof SerafortApiError
            ? err.message
            : (err as Error)?.message || "Sign-up failed. Please try again.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [http, email, firstName, lastName],
  );

  const reset = useCallback(() => {
    setFirstName("");
    setLastName("");
    setEmailState("");
    setStep("form");
    setError(null);
  }, []);

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    step,
    isSubmitting,
    error,
    submit,
    reset,
  };
}
