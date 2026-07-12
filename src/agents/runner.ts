// RUNNER — executes the generated Playwright specs and parses results.
// Test failures are DATA (they become findings), not a pipeline crash — so the
// runner ignores Playwright's non-zero exit and reads the JSON report instead.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import type { TestResult } from "../types.js";

const RESULTS = "generated/.results.json";

export function run(): TestResult[] {
  spawnSync("npx", ["playwright", "test"], {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });

  if (!existsSync(RESULTS)) {
    console.warn("[runner] no results file produced.");
    return [];
  }

  const report = JSON.parse(readFileSync(RESULTS, "utf8"));
  const results: TestResult[] = [];

  const walk = (suites: any[] = []) => {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        const test = spec.tests?.[0];
        const result = test?.results?.[test.results.length - 1];
        const status = spec.ok ? "passed" : "failed";
        results.push({
          name: spec.title,
          status: status as TestResult["status"],
          durationMs: result?.duration ?? 0,
          error: spec.ok
            ? undefined
            : (result?.error?.message ?? "Test failed").split("\n")[0],
        });
      }
      if (suite.suites) walk(suite.suites);
    }
  };
  walk(report.suites);
  return results;
}
