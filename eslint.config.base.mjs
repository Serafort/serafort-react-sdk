// Shared flat ESLint config for the Serafort React SDK workspace
// (`@serafort/react-sdk` + `@serafort/react-elements`). Each package's own
// `eslint.config.mjs` imports and extends this base so both packages stay
// consistent without duplicating the rule set.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.tsbuildinfo"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // eslint-plugin-react-hooks@7 bundles the full React Compiler diagnostic
    // rule set (immutability, purity, set-state-in-render, etc.) under
    // `configs["recommended-latest"]` (also in legacy eslintrc shape, which
    // flat config rejects — hence registering the plugin object directly
    // below). Those compiler rules assume code is authored for the React
    // Compiler and are known to false-positive on ordinary hand-written hooks
    // (e.g. a `useCallback` that recursively re-schedules itself, a standard
    // pattern for polling/background-refresh loops used in this SDK's token
    // refresh timer). This SDK does not build with the React Compiler, so we
    // only enable the two long-stable, universally-applicable rules instead
    // of the full experimental set.
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Headless/UI SDK code intentionally exposes broad public surface area;
      // unused exported types are common in .d.ts-style barrel files.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default baseConfig;
