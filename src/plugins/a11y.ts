import type { Page } from "@playwright/test";
import type { Finding } from "../types.js";
import type { QaPlugin } from "./plugin.js";

// Lightweight accessibility checks (a subset of WCAG heuristics) run in-page.
export class A11yPlugin implements QaPlugin {
  readonly name = "a11y";

  async inspect(page: Page, url: string): Promise<Finding[]> {
    const issues = await page.evaluate(() => {
      const out: { title: string; count: number }[] = [];
      const imgsNoAlt = [...document.querySelectorAll("img")].filter(
        (i) => !i.hasAttribute("alt")
      ).length;
      if (imgsNoAlt) out.push({ title: "Images missing alt text", count: imgsNoAlt });

      const inputsNoLabel = [...document.querySelectorAll("input, select, textarea")].filter(
        (el) => {
          const id = el.getAttribute("id");
          const labelled =
            (id && document.querySelector(`label[for="${id}"]`)) ||
            el.getAttribute("aria-label") ||
            el.getAttribute("aria-labelledby") ||
            el.closest("label");
          const type = el.getAttribute("type");
          return !labelled && type !== "hidden" && type !== "submit";
        }
      ).length;
      if (inputsNoLabel) out.push({ title: "Form fields without an accessible label", count: inputsNoLabel });

      if (!document.querySelector("html")?.getAttribute("lang"))
        out.push({ title: "Document is missing a lang attribute", count: 1 });

      if (document.querySelectorAll("h1").length === 0)
        out.push({ title: "Page has no H1 heading", count: 1 });

      return out;
    });

    return issues.map<Finding>((i) => ({
      title: i.title,
      area: "accessibility",
      severity: "medium",
      evidence: `${i.count} occurrence(s) on ${url}`,
      recommendation: "Address per WCAG 2.2 AA guidance.",
    }));
  }
}
