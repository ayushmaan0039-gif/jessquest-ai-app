/**
 * AI generation for JessQuest AI — routed through OpenRouter's public network.
 *
 * Two entry points share ONE provider-call core (`generateText`):
 *
 * 1. `generateStrategicContent` — a Convex ACTION called from the React
 *    frontend via `useAction(api.debate.generateStrategicContent)` (no browser
 *    fetch anywhere). It persists the user prompt, creates the assistant
 *    message, and streams tokens into it by progressively patching the
 *    message document, so the chat feed types out live via reactive queries.
 *
 * 2. `generateDebate` — the `/api/generate-debate` HTTP action, kept for
 *    non-React clients and direct API access. Streams a text/plain body.
 *
 * THE ROUTE — OpenRouter (https://openrouter.ai/api/v1/chat/completions):
 *
 *   Endpoint : https://openrouter.ai/api/v1/chat/completions
 *              (OpenRouter's official API path — the bare openrouter.ai host
 *              serves their website, not the API.)
 *   Model    : nvidia/nemotron-3-nano-30b-a3b:free — a live, $0 free model
 *              from OpenRouter's catalog, chosen for low traffic on the free
 *              pool. If it 429s, the core automatically retries two smaller
 *              live free models before surfacing the error. NOTE: the
 *              previously requested `meta-llama/llama-3-8b-instruct:free` is
 *              retired from OpenRouter (no :free llama models remain).
 *   Headers  : Content-Type, HTTP-Referer, X-Title (public identity headers).
 *   Auth     : OpenRouter requires a free account API key (sk-or-v1-…) even
 *              for :free models — the model itself costs $0. When
 *              `OPENROUTER_API_KEY` is set it is sent as a Bearer token;
 *              otherwise the request is rejected with a clear message.
 *
 * The raw prompt plus the active Committee Mode and Experience Tier
 * selections are piped straight to the model. A strict persona is injected
 * server-side per committee × skill combination (see PERSONAS below):
 *   - UN + Beginner        → encouraging MUN coach, verbatim speech scripts
 *                            with phonetic pacing cues.
 *   - Lok Sabha/AIPPM + Veteran → elite parliamentary advisor, complex trap
 *                            cross-examinations, Rule 376/377 procedures,
 *                            intense debate rhetoric.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import {
  chatModeValidator,
  committeeFrameworkValidator,
  skillLevelValidator,
} from "./shared";

/**
 * Canonical model identifiers. `nvidia/nemotron-3-nano-30b-a3b:free` is a
 * live, $0 free model on OpenRouter's public catalog — a fast 30B MoE
 * (3B active) with far less traffic than the Gemma/GPT-OSS free pools.
 * (The previously requested `meta-llama/llama-3-8b-instruct:free` is
 * retired — no :free llama models remain on OpenRouter.)
 */
const CANONICAL_MODELS = ["nvidia/nemotron-3-nano-30b-a3b:free"] as const;

/**
 * Automatic 429 fallback chain: if the primary free model is rate-limited,
 * try successively smaller/less-contended free models to bypass the traffic.
 * All are verified live in OpenRouter's catalog.
 */
const FREE_FALLBACK_MODELS = [
  "liquid/lfm-2.5-2.6b:free",
  "dots-studio/dots-3-note-preview:free",
] as const;

/** Valid dropdown values, used for strict request validation (must match
 *  `CommitteeFramework` / `SkillLevel` in `src/convex/shared.ts`). */
const COMMITTEES = ["un", "loksabha", "aippm"] as const;
const SKILLS = ["beginner", "veteran"] as const;

/** Model chosen per Experience Tier — one free engine, tuned by the persona
 *  matrix instead. */
const MODEL_BY_SKILL: Record<string, string> = {
  beginner: "nvidia/nemotron-3-nano-30b-a3b:free",
  veteran: "nvidia/nemotron-3-nano-30b-a3b:free",
};

/** OpenRouter's official API base (chat completions live under /api/v1). */
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

/** Public client identity headers (no secrets). */
const OPENROUTER_REFERER = "https://localhost:3000";
const OPENROUTER_TITLE = "MUN AI Diplomat Client";

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

