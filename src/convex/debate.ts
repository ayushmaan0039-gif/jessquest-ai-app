/**
 * `/api/generate-debate` — server-side Gemini streaming endpoint.
 *
 * Reads the API key from the environment:
 *   process.env.GEMINI_API_KEY
 *
 * Set it in Freebuff → project Keys/API keys tab under the name
 * `GEMINI_API_KEY` (hand-edited `.env` files do not reach the runtime).
 * The model used is `gemini-1.5-pro`.
 *
 * Request body (JSON):
 *   {
 *     mode: "interventions" | "poiVault" | "resolutions",
 *     committee: "un" | "loksabha" | "aippm",
 *     skill: "beginner" | "veteran",
 *     prompt: string
 *   }
 *
 * Response: a text/plain streaming body of generated content, with CORS
 * headers so the dashboard can consume it from the browser.
 */
import { GoogleGenAI } from "@google/genai";
import { httpAction } from "./_generated/server";

const MODEL = "gemini-1.5-pro";

// ---------------------------------------------------------------------------
// System-instruction building blocks, driven by the header dropdown state
// ---------------------------------------------------------------------------

const COMMITTEE_INSTRUCTIONS: Record<string, string> = {
  un: "Committee framework: United Nations (UN Committees). Formal General Assembly protocol — 'Honourable Chair, distinguished delegates', diplomatic register, bloc politics, consensus language, and UN-style resolution drafting conventions.",
  loksabha: "Committee framework: Lok Sabha (Indian Parliament). Rules of Procedure and Question Hour — 'Honourable Speaker, through you…', parliamentary decorum, constitutional rather than personal attacks, and Indian political figures, ministries, and policy vocabulary.",
  aippm: "Committee framework: AIPPM (All India Political Parties Meet). Coalition arithmetic and consensus building — party positioning, national-interest framing, addressing other parties as allies or opponents, and common-minimum-programme style language.",
};

const SKILL_INSTRUCTIONS: Record<string, string> = {
  beginner:
    "Skill track: Beginner. Prioritise clarity, structure, and confidence. Aim for roughly 140 words / 90 seconds of speaking time. Keep protocol implicit but correct, avoid unexplained jargon, and produce something a first-time delegate can deliver cleanly.",
  veteran:
    "Skill track: Veteran. Assume fluency in procedure and politics. Aim for roughly 420 words / 4 minutes of speaking time. Reward rhetorical precision, legal and political depth, rapid-rebuttal instincts, and tactical drafting. Do not oversimplify.",
};

const MODE_INSTRUCTIONS: Record<string, string> = {
  interventions:
    "Task: draft a floor intervention (a formal speech, right of reply, explanation of vote, procedural motion, or cross-examination answer — whichever fits the user's prompt). Include the opening address to the chair, a clear one-line position, structured arguments with concrete examples, and a closing ask.",
  poiVault:
    "Task: compose a point of information (POI) or cross-examination question aimed at an opposing delegation, plus a crisp recommended response the user can deliver from the floor. The question must be procedurally fair but substantively potent; the response must be poised and precise.",
  resolutions:
    "Task: draft resolution content — preambulatory clauses, operative clauses, or a complete short draft — following the drafting conventions of the selected chamber. Clauses must be numbered, actionable, and internally consistent.",
};

const OUTPUT_FORMATS: Record<string, string> = {
  interventions:
    "Output format: plain prose with each beat of the intervention separated by a blank line.",
  poiVault:
    "Output format (exactly this shape):\nQUESTION: <the question>\nRESPONSE: <the recommended response>",
  resolutions:
    "Output format (exactly this shape):\nPREAMBULATORY:\n- <clause>\n- <clause>\nOPERATIVE:\n- <clause>\n- <clause>",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(
  status: number,
  payload: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export const generateDebate = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error:
        "GEMINI_API_KEY is not configured. Add it in the project Keys/API keys tab.",
    });
  }

  let body: {
    mode?: unknown;
    committee?: unknown;
    skill?: unknown;
    prompt?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." });
  }

  const mode = typeof body.mode === "string" ? body.mode : "";
  const committee = typeof body.committee === "string" ? body.committee : "";
  const skill = typeof body.skill === "string" ? body.skill : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!mode || !committee || !skill || !prompt) {
    return jsonResponse(400, {
      error: "mode, committee, skill, and prompt are all required.",
    });
  }
  if (!(mode in MODE_INSTRUCTIONS)) {
    return jsonResponse(400, { error: `Unknown mode: ${mode}` });
  }
  if (!(committee in COMMITTEE_INSTRUCTIONS)) {
    return jsonResponse(400, { error: `Unknown committee: ${committee}` });
  }
  if (!(skill in SKILL_INSTRUCTIONS)) {
    return jsonResponse(400, { error: `Unknown skill: ${skill}` });
  }

  const systemInstruction = [
    "You are MUN Apex AI, the in-chamber drafting assistant inside a premium debate dashboard.",
    COMMITTEE_INSTRUCTIONS[committee],
    SKILL_INSTRUCTIONS[skill],
    MODE_INSTRUCTIONS[mode],
    OUTPUT_FORMATS[mode],
    "Respond with only the requested content — no preamble, no commentary, no markdown headers.",
  ].join("\n\n");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: prompt,
      config: { systemInstruction },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown stream error";
          controller.enqueue(
            encoder.encode(`\n[Generation interrupted: ${message}]`),
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        // Client disconnected — stop consuming the upstream stream.
      },
    });

    return new Response(readable, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";
    return jsonResponse(502, { error: `Gemini request failed: ${message}` });
  }
});
