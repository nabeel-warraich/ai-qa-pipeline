import { defineConfig } from "@playwright/test";

// Config for the specs the pipeline GENERATES into ./generated at runtime.
export default defineConfig({
  testDir: "./generated",
  timeout: 30000,
  fullyParallel: true,
  reporter: [["json", { outputFile: "generated/.results.json" }], ["list"]],
  use: {
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
