import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  HelpCircle,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type {
  CommitteeFramework,
  PoiCategory,
  SkillLevel,
} from "@/convex/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DebateConsole } from "@/components/dashboard/DebateConsole";
import { parsePoiOutput } from "@/lib/gemini";
import {
  CATEGORY_LABELS,
  COMMITTEES,
  SKILLS,
  TONE_OPTIONS,
  getPoiLibrary,
} from "@/components/dashboard/data";

type ToneFilter = "all" | string;
type CategoryFilter = "all" | PoiCategory;

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "poi", label: "POI" },
  { value: "cross_exam", label: "Cross-Examination" },
];

const CATEGORY_ICONS: Record<PoiCategory, typeof MessageSquare> = {
  poi: MessageSquare,
  cross_exam: HelpCircle,
};

export function PoiVaultView({
  committee,
  skill,
}: {
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [toneFilter, setToneFilter] = useState<ToneFilter>("all");

  const myEntries = useQuery(api.pois.list, {
    committeeFramework: committee,
    skillLevel: skill,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });
  const createEntry = useMutation(api.pois.create);
  const removeEntry = useMutation(api.pois.remove);
  const incrementUsage = useMutation(api.pois.incrementUsage);

  // Add-to-vault dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<PoiCategory>("poi");
  const [newTone, setNewTone] = useState<string>(TONE_OPTIONS[0]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const curated = useMemo(() => {
    return getPoiLibrary(committee, skill).filter(
      (entry) =>
        (categoryFilter === "all" || entry.category === categoryFilter) &&
        (toneFilter === "all" || entry.tone === toneFilter),
    );
  }, [committee, skill, categoryFilter, toneFilter]);

  const mine = useMemo(() => {
    return (myEntries ?? []).filter(
      (entry) => toneFilter === "all" || entry.tone === toneFilter,
    );
  }, [myEntries, toneFilter]);

  const total = curated.length + mine.length;

  const handleCopy = async (question: string, response: string) => {
    try {
      const text = response
        ? `Q: ${question}\nA: ${response}`
        : question;
      await navigator.clipboard.writeText(text);
      toast.success("Copied to the clipboard — strike when the chair calls.");
    } catch {
      toast.error("Clipboard unavailable in this browser.");
    }
  };

  const handleSubmit = async () => {
    if (!newQuestion.trim() || !newResponse.trim()) {
      toast.error("A vault entry needs both a question and a response.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createEntry({
        committeeFramework: committee,
        skillLevel: skill,
        category: newCategory,
        tone: newTone,
        question: newQuestion.trim(),
        response: newResponse.trim(),
        tags: newTags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      });
      toast.success("Filed to your vault.");
      setDialogOpen(false);
      setNewQuestion("");
      setNewResponse("");
      setNewTags("");
    } catch {
      toast.error("Could not file the entry. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">
            The Vault · {COMMITTEES[committee].short} /{" "}
            {SKILLS[skill].label}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
            POI &amp; Cross-Examination Vault
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Points of information and cross-exam ammunition, curated for this
            chamber and skill track — plus your own additions.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Add to vault
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-y border-border py-3">
        <div className="flex items-center gap-1 rounded-sm border border-border bg-card p-1">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setCategoryFilter(filter.value)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                categoryFilter === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tone
          </span>
          {(["all", ...TONE_OPTIONS] as ToneFilter[]).map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => setToneFilter(tone)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                toneFilter === tone
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {tone === "all" ? "All tones" : tone}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {total} entry{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* AI console — streams a generated Q&A into the vault */}
      <DebateConsole
        mode="poiVault"
        committee={committee}
        skill={skill}
        generateLabel="Compose"
        placeholder="Aim at the opposing delegation's weak point — e.g. 'China's climate finance pledge'"
      >
        {({ text: generated, isStreaming, clear }) => {
          const parsed = parsePoiOutput(generated);
          return (
            <>
              <Button
                size="sm"
                variant="outline"
                className="rounded-sm border-border bg-card text-[11px] font-semibold"
                disabled={!generated || isStreaming}
                onClick={() =>
                  handleCopy(
                    parsed?.question ?? generated,
                    parsed?.response ?? "",
                  )
                }
              >
                <Copy className="size-3.5" />
                Copy
              </Button>
              <Button
                size="sm"
                className="rounded-sm bg-primary text-[11px] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:bg-primary/90"
                disabled={!parsed || isStreaming}
                onClick={() => {
                  if (!parsed) return;
                  setNewCategory(parsed.question.toLowerCase().includes("cross")
                    ? "cross_exam"
                    : "poi");
                  setNewQuestion(parsed.question);
                  setNewResponse(parsed.response);
                  setDialogOpen(true);
                  clear();
                }}
              >
                <Plus className="size-3.5" />
                File to vault
              </Button>
            </>
          );
        }}
      </DebateConsole>

      {/* Entries */}
      <div className="grid gap-4 md:grid-cols-2">
        {curated.map((entry) => {
          const Icon = CATEGORY_ICONS[entry.category];
          return (
            <article
              key={entry.id}
              className="flex flex-col border border-border bg-card p-5 transition-colors hover:border-foreground/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1 rounded-sm border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  <Icon className="size-3" />
                  {CATEGORY_LABELS[entry.category]}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-sm border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {entry.tone}
                </Badge>
                <span className="ml-auto text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Curated
                </span>
              </div>

              <p className="mt-3 font-serif text-[15px] leading-6">
                {entry.question}
              </p>
              <p className="mt-2 text-[13px] italic leading-5 text-muted-foreground">
                → {entry.response}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-sm border-border bg-card text-[11px] font-semibold"
                  onClick={() => handleCopy(entry.question, entry.response)}
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
            </article>
          );
        })}

        {mine.map((entry) => {
          const Icon = CATEGORY_ICONS[entry.category];
          return (
            <article
              key={entry._id}
              className="flex flex-col border border-border bg-card p-5 transition-colors hover:border-accent/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1 rounded-sm border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  <Icon className="size-3" />
                  {CATEGORY_LABELS[entry.category]}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-sm border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {entry.tone}
                </Badge>
                <span className="ml-auto flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="text-accent">Mine</span> · used{" "}
                  {entry.usageCount}×
                </span>
              </div>

              <p className="mt-3 font-serif text-[15px] leading-6">
                {entry.question}
              </p>
              <p className="mt-2 text-[13px] italic leading-5 text-muted-foreground">
                → {entry.response}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-sm border-border bg-card text-[11px] font-semibold"
                    onClick={() => {
                      incrementUsage({ id: entry._id });
                      handleCopy(entry.question, entry.response);
                    }}
                  >
                    <Copy className="size-3" />
                    Copy &amp; count
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-sm text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await removeEntry({ id: entry._id });
                      toast.success("Removed from your vault.");
                    }}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {total === 0 && (
        <div className="border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-serif text-lg">Nothing filed under these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Loosen the tone filter or add an entry of your own.
          </p>
        </div>
      )}

      {/* Add-to-vault dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <p className="eyebrow text-muted-foreground">The Vault</p>
            <DialogTitle className="mt-1 font-serif text-xl tracking-tight">
              File a new entry
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              Tagged for {COMMITTEES[committee].label} — {SKILLS[skill].label}{" "}
              track.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Category
                </label>
                <Select
                  value={newCategory}
                  onValueChange={(v) => setNewCategory(v as PoiCategory)}
                >
                  <SelectTrigger className="w-full rounded-sm border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm border-border bg-popover">
                    <SelectItem value="poi" className="text-xs">
                      POI
                    </SelectItem>
                    <SelectItem value="cross_exam" className="text-xs">
                      Cross-Examination
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Tone
                </label>
                <Select value={newTone} onValueChange={setNewTone}>
                  <SelectTrigger className="w-full rounded-sm border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm border-border bg-popover">
                    {TONE_OPTIONS.map((tone) => (
                      <SelectItem key={tone} value={tone} className="text-xs">
                        {tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Question
              </label>
              <Textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={3}
                placeholder="Does the delegate concede that…?"
                className="resize-none rounded-sm border-border bg-card text-sm leading-5"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Response / rebuttal
              </label>
              <Textarea
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                rows={3}
                placeholder="We thank the delegate for the question…"
                className="resize-none rounded-sm border-border bg-card text-sm leading-5"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Tags <span className="normal-case">(comma separated)</span>
              </label>
              <input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="climate, finance, consensus"
                className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-sm border-border bg-card"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-sm bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Filing…" : "File to vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
