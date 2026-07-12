// Vendor-agnostic LLM provider interface + factory.
// The whole pipeline talks to this interface, never to a specific vendor —
// swap OpenAI, Anthropic, or the no-key heuristic mode without touching agents.

import type { PipelineConfig } from "../types.js";

export interface LLMProvider {
  readonly name: string;
  /** Returns a completion for the given system+user prompt, or null if unavailable. */
  complete(system: string, user: string): Promise<string | null>;
}

export async function createProvider(config: PipelineConfig): Promise<LLMProvider> {
  if (config.provider === "openai") {
    const { OpenAIProvider } = await import("./openai.js");
    return new OpenAIProvider();
  }
  if (config.provider === "anthropic") {
    const { AnthropicProvider } = await import("./anthropic.js");
    return new AnthropicProvider();
  }
  const { HeuristicProvider } = await import("./heuristic.js");
  return new HeuristicProvider();
}

/** Parse a JSON object/array out of a model response that may be fenced or noisy. */
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  try {
    return JSON.parse(candidate.slice(start)) as T;
  } catch {
    return null;
  }
}
