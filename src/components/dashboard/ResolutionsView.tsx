import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  FilePlus2,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type {
  CommitteeFramework,
  ResolutionStatus,
  SkillLevel,
} from "@/convex/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMITTEES,
  PHRASE_BANKS,
  RESOLUTION_STARTERS,
  SKILLS,
} from "@/components/dashboard/data";

type Clause = { id: string; text: string };
type ClauseSection = "preamble" | "operative";

const ROMAN = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
  "xiii",
  "xiv",
  "xv",
];

const STATUS_LABELS: Record<ResolutionStatus, string> = {
  draft: "Draft",
  signatures: "Open for Signatures",
  submitted: "Submitted",
};

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clausesFromTexts(texts: string[]): Clause[] {
  return texts.map((text) => ({ id: uid(), text }));
}

export function ResolutionsView({
  committee,
  skill,
}: {
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  const resolutions = useQuery(api.resolutions.list);
  const createResolution = useMutation(api.resolutions.create);
  const updateResolution = useMutation(api.resolutions.update);
  const removeResolution = useMutation(api.resolutions.remove);

  const [selectedId, setSelectedId] = useState<Id<"resolutions"> | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [sponsors, setSponsors] = useState("");
  const [status, setStatus] = useState<ResolutionStatus>("draft");
  const [preamble, setPreamble] = useState<Clause[]>([]);
  const [operative, setOperative] = useState<Clause[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const chamberResolutions = useMemo(
    () =>
      (resolutions ?? []).filter(
        (doc) => doc.committeeFramework === committee,
      ),
    [resolutions, committee],
  );

  const selected = useMemo(
    () => chamberResolutions.find((doc) => doc._id === selectedId) ?? null,
    [chamberResolutions, selectedId],
  );

  const loadDoc = (doc: NonNullable<typeof selected>) => {
    setSelectedId(doc._id);
    setTitle(doc.title);
    setTopic(doc.topic);
    setSponsors(doc.sponsors);
    setStatus(doc.status);
    setPreamble(clausesFromTexts(doc.preamble));
    setOperative(clausesFromTexts(doc.operative));
  };

  const handleNew = async () => {
    const starter = RESOLUTION_STARTERS[committee];
    const id = await createResolution({
      committeeFramework: committee,
      title: starter.title,
      topic: starter.topic,
      sponsors: "Your Delegation",
      preamble: starter.preamble,
      operative: starter.operative,
      status: "draft",
    });
    setSelectedId(id);
    setTitle(starter.title);
    setTopic(starter.topic);
    setSponsors("Your Delegation");
    setStatus("draft");
    setPreamble(clausesFromTexts(starter.preamble));
    setOperative(clausesFromTexts(starter.operative));
    toast.success("New draft opened from the chamber template.");
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await updateResolution({
        id: selectedId,
        title: title.trim() || "Untitled Resolution",
        topic: topic.trim(),
        sponsors: sponsors.trim(),
        status,
        preamble: preamble.map((clause) => clause.text),
        operative: operative.map((clause) => clause.text),
      });
      toast.success("Resolution draft saved.");
    } catch {
      toast.error("Could not save the draft. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await removeResolution({ id: selectedId });
    setSelectedId(null);
    toast.success("Draft deleted.");
  };

  const handleCopy = async () => {
    const text = buildDocumentText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Document copied — paste it anywhere.");
    } catch {
      toast.error("Clipboard unavailable in this browser.");
    }
  };

  const addClause = (section: ClauseSection, phrase = "") => {
    const clause: Clause = { id: uid(), text: phrase };
    if (section === "preamble") {
      setPreamble((current) => [...current, clause]);
    } else {
      setOperative((current) => [...current, clause]);
    }
  };

  const updateClause = (
    section: ClauseSection,
    id: string,
    text: string,
  ) => {
    const patch = (clauses: Clause[]) =>
      clauses.map((clause) =>
        clause.id === id ? { ...clause, text } : clause,
      );
    if (section === "preamble") {
      setPreamble(patch);
    } else {
      setOperative(patch);
    }
  };

  const removeClause = (section: ClauseSection, id: string) => {
    if (section === "preamble") {
      setPreamble((current) => current.filter((clause) => clause.id !== id));
    } else {
      setOperative((current) => current.filter((clause) => clause.id !== id));
    }
  };

  const buildDocumentText = () => {
    const body = COMMITTEES[committee].body;
    const lines = [
      body.toUpperCase(),
      "DRAFT RESOLUTION",
      "",
      title.toUpperCase(),
      topic ? `Topic: ${topic}` : "",
      "",
      `The ${body.replace(/^[^,]+, /, "")},`,
      ...preamble.map((clause, index) => {
        const numeral = ROMAN[index] ?? `${index + 1}`;
        return `${numeral}. ${clause.text}`;
      }),
      "",
      ...operative.map((clause, index) => `${index + 1}. ${clause.text}`),
      "",
      `Sponsors: ${sponsors || "—"}`,
      `Status: ${STATUS_LABELS[status]}`,
    ];
    return lines.join("\n");
  };

  return (
    <div className="space-y-8">
      {/* Section header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">
            The Draftsman · {COMMITTEES[committee].short} /{" "}
            {SKILLS[skill].label}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
            Resolution Draftsman
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Preambulatory clauses, operative clauses, sponsor lines — drafted
            like a rapporteur and previewed like the real thing.
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="gap-2 rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
        >
          <FilePlus2 className="size-4" />
          New resolution
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* Resolution list */}
        {/* ---------------------------------------------------------------- */}
        <aside>
          <div className="rule-double-b flex items-center justify-between pb-2">
            <h2 className="eyebrow text-foreground">Your resolutions</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chamberResolutions.length}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {chamberResolutions.map((doc) => (
              <button
                key={doc._id}
                type="button"
                onClick={() => loadDoc(doc)}
                className={cn(
                  "group w-full rounded-sm border border-l-4 bg-card p-3.5 text-left transition-colors",
                  selectedId === doc._id
                    ? "border-l-accent border-border"
                    : "border-l-border border-border hover:border-foreground/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-serif text-sm font-semibold leading-snug">
                    {doc.title}
                  </p>
                  <Badge
                    variant={
                      doc.status === "submitted"
                        ? "default"
                        : doc.status === "signatures"
                          ? "secondary"
                          : "outline"
                    }
                    className="shrink-0 rounded-sm border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                  >
                    {STATUS_LABELS[doc.status]}
                  </Badge>
                </div>
                {doc.topic && (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {doc.topic}
                  </p>
                )}
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </button>
            ))}

            {chamberResolutions.length === 0 && (
              <div className="border border-dashed border-border bg-card/50 p-6 text-center">
                <ScrollText className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 font-serif text-sm">
                  No drafts for {COMMITTEES[committee].short} yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-sm border-border bg-card"
                  onClick={handleNew}
                >
                  <Plus className="size-3.5" />
                  Open the starter
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* Editor + preview */}
        {/* ---------------------------------------------------------------- */}
        {selectedId === null ? (
          <section className="flex flex-col items-center justify-center border border-dashed border-border bg-card/50 p-12 text-center">
            <ScrollText className="size-7 text-muted-foreground" />
            <h3 className="mt-3 font-serif text-xl">The desk is clear.</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Select a draft from the list or open a new one — the starter
              template is pre-loaded with clauses for{" "}
              {COMMITTEES[committee].short}.
            </p>
            <Button
              onClick={handleNew}
              className="mt-5 gap-2 rounded-sm bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <FilePlus2 className="size-4" />
              New resolution
            </Button>
          </section>
        ) : (
          <div className="grid gap-8 xl:grid-cols-2">
            {/* Editor */}
            <section className="space-y-5">
              <div className="border border-border bg-card p-5 shadow-xs">
                <p className="eyebrow text-muted-foreground">
                  Document details
                </p>
                <div className="mt-4 space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="A Resolution on…"
                      className="h-9 w-full rounded-sm border border-input bg-card px-3 font-serif text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Topic
                      </label>
                      <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Agenda item"
                        className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Sponsors
                      </label>
                      <input
                        value={sponsors}
                        onChange={(e) => setSponsors(e.target.value)}
                        placeholder="Your Delegation"
                        className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Status
                    </label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as ResolutionStatus)}
                    >
                      <SelectTrigger className="w-full rounded-sm border-border bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-sm border-border bg-popover">
                        {(
                          ["draft", "signatures", "submitted"] as ResolutionStatus[]
                        ).map((value) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {STATUS_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Clause sections */}
              {(
                [
                  { section: "preamble" as ClauseSection, label: "Preambulatory clauses", hint: "The 'whereas' — the reasons. Each clause ends with a comma." },
                  { section: "operative" as ClauseSection, label: "Operative clauses", hint: "The 'therefores' — the action. Each clause ends with a semicolon or period." },
                ]
              ).map(({ section, label, hint }) => {
                const count =
                  section === "preamble" ? preamble.length : operative.length;
                return (
                <div key={section} className="border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow text-muted-foreground">{label}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {count} clause{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {hint}
                  </p>

                  {/* Phrase bank quick-inserts */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {PHRASE_BANKS[committee][section].slice(0, 5).map((phrase) => (
                      <button
                        key={phrase}
                        type="button"
                        onClick={() => addClause(section, phrase)}
                        className="rounded-sm border border-border bg-secondary/60 px-2 py-1 text-[10.5px] font-medium text-foreground/75 transition-colors hover:border-accent/50 hover:text-accent"
                        title={`Add clause starting “${phrase}…”`}
                      >
                        {phrase.length > 34 ? `${phrase.slice(0, 32)}…` : phrase}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {(section === "preamble" ? preamble : operative).map(
                      (clause, index) => (
                        <div key={clause.id} className="flex items-start gap-2">
                          <span className="mt-2.5 w-6 shrink-0 text-right font-serif text-[13px] font-semibold text-muted-foreground">
                            {section === "preamble"
                              ? ROMAN[index] ?? index + 1
                              : index + 1}
                            .
                          </span>
                          <Textarea
                            value={clause.text}
                            onChange={(e) =>
                              updateClause(section, clause.id, e.target.value)
                            }
                            rows={2}
                            placeholder={
                              section === "preamble"
                                ? "Affirming that…"
                                : "1. Calls upon…"
                            }
                            className="min-h-[3.25rem] flex-1 resize-none rounded-sm border-border bg-card font-serif text-[13px] leading-5"
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="mt-1 rounded-sm text-muted-foreground hover:text-destructive"
                            onClick={() => removeClause(section, clause.id)}
                            aria-label={`Remove ${section} clause`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ),
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3.5 rounded-sm border-border bg-card text-[11px] font-semibold"
                    onClick={() => addClause(section)}
                  >
                    <Plus className="size-3.5" />
                    Add {section === "preamble" ? "preambulatory" : "operative"}{" "}
                    clause
                  </Button>
                </div>
                );
              })}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2 rounded-sm bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="size-4" />
                  {isSaving ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-sm border-border bg-card font-semibold"
                  onClick={handleCopy}
                >
                  <Copy className="size-4" />
                  Copy document
                </Button>
                <Button
                  variant="ghost"
                  className="ml-auto gap-2 rounded-sm text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </section>

            {/* Preview */}
            <section className="xl:sticky xl:top-24 xl:self-start">
              <div className="rule-double-b flex items-center justify-between pb-2">
                <h2 className="eyebrow text-foreground">Live preview</h2>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Rev.{" "}
                  {selected
                    ? new Date(selected.updatedAt).toLocaleTimeString(
                        undefined,
                        { hour: "2-digit", minute: "2-digit" },
                      )
                    : "—"}
                </span>
              </div>

              <div className="mt-4 border border-border bg-[#faf8f1] p-7 font-serif shadow-[4px_4px_0_rgba(33,31,26,0.06)] sm:p-8">
                <p className="text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {COMMITTEES[committee].body}
                </p>
                <p className="mt-1 text-center text-[9px] font-bold uppercase tracking-[0.28em] text-foreground">
                  Draft Resolution
                </p>
                <h3 className="mt-4 text-center text-lg font-semibold leading-snug sm:text-xl">
                  {title || "Untitled Resolution"}
                </h3>
                {topic && (
                  <p className="mt-1.5 text-center text-xs italic text-muted-foreground">
                    Topic: {topic}
                  </p>
                )}

                <div className="mt-6 space-y-2 text-[13px] leading-6 text-foreground/90">
                  <p className="font-semibold">
                    The{" "}
                    {COMMITTEES[committee].body.replace(/^[^,]+, /, "")},
                  </p>
                  {preamble.map((clause, index) => (
                    <p key={clause.id} className="pl-6">
                      <span className="font-semibold text-foreground/60">
                        {ROMAN[index] ?? index + 1}.
                      </span>{" "}
                      {clause.text || "…"}
                    </p>
                  ))}
                </div>

                <div className="mt-5 space-y-2 border-t border-border pt-5 text-[13px] leading-6 text-foreground/90">
                  {operative.map((clause, index) => (
                    <p key={clause.id} className="pl-6">
                      <span className="font-semibold text-foreground/60">
                        {index + 1}.
                      </span>{" "}
                      {clause.text || "…"}
                    </p>
                  ))}
                  {operative.length === 0 && (
                    <p className="pl-6 italic text-muted-foreground">
                      No operative clauses yet.
                    </p>
                  )}
                </div>

                <p className="mt-6 text-xs italic text-muted-foreground">
                  Sponsors: {sponsors || "—"}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Status: {STATUS_LABELS[status]}</span>
                  <span>{COMMITTEES[committee].short}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
