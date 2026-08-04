// https://docs.expo.dev/guides/using-eslint/
//
// Biome (repo root) handles formatting and its own rule set; this adds what it
// doesn't have — the react-hooks and import rules from eslint-config-expo.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `.expo` is generated (the dev-error overlay imports paths that only exist
    // inside Metro), so linting it only ever produces noise.
    ignores: ['dist/*', '.expo/*', 'assets/data/*.json'],
  },
]);
