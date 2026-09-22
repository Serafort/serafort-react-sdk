import React from "react";
import { Box, Button, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Alert } from "@mui/material";
import type { UseMfaChallengeResult } from "@serafort/react-sdk";
import { RADIUS_LG, CONTROL_HEIGHT } from "../theme/tokens";

export interface MfaChallengeProps {
  /** The state + actions returned by `useSignIn().mfa` (or a standalone `useMfaChallenge()` call). */
  mfa: UseMfaChallengeResult;
  onCancel?: () => void;
}

/**
 * MFA challenge screen: TOTP / SMS / recovery-code entry for a pending
 * login-time challenge. Exported both standalone and embedded inside
 * `<SignIn/>` once `useSignIn().step === 'mfa'`.
 */
export function MfaChallenge({ mfa, onCancel }: MfaChallengeProps) {
  const canSubmit = mfa.code.trim().length > 0 && !mfa.isSubmitting;

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Verify your identity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter the verification code to finish signing in.
        </Typography>
      </Box>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={mfa.method}
        onChange={(_e, value) => value && mfa.setMethod(value)}
        sx={{ "& .MuiToggleButton-root": { textTransform: "none", borderRadius: `${RADIUS_LG} !important` } }}
      >
        <ToggleButton value="totp">Authenticator</ToggleButton>
        <ToggleButton value="sms">SMS</ToggleButton>
        <ToggleButton value="recovery">Recovery code</ToggleButton>
      </ToggleButtonGroup>

      {mfa.error && <Alert severity="error">{mfa.error}</Alert>}

      <TextField
        autoFocus
        fullWidth
        label={mfa.method === "recovery" ? "Recovery code" : "6-digit code"}
        value={mfa.code}
        onChange={(e) => mfa.setCode(e.target.value)}
        inputProps={{ inputMode: mfa.method === "recovery" ? "text" : "numeric", maxLength: mfa.method === "recovery" ? 32 : 6 }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) void mfa.verify();
        }}
      />

      {mfa.method === "sms" && (
        <Button
          variant="text"
          size="small"
          disabled={mfa.isResendingSms}
          onClick={() => void mfa.resendSms()}
          sx={{ textTransform: "none", alignSelf: "flex-start" }}
        >
          {mfa.isResendingSms ? "Sending…" : "Resend code"}
        </Button>
      )}

      <Button
        fullWidth
        variant="contained"
        disabled={!canSubmit}
        onClick={() => void mfa.verify()}
        sx={{ height: CONTROL_HEIGHT, borderRadius: RADIUS_LG, textTransform: "none", fontWeight: 700 }}
      >
        {mfa.isSubmitting ? "Verifying…" : "Verify"}
      </Button>

      {onCancel && (
        <Button variant="text" onClick={onCancel} sx={{ textTransform: "none" }}>
          Back to sign in
        </Button>
      )}
    </Stack>
  );
}
