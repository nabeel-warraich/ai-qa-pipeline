// Plugin interface + registry. Capabilities (visual regression, a11y, perf,
// security, ...) plug in here without touching the core pipeline. 100% optional.

import type { Page } from "@playwright/test";
import type { Finding } from "../types.js";

export interface QaPlugin {
  readonly name: string;
  /** Runs against a live page during exploration; returns any findings. */
  inspect(page: Page, url: string): Promise<Finding[]>;
}

export class PluginRegistry {
  private plugins: QaPlugin[] = [];
  register(plugin: QaPlugin): this {
    this.plugins.push(plugin);
    return this;
  }
  get all(): QaPlugin[] {
    return this.plugins;
  }
  async runAll(page: Page, url: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    for (const p of this.plugins) {
      try {
        findings.push(...(await p.inspect(page, url)));
      } catch (err) {
        console.warn(`[plugin:${p.name}] error:`, (err as Error).message);
      }
    }
    return findings;
  }
}
