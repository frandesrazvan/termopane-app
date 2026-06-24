import js from "@eslint/js";
import tseslint from "typescript-eslint";

const nodeGlobals = {
  console: "readonly",
  process: "readonly",
};

export default [
  {
    ignores: [
      "apps/web/.next/**",
      "apps/web/node_modules/**",
      "node_modules/**",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: nodeGlobals,
      sourceType: "module",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
