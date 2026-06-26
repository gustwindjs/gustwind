// @ts-check

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
const config = {
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  checkers: ["typescript"],
  cleanTempDir: "always",
  commandRunner: {
    command: "npm run test:mutation:node",
  },
  concurrency: "50%",
  coverageAnalysis: "off",
  disableTypeChecks: false,
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  ignorePatterns: [
    "build/**",
    "e2e/**",
    ".tmp-node-build/**",
    ".tmp-node-build-wrapper/**",
    "gustwind-node/npm/**",
    "htmlisp/npm/**",
  ],
  mutate: [
    "mod.ts",
    "version.ts",
    "cloudflare-worker/**/*.ts",
    "gustwind-node/**/*.ts",
    "gustwind-utilities/**/*.ts",
    "htmlisp/**/*.ts",
    "load-adapters/**/*.ts",
    "netlify/**/*.ts",
    "plugins/**/*.ts",
    "render-runtime/**/*.ts",
    "renderers/**/*.ts",
    "routers/**/*.ts",
    "scripts/**/*.ts",
    "utilities/**/*.ts",
    "!**/*_test.ts",
  ],
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
