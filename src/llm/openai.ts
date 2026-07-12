import type { LLMProvider } from "./provider.js";

// Minimal OpenAI Chat Completions client via fetch (no SDK dependency).
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private key = process.env.OPENAI_API_KEY ?? "";
  private model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  async complete(system: string, user: string): Promise<string | null> {
    if (!this.key) {
      console.warn("[openai] OPENAI_API_KEY not set — falling back to no output.");
      return null;
    }
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) {
        console.warn(`[openai] request failed: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = (await res.json()) as any;
      return data?.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      console.warn("[openai] error:", (err as Error).message);
      return null;
    }
  }
}
