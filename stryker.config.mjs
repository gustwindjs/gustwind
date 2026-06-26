// @ts-check

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
const config = {
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  checkers: ["typescript"],
  cleanTempDir: "always",
  commandRunner: {
    command: "npm run test:node:site",
  },
  concurrency: "50%",
  coverageAnalysis: "off",
  disableTypeChecks: false,
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  ignorePatterns: ["build/**", ".tmp-node-build/**", ".tmp-node-build-wrapper/**"],
  mutate: ["site/transforms/markdownSatteri.ts"],
  packageManager: "npm",
  reporters: ["clear-text", "progress", "html", "json"],
  testRunner: "command",
  thresholds: {
    high: 90,
    low: 80,
    break: null,
  },
  tsconfigFile: "tsconfig.json",
  typescriptChecker: {
    prioritizePerformanceOverAccuracy: true,
  },
};

export default config;
