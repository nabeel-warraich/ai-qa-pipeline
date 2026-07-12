// REPORTER — assembles the final severity-ranked QA report and the ship/no-ship
// verdict, and writes it to Markdown.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Feature, Finding, QaReport, TestResult } from "../types.js";

const EMOJI: Record<Finding["severity"], string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "⚪",
};

export function buildReport(input: {
  url: string;
  startedAt: string;
  provider: string;
  pagesExplored: number;
  features: Feature[];
  results: TestResult[];
  findings: Finding[];
}): QaReport {
  const blocking = input.findings.filter(
    (f) => f.severity === "critical" || f.severity === "high"
  );
  const verdict: QaReport["verdict"] = blocking.length ? "NO-SHIP" : "SHIP";
  const verdictReason = blocking.length
    ? `${blocking.length} blocking finding(s) at high/critical severity.`
    : "No blocking findings; only medium/low issues (if any).";

  return { ...input, verdict, verdictReason };
}

export function writeMarkdown(report: QaReport, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const passed = report.results.filter((r) => r.status === "passed").length;
  const failed = report.results.length - passed;

  const lines: string[] = [];
  lines.push(`# QA Report — ${report.url}`);
  lines.push("");
  lines.push(`- **Verdict:** ${report.verdict === "SHIP" ? "✅ SHIP" : "⛔ NO-SHIP"} — ${report.verdictReason}`);
  lines.push(`- **Run:** ${report.startedAt}  |  **AI provider:** ${report.provider}`);
  lines.push(`- **Pages explored:** ${report.pagesExplored}  |  **Tests:** ${report.results.length} (${passed} passed, ${failed} failed)  |  **Findings:** ${report.findings.length}`);
  lines.push("");

  lines.push("## Findings (severity-ranked)");
  if (!report.findings.length) {
    lines.push("_No findings._");
  } else {
    lines.push("| Sev | Area | Finding | Evidence | Recommendation |");
    lines.push("|-----|------|---------|----------|----------------|");
    for (const f of report.findings) {
      lines.push(
        `| ${EMOJI[f.severity]} ${f.severity} | ${f.area} | ${esc(f.title)} | ${esc(f.evidence)} | ${esc(f.recommendation)} |`
      );
    }
  }
  lines.push("");

  lines.push("## Features analyzed");
  for (const feat of report.features) {
    lines.push(`- **${esc(feat.name)}** _(${feat.area}, risk: ${feat.risk})_`);
  }
  lines.push("");

  lines.push("## Test results");
  for (const r of report.results) {
    lines.push(`- ${r.status === "passed" ? "✅" : "❌"} ${esc(r.name)} (${r.durationMs}ms)${r.error ? ` — ${esc(r.error)}` : ""}`);
  }
  lines.push("");

  const path = join(outDir, "report.md");
  writeFileSync(path, lines.join("\n"));
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  return path;
}

function esc(s: string): string {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
