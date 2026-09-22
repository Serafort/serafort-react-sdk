import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import BusinessIcon from "@mui/icons-material/Business";
import { useSignIn } from "@serafort/react-sdk";
import { MfaChallenge } from "./MfaChallenge";
import { RADIUS_LG, CONTROL_HEIGHT } from "../theme/tokens";

export interface SignInProps {
  /** Called once a session is established (password, passkey, or MFA-completed). */
  onSignedIn?: () => void;
}

/**
 * Headless-hook-driven sign-in form: email → SSO-domain auto-routing
 * ("Continue with Okta/SAML" once a matching domain is detected) → password
 * or passkey → optional MFA challenge. All state lives in `@serafort/react-sdk`'s
 * `useSignIn()`; this component only renders it.
 */
export function SignIn({ onSignedIn }: SignInProps) {
  const signIn = useSignIn();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (signIn.step === "complete") onSignedIn?.();
  }, [signIn.step, onSignedIn]);

  if (signIn.step === "mfa" && signIn.mfa) {
    return <MfaChallenge mfa={signIn.mfa} onCancel={signIn.reset} />;
  }

  const showSsoAction = signIn.sso.result.status === "found";

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome back. Sign in to continue.
        </Typography>
      </Box>

      {signIn.error && <Alert severity="error">{signIn.error}</Alert>}

      <TextField
        fullWidth
        type="email"
        label="Email address"
        autoComplete="username webauthn"
        value={signIn.email}
        onChange={(e) => signIn.setEmail(e.target.value)}
      />

      {showSsoAction ? (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<BusinessIcon />}
          onClick={signIn.redirectToSso}
          sx={{ height: CONTROL_HEIGHT, borderRadius: RADIUS_LG, textTransform: "none", fontWeight: 700 }}
        >
          Continue with SSO
        </Button>
      ) : (
        <>
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password webauthn"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && signIn.email && password) void signIn.submitPassword(password);
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            fullWidth
            variant="contained"
            disabled={!signIn.email || !password || signIn.isSubmitting}
            onClick={() => void signIn.submitPassword(password)}
            sx={{ height: CONTROL_HEIGHT, borderRadius: RADIUS_LG, textTransform: "none", fontWeight: 700 }}
          >
            {signIn.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<FingerprintIcon />}
            disabled={signIn.isPasskeyBusy}
            onClick={() => void signIn.submitPasskey()}
            sx={{ height: CONTROL_HEIGHT, borderRadius: RADIUS_LG, textTransform: "none", fontWeight: 700 }}
          >
            {signIn.isPasskeyBusy ? "Waiting for passkey…" : "Sign in with a passkey"}
          </Button>
        </>
      )}
    </Stack>
  );
}
