import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useSerafortClient, usePasskey, SDK_ENDPOINTS } from "@serafort/react-sdk";
import type { PasskeyItem, SessionListItem } from "@serafort/react-sdk";
import { RADIUS_LG, CONTROL_HEIGHT } from "../theme/tokens";

type TabKey = "password" | "sessions" | "two-factor" | "passkeys";

/**
 * Self-serve account management: password change, active-session review and
 * revocation, TOTP enrollment/disable, and passkey management. Wraps the same
 * backend endpoints the internal module's equivalent screens use
 * (`user-directory` for password/sessions, `mfa-orchestrator` for TOTP and
 * passkeys — see `SDK_ENDPOINTS` in `@serafort/react-sdk` for the exact paths).
 */
export function UserProfile() {
  const [tab, setTab] = useState<TabKey>("password");

  return (
    <Paper elevation={0} variant="outlined" sx={{ width: "100%", maxWidth: 560, mx: "auto", borderRadius: RADIUS_LG }}>
      <Tabs
        value={tab}
        onChange={(_e, value) => setTab(value)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="password" label="Password" sx={{ textTransform: "none" }} />
        <Tab value="sessions" label="Sessions" sx={{ textTransform: "none" }} />
        <Tab value="two-factor" label="Two-factor" sx={{ textTransform: "none" }} />
        <Tab value="passkeys" label="Passkeys" sx={{ textTransform: "none" }} />
      </Tabs>
      <Box sx={{ p: 3 }}>
        {tab === "password" && <PasswordPanel />}
        {tab === "sessions" && <SessionsPanel />}
        {tab === "two-factor" && <TwoFactorPanel />}
        {tab === "passkeys" && <PasskeysPanel />}
      </Box>
    </Paper>
  );
}

function PasswordPanel() {
  const { http } = useSerafortClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setStatus(null);
    try {
      // Backend validator (`changePasswordValidator`, Authentication/app/controllers/user/users_controller.ts)
      // expects `password`, not `newPassword`, as the new-password field.
      await http.post(SDK_ENDPOINTS.user.changePassword, { currentPassword, password: newPassword });
      setStatus({ type: "success", message: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setStatus({ type: "error", message: (err as Error)?.message || "Could not update password." });
    } finally {
      setIsSubmitting(false);
    }
  }, [http, currentPassword, newPassword]);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Change password
      </Typography>
      {status && <Alert severity={status.type}>{status.message}</Alert>}
      <TextField
        fullWidth
        type="password"
        label="Current password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <TextField
        fullWidth
        type="password"
        label="New password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Button
        variant="contained"
        disabled={!currentPassword || !newPassword || isSubmitting}
        onClick={() => void submit()}
        sx={{ height: CONTROL_HEIGHT, borderRadius: RADIUS_LG, textTransform: "none", fontWeight: 700, alignSelf: "flex-start", px: 3 }}
      >
        {isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </Stack>
  );
}

function SessionsPanel() {
  const { http } = useSerafortClient();
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await http.get<SessionListItem[]>(SDK_ENDPOINTS.auth.sessions);
      setSessions(res.data ?? []);
    } catch (err) {
      setError((err as Error)?.message || "Could not load sessions.");
    }
  }, [http]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = useCallback(
    async (id: string) => {
      await http.delete(SDK_ENDPOINTS.auth.revokeSession(id));
      void load();
    },
    [http, load],
  );

  const revokeAll = useCallback(async () => {
    await http.post(SDK_ENDPOINTS.auth.revokeAllSessions);
    void load();
  }, [http, load]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Active sessions
        </Typography>
        <Button size="small" onClick={() => void revokeAll()} sx={{ textTransform: "none" }}>
          Sign out everywhere
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <List disablePadding>
        {(sessions ?? []).map((session) => (
          <ListItem key={session.id} divider>
            <ListItemText
              primary={session.userAgent || session.id}
              secondary={
                <>
                  {session.ipAddress ?? "Unknown IP"}
                  {session.current && <Chip size="small" label="This device" sx={{ ml: 1 }} />}
                </>
              }
            />
            {!session.current && (
              <ListItemSecondaryAction>
                <IconButton size="small" onClick={() => void revoke(session.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

function TwoFactorPanel() {
  const { http } = useSerafortClient();
  const [setupData, setSetupData] = useState<{ qrDataUrl: string; manualEntry: string } | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const beginSetup = useCallback(async () => {
    setStatus(null);
    try {
      const res = await http.post<{ qrDataUrl: string; manualEntry: string }>(SDK_ENDPOINTS.auth.mfa.setup);
      setSetupData(res.data);
    } catch (err) {
      setStatus({ type: "error", message: (err as Error)?.message || "Could not start TOTP setup." });
    }
  }, [http]);

  const confirmSetup = useCallback(async () => {
    try {
      const res = await http.post<{ recoveryCodes: string[]; message: string }>(SDK_ENDPOINTS.auth.mfa.verify, { code });
      setRecoveryCodes(res.data.recoveryCodes);
      setSetupData(null);
      setCode("");
      setStatus({ type: "success", message: "Two-factor authentication enabled." });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error)?.message || "Invalid code." });
    }
  }, [http, code]);

  const disable = useCallback(async () => {
    try {
      await http.post(SDK_ENDPOINTS.auth.mfa.disable);
      setStatus({ type: "success", message: "Two-factor authentication disabled." });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error)?.message || "Could not disable two-factor." });
    }
  }, [http]);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Authenticator app (TOTP)
      </Typography>
      {status && <Alert severity={status.type}>{status.message}</Alert>}

      {recoveryCodes && (
        <Alert severity="info">
          Save these recovery codes — each works once: {recoveryCodes.join(", ")}
        </Alert>
      )}

      {!setupData && (
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={() => void beginSetup()} sx={{ textTransform: "none", fontWeight: 700 }}>
            Enable
          </Button>
          <Button variant="outlined" color="error" onClick={() => void disable()} sx={{ textTransform: "none" }}>
            Disable
          </Button>
        </Stack>
      )}

      {setupData && (
        <Stack spacing={2}>
          <Box component="img" src={setupData.qrDataUrl} alt="Scan with your authenticator app" sx={{ width: 180, height: 180 }} />
          <Typography variant="caption" color="text.secondary">
            Or enter manually: {setupData.manualEntry}
          </Typography>
          <TextField
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputProps={{ inputMode: "numeric", maxLength: 6 }}
          />
          <Button
            variant="contained"
            disabled={code.trim().length === 0}
            onClick={() => void confirmSetup()}
            sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
          >
            Confirm
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function PasskeysPanel() {
  const passkey = usePasskey();
  const [items, setItems] = useState<PasskeyItem[] | null>(null);

  const load = useCallback(async () => {
    const list = await passkey.listPasskeys();
    setItems(list);
  }, [passkey]);

  useEffect(() => {
    void load();
  }, [load]);

  const addPasskey = useCallback(async () => {
    const ok = await passkey.registerPasskey();
    if (ok) void load();
  }, [passkey, load]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Passkeys
        </Typography>
        <Button
          size="small"
          disabled={passkey.isBusy}
          onClick={() => void addPasskey()}
          sx={{ textTransform: "none" }}
        >
          {passkey.isBusy ? "Waiting…" : "Add a passkey"}
        </Button>
      </Stack>
      {passkey.error && <Alert severity="error">{passkey.error}</Alert>}
      <List disablePadding>
        {(items ?? []).map((item) => (
          <ListItem key={item.id} divider>
            <ListItemText primary={item.name} secondary={item.deviceType} />
            <ListItemSecondaryAction>
              <IconButton
                size="small"
                onClick={async () => {
                  await passkey.deletePasskey(item.id);
                  void load();
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      {items && items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No passkeys registered yet.
        </Typography>
      )}
      <Divider />
    </Stack>
  );
}
