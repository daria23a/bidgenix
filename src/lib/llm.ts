// Thin LLM helper with a deterministic MOCK fallback.
// If OPENAI_API_KEY is set, we call the OpenAI Chat Completions API and force a
// JSON response. Otherwise we return a heuristic result so the whole app still
// runs locally with zero setup.

type ChatMessage = { role: "system" | "user"; content: string };

const hasKey = () => !!process.env.OPENAI_API_KEY;

async function callOpenAIJson(messages: ChatMessage[]): Promise<any> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

export type ExtractedQuestion = {
  id: string;
  requirement: string;
  topic_keywords: string[];
};

export async function extractQuestions(rfpText: string): Promise<{
  questions: ExtractedQuestion[];
  mode: "llm" | "mock";
}> {
  if (hasKey()) {
    const out = await callOpenAIJson([
      {
        role: "system",
        content:
          "You are an RFP analyst. Extract every discrete requirement/question a vendor must respond to. " +
          'Return JSON: {"questions":[{"id":string,"requirement":string,"topic_keywords":string[]}]}. ' +
          "topic_keywords: 2-4 short keywords useful to search a company answer library.",
      },
      { role: "user", content: rfpText },
    ]);
    return { questions: out.questions || [], mode: "llm" };
  }
  // MOCK: pull numbered lines like "3.1 ..." as requirements.
  const questions: ExtractedQuestion[] = [];
  const lines = rfpText.split(/\n/);
  for (const line of lines) {
    const m = line.match(/^\s*(\d+\.\d+)\s+(.*)$/);
    if (m) {
      const requirement = m[2].trim();
      const stop = new Set([
        "your", "the", "and", "for", "with", "you", "our", "how", "are",
        "describe", "provide", "detail", "list", "including", "from",
        "that", "must", "each", "item", "below",
      ]);
      const kws = Array.from(
        new Set(
          requirement
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 3 && !stop.has(w)),
        ),
      ).slice(0, 4);
      questions.push({ id: m[1], requirement, topic_keywords: kws });
    }
  }
  return { questions, mode: "mock" };
}

export type DraftResult = { answer: string; gaps: string };

export async function draftAnswer(
  requirement: string,
  snippets: { topic: string; content: string }[],
): Promise<{ result: DraftResult; mode: "llm" | "mock" }> {
  const context = snippets
    .map((s) => `- (${s.topic}) ${s.content}`)
    .join("\n");
  if (hasKey()) {
    const out = await callOpenAIJson([
      {
        role: "system",
        content:
          "You are a proposal writer. Draft a concise, confident, first-person-plural answer to the RFP " +
          "requirement using ONLY facts in the provided answer library. Do not invent facts. If a needed " +
          'fact is missing, still answer with what you have and note the gap. Return JSON: {"answer":string,"gaps":string}. ' +
          "Answer library:\n" +
          context,
      },
      { role: "user", content: "RFP requirement: " + requirement },
    ]);
    return {
      result: { answer: out.answer || "", gaps: out.gaps || "" },
      mode: "llm",
    };
  }
  // MOCK: stitch the retrieved snippets into a plausible answer.
  if (!snippets.length) {
    return {
      result: {
        answer: "We will provide this information upon request.",
        gaps: "No matching content in the answer library — add an entry for this topic.",
      },
      mode: "mock",
    };
  }
  const body = snippets.map((s) => s.content).join(" ");
  return {
    result: {
      answer: `In response to this requirement: ${body}`,
      gaps: "",
    },
    mode: "mock",
  };
}

export const runMode = () => (hasKey() ? "llm" : "mock");
