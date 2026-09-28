// Flat config (eslint 9+). Migrated from .eslintrc.js — every rule, plugin,
// and override below is preserved from the legacy config; nothing was
// dropped to make lint pass. See ../eslint.config.js for the sibling
// frontend config (which additionally extends "prettier" and sets
// "max-len" — this Worker config does not, matching the original).
const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    // Replaces the old ignorePatterns: ["/lib/**/*"] (built files). Also
    // exempts this config file itself from the "google"/typescript-eslint
    // style rules below, which target application source, not build
    // tooling (it would otherwise fail on its own require()/formatting).
    ignores: ["lib/**", "node_modules/**", "eslint.config.js"],
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
  // ambient globals like `jest`/`describe`/`KVNamespace`, declared only
  // via @types/jest and @cloudflare/workers-types, don't false-positive).
  ...tsPlugin.configs["flat/recommended"],
  tsPlugin.configs["flat/eslint-recommended"],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["tsconfig.json", "tsconfig.dev.json"],
        sourceType: "module",
      },
    },
    rules: {
      quotes: ["error", "double"],
      "import/no-unresolved": 0,
      "require-jsdoc": 0,
      // "google" configures core rules removed in eslint 9 (deprecated
      // since 5.10, removed 9.0.0); referencing them at all — even to
      // disable — is fatal unless explicitly turned off here.
      "valid-jsdoc": "off",
    },
  },
  {
    files: ["**/*.spec.+(ts|tsx)"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
