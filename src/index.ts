#!/usr/bin/env -S npx tsx
// CLI entry. Usage:
//   npm run qa -- <url> [--prd <file>] [--provider openai|anthropic|none]
//                       [--max-pages N] [--out <dir>] [--gate]

import { readFileSync, existsSync } from "node:fs";
import { runPipeline } from "./orchestrator.js";
import type { PipelineConfig } from "./types.js";

// --- tiny .env loader (zero-dependency) ---
function loadEnv(): void {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      if (key === "gate") args.gate = "true";
      else args[key] = argv[++i] ?? "";
    } else positional.push(argv[i]);
  }
  return { args, positional };
}

async function main() {
  loadEnv();
  const { args, positional } = parseArgs(process.argv.slice(2));
  const url = positional[0];
  if (!url) {
    console.error("Usage: npm run qa -- <url> [--prd file] [--provider openai|anthropic|none] [--max-pages N] [--gate]");
    process.exit(2);
  }

  const provider = (args.provider ?? process.env.LLM_PROVIDER ?? "none") as PipelineConfig["provider"];
  const startedAt = new Date().toISOString();
  const config: PipelineConfig = {
    url,
    prd: args.prd && existsSync(args.prd) ? readFileSync(args.prd, "utf8") : undefined,
    provider: ["openai", "anthropic", "none"].includes(provider) ? provider : "none",
    maxPages: Number(args["max-pages"] ?? 5),
    outDir: args.out ?? `runs/${startedAt.replace(/[:.]/g, "-")}`,
  };

  const { report, reportPath } = await runPipeline(config, startedAt);

  console.log("\n" + "=".repeat(56));
  console.log(`  VERDICT: ${report.verdict === "SHIP" ? "✅ SHIP" : "⛔ NO-SHIP"}`);
  console.log(`  ${report.verdictReason}`);
  console.log(`  Report: ${reportPath}`);
  console.log("=".repeat(56) + "\n");

  // Optional quality gate: fail the process on NO-SHIP (for CI gating in real use).
  if (args.gate && report.verdict === "NO-SHIP") process.exit(1);
}

main().catch((err) => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
