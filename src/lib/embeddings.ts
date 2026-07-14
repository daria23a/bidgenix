import { env, features } from "@/lib/config";

// Create an embedding vector for a piece of text using OpenAI. Returns null if
// no OpenAI key is configured (caller then falls back to keyword search).
export async function embed(text: string): Promise<number[] | null> {
  if (!features.openai) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiKey}`,
    },
    body: JSON.stringify({ model: env.embedModel, input: text }),
  });
  if (!res.ok) {
    throw new Error(`Embedding error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}
