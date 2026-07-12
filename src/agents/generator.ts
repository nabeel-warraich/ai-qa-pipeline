// GENERATOR — turns discovered pages into executable Playwright specs.
// Deterministic, grounded in the real crawl (no hallucinated selectors). The LLM
// contributes feature/risk analysis upstream; generation stays safe and runnable.

import { writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DiscoveredPage, GeneratedTest } from "../types.js";

const GEN_DIR = "generated";

function slug(url: string): string {
  return (
    url
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "page"
  );
}

export function generate(pages: DiscoveredPage[]): GeneratedTest[] {
  if (existsSync(GEN_DIR)) rmSync(GEN_DIR, { recursive: true, force: true });
  mkdirSync(GEN_DIR, { recursive: true });

  const tests: GeneratedTest[] = [];

  for (const p of pages) {
    const name = p.title || p.url;
    const hasForm = p.forms.some((f) => f.inputs.length);
    const spec = `import { test, expect } from '@playwright/test';

const URL = ${JSON.stringify(p.url)};

test.describe(${JSON.stringify(name)}, () => {
  test('loads with a successful status and renders content', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    const resp = await page.goto(URL, { waitUntil: 'domcontentloaded' });
    expect(resp?.status() ?? 0, 'HTTP status should be < 400').toBeLessThan(400);
    await expect(page.locator('h1, h2').first(), 'a primary heading should be visible').toBeVisible();
    expect(consoleErrors, 'no console errors on load').toHaveLength(0);
  });
${
  hasForm
    ? `
  test('primary form exposes a submit control', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('form button, form [type="submit"]').first(),
      'form should have a submit control'
    ).toBeVisible();
  });
`
    : ""
}});
`;
    const filePath = join(GEN_DIR, `${slug(p.url)}.spec.ts`);
    writeFileSync(filePath, spec);
    tests.push({ name, filePath, targetUrl: p.url });
  }

  return tests;
}
