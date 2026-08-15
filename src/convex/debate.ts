/**
 * `/api/generate-debate` — server-side DeepSeek-V3 streaming endpoint.
 *
 * No external AI SDK, no external fetch route, and no external key of any
 * kind. Generation flows through Freebuff's native, built-in AI gateway — the
 * same endpoint the `@vly-ai/integrations` SDK targets — authenticated with
 * the deployment token that is injected automatically during project creation:
 *
 *   process.env.VLY_INTEGRATION_KEY   (auto-set, format `sk_*`)
 *   process.env.VLY_INTEGRATION_BASE_URL (optional override; default is the
 *   gateway base the SDK ships with, https://integrations.vly.ai/v1/llm)
 *
 * If the gateway rejects the deployment token (platform provisioning issue),
 * the handler automatically falls back to DeepSeek's OFFICIAL API
 * (https://api.deepseek.com, model `deepseek-chat` = DeepSeek-V3) when
 * `DEEPSEEK_API_KEY` is configured in the project Keys/API keys tab.
 *
 * Request body (JSON):
 *   {
 *     mode: "interventions" | "poiVault" | "resolutions",
 *     committee: "un" | "loksabha" | "aippm",
 *     skill: "beginner" | "veteran",
 *     prompt: string,
 *     model?: string  // optional; canonical DeepSeek ID, defaults to
 *                     // "deepseek-chat" (DeepSeek-V3)
 *   }
 *
 * The raw prompt plus the active Committee Mode and Experience Tier
 * selections are piped straight to the model. A strict persona is injected
 * server-side per committee × skill combination (see PERSONAS below):
 *   - UN + Beginner        → encouraging MUN coach, verbatim speech scripts
 *                            with phonetic pacing cues.
 *   - Lok Sabha/AIPPM + Veteran → elite parliamentary advisor, complex trap
 *                            cross-examinations, Rule 376/377 procedures,
 *                            intense debate rhetoric.
 *
 * Response: a text/plain streaming body (OpenAI-compatible SSE frames
 * decoded), with CORS headers so the dashboard can consume it from the
 * browser. Token chunks are forwarded as they arrive — the markdown bubble
 * types out live.
 */
import { httpAction } from "./_generated/server";

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
 *  engine, tuned by the persona matrix instead). Synchronized with the
 *  frontend bindings in `src/lib/deepseek.ts`. */
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

/**
 * Converts the upstream SSE stream into a plain text stream. Each `data:`
 * frame is parsed and its incremental text is forwarded downstream.
 */
function sseToTextStream(upstream: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const reader = upstream.getReader();
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
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Malformed frame — skip it, keep streaming.
            }
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

  // Resolve the model from the request if it is a canonical DeepSeek ID,
  // otherwise fall back to the Experience Tier mapping (always DeepSeek-V3).
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const model = CANONICAL_MODELS.includes(
    requestedModel as (typeof CANONICAL_MODELS)[number],
  )
    ? requestedModel
    : (MODEL_BY_SKILL[skill] ?? "deepseek-chat");

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

  const persona = PERSONAS[`${committee}:${skill}`] ?? PERSONAS["un:beginner"];

  const systemInstruction = [
    "You are MUN Apex AI, the in-chamber drafting assistant inside a premium debate dashboard. You are running a live conversational loop for one delegate.",
    persona,
    MODE_INSTRUCTIONS[mode],
    OUTPUT_FORMATS[mode],
    "Respond with only the requested content — no preamble, no commentary, no markdown headers.",
  ].join("\n\n");

  const payload = {
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt },
    ],
    stream: true,
    temperature: 0.7,
  };

  // -------------------------------------------------------------------------
  // Provider selection.
  //   1. Freebuff's native built-in gateway (no key needed — deployment token
  //      injected automatically). This is the requested route.
  //   2. If the gateway rejects the deployment token (platform provisioning
  //      issue) and a DEEPSEEK_API_KEY is configured, fall back to DeepSeek's
  //      OFFICIAL API — same model, same payload, same streaming.
  // -------------------------------------------------------------------------
  const gatewayKey = process.env.VLY_INTEGRATION_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

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
    // NOTE: errors are returned with a 4xx status on purpose — the hosting
    // edge masks 5xx response bodies, so a 5xx would swallow this message.
    return jsonResponse(400, {
      error:
        "No AI provider is configured. The Freebuff gateway token (VLY_INTEGRATION_KEY) is missing — add a DEEPSEEK_API_KEY in the project Keys/API keys tab as an alternative.",
    });
  }

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
    return jsonResponse(400, {
      error: `[${provider}] network request failed: ${message}`,
      model,
    });
  }

  // Error safety net: surface the provider's exact error message verbatim on
  // the dashboard console — never a generic 404 block.
  if (!upstream.ok) {
    const detail = await extractUpstreamError(upstream);

    // Automatic fallback: gateway rejected the deployment token, but an
    // official DeepSeek API key is available — retry against DeepSeek.
    if (
      provider === "gateway" &&
      deepseekKey &&
      (upstream.status === 401 || upstream.status === 403)
    ) {
      const fallbackEndpoint = `${DEEPSEEK_API_BASE}/chat/completions`;
      let fallback: Response;
      try {
        fallback = await fetch(fallbackEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25000),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown network error";
        return jsonResponse(400, {
          error: `[deepseek-api] network request failed: ${message}`,
          model,
        });
      }
      if (!fallback.ok) {
        const fallbackDetail = await extractUpstreamError(fallback);
        return jsonResponse(400, {
          error: `DeepSeek request failed (${fallback.status}): ${fallbackDetail}`,
          model,
        });
      }
      if (!fallback.body) {
        return jsonResponse(400, {
          error: "The DeepSeek API returned an empty stream.",
          model,
        });
      }
      return new Response(sseToTextStream(fallback.body), {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    const hint =
      provider === "gateway"
        ? " The Freebuff gateway rejected the deployment token (platform provisioning issue). Add a DEEPSEEK_API_KEY in the project Keys/API keys tab to use the official DeepSeek-V3 API instead."
        : "";
    return jsonResponse(400, {
      error: `DeepSeek request failed (${upstream.status}): ${detail}${hint}`,
      model,
    });
  }

  if (!upstream.body) {
    return jsonResponse(400, {
      error: `The provider (${provider}) returned an empty stream.`,
      model,
    });
  }

  return new Response(sseToTextStream(upstream.body), {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
});
