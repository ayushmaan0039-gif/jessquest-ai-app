import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  PenLine,
  Quote,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type {
  CommitteeFramework,
  InterventionStatus,
  InterventionType,
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
import { DebateConsole } from "@/components/dashboard/DebateConsole";
import {
  COMMITTEES,
  FLOOR_FEED,
  SKILLS,
  formatClock,
  formatDuration,
  getAngleHints,
} from "@/components/dashboard/data";

// Session clock anchor — a fixed offset so the floor timer feels "in session".
const SESSION_ANCHOR = Date.now() - 11 * 60 * 1000;

const STATUS_RANK: Record<InterventionStatus, number> = {
  live: 0,
  upcoming: 1,
  delivered: 2,
};

const STATUS_META: Record<
  InterventionStatus,
  { label: string; className: string }
> = {
  live: {
    label: "Live",
    className:
      "border-accent/30 bg-accent/10 text-accent",
  },
  upcoming: {
    label: "Up next",
    className: "border-primary/25 bg-secondary text-primary",
  },
  delivered: {
    label: "Delivered",
    className: "border-border bg-muted text-muted-foreground",
  },
};

type FeedItem = {
  key: string;
  speaker: string;
  delegation: string;
  type: InterventionType;
  status: InterventionStatus;
  body: string;
  durationSeconds: number;
  bookmarked: boolean;
  isUser: boolean;
  createdAt: number;
  id?: Id<"interventions">;
};

function starterOutline(
  type: InterventionType,
  committee: CommitteeFramework,
  skill: SkillLevel,
): string {
  const chamber = COMMITTEES[committee].short;
  const pace =
    skill === "beginner"
      ? "Keep it to ninety seconds and three beats."
      : "Extend the beats but never the padding — four minutes of substance.";
  const lines: Record<InterventionType, string[]> = {
    "Formal Speech": [
      "1. Address the chair: \"Honourable Chair, esteemed delegates…\"",
      "2. State your position in one line — the chamber should know your ask by sentence two.",
      `3. Argument one, anchored to the ${chamber} agenda and one concrete example.`,
      "4. Argument two: answer the strongest counter before it is raised.",
      `5. Close with the ask: the clause, bloc, or vote you are building. ${pace}`,
    ],
    "Right of Reply": [
      "1. Name the mischaracterisation precisely — quote it, then correct it.",
      `2. Restate your delegation's position on the ${chamber} question in one line.`,
      "3. Do not attack the delegate; attack the distortion.",
      "4. Close by returning to the substance the House should focus on.",
    ],
    "Explanation of Vote": [
      "1. State your vote plainly: in favour, against, or abstention.",
      "2. Give one principled reason — the text, the process, or the precedent.",
      "3. Note what the draft got right even where you dissent.",
      "4. One sentence on what would change your vote.",
    ],
    "Procedural Motion": [
      "1. Identify the motion and the rule you are invoking.",
      `2. Give the ${chamber} one concrete reason this serves the debate.`,
      "3. Request the chair's ruling with courtesy.",
    ],
    "Cross-Examination Answer": [
      "1. Answer the question directly before adding anything else.",
      "2. One sentence of position, one of evidence.",
      "3. Reclaim the floor: pivot to what your delegation is actually proposing.",
    ],
  };
  return lines[type].join("\n");
}

export function InterventionsView({
  committee,
  skill,
}: {
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  const userInterventions = useQuery(api.interventions.list);
  const createIntervention = useMutation(api.interventions.create);
  const updateStatus = useMutation(api.interventions.updateStatus);
  const toggleBookmark = useMutation(api.interventions.toggleBookmark);
  const removeIntervention = useMutation(api.interventions.remove);

  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - SESSION_ANCHOR) / 1000)),
  );
  useEffect(() => {
    const timer = setInterval(
      () => setElapsed((s) => s + 1),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  // Draft desk state
  const [speaker, setSpeaker] = useState("");
  const [delegation, setDelegation] = useState("");
  const [type, setType] = useState<InterventionType>("Formal Speech");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const words = useMemo(
    () => body.trim().split(/\s+/).filter(Boolean).length,
    [body],
  );
  const target = SKILLS[skill].targetWords;

  const feed = useMemo<FeedItem[]>(() => {
    const seeds: FeedItem[] = FLOOR_FEED[committee].map((seed, index) => ({
      key: seed.id,
      speaker: seed.speaker,
      delegation: seed.delegation,
      type: seed.type,
      status: seed.status,
      body: seed.body,
      durationSeconds: seed.durationSeconds,
      bookmarked: false,
      isUser: false,
      createdAt: 10_000 - index * 1000,
    }));

    const mine: FeedItem[] = (userInterventions ?? [])
      .filter((entry) => entry.committeeFramework === committee)
      .map((entry) => ({
        key: entry._id,
        speaker: entry.speaker,
        delegation: entry.delegation,
        type: entry.type,
        status: entry.status,
        body: entry.body,
        durationSeconds: entry.durationSeconds,
        bookmarked: entry.bookmarked,
        isUser: true,
        createdAt: entry.createdAt,
        id: entry._id,
      }));

    return [...seeds, ...mine].sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        b.createdAt - a.createdAt,
    );
  }, [committee, userInterventions]);

  const handleSave = async () => {
    if (!body.trim()) {
      toast.error("Write something before filing it to the floor.");
      return;
    }
    setIsSaving(true);
    try {
      await createIntervention({
        type,
        speaker: speaker.trim() || "The Delegate",
        delegation: delegation.trim() || "Your Delegation",
        status: "upcoming",
        body: body.trim(),
        durationSeconds: Math.max(30, Math.round(words / 2.2)),
      });
      toast.success("Intervention filed to the speaker's list.");
      setBody("");
    } catch {
      toast.error("Could not file the intervention. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpand = () => {
    const outline = starterOutline(type, committee, skill);
    setBody((current) =>
      current.trim() ? `${current.trim()}\n\n${outline}` : outline,
    );
    toast.info("Starter outline inserted into the draft desk.");
  };

  return (
    <div className="space-y-8">
      {/* Section header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">
            {COMMITTEES[committee].short} · {COMMITTEES[committee].committees[0]}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
            Live Floor Interventions
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {COMMITTEES[committee].floorNote}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 rounded-sm border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            Live
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 rounded-sm border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            <Clock className="size-3" />
            {formatClock(elapsed)}
          </Badge>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------------------------------------------------------------- */}
        {/* Floor feed */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <div className="rule-double-b flex items-center justify-between pb-2">
            <h2 className="eyebrow text-foreground">Speaker's list</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {feed.length} on record
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {feed.map((item) => (
              <article
                key={item.key}
                className={cn(
                  "rounded-sm border border-border border-l-4 bg-card p-4 sm:p-5",
                  item.status === "live"
                    ? "border-l-accent"
                    : item.status === "upcoming"
                      ? "border-l-primary/40"
                      : "border-l-border",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-sm border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                  >
                    {item.type}
                  </Badge>
                  <Badge
                    className={cn(
                      "rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                      STATUS_META[item.status].className,
                    )}
                  >
                    {item.status === "live" && (
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
                      </span>
                    )}
                    {STATUS_META[item.status].label}
                  </Badge>
                  <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {formatDuration(item.durationSeconds)}
                  </span>
                </div>

                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {item.delegation}
                </p>
                <h3 className="mt-0.5 font-serif text-lg leading-snug">
                  {item.speaker}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-3">
                  {item.body}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  {item.isUser && item.id ? (
                    <>
                      <Select
                        value={item.status}
                        onValueChange={(value) =>
                          updateStatus({
                            id: item.id!,
                            status: value as InterventionStatus,
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-7 w-[130px] rounded-sm border-border bg-card text-[11px]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm border-border bg-popover">
                          <SelectItem value="upcoming" className="text-xs">
                            Up next
                          </SelectItem>
                          <SelectItem value="delivered" className="text-xs">
                            Delivered
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-sm"
                        onClick={() =>
                          toggleBookmark({ id: item.id! })
                        }
                        aria-label="Bookmark intervention"
                      >
                        {item.bookmarked ? (
                          <BookmarkCheck className="size-3.5 text-accent" />
                        ) : (
                          <Bookmark className="size-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-sm text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          await removeIntervention({ id: item.id! });
                          toast.success("Removed from your list.");
                        }}
                        aria-label="Delete intervention"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Curated from the floor
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Draft desk */}
        {/* ---------------------------------------------------------------- */}
        <section className="space-y-5">
          <div className="border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <PenLine className="size-4 text-accent" />
                <h2 className="eyebrow text-foreground">Draft desk</h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {SKILLS[skill].label} track
              </span>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Intervention type
                </label>
                <Select value={type} onValueChange={(v) => setType(v as InterventionType)}>
                  <SelectTrigger className="w-full rounded-sm border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm border-border bg-popover">
                    {(
                      [
                        "Formal Speech",
                        "Right of Reply",
                        "Explanation of Vote",
                        "Procedural Motion",
                        "Cross-Examination Answer",
                      ] as InterventionType[]
                    ).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Delegate
                  </label>
                  <input
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="Your name"
                    className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Delegation
                  </label>
                  <input
                    value={delegation}
                    onChange={(e) => setDelegation(e.target.value)}
                    placeholder="Your delegation"
                    className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Speech text
                  </label>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.14em]",
                      words > target
                        ? "text-accent"
                        : "text-muted-foreground",
                    )}
                  >
                    {words} / {target} words
                  </span>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Address the chair, state your position, make your argument, close with the ask…"
                  className="resize-none rounded-sm border-border bg-card text-sm leading-6"
                />
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                  {SKILLS[skill].label} target: ~
                  {SKILLS[skill].targetSeconds / 60} minutes ·{" "}
                  {formatDuration(SKILLS[skill].targetSeconds)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleExpand}
                  variant="outline"
                  className="w-full rounded-sm border-border bg-card text-xs font-semibold"
                >
                  <Quote className="size-3.5" />
                  Insert starter outline
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full rounded-sm bg-primary text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? "Filing…" : "File to the floor list"}
                </Button>
              </div>
            </div>
          </div>

          {/* Angle hints */}
          <div className="border border-border bg-card p-5">
            <p className="eyebrow text-muted-foreground">
              Angle hints · {COMMITTEES[committee].short} /{" "}
              {SKILLS[skill].label}
            </p>
            <ul className="mt-3.5 space-y-3">
              {getAngleHints(committee, skill).map((hint) => (
                <li key={hint} className="flex gap-2.5">
                  <span className="mt-0.5 font-serif text-sm font-semibold text-accent">
                    ¶
                  </span>
                  <p className="text-[13px] leading-5 text-foreground/85">
                    {hint}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* AI console — streams a generated intervention into the draft desk */}
          <DebateConsole
            mode="interventions"
            committee={committee}
            skill={skill}
            generateLabel="Draft"
            placeholder={`Describe the ${type.toLowerCase()} you need — topic, position, or the counter you expect…`}
          >
            {({ text: generated, isStreaming }) => (
              <Button
                size="sm"
                variant="outline"
                className="rounded-sm border-border bg-card text-[11px] font-semibold"
                disabled={!generated || isStreaming}
                onClick={() => {
                  setBody(generated);
                  toast.success("Generated text moved into the draft desk.");
                }}
              >
                <PenLine className="size-3.5" />
                Use in draft
              </Button>
            )}
          </DebateConsole>
        </section>
      </div>
    </div>
  );
}
