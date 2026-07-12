// ORCHESTRATOR — plans, coordinates, routes context between agents, and enforces
// quality gates. This is the spine of the pipeline.

import { join } from "node:path";
import type { PipelineConfig, QaReport } from "./types.js";
import { createProvider } from "./llm/provider.js";
import { Memory } from "./memory/memory.js";
import { PluginRegistry } from "./plugins/plugin.js";
import { A11yPlugin } from "./plugins/a11y.js";
import { PerfPlugin } from "./plugins/perf.js";
import { explore } from "./agents/explorer.js";
import { analyze } from "./agents/analyst.js";
import { generate } from "./agents/generator.js";
import { run } from "./agents/runner.js";
import { investigate } from "./agents/investigator.js";
import { buildReport, writeMarkdown } from "./agents/reporter.js";

export async function runPipeline(
  config: PipelineConfig,
  startedAt: string
): Promise<{ report: QaReport; reportPath: string }> {
  const llm = await createProvider(config);
  const memory = new Memory(join(".aiqa-memory.json"));
  const plugins = new PluginRegistry().register(new A11yPlugin()).register(new PerfPlugin());

  console.log(`\n▶ AI QA Pipeline  |  target: ${config.url}  |  provider: ${llm.name}\n`);

  console.log("① Explorer — walking the app with Playwright…");
  const { pages, pluginFindings } = await explore(config.url, config.maxPages, plugins);
  console.log(`   explored ${pages.length} page(s), ${pluginFindings.length} plugin finding(s)`);

  console.log("② Analyst — identifying features & risks…");
  const features = await analyze(pages, config.prd, llm);
  console.log(`   ${features.length} feature(s)`);

  console.log("③ Generator — writing executable Playwright specs…");
  const tests = generate(pages);
  console.log(`   generated ${tests.length} spec file(s)`);

  console.log("④ Runner — executing generated specs…");
  const results = run();
  console.log(`   ${results.filter((r) => r.status === "passed").length}/${results.length} passed`);

  console.log("⑤ Investigator — triaging & scoring severity…");
  const findings = await investigate(results, pluginFindings, llm, memory, startedAt);
  console.log(`   ${findings.length} finding(s)`);

  console.log("⑥ Reporter — building severity-ranked report…");
  const report = buildReport({
    url: config.url,
    startedAt,
    provider: llm.name,
    pagesExplored: pages.length,
    features,
    results,
    findings,
  });
  const reportPath = writeMarkdown(report, config.outDir);

  memory.addLesson(`Ran against ${new URL(config.url).origin}: verdict ${report.verdict}`);
  memory.save();

  return { report, reportPath };
}
