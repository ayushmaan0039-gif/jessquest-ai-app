import type {
  CommitteeFramework,
  DebateMode,
  SkillLevel,
} from "@/convex/shared";

export type { DebateMode };

/**
 * Sniffs which drafting discipline a prompt belongs to so the assistant can
 * be tuned to the right module: interventions, POI/cross-examination, or
 * resolution drafting.
 */
export function detectMode(prompt: string): DebateMode {
  const text = prompt.toLowerCase();
  if (
    /(poi|point of information|cross[- ]?exam|question|trap|interrupt|ask)/.test(
      text,
    )
  ) {
    return "poiVault";
  }
  if (
    /(resolution|clause|draft|amendment|operative|preambul|resolution|bill)/.test(
      text,
    )
  ) {
    return "resolutions";
  }
  return "interventions";
}

export type GenerateDebateArgs = {
  mode: DebateMode;
  committee: CommitteeFramework;
  skill: SkillLevel;
  prompt: string;
};

/**
 * Streams generated content from the Convex `/api/generate-debate` route.
 * Yields decoded text chunks as they arrive; throws on a non-2xx response.
 */
export async function* streamGenerateDebate(
  args: GenerateDebateArgs,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const url = `${import.meta.env.VITE_CONVEX_URL}/api/generate-debate`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: args.mode,
      committee: args.committee,
      skill: args.skill,
      prompt: args.prompt,
    }),
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.error ?? "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(
      detail || `Generation request failed with status ${response.status}.`,
    );
  }

  if (!response.body) {
    throw new Error("The server returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Parses the structured POI output: `QUESTION: …\nRESPONSE: …` */
export function parsePoiOutput(
  text: string,
): { question: string; response: string } | null {
  const questionMatch = text.match(
    /QUESTION:\s*([\s\S]*?)(?=\n\s*RESPONSE:)/i,
  );
  const responseMatch = text.match(/RESPONSE:\s*([\s\S]*)$/i);
  if (!questionMatch || !responseMatch) return null;
  const question = questionMatch[1].trim();
  const response = responseMatch[1].trim();
  if (!question || !response) return null;
  return { question, response };
}

/**
 * Parses the structured resolution output:
 *   PREAMBULATORY:\n- <clause>\n…\nOPERATIVE:\n- <clause>\n…
 * Returns the split clauses (prefixes like "-", "i.", "1." are stripped).
 */
export function parseResolutionOutput(text: string): {
  preamble: string[];
  operative: string[];
} {
  const preamble: string[] = [];
  const operative: string[] = [];
  let section: "preamble" | "operative" | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (/^PREAMBULATORY\s*:/i.test(line)) {
      section = "preamble";
      continue;
    }
    if (/^OPERATIVE\s*:/i.test(line)) {
      section = "operative";
      continue;
    }
    if (!line) continue;

    const cleaned = line
      .replace(/^[-•*]\s*/, "")
      .replace(/^[ivxlcdm]+\.\s*/i, "")
      .replace(/^\d+\.\s*/, "")
      .trim();
    if (!cleaned) continue;

    if (section === "preamble") preamble.push(cleaned);
    else if (section === "operative") operative.push(cleaned);
  }

  return { preamble, operative };
}
