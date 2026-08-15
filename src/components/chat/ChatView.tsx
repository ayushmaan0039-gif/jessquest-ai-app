import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type {
  CommitteeFramework,
  DebateMode,
  SkillLevel,
} from "@/convex/shared";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { detectMode, streamGenerateDebate } from "@/lib/gemini";
import { COMMITTEES, SKILLS } from "@/components/dashboard/data";

const SUGGESTIONS = [
  "Draft a 90-second speech on climate finance for developing nations",
  "Give me a trap POI for the United States delegation on sanctions policy",
  "Write three operative clauses on international migration",
];

const MODE_LABELS: Record<DebateMode, string> = {
  interventions: "Floor Interventions",
  poiVault: "POI & Cross-Examination",
  resolutions: "Resolution Draftsman",
};

export function ChatView({
  committee,
  skill,
}: {
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  const messages = useQuery(api.chat.list);
  const insertMessage = useMutation(api.chat.insert);

  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [live, setLive] = useState<{
    mode: DebateMode;
    text: string;
  } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, live]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || isStreaming) return;

      const mode = detectMode(text);
      setIsStreaming(true);
      setStreamError(null);
      setPrompt("");

      try {
        await insertMessage({
          role: "user",
          content: text,
          mode,
          committeeFramework: committee,
          skillLevel: skill,
        });
      } catch {
        toast.error("Could not save your prompt.");
      }

      const controller = new AbortController();
      streamRef.current = controller;
      setLive({ mode, text: "" });

      let full = "";
      try {
        for await (const chunk of streamGenerateDebate(
          { mode, committee, skill, prompt: text },
          controller.signal,
        )) {
          full += chunk;
          setLive({ mode, text: full });
        }
        if (full.trim()) {
          await insertMessage({
            role: "assistant",
            content: full.trim(),
            mode,
            committeeFramework: committee,
            skillLevel: skill,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message =
            error instanceof Error ? error.message : "Generation failed.";
          setStreamError(message);
          toast.error(message);
        }
      } finally {
        streamRef.current = null;
        setLive(null);
        setIsStreaming(false);
      }
    },
    [committee, skill, insertMessage, isStreaming],
  );

  const cancelStream = useCallback(() => {
    streamRef.current?.abort();
  }, []);

  const isEmpty = (messages?.length ?? 0) === 0 && !live;

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {isEmpty ? (
          /* ------------------------------------------------------------ */
          /* Empty state — the centerpiece                                */
          /* ------------------------------------------------------------ */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-20"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_38%,rgba(47,107,255,0.12),transparent_70%)]" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
              className="relative z-10 flex w-full max-w-2xl flex-col items-center"
            >
              <h1 className="text-center font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
                What are we debating today?
              </h1>
              <p className="mt-4 text-center text-sm leading-6 text-muted-foreground">
                Tuned for {COMMITTEES[committee].label} ·{" "}
                {SKILLS[skill].label} tier — speeches, trap POIs, and
                resolution clauses, streamed as they are drafted.
              </p>

              <div className="mt-9 w-full">
                <ChatInput
                  value={prompt}
                  onChange={setPrompt}
                  onSend={() => send(prompt)}
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ------------------------------------------------------------ */
          /* Chat stream                                                  */
          /* ------------------------------------------------------------ */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
              <div className="mx-auto flex max-w-3xl flex-col gap-7">
                {messages?.map((message) => (
                  <ChatMessage
                    key={message._id}
                    role={message.role}
                    content={message.content}
                    mode={message.mode}
                    committee={message.committeeFramework}
                    skill={message.skillLevel}
                  />
                ))}

                {live && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 pr-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-accent" />
                      </span>
                      Apex is drafting · {MODE_LABELS[live.mode]}
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-card/80 p-5 sm:p-6">
                      <div className="md-body">
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {live.text || "…"}
                        </Markdown>
                      </div>
                      {isStreaming && (
                        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-accent align-middle" />
                      )}
                    </div>
                  </div>
                )}

                {/* Exact upstream error, printed straight onto the console */}
                {streamError && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-[13px] font-semibold text-destructive">
                      Generation failed
                    </p>
                    <p className="mt-1.5 font-mono text-[12px] leading-5 text-destructive/90 whitespace-pre-wrap">
                      {streamError}
                    </p>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            {/* Pinned input */}
            <div className="border-t border-white/5 px-4 py-4 pb-6 sm:px-8">
              <div className="mx-auto max-w-3xl">
                <ChatInput
                  compact
                  value={prompt}
                  onChange={setPrompt}
                  onSend={() => send(prompt)}
                  isStreaming={isStreaming}
                />
                <div className="mt-2.5 flex h-4 items-center justify-center">
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={cancelStream}
                      className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Stop generating
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">
                      Enter to send · Shift+Enter for a new line
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
