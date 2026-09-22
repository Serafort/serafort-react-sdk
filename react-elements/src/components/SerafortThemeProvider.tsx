import React, { useMemo } from "react";
import { ThemeProvider, createTheme, useTheme, type Theme } from "@mui/material/styles";

export interface SerafortThemeProviderProps {
  /** Pass your app's own MUI theme to have Serafort components inherit it exactly. */
  theme?: Theme;
  children: React.ReactNode;
}

/**
 * Optional convenience wrapper. `@serafort/react-elements` components work fine
 * without it — MUI v7 components fall back to its default theme when no
 * `ThemeProvider` ancestor exists — but a host app with no MUI setup at all
 * gets a slightly nicer out-of-the-box look (rounded controls, the same
 * default palette the rest of Serafort ships with) by wrapping once here.
 *
 * If the host app already has its own `<ThemeProvider>`, skip this entirely;
 * `<LoginBox/>` / `<UserProfile/>` read colors from `useTheme()` and will pick
 * up the ambient theme automatically.
 */
export function SerafortThemeProvider({ theme, children }: SerafortThemeProviderProps) {
  const fallbackTheme = useMemo(() => theme ?? createTheme({ shape: { borderRadius: 12 } }), [theme]);
  return <ThemeProvider theme={fallbackTheme}>{children}</ThemeProvider>;
}

export { useTheme };
