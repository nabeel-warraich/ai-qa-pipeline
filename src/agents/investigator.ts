// INVESTIGATOR — turns raw failures + plugin findings into severity-ranked
// findings, consults memory for regressions, and (optionally) asks the LLM to
// sharpen recommendations.

import type { Finding, TestResult } from "../types.js";
import type { LLMProvider } from "../llm/provider.js";
import type { Memory } from "../memory/memory.js";

function severityFor(error: string): Finding["severity"] {
  const e = error.toLowerCase();
  if (e.includes("failed to load") || e.includes("http status")) return "critical";
  if (e.includes("console error")) return "high";
  if (e.includes("submit") || e.includes("form")) return "high";
  if (e.includes("heading")) return "medium";
  return "medium";
}

export async function investigate(
  results: TestResult[],
  pluginFindings: Finding[],
  llm: LLMProvider,
  memory: Memory,
  now: string
): Promise<Finding[]> {
  const findings: Finding[] = [...pluginFindings];

  for (const r of results.filter((x) => x.status === "failed")) {
    const severity = severityFor(r.error ?? "");
    findings.push({
      title: r.name,
      area: "functional",
      severity,
      evidence: r.error ?? "Assertion failed",
      recommendation: "Reproduce, confirm expected behaviour, and fix or file a defect.",
    });
  }

  // Memory: flag recurring issues as regressions.
  for (const f of findings) {
    const recurring = memory.recordBug(f.title, f.area, now);
    if (recurring) {
      f.recommendation = `RECURRING (seen in a prior run) — ${f.recommendation}`;
      if (f.severity === "medium") f.severity = "high";
    }
  }

  // Optional LLM enrichment of recommendations (safe fallback if unavailable).
  if (findings.length) {
    const system =
      "You are a QA lead. For each finding, give a one-sentence, concrete remediation. " +
      'Return ONLY JSON: an array of { "title": string, "recommendation": string } matching the input titles.';
    const user = JSON.stringify(findings.map((f) => ({ title: f.title, evidence: f.evidence })));
    const { extractJson } = await import("../llm/provider.js");
    const enriched = extractJson<{ title: string; recommendation: string }[]>(
      await llm.complete(system, user)
    );
    if (enriched) {
      for (const e of enriched) {
        const match = findings.find((f) => f.title === e.title);
        if (match && e.recommendation) match.recommendation = e.recommendation;
      }
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}
