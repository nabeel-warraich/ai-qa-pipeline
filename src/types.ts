// Shared types for the AI QA pipeline.

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface PipelineConfig {
  url: string;
  prd?: string;            // optional requirements text
  provider: "openai" | "anthropic" | "none";
  maxPages: number;        // crawl depth cap
  outDir: string;          // where reports/artifacts are written
}

export interface DiscoveredPage {
  url: string;
  title: string;
  status: number | null;
  links: string[];
  forms: { action: string; inputs: string[]; hasSubmit: boolean }[];
  buttons: string[];
  headings: string[];
  consoleErrors: string[];
  loadMs: number;
}

export interface Feature {
  name: string;
  area: string;            // e.g. "authentication", "checkout"
  risk: Severity;
  acceptanceCriteria: string[];
}

export interface GeneratedTest {
  name: string;
  filePath: string;        // written .spec.ts
  targetUrl: string;
}

export interface TestResult {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  error?: string;
}

export interface Finding {
  title: string;
  area: string;
  severity: Severity;
  evidence: string;
  recommendation: string;
}

export interface QaReport {
  url: string;
  startedAt: string;
  provider: string;
  pagesExplored: number;
  features: Feature[];
  results: TestResult[];
  findings: Finding[];
  verdict: "SHIP" | "NO-SHIP";
  verdictReason: string;
}
