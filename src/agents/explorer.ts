// EXPLORER — walks the live app with Playwright like a real user:
// visits pages (same-origin, breadth-first, capped), captures structure,
// console errors, timing, and runs any registered plugins.

import { chromium } from "@playwright/test";
import type { DiscoveredPage, Finding } from "../types.js";
import type { PluginRegistry } from "../plugins/plugin.js";

export interface ExploreOutput {
  pages: DiscoveredPage[];
  pluginFindings: Finding[];
}

export async function explore(
  startUrl: string,
  maxPages: number,
  plugins: PluginRegistry
): Promise<ExploreOutput> {
  const origin = new URL(startUrl).origin;
  const queue = [startUrl];
  const seen = new Set<string>();
  const pages: DiscoveredPage[] = [];
  const pluginFindings: Finding[] = [];

  const browser = await chromium.launch();
  const context = await browser.newContext();

  try {
    while (queue.length && pages.length < maxPages) {
      const url = queue.shift()!;
      if (seen.has(url)) continue;
      seen.add(url);

      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(e.message));

      const started = Date.now();
      let status: number | null = null;
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        status = resp?.status() ?? null;
      } catch (err) {
        pluginFindings.push({
          title: "Page failed to load",
          area: "reliability",
          severity: "high",
          evidence: `${url}: ${(err as Error).message}`,
          recommendation: "Verify the route is reachable and returns within the timeout.",
        });
        await page.close();
        continue;
      }
      const loadMs = Date.now() - started;

      const data = await page.evaluate(() => {
        const abs = (href: string) => {
          try {
            return new URL(href, location.href).href;
          } catch {
            return "";
          }
        };
        return {
          title: document.title,
          links: [...document.querySelectorAll("a[href]")]
            .map((a) => abs(a.getAttribute("href") || ""))
            .filter(Boolean),
          forms: [...document.querySelectorAll("form")].map((f) => ({
            action: f.getAttribute("action") || location.href,
            inputs: [...f.querySelectorAll("input, select, textarea")].map(
              (i) => i.getAttribute("name") || i.getAttribute("id") || i.getAttribute("type") || "field"
            ),
            hasSubmit: !!f.querySelector('button, [type="submit"]'),
          })),
          buttons: [...document.querySelectorAll("button")].map((b) => (b.textContent || "").trim()).filter(Boolean),
          headings: [...document.querySelectorAll("h1, h2")].map((h) => (h.textContent || "").trim()).filter(Boolean),
        };
      });

      pluginFindings.push(...(await plugins.runAll(page, url)));

      pages.push({ url, status, loadMs, consoleErrors, ...data });

      // queue same-origin, non-anchor links we haven't seen
      for (const link of data.links) {
        const clean = link.split("#")[0];
        if (clean.startsWith(origin) && !seen.has(clean) && !queue.includes(clean)) {
          queue.push(clean);
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return { pages, pluginFindings };
}
