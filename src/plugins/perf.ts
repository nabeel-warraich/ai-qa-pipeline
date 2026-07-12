import type { Page } from "@playwright/test";
import type { Finding } from "../types.js";
import type { QaPlugin } from "./plugin.js";

// Basic performance check using Navigation Timing. Flags slow loads.
export class PerfPlugin implements QaPlugin {
  readonly name = "perf";
  private budgetMs = 4000;

  async inspect(page: Page, url: string): Promise<Finding[]> {
    const loadMs = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      return nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0;
    });

    if (loadMs > this.budgetMs) {
      return [
        {
          title: "Page load exceeds performance budget",
          area: "performance",
          severity: loadMs > this.budgetMs * 2 ? "high" : "medium",
          evidence: `Load time ${loadMs}ms > budget ${this.budgetMs}ms on ${url}`,
          recommendation: "Investigate render-blocking resources, image sizes, and Core Web Vitals.",
        },
      ];
    }
    return [];
  }
}
