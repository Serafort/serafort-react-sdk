import React from "react";
import { Paper } from "@mui/material";
import { SignUp, type SignUpProps } from "./SignUp";
import { RADIUS_LG } from "../theme/tokens";

export interface SignUpBoxProps extends SignUpProps {
  maxWidth?: number;
}

/**
 * ```tsx
 * <SignUpBox />
 * ```
 *
 * Clerk-style drop-in card: `<SignUp/>` inside a themed `Paper`, matching
 * `<LoginBox/>`. Use `<SignUp/>` directly if you want to control the
 * surrounding chrome yourself.
 */
export function SignUpBox({ maxWidth = 400, ...signUpProps }: SignUpBoxProps) {
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
      <SignUp {...signUpProps} />
    </Paper>
  );
}