/** Resolves the canonical model, falling back to the Experience Tier map. */
function resolveModel(skill: string, requested?: string): string {
  if (requested && CANONICAL_MODELS.includes(requested as never)) {
    return requested;
  }
  return MODEL_BY_SKILL[skill] ?? "nvidia/nemotron-3-nano-30b-a3b:free";
}

/** Builds the strict system instruction for the selected chamber × tier. */
function buildSystemInstruction(
  mode: string,
  committee: string,
  skill: string,
): string {
  const persona = PERSONAS[`${committee}:${skill}`] ?? PERSONAS["un:beginner"];
  return [
    "You are JessQuest AI, the in-chamber drafting assistant inside a premium debate dashboard. You are running a live conversational loop for one delegate.",
    persona,
    MODE_INSTRUCTIONS[mode],
    OUTPUT_FORMATS[mode],
    "Respond with only the requested content — no preamble, no commentary, no markdown headers.",
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Streaming helpers (OpenRouter uses OpenAI-compatible SSE)
// ---------------------------------------------------------------------------

/**
 * Pulls the incremental text out of an OpenAI-compatible streaming frame:
 * `choices[0].delta.content` for stream chunks, `choices[0].message.content`
 * for non-streamed fallbacks.
 */
function extractStreamText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";
  const data = payload as {
    choices?: Array<{
      delta?: { content?: string };
      message?: { content?: string };
    }>;
    error?: { message?: string };
  };
  if (data.error) return "";
  const choice = data.choices?.[0];
  return choice?.delta?.content ?? choice?.message?.content ?? "";
}

/** Parses the exact error body OpenRouter returns. */
async function extractUpstreamError(upstream: Response): Promise<string> {
  try {
    const errorJson = (await upstream.json()) as {
      error?: { message?: string; status?: string };
    };
    return (
      errorJson?.error?.message ??
      errorJson?.error?.status ??
      JSON.stringify(errorJson)
    );
  } catch {
    return (await upstream.text().catch(() => "")).trim();
  }
}

/** Consumes an SSE stream, yielding incremental text to the callback. */
async function consumeSse(
  upstream: ReadableStream<Uint8Array>,
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<string> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data:")) continue;

      const frame = line.slice(5).trim();
      if (!frame || frame === "[DONE]") continue;

      try {
        const text = extractStreamText(JSON.parse(frame));
        if (text) {
          full += text;
          await onChunk?.(text);
        }
      } catch {
        // Malformed frame — skip it, keep streaming.
      }
    }
  }
  return full;
}

// ---------------------------------------------------------------------------
// THE CORE — one direct fetch() to OpenRouter's public network
// ---------------------------------------------------------------------------

/** Executes one streaming request against OpenRouter with the given model. */
async function streamFromOpenRouter(
  payload: Record<string, unknown>,
  apiKey: string,
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<string> {
  let upstream: Response;
  try {
    upstream = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": OPENROUTER_TITLE,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`[OpenRouter] network request failed: ${message}`);
  }

  // Error safety net: surface OpenRouter's exact error message verbatim on
  // the dashboard console — never a generic 401/404 block.
  if (!upstream.ok) {
    const detail = await extractUpstreamError(upstream);
    throw new Error(
      `OpenRouter request failed (${upstream.status}): ${detail}`,
    );
  }

  if (!upstream.body) {
    throw new Error("OpenRouter returned an empty stream.");
  }

  return consumeSse(upstream.body, onChunk);
}

async function generateText(
  args: {
    model: string;
    systemInstruction: string;
    prompt: string;
  },
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // OpenRouter requires a free account API key even for :free models — the
  // model itself costs $0, but there is no anonymous endpoint. Surface this
  // clearly instead of letting OpenRouter reply with a bare 401.
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. OpenRouter requires a free account API key (sk-or-v1-…) even for $0 :free models — add it in the project Keys/API keys tab.",
    );
  }

  // 429-bypass chain: try the primary free model, then progressively smaller
  // live free models when the provider rate-limits (429) under traffic.
  const models = [args.model, ...FREE_FALLBACK_MODELS];
  let lastError: Error | null = null;

  for (const model of models) {
    const payload = {
      model,
      messages: [
        { role: "system", content: args.systemInstruction },
        { role: "user", content: args.prompt },
      ],
      stream: true,
      temperature: 0.7,
    };

    try {
      return await streamFromOpenRouter(payload, apiKey, onChunk);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Fall through to the next free model on provider rate limits (429)
      // and on first-byte timeouts (free pools queue when busy). Auth,
      // model-not-found and other errors surface immediately.
      const retryable =
        /request failed \(429\)/.test(lastError.message) ||
        /AbortError|aborted|timed out|timeout/i.test(lastError.message);
      if (!retryable) break;
    }
  }

  throw new Error(
    `${lastError?.message ?? "Generation failed."} Tried free models: ${models.join(", ")}. Free-tier pools are heavily shared — retry shortly or add a small OpenRouter credit for priority routing.`,
  );
}

