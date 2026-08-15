import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebateStream } from "@/hooks/use-debate-stream";
import type { DebateMode } from "@/lib/gemini";
import type {
  CommitteeFramework,
  SkillLevel,
} from "@/convex/shared";
import { COMMITTEES, SKILLS } from "@/components/dashboard/data";

const MODE_LABELS: Record<DebateMode, string> = {
  interventions: "Floor Interventions",
  poiVault: "POI & Cross-Examination",
  resolutions: "Resolution Draftsman",
};

export type DebateConsoleActions = (ctx: {
  text: string;
  isStreaming: boolean;
  clear: () => void;
}) => ReactNode;

export function DebateConsole({
  mode,
  committee,
  skill,
  placeholder,
  generateLabel = "Generate",
  children,
}: {
  mode: DebateMode;
  committee: CommitteeFramework;
  skill: SkillLevel;
  placeholder?: string;
  generateLabel?: string;
  children?: DebateConsoleActions;
}) {
  const { text, isStreaming, error, start, clear } = useDebateStream();
  const [prompt, setPrompt] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [text]);

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming) return;
    start({ mode, committee, skill, prompt: trimmed });
  };

  return (
    <div className="border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <h3 className="eyebrow text-foreground">Apex Console</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {MODE_LABELS[mode]} · {COMMITTEES[committee].short} ·{" "}
          {SKILLS[skill].label}
        </span>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isStreaming) handleGenerate();
            }}
            placeholder={
              placeholder ?? "Describe what the chamber needs…"
            }
            className="h-9 min-w-0 flex-1 rounded-sm border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          <Button
            onClick={handleGenerate}
            disabled={isStreaming || !prompt.trim()}
            className="shrink-0 gap-1.5 rounded-sm bg-primary text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground hover:bg-primary/90"
          >
            {isStreaming ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {isStreaming ? "Streaming…" : generateLabel}
          </Button>
        </div>

        {/* Streamed console output */}
        <div
          ref={outputRef}
          className="max-h-[320px] min-h-[140px] overflow-y-auto whitespace-pre-wrap rounded-sm border border-border bg-[#faf8f1] p-3.5 font-mono text-[12px] leading-5 text-foreground/90"
        >
          {text ? (
            text
          ) : isStreaming ? (
            <span className="text-muted-foreground italic">
              Standing by the chamber… streaming…
            </span>
          ) : (
            <span className="text-muted-foreground italic">
              Console idle — describe the intervention, question, or clauses you
              need. The model is tuned to {COMMITTEES[committee].short} ·{" "}
              {SKILLS[skill].label}.
            </span>
          )}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-middle" />
          )}
        </div>

        {error && (
          <p className="text-xs leading-5 text-destructive">{error}</p>
        )}

        {children && (text || error) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {children({ text, isStreaming, clear })}
            {text && !isStreaming && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="ml-auto rounded-sm text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
