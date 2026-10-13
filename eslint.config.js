import eslintJs from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    // Artefactos generados: no se lintean (BE-27)
    ignores: ["coverage/**", "dist/**"],
  },
  {
    files: ["**/*.ts"],

    // Extend recommended rule sets from:
    // 1. ESLint JS's recommended rules
    // 2. TypeScript ESLint recommended rules
    // (espejo de FE-21 sin plugin de React: hooks no aplica al backend)
    extends: [eslintJs.configs.recommended, tseslint.configs.recommended],

    // Configure language/parsing options
    languageOptions: {
      // Use TypeScript ESLint parser for TypeScript files
      parser: tseslint.parser,
    },
  },
]);
