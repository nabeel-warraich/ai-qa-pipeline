import type { LLMProvider } from "./provider.js";

// Minimal Anthropic Messages client via fetch (no SDK dependency).
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private key = process.env.ANTHROPIC_API_KEY ?? "";
  private model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  async complete(system: string, user: string): Promise<string | null> {
    if (!this.key) {
      console.warn("[anthropic] ANTHROPIC_API_KEY not set — falling back to no output.");
      return null;
    }
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          temperature: 0.2,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) {
        console.warn(`[anthropic] request failed: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = (await res.json()) as any;
      return data?.content?.[0]?.text ?? null;
    } catch (err) {
      console.warn("[anthropic] error:", (err as Error).message);
      return null;
    }
  }
}
