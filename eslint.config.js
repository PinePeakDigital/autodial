// Flat config (eslint 9+). Migrated from .eslintrc.js — every rule, plugin,
// and override below is preserved from the legacy config; nothing was
// dropped to make lint pass. See functions/eslint.config.js for the
// sibling Worker config.
const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    // Also exempts this config file itself from the "google"/
    // typescript-eslint style rules below, which target application
    // source, not build tooling (it would otherwise fail on its own
    // require()/formatting).
    ignores: ["build/**", "coverage/**", "node_modules/**", "eslint.config.js"],
  },
  js.configs.recommended,
  // plugin:import/errors, plugin:import/warnings, plugin:import/typescript,
  // then "google" — same order as the old extends array, via the official
  // eslintrc compat layer (neither ships a native flat config).
  ...compat.extends(
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ),
  ...compat.extends("google"),
  // plugin:@typescript-eslint/recommended's flat form, plus the
  // TS-specific "eslint-recommended" overlay that turns off core rules
  // TypeScript itself already enforces (e.g. no-undef — needed so
  // ambient globals declared only via vitest's "vitest/globals" types,
  // like `describe`/`it`/`expect`, don't false-positive).
  ...tsPlugin.configs["flat/recommended"],
  tsPlugin.configs["flat/eslint-recommended"],
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.es2020,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: ["tsconfig.json", "tsconfig.dev.json"],
        sourceType: "module",
      },
    },
    rules: {
      quotes: ["error", "double"],
      "require-jsdoc": 0,
      "max-len": "error",
      // "google" configures core rules removed in eslint 9 (deprecated
      // since 5.10, removed 9.0.0); referencing them at all — even to
      // disable — is fatal unless explicitly turned off here.
      "valid-jsdoc": "off",
      // Allow vite's generated triple-slash reference directives (e.g.
      // src/vite-env.d.ts's `/// <reference types="vite/client" />`);
      // the default config treats the third "/" as a missing space.
      "spaced-comment": ["error", "always", {markers: ["/"]}],
    },
  },
  // eslint-config-prettier: turn off stylistic rules that conflict with
  // Prettier. Its exported object is rules-only, so it's flat-config safe.
  prettierConfig,
  {
    files: ["**/*.spec.+(ts|tsx)"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
