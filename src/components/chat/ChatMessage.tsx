import { motion } from "framer-motion";
import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  CommitteeFramework,
  DebateMode,
  SkillLevel,
} from "@/convex/shared";
import { COMMITTEES, SKILLS } from "@/components/dashboard/data";

const MODE_LABELS: Record<DebateMode, string> = {
  interventions: "Floor Interventions",
  poiVault: "POI & Cross-Examination",
  resolutions: "Resolution Draftsman",
};

function TuningChip({
  mode,
  committee,
  skill,
}: {
  mode: DebateMode;
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
      <Sparkles className="size-3 text-accent" />
      Tuned · {MODE_LABELS[mode]} · {COMMITTEES[committee].short} ·{" "}
      {SKILLS[skill].label}
    </span>
  );
}

export function ChatMessage({
  role,
  content,
  mode,
  committee,
  skill,
}: {
  role: "user" | "assistant";
  content: string;
  mode: DebateMode;
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  const [copied, setCopied] = useState(false);

  if (role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex justify-end"
      >
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-white/8 px-4 py-2.5 text-[14.5px] leading-6 text-foreground">
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group/msg relative"
    >
      {/* Floating copy action above the response box */}
      <div className="mb-1.5 flex items-center justify-end gap-2 pr-1">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              toast.success("Response copied to the clipboard.");
              setTimeout(() => setCopied(false), 1600);
            } catch {
              toast.error("Clipboard unavailable in this browser.");
            }
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium tracking-wide transition-colors",
            copied
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground",
          )}
        >
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? "Copied" : "Copy to Clipboard"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-card/80 p-5 sm:p-6">
        <div className="md-body">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      </div>

      <div className="mt-2 flex justify-end pr-1">
        <TuningChip mode={mode} committee={committee} skill={skill} />
      </div>
    </motion.div>
  );
}
