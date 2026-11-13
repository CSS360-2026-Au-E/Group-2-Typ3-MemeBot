import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
  // Tests run under mocha, which provides describe, it, beforeEach, ...
  { files: ["tests/**/*.js"], languageOptions: { globals: globals.mocha } },
]);
