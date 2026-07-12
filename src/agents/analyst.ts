// ANALYST — turns raw exploration (+ optional PRD) into a prioritized list of
// features with risk levels and acceptance criteria. Uses the LLM when available,
// otherwise derives features heuristically from page structure.

import type { DiscoveredPage, Feature } from "../types.js";
import type { LLMProvider } from "../llm/provider.js";
import { extractJson } from "../llm/provider.js";

export async function analyze(
  pages: DiscoveredPage[],
  prd: string | undefined,
  llm: LLMProvider
): Promise<Feature[]> {
  const summary = pages.map((p) => ({
    url: p.url,
    title: p.title,
    forms: p.forms.length,
    buttons: p.buttons.slice(0, 8),
    headings: p.headings.slice(0, 6),
  }));

  const system =
    "You are a senior QA analyst. From the crawled pages and optional requirements, " +
    "identify the key user-facing features to test. Return ONLY JSON: an array of " +
    '{ "name": string, "area": string, "risk": "critical"|"high"|"medium"|"low", "acceptanceCriteria": string[] }.';
  const user =
    `Requirements (PRD): ${prd ? prd.slice(0, 4000) : "(none provided)"}\n\n` +
    `Crawled pages: ${JSON.stringify(summary).slice(0, 6000)}`;

  const parsed = extractJson<Feature[]>(await llm.complete(system, user));
  if (parsed && Array.isArray(parsed) && parsed.length) {
    return parsed.map((f) => ({
      name: String(f.name ?? "Unnamed feature"),
      area: String(f.area ?? "general"),
      risk: (["critical", "high", "medium", "low"].includes(f.risk) ? f.risk : "medium") as Feature["risk"],
      acceptanceCriteria: Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria.map(String) : [],
    }));
  }

  // Heuristic fallback: derive features from page structure.
  const features: Feature[] = [];
  for (const p of pages) {
    if (p.forms.length) {
      features.push({
        name: `Form submission on "${p.title || p.url}"`,
        area: /login|sign|auth/i.test(p.title + p.url) ? "authentication" : "forms",
        risk: "high",
        acceptanceCriteria: [
          "Required fields are validated",
          "Valid input submits successfully",
          "Errors are shown clearly for invalid input",
        ],
      });
    }
    features.push({
      name: `Page loads and renders: "${p.title || p.url}"`,
      area: "navigation",
      risk: "medium",
      acceptanceCriteria: ["Returns 2xx", "Renders without console errors", "Primary heading is present"],
    });
  }
  return features;
}
