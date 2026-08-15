import { motion } from "framer-motion";
import {
  ArrowRight,
  Landmark,
  Library,
  Radio,
  ScrollText,
} from "lucide-react";
import { Link } from "react-router";
import { Wordmark } from "@/components/BrandMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { COMMITTEES, SKILLS } from "@/components/dashboard/data";

const MODULES = [
  {
    numeral: "I",
    title: "Live Floor Interventions",
    icon: Radio,
    blurb:
      "Follow the chamber as it happens — speeches, rights of reply, and motions stream onto the speaker's list in real time.",
    bullets: [
      "Live speaker's list with status tracking",
      "Draft desk with word targets per skill track",
      "Angle hints calibrated to your chamber",
    ],
  },
  {
    numeral: "II",
    title: "POI & Cross-Examination Vault",
    icon: Library,
    blurb:
      "A filing cabinet of points of information and cross-exam questions, sorted by tone — sharp, measured, forensic, disarming.",
    bullets: [
      "Curated ammunition for every chamber & skill",
      "Add your own entries and track usage",
      "Copy a strike in one click",
    ],
  },
  {
    numeral: "III",
    title: "Resolution Draftsman",
    icon: ScrollText,
    blurb:
      "Draft like a rapporteur: clause banks for preambulatory and operative text, a live document preview, and status tracking.",
    bullets: [
      "Preambulatory & operative clause banks",
      "Live UN-style document preview",
      "Save, revise, and submit drafts",
    ],
  },
];

const CHAMBERS = [
  COMMITTEES.un,
  COMMITTEES.loksabha,
  COMMITTEES.aippm,
];

