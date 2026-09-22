import React from "react";
import { Paper } from "@mui/material";
import { SignIn, type SignInProps } from "./SignIn";
import { RADIUS_LG } from "../theme/tokens";

export interface LoginBoxProps extends SignInProps {
  maxWidth?: number;
}

/**
 * ```tsx
 * <LoginBox />
 * ```
 *
 * Clerk-style drop-in card: `<SignIn/>` inside a themed `Paper`. Use `<SignIn/>`
 * directly if you want to control the surrounding chrome yourself.
 */
export function LoginBox({ maxWidth = 400, ...signInProps }: LoginBoxProps) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        width: "100%",
        maxWidth,
        mx: "auto",
        p: 4,
        borderRadius: RADIUS_LG,
      }}
    >
      <SignIn {...signInProps} />
    </Paper>
  );
}
