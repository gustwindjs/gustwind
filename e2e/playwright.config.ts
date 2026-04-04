import { defineConfig } from "@playwright/test";

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;
const useExternalServer = process.env.PW_EXTERNAL_SERVER === "1";

export default defineConfig({
  testDir: "./",
  testMatch: "site.spec.ts",
  fullyParallel: true,
  reporter: "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: useExternalServer
    ? undefined
    : {
      command: `cd .. && deno task build && python3 -m http.server ${port} --directory build`,
      url: `${baseURL}/`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 120_000,
    },
});