const STATS = [
  { value: "3", label: "Committee frameworks" },
  { value: "2", label: "Skill tracks" },
  { value: "3", label: "Debate modules" },
  { value: "∞", label: "Amendments drafted" },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const enterHref = isAuthenticated
    ? "/dashboard"
    : "/auth?returnTo=%2Fdashboard";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Masthead */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b-2 border-foreground">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex items-center justify-between gap-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">
            <span>Est. 2026 · The Delegate's Daily</span>
            <span className="hidden md:block">
              Committee intelligence · Three chambers
            </span>
            <span>Vol. I — No. 1</span>
          </div>

          <div className="border-t border-border py-7 text-center sm:py-9">
            <p className="eyebrow text-muted-foreground">
              Apex intelligence for the modern delegate
            </p>
            <h1 className="masthead mt-3 text-4xl leading-none tracking-[0.18em] text-foreground sm:text-6xl md:text-7xl">
              MUN APEX AI
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-serif text-base italic text-muted-foreground sm:text-lg">
              Debate with precision. Draft with authority. Rebut with evidence.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-border py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
            <a href="#modules" className="transition-colors hover:text-foreground">
              The Modules
            </a>
            <a href="#chambers" className="transition-colors hover:text-foreground">
              The Chambers
            </a>
            <a href="#floor" className="transition-colors hover:text-foreground">
              The Floor
            </a>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <Link
              to="/auth"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Badge
              variant="outline"
              className="rounded-full border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
            >
              <span className="relative mr-1.5 flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              The floor is live
            </Badge>

            <h2 className="mt-6 font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              One desk for the{" "}
              <span className="text-accent">whole chamber</span> — from the
              first speech to the final clause.
            </h2>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
              MUN Apex AI is a premium dashboard for delegates and parliament
              speakers. Choose your committee framework and skill level, then
              work the floor: track interventions live, draw from a vault of
              points of information, and draft resolutions like a rapporteur.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={enterHref}>
                <Button
                  size="lg"
                  className="gap-2 rounded-md bg-primary px-6 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                  Enter the Floor
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#modules">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 rounded-md border-border bg-card px-6 font-semibold"
                >
                  Read the modules
                </Button>
              </a>
            </div>

            {!isLoading && !isAuthenticated && (
              <p className="mt-4 text-xs text-muted-foreground">
                New delegates sign in with email — one-time code, no password
                to remember.
              </p>
            )}
          </motion.div>

          {/* Front-page mock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          >
            <div className="border border-white/10 bg-card shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
              <div className="border-b-2 border-foreground px-5 py-3 text-center">
                <p className="masthead text-sm tracking-[0.3em]">THE FLOOR</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  General debate · Second day
                </p>
              </div>
              <div className="space-y-0 px-5 py-4">
                <p className="font-serif text-xl leading-snug">
                  Delegates trade pledges as the climate bloc firms up
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  The debate turned on financing this morning. Three blocs have
                  circulated working papers; a fourth is expected before the
                  evening session.
                </p>
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {[
                    ["People's Republic of China", "…development is the master key to all problems."],
                    ["Republic of India", "…a permanent voice for a sixth of humanity."],
                    ["Republic of Kenya", "…the climate crisis is a security crisis."],
                  ].map(([delegation, quote]) => (
                    <div key={delegation}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        {delegation}
                      </p>
                      <p className="mt-0.5 font-serif text-[13px] italic leading-snug text-foreground/85">
                        {quote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border bg-secondary/50 px-5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span>Live from the chamber</span>
                <span className="flex items-center gap-1.5 text-accent">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  On air
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats ledger */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border px-5 sm:px-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-6 py-7 text-center">
              <p className="font-serif text-4xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Modules */}
      {/* ------------------------------------------------------------------ */}
      <section id="modules" className="border-b border-border scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">
                The working desk
              </p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
                Three instruments, one chamber
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Every module reads your committee framework and skill level from
              the header — switch chambers and the entire desk reconfigures.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
            {MODULES.map((module) => (
              <motion.article
                key={module.numeral}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45 }}
                className="group flex flex-col bg-card p-7 transition-colors hover:bg-card/60"
              >
                <div className="flex items-center justify-between">
                  <module.icon className="size-5 text-accent" />
                  <span className="font-serif text-3xl font-semibold text-foreground/15 transition-colors group-hover:text-foreground/30">
                    {module.numeral}
                  </span>
                </div>
                <h3 className="mt-5 font-serif text-xl leading-snug">
                  {module.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {module.blurb}
                </p>
                <ul className="mt-5 space-y-2 border-t border-border pt-4 text-[13px] leading-5 text-foreground/80">
                  {module.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Chambers */}
      {/* ------------------------------------------------------------------ */}
      <section id="chambers" className="border-b border-border scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="text-center">
            <p className="eyebrow text-muted-foreground">
              Choose your framework
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
              Three chambers, three dialects of debate
            </h2>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
            {CHAMBERS.map((chamber) => (
              <motion.div
                key={chamber.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45 }}
                className="bg-card p-7"
              >
                <div className="flex items-center gap-2.5">
                  <Landmark className="size-4 text-primary" />
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary">
                    Chamber {chamber.short}
                  </p>
                </div>
                <h3 className="mt-4 font-serif text-xl leading-snug">
                  {chamber.label}
                </h3>
                <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                  {chamber.tagline}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {chamber.committees.slice(0, 4).map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="rounded-sm border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Resolution pull-quote */}
      {/* ------------------------------------------------------------------ */}
      <section id="floor" className="border-b border-border scroll-mt-24">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 lg:py-20">
          <p className="eyebrow text-muted-foreground">
            A leaf from the Draftsman
          </p>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            United Nations General Assembly · Draft Resolution
          </p>
          <blockquote className="mt-4 font-serif text-2xl leading-snug tracking-tight sm:text-3xl">
            <span className="drop-cap">
              The General Assembly, guided by the principles of the Charter and
              deeply concerned by the financing gap,
            </span>{" "}
            <span className="italic">
              calls upon Member States to honour their pledges and{" "}
              <span className="not-italic text-accent">decides to remain
              seized of the matter.</span>
            </span>
          </blockquote>
          <p className="mx-auto mt-6 max-w-md text-xs leading-5 text-muted-foreground">
            Preambulatory clauses, operative clauses, sponsor lines, and status
            tracking — assembled in the Resolution Draftsman, not a word
            processor.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA band */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b-2 border-foreground">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 lg:py-20">
          <p className="eyebrow text-muted-foreground">
            {SKILLS.beginner.label} & {SKILLS.veteran.label} tracks
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            The floor is open.{" "}
            <span className="text-accent">Take your seat.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
            Sign in with email — a one-time code lands in your inbox, and the
            dashboard remembers your chamber, your skill track, and where you
            left off.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={enterHref}>
              <Button
                size="lg"
                className="gap-2 rounded-md bg-primary px-8 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
              >
                Enter the Floor
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                variant="outline"
                size="lg"
                className="rounded-md border-border bg-card px-8 font-semibold"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="bg-card">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Wordmark compact />
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <a href="#modules" className="transition-colors hover:text-foreground">
                Modules
              </a>
              <a href="#chambers" className="transition-colors hover:text-foreground">
                Chambers
              </a>
              <Link to="/auth" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
            </nav>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:flex-row">
            <span>© 2026 MUN Apex AI — Delegate Intelligence</span>
            <span>Set in the Papery editorial system</span>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
