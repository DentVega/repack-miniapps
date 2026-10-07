/** @type {import('jest').Config} */
module.exports = {
  preset: "react-native",
  testMatch: ["**/*.test.tsx", "**/*.test.ts"],
  // Los imports relativos llevan .js (requisito del ESM publicado); en test apuntan al .ts.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transformIgnorePatterns: [
    "node_modules/\\.pnpm/(?!(?:react-native|react-native-|@react-native\\+|@react-native-community\\+|@testing-library\\+|@noble\\+|@dentvega\\+))",
  ],
};
