import type { LLMProvider } from "./provider.js";

// No-key mode. Returns null so each agent uses its deterministic, built-in
// heuristics instead of a model. Lets the pipeline run end-to-end with zero setup.
export class HeuristicProvider implements LLMProvider {
  readonly name = "none (heuristic)";
  async complete(): Promise<string | null> {
    return null;
  }
}
