import React, { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useSignUp } from "@serafort/react-sdk";
import { RADIUS_LG, CONTROL_HEIGHT } from "../theme/tokens";

export interface SignUpProps {
  /** Called once registration succeeds and the account is pending email verification. */
  onSignedUp?: () => void;
}

/**
 * Headless-hook-driven sign-up form: name + email + password → account
 * creation. All state lives in `@serafort/react-sdk`'s `useSignUp()`; this
 * component only renders it. Unlike `<SignIn/>`, a successful submit does not
 * establish a session — the backend always requires email verification
 * first, so this renders a "check your email" confirmation instead of
 * redirecting straight into the app.
 */
export function SignUp({ onSignedUp }: SignUpProps) {
  const signUp = useSignUp();
  const [password, setPassword] = useState("");

  React.useEffect(() => {
    if (signUp.step === "verify-email") onSignedUp?.();
  }, [signUp.step, onSignedUp]);

  if (signUp.step === "verify-email") {
    return (
      <Stack spacing={2.5} sx={{ width: "100%" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Check your email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We sent a verification link to {signUp.email}. Verify your address to finish setting up your account.
          </Typography>
        </Box>
      </Stack>
    );
  }

  const canSubmit = !!signUp.firstName && !!signUp.lastName && !!signUp.email && !!password;

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Create your account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Get started in a few seconds.
        </Typography>
      </Box>

      {signUp.error && <Alert severity="error">{signUp.error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField
          fullWidth
          label="First name"
          autoComplete="given-name"
          value={signUp.firstName}
          onChange={(e) => signUp.setFirstName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Last name"
          autoComplete="family-name"
          value={signUp.lastName}
          onChange={(e) => signUp.setLastName(e.target.value)}
        />
      </Stack>

      <TextField
        fullWidth
        type="email"
        label="Email address"
        autoComplete="username"
        value={signUp.email}
        onChange={(e) => signUp.setEmail(e.target.value)}
      />

      <TextField
        fullWidth
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) void signUp.submit(password);
        }}
      />

      <Button
        fullWidth
        variant="contained"
        disabled={!canSubmit || signUp.isSubmitting}
        onClick={() => void signUp.submit(password)}
        sx={{ height: CONTROL_HEIGHT, borderRadius: RADIUS_LG, textTransform: "none", fontWeight: 700 }}
      >
        {signUp.isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </Stack>
  );
}