// ---------------------------------------------------------------------------
// ENTRY POINT 1 — Convex action used by the React frontend (useAction).
// ---------------------------------------------------------------------------

export const generateStrategicContent = action({
  args: {
    mode: chatModeValidator,
    committee: committeeFrameworkValidator,
    skill: skillLevelValidator,
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const prompt = args.prompt.trim();
    if (!prompt) throw new Error("Prompt cannot be empty.");

    const model = resolveModel(args.skill);
    const systemInstruction = buildSystemInstruction(
      args.mode,
      args.committee,
      args.skill,
    );

    // 1. Persist the user prompt so it appears instantly in the feed.
    await ctx.runMutation(api.chat.insert, {
      role: "user",
      content: prompt,
      mode: args.mode,
      committeeFramework: args.committee,
      skillLevel: args.skill,
    });

    // 2. Create the assistant message, then patch its content as tokens
    //    stream in — each patch is a committed DB update, so the reactive
    //    `api.chat.list` query makes the markdown bubble type out live.
    const assistantId = await ctx.runMutation(api.chat.insert, {
      role: "assistant",
      content: "",
      mode: args.mode,
      committeeFramework: args.committee,
      skillLevel: args.skill,
    });

    let full = "";
    try {
      const text = await generateText(
        { model, systemInstruction, prompt },
        (chunk) => {
          full += chunk;
          return ctx.runMutation(api.chat.patchContent, {
            id: assistantId,
            content: full,
          });
        },
      );
      return { text, model, provider: "openrouter" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation failed.";
      // Persist the exact failure onto the message so it survives reloads,
      // then rethrow so the client can surface the red console banner too.
      await ctx
        .runMutation(api.chat.patchContent, {
          id: assistantId,
          content: `⚠️ Generation failed: ${message}`,
        })
        .catch(() => undefined);
      throw error;
    }
  },
});

// ---------------------------------------------------------------------------
// ENTRY POINT 2 — HTTP action `/api/generate-debate` (non-React clients).
// ---------------------------------------------------------------------------

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
  const requestedModel = typeof body.model === "string" ? body.model : "";

  if (!mode || !committee || !skill || !prompt) {
    return jsonResponse(400, {
      error: "mode, committee, skill, and prompt are all required.",
    });
  }
  if (!(mode in MODE_INSTRUCTIONS)) {
    return jsonResponse(400, { error: `Unknown mode: ${mode}` });
  }
  if (!COMMITTEES.includes(committee as (typeof COMMITTEES)[number])) {
    return jsonResponse(400, { error: `Unknown committee: ${committee}` });
  }
  if (!SKILLS.includes(skill as (typeof SKILLS)[number])) {
    return jsonResponse(400, { error: `Unknown skill: ${skill}` });
  }

  const model = resolveModel(skill, requestedModel);
  const systemInstruction = buildSystemInstruction(mode, committee, skill);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await generateText({ model, systemInstruction, prompt }, (chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`\n[Generation failed: ${message}]`),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Client disconnected — stop consuming the upstream stream.
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
});
