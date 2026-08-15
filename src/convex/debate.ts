/**
 * DeepSeek-V3 generation for MUN Apex AI.
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
 * No external AI SDK and no external API key of any kind. Generation flows
 * through Freebuff's native, built-in AI gateway — the same endpoint the
 * `@vly-ai/integrations` SDK targets — authenticated with the deployment
 * token injected automatically during project creation:
 *
 *   process.env.VLY_INTEGRATION_KEY       (auto-set, format `sk_*`)
 *   process.env.VLY_INTEGRATION_BASE_URL  (optional override; default is the
 *   gateway base the SDK ships with, https://integrations.vly.ai/v1/llm)
 *
 * If the gateway rejects the deployment token (platform provisioning issue),
 * the core automatically falls back to DeepSeek's OFFICIAL API
 * (https://api.deepseek.com, model `deepseek-chat` = DeepSeek-V3) when
 * `DEEPSEEK_API_KEY` is configured in the project Keys/API keys tab.
 * Neither path reads any external key-prefix environment variable.
 *
 * Both paths inject the strict persona built from the active dropdown state
 * (Committee Mode × Experience Tier):
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
 * Canonical DeepSeek model identifiers. `deepseek-chat` is DeepSeek's
 * production alias for DeepSeek-V3 (the identifier both DeepSeek's official
 * API and the gateway expect).
 */
const CANONICAL_MODELS = ["deepseek-chat"] as const;

/** Valid dropdown values, used for strict request validation (must match
 *  `CommitteeFramework` / `SkillLevel` in `src/convex/shared.ts`). */
const COMMITTEES = ["un", "loksabha", "aippm"] as const;
const SKILLS = ["beginner", "veteran"] as const;

/** Model chosen per Experience Tier (both resolve to DeepSeek-V3 — one
 *  engine, tuned by the persona matrix instead). */
const MODEL_BY_SKILL: Record<string, string> = {
  beginner: "deepseek-chat",
  veteran: "deepseek-chat",
};

/** Official DeepSeek API (OpenAI-compatible). Model `deepseek-chat` = V3. */
const DEEPSEEK_API_BASE = "https://api.deepseek.com";

/**
 * Resolves the Freebuff gateway base for chat completions. Honors
 * `VLY_INTEGRATION_BASE_URL` if the platform set it, otherwise falls back to
 * the exact base URL the `@vly-ai/integrations` SDK ships with
 * (https://integrations.vly.ai/v1/llm). `/v1/llm` is appended if missing so
 * both forms work.
 */
function gatewayBase(): string {
  const configured = process.env.VLY_INTEGRATION_BASE_URL?.trim();
  if (configured) {
    const base = configured.replace(/\/+$/, "");
    return base.endsWith("/v1/llm") ? base : `${base}/v1/llm`;
  }
  return "https://integrations.vly.ai/v1/llm";
}

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
  return MODEL_BY_SKILL[skill] ?? "deepseek-chat";
}

/** Builds the strict system instruction for the selected chamber × tier. */
function buildSystemInstruction(
  mode: string,
  committee: string,
  skill: string,
): string {
  const persona = PERSONAS[`${committee}:${skill}`] ?? PERSONAS["un:beginner"];
  return [
    "You are MUN Apex AI, the in-chamber drafting assistant inside a premium debate dashboard. You are running a live conversational loop for one delegate.",
    persona,
    MODE_INSTRUCTIONS[mode],
    OUTPUT_FORMATS[mode],
    "Respond with only the requested content — no preamble, no commentary, no markdown headers.",
  ].join("\n\n");
}

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

/** Parses the exact error body an OpenAI-compatible provider returns. */
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

/** Consumes an OpenAI-compatible SSE stream, yielding incremental text. */
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

/** Executes one streaming chat-completions request against an endpoint. */
async function streamFromEndpoint(
  endpoint: string,
  authToken: string,
  payload: Record<string, unknown>,
  provider: "gateway" | "deepseek-api",
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<string> {
  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`[${provider}] network request failed: ${message}`);
  }

  if (!upstream.ok) {
    const detail = await extractUpstreamError(upstream);
    throw new Error(`DeepSeek request failed (${upstream.status}): ${detail}`);
  }

  if (!upstream.body) {
    throw new Error(`The provider (${provider}) returned an empty stream.`);
  }

  return consumeSse(upstream.body, onChunk);
}

// ---------------------------------------------------------------------------
// THE SHARED CORE — provider selection + gateway → official API fallback
// ---------------------------------------------------------------------------

async function generateText(
  args: {
    model: string;
    systemInstruction: string;
    prompt: string;
  },
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<{ text: string; provider: "gateway" | "deepseek-api" }> {
  const gatewayKey = process.env.VLY_INTEGRATION_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  const payload = {
    model: args.model,
    messages: [
      { role: "system", content: args.systemInstruction },
      { role: "user", content: args.prompt },
    ],
    stream: true,
    temperature: 0.7,
  };

  let provider: "gateway" | "deepseek-api";
  let endpoint: string;
  let authToken: string;
  if (gatewayKey) {
    provider = "gateway";
    endpoint = `${gatewayBase()}/chat/completions`;
    authToken = gatewayKey;
  } else if (deepseekKey) {
    provider = "deepseek-api";
    endpoint = `${DEEPSEEK_API_BASE}/chat/completions`;
    authToken = deepseekKey;
  } else {
    throw new Error(
      "No AI provider is configured. The Freebuff gateway token (VLY_INTEGRATION_KEY) is missing — add a DEEPSEEK_API_KEY in the project Keys/API keys tab as an alternative.",
    );
  }

  try {
    const text = await streamFromEndpoint(
      endpoint,
      authToken,
      payload,
      provider,
      onChunk,
    );
    return { text, provider };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    // Automatic fallback: the gateway rejected the deployment token (a
    // platform provisioning issue), but an official DeepSeek API key is
    // available — retry against DeepSeek's API with the same payload.
    if (
      provider === "gateway" &&
      deepseekKey &&
      /request failed \((401|403)\)/.test(message)
    ) {
      const text = await streamFromEndpoint(
        `${DEEPSEEK_API_BASE}/chat/completions`,
        deepseekKey,
        payload,
        "deepseek-api",
        onChunk,
      );
      return { text, provider: "deepseek-api" };
    }

    const hint =
      provider === "gateway"
        ? " The Freebuff gateway rejected the deployment token (platform provisioning issue). Add a DEEPSEEK_API_KEY in the project Keys/API keys tab to use the official DeepSeek-V3 API instead."
        : "";
    throw new Error(`${message}${hint}`);
  }
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
      const result = await generateText(
        { model, systemInstruction, prompt },
        (chunk) => {
          full += chunk;
          return ctx.runMutation(api.chat.patchContent, {
            id: assistantId,
            content: full,
          });
        },
      );
      return { text: result.text, model, provider: result.provider };
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
