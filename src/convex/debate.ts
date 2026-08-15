/**
 * AI generation for MUN Apex AI.
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
 * PROVIDER CHAIN (first available credential wins, then automatic fallback
 * when a provider rejects the request with an auth error):
 *
 *   1. GEMINI (primary)   — `VITE_GEMINI_API_KEY` (or `GEMINI_API_KEY`),
 *      model `gemini-2.0-flash`, raw fetch to Google's official
 *      `:streamGenerateContent?alt=sse` endpoint. NOTE: Google only accepts
 *      AI Studio API keys (AIza…) — OAuth-style `AQ.` tokens are rejected.
 *   2. DEEPSEEK (fallback) — `DEEPSEEK_API_KEY`, official
 *      https://api.deepseek.com, model `deepseek-chat` (DeepSeek-V3).
 *   3. FREEBUFF GATEWAY — `VLY_INTEGRATION_KEY` (auto-injected deployment
 *      token; note the platform's gateway currently rejects this token).
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
 * Canonical production model strings, synchronized with the Experience Tier
 * toggle. The user-facing loop runs on `gemini-2.0-flash`; DeepSeek-V3
 * (`deepseek-chat`) is used when the fallback engine takes over.
 */
const CANONICAL_MODELS = ["gemini-2.0-flash", "deepseek-chat"] as const;

/** Valid dropdown values, used for strict request validation (must match
 *  `CommitteeFramework` / `SkillLevel` in `src/convex/shared.ts`). */
const COMMITTEES = ["un", "loksabha", "aippm"] as const;
const SKILLS = ["beginner", "veteran"] as const;

/** Model chosen per Experience Tier — both run the `gemini-2.0-flash` loop. */
const MODEL_BY_SKILL: Record<string, string> = {
  beginner: "gemini-2.0-flash",
  veteran: "gemini-2.0-flash",
};

/** Google's global generative language endpoint. */
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";

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
  return MODEL_BY_SKILL[skill] ?? "gemini-2.0-flash";
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

// ---------------------------------------------------------------------------
// Frame extractors (per provider's streaming JSON shape)
// ---------------------------------------------------------------------------

/** Gemini frames: `candidates[0].content.parts[].text` (or top-level text). */
function extractGeminiText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";
  const data = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    text?: string;
  };
  const candidates = data.candidates;
  if (Array.isArray(candidates)) {
    const parts = candidates[0]?.content?.parts;
    if (Array.isArray(parts)) {
      return parts
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("");
    }
  }
  return typeof data.text === "string" ? data.text : "";
}

/**
 * OpenAI-compatible frames (DeepSeek, gateway):
 * `choices[0].delta.content` for stream chunks, `choices[0].message.content`
 * for non-streamed fallbacks.
 */
function extractOpenAiText(payload: unknown): string {
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

// ---------------------------------------------------------------------------
// Request specs per provider
// ---------------------------------------------------------------------------

type ProviderName = "gemini" | "deepseek" | "gateway";

type RequestSpec = {
  name: ProviderName;
  label: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  extractFrame: (payload: unknown) => string;
};

function buildGeminiSpec(
  model: string,
  systemInstruction: string,
  prompt: string,
  apiKey: string,
): RequestSpec {
  return {
    name: "gemini",
    label: "Gemini",
    url:
      `${GEMINI_API_BASE}/v1beta/models/${model}:streamGenerateContent` +
      `?alt=sse&key=${encodeURIComponent(apiKey)}`,
    headers: { "Content-Type": "application/json" },
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
    },
    extractFrame: extractGeminiText,
  };
}

function buildOpenAiSpec(
  name: ProviderName,
  label: string,
  endpoint: string,
  authToken: string,
  model: string,
  systemInstruction: string,
  prompt: string,
): RequestSpec {
  return {
    name,
    label,
    url: endpoint,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: {
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      stream: true,
      temperature: 0.7,
    },
    extractFrame: extractOpenAiText,
  };
}

/** Executes one streaming request; throws a labelled error on failure. */
async function streamFromSpec(
  spec: RequestSpec,
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<string> {
  let upstream: Response;
  try {
    upstream = await fetch(spec.url, {
      method: "POST",
      headers: spec.headers,
      body: JSON.stringify(spec.body),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`[${spec.label}] network request failed: ${message}`);
  }

  if (!upstream.ok) {
    const detail = await extractUpstreamError(upstream);
    throw new Error(`${spec.label} request failed (${upstream.status}): ${detail}`);
  }

  if (!upstream.body) {
    throw new Error(`The provider (${spec.label}) returned an empty stream.`);
  }

  return consumeSse(upstream.body, spec.extractFrame, onChunk);
}

/** Consumes an SSE stream, yielding incremental text via the frame extractor. */
async function consumeSse(
  upstream: ReadableStream<Uint8Array>,
  extractFrame: (payload: unknown) => string,
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
        const text = extractFrame(JSON.parse(frame));
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
// THE SHARED CORE — provider chain + automatic fallback
// ---------------------------------------------------------------------------

async function generateText(
  args: {
    model: string;
    systemInstruction: string;
    prompt: string;
  },
  onChunk?: (chunk: string) => void | Promise<unknown>,
): Promise<{ text: string; provider: ProviderName }> {
  const geminiKey =
    process.env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const gatewayKey = process.env.VLY_INTEGRATION_KEY;

  // Build the ordered provider chain from whatever credentials exist.
  const specs: RequestSpec[] = [];
  if (geminiKey) {
    specs.push(
      buildGeminiSpec(args.model, args.systemInstruction, args.prompt, geminiKey),
    );
  }
  if (deepseekKey) {
    specs.push(
      buildOpenAiSpec(
        "deepseek",
        "DeepSeek",
        `${DEEPSEEK_API_BASE}/chat/completions`,
        deepseekKey,
        "deepseek-chat",
        args.systemInstruction,
        args.prompt,
      ),
    );
  }
  if (gatewayKey) {
    specs.push(
      buildOpenAiSpec(
        "gateway",
        "Freebuff Gateway",
        `${gatewayBase()}/chat/completions`,
        gatewayKey,
        args.model,
        args.systemInstruction,
        args.prompt,
      ),
    );
  }

  if (specs.length === 0) {
    throw new Error(
      "No AI provider is configured. Add a VITE_GEMINI_API_KEY (AI Studio, AIza…) or a DEEPSEEK_API_KEY in the project Keys/API keys tab.",
    );
  }

  let lastError: Error | null = null;
  let lastAuthFailure = false;

  for (const spec of specs) {
    try {
      const text = await streamFromSpec(spec, onChunk);
      return { text, provider: spec.name };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastAuthFailure = /request failed \((401|403)\)|UNAUTHENTICATED|invalid authentication|API key not valid|ACCESS_TOKEN_TYPE_UNSUPPORTED|API_KEY_SERVICE_BLOCKED/i.test(
        lastError.message,
      );
      // Only move to the next provider on auth-style failures; other errors
      // (network, model-not-found, rate limits) should surface immediately.
      if (!lastAuthFailure) break;
    }
  }

  const hint =
    lastAuthFailure && specs.some((spec) => spec.name === "gemini")
      ? " Google only accepts AI Studio API keys (AIza…) — OAuth-style AQ. tokens are rejected. Add a valid VITE_GEMINI_API_KEY, or a DEEPSEEK_API_KEY to run the fallback engine."
      : "";
  throw new Error(`${lastError?.message ?? "Generation failed."}${hint}`);
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
