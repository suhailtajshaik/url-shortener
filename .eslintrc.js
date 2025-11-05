module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "plugin:node/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  rules: {
    "no-console": "off",
    "no-process-exit": "off",
    "node/no-unpublished-require": "off",
    "node/no-unsupported-features/es-syntax": "off",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "prefer-const": "error",
    "no-var": "error",
  },
};
