import { ArrowUp, Loader2 } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ChatInput({
  value,
  onChange,
  onSend,
  isStreaming,
  placeholder = "Draft a speech, formulate a trap POI, or ask a parliamentary question...",
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (next: string) => {
    onChange(next);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-full border border-white/10 bg-card shadow-[0_12px_48px_rgba(0,0,0,0.45)] transition-colors focus-within:border-accent/60",
        compact ? "p-3 pl-5" : "p-4 pl-6",
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder}
        className="block w-full resize-none overflow-y-auto bg-transparent pr-12 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={isStreaming || !value.trim()}
        aria-label="Send"
        className={cn(
          "absolute bottom-2.5 right-2.5 grid size-10 place-items-center rounded-full bg-accent text-white shadow-[0_4px_16px_rgba(47,107,255,0.45)] transition-all hover:bg-accent/90 disabled:opacity-40 disabled:shadow-none",
          compact ? "bottom-1.5 right-1.5 size-9" : "",
        )}
      >
        {isStreaming ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : (
          <ArrowUp className="size-[18px]" />
        )}
      </button>
    </div>
  );
}
