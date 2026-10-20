import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Downgraded to warn for Phase 2 work: the codebase has ~140 preexisting
      // `as any` casts (ROLLOUT_PLAN.md phase 4 cleans them up incrementally).
      // Treating them as errors blocked bug-fix PRs that merely touched files
      // with backlog casts. CI's per-PR lint runs with --quiet so warnings do
      // not fail the build, but editors still highlight them. Flip back to
      // "error" once the backlog is drained in phase 4.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
