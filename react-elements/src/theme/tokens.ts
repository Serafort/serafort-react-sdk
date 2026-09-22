/**
 * Design tokens for `@serafort/react-elements`.
 *
 * These are CSS custom properties with fallbacks, the same convention
 * `AuthSocialButton` uses in the internal auth module (see
 * `boilerplate/packages/modules/auth/src/modules/authentication-core/components/shared/auth/AuthSocialButton.tsx`,
 * `var(--sf-radius-lg, 12px)`). Components read colors from the MUI `theme`
 * object passed in via `sx`/`useTheme()` — never a hardcoded hex — and use
 * these tokens only for non-palette values (radius, spacing rhythm).
 *
 * Deliberately NOT depending on `@cap/theme`: that package pulls in
 * `@cap/platform-core` and `@cap/platform-store` (see its `package.json`),
 * which wire up the internal app's Zustand store, tenant theme resolution and
 * IndexedDB-backed persistence — none of which a third-party host app has or
 * wants. `@serafort/react-elements` instead brings its own MUI `ThemeProvider`
 * fallback (see `SerafortThemeProvider` in `components/SerafortThemeProvider.tsx`)
 * so it renders correctly even when the host app has no MUI theme at all, and
 * automatically inherits `--sf-*` custom properties if the host happens to
 * already define them (e.g. because it also runs `@cap/theme`).
 */
export const RADIUS_LG = "var(--sf-radius-lg, 12px)";
export const RADIUS_MD = "var(--sf-radius-md, 8px)";
export const CONTROL_HEIGHT = 48;
