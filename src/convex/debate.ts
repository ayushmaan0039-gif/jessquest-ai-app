/**
 * `/api/generate-debate` — server-side Gemini streaming endpoint.
 *
 * Reads the API key from the environment (in order of preference):
 *   process.env.VITE_GEMINI_API_KEY
 *   process.env.GEMINI_API_KEY          (fallback)
 *
 * Set `VITE_GEMINI_API_KEY` in Freebuff → project Keys/API keys tab.
 * The model used is `gemini-1.5-pro`, streaming tokens as they are
 * generated back to the chat capsule.
 *
 * Request body (JSON):
 *   {
 *     mode: "interventions" | "poiVault" | "resolutions",
 *     committee: "un" | "loksabha" | "aippm",
 *     skill: "beginner" | "veteran",
 *     prompt: string,
 *     model?: "gemini-1.5-flash" | "gemini-1.5-pro"  // optional, defaults by skill
 *   }
 *
 * The raw prompt plus the active Committee Mode and Experience Tier
 * selections are piped straight to Google, with a strict persona injected
 * per committee × skill combination (see PERSONAS below). Only the
 * canonical model strings above are accepted; the model is resolved from
 * the UI toggles (Experience Tier → flash for Beginner, pro for Veteran).
 *
 * Response: a text/plain streaming body, with CORS headers so the
 * dashboard can consume it from the browser.
 */
import { GoogleGenAI } from "@google/genai";
import { httpAction } from "./_generated/server";

/** Canonical production model strings — no aliases, no prefixes. */
const CANONICAL_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"] as const;

/** Model chosen by the Experience Tier toggle when the client does not
 *  explicitly pass one: Beginner → flash (fast coaching), Veteran → pro. */
const MODEL_BY_SKILL: Record<string, string> = {
  beginner: "gemini-1.5-flash",
  veteran: "gemini-1.5-pro",
};

/** Global generative language endpoint — the canonical Google AI path. */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

// ---------------------------------------------------------------------------
// Strict personas per dropdown combination (Committee Mode × Experience Tier)
// ---------------------------------------------------------------------------

const PERSONAS: Record<string, string> = {
  "un:beginner":
    "Persona: an encouraging MUN coach. Output full verbatim speech scripts with PHONETIC PACING GUIDES — mark pauses as (pause), add breath marks like (breathe), emphasise key phrases in CAPITALS, and annotate timing brackets such as [0:00–0:15]. Explain General Assembly protocol gently as you go, keep the delegate confident, and always close with one concrete improvement for next time.",
  "un:veteran":
    "Persona: an elite UN diplomat's advisor. Assume complete mastery of GA/UNSC protocol and diplomatic register. Write in precise, quotable language, cite Charter articles and UNSC/GA resolutions where they strengthen the argument, game out bloc positions before they are raised, and pre-empt the POI inside the speech itself.",
  "loksabha:beginner":
    "Persona: an encouraging Lok Sabha coach. Output full verbatim speech scripts with PHONETIC PACING GUIDES — pauses (pause), breath marks (breathe), CAPITALS emphasis, and timing brackets [0:00–0:15]. Teach the Rules of Procedure warmly ('Honourable Speaker, through you…'), correct gently, and always end with one concrete improvement.",
  "loksabha:veteran":
    "Persona: an elite parliamentary advisor to a seasoned Member of Parliament. Generate complex TRAP CROSS-EXAMINATIONS that corner the opposite bench, deploy Rule 376/377 procedures for urgent public importance and special mentions, and craft intense debate rhetoric grounded in the Rules of Procedure and constitutional argument. Assume the MP is fluent in the House.",
  "aippm:beginner":
    "Persona: an encouraging AIPPM coach. Output full verbatim speech scripts with PHONETIC PACING GUIDES — pauses (pause), breath marks (breathe), CAPITALS emphasis, timing brackets [0:00–0:15]. Teach coalition basics and party positioning kindly, correct gently, and always close with one concrete improvement.",
  "aippm:veteran":
    "Persona: an elite political strategist for an AIPPM party chief. Produce coalition-arithmetic-aware positioning, complex TRAP CROSS-EXAMINATIONS of rival party spokespersons, and intense rhetoric that frames every exchange in national interest while weaponising the common minimum programme. Assume deep fluency in Indian politics.",
};

// ---------------------------------------------------------------------------
// Mode-specific drafting instructions (which module the request came from)
// ---------------------------------------------------------------------------

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

  const apiKey =
    process.env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error:
        "VITE_GEMINI_API_KEY is not configured. Add it in the project Keys/API keys tab.",
    });
  }

  let body: {
    mode?: unknown;
    committee?: unknown;
    skill?: unknown;
    prompt?: unknown;
    model?: unknown;
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

  // Resolve the model from the request if it is a canonical string, otherwise
  // fall back to the Experience Tier mapping.
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const model = CANONICAL_MODELS.includes(
    requestedModel as (typeof CANONICAL_MODELS)[number],
  )
    ? requestedModel
    : (MODEL_BY_SKILL[skill] ?? "gemini-1.5-pro");

  if (!mode || !committee || !skill || !prompt) {
    return jsonResponse(400, {
      error: "mode, committee, skill, and prompt are all required.",
    });
  }
  if (!(mode in MODE_INSTRUCTIONS)) {
    return jsonResponse(400, { error: `Unknown mode: ${mode}` });
  }
  if (!(committee in ["un", "loksabha", "aippm"])) {
    return jsonResponse(400, { error: `Unknown committee: ${committee}` });
  }
  if (!(skill in ["beginner", "veteran"])) {
    return jsonResponse(400, { error: `Unknown skill: ${skill}` });
  }

  const persona = PERSONAS[`${committee}:${skill}`] ?? PERSONAS["un:beginner"];

  const systemInstruction = [
    "You are MUN Apex AI, the in-chamber drafting assistant inside a premium debate dashboard. You are running a live conversational loop for one delegate.",
    persona,
    MODE_INSTRUCTIONS[mode],
    OUTPUT_FORMATS[mode],
    "Respond with only the requested content — no preamble, no commentary, no markdown headers.",
  ].join("\n\n");

  const ai = new GoogleGenAI({
    apiKey,
    // Pin the global generative language path so requests always hit the
    // canonical REST route (never a stale or region-scoped base URL).
    httpOptions: { baseUrl: GEMINI_BASE_URL },
  });

  try {
    const stream = await ai.models.generateContentStream({
      model,
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
    const status =
      error && typeof error === "object" && "status" in error
        ? String((error as { status?: unknown }).status ?? "")
        : "";
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";
    return jsonResponse(502, {
      error: `Gemini request failed${status ? ` (${status})` : ""}: ${message}`,
      model,
    });
  }
});
