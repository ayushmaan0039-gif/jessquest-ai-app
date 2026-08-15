import { Link } from "react-router";
import { ChevronDown, LogOut } from "lucide-react";
import { BrandMark, Wordmark } from "@/components/BrandMark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CommitteeFramework,
  SkillLevel,
} from "@/convex/shared";
import { COMMITTEES, SKILLS } from "@/components/dashboard/data";

type DashboardUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null | undefined;

const COMMITTEE_HEADER_LABELS: Record<CommitteeFramework, string> = {
  un: "UN Committee",
  loksabha: "Lok Sabha",
  aippm: "AIPPM",
};

function getInitials(user: DashboardUser): string {
  const source = user?.name ?? user?.email ?? "D";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardHeader({
  committee,
  skill,
  onCommitteeChange,
  onSkillChange,
  user,
  onSignOut,
}: {
  committee: CommitteeFramework;
  skill: SkillLevel;
  onCommitteeChange: (framework: CommitteeFramework) => void;
  onSkillChange: (level: SkillLevel) => void;
  user: DashboardUser;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="relative flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        {/* Brand */}
        <Link
          to="/"
          className="shrink-0 transition-opacity hover:opacity-80"
          aria-label="MUN Apex AI — home"
        >
          <span className="hidden md:block">
            <Wordmark compact />
          </span>
          <span className="block md:hidden">
            <BrandMark className="size-8" />
          </span>
        </Link>

        {/* Centered global toggles — sleek, borderless, dark */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-white/5"
                aria-label="Committee Framework"
              >
                <span className="flex flex-col items-start leading-tight">
                  <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
                    Committee Framework
                  </span>
                  <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
                    {COMMITTEE_HEADER_LABELS[committee]}
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="w-72 rounded-xl border-white/10 bg-popover/95 shadow-2xl backdrop-blur-xl"
            >
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Committee Framework
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={committee}
                onValueChange={(value) =>
                  onCommitteeChange(value as CommitteeFramework)
                }
              >
                {(Object.keys(COMMITTEES) as CommitteeFramework[]).map(
                  (key) => (
                    <DropdownMenuRadioItem
                      key={key}
                      value={key}
                      className="cursor-pointer items-start gap-3 rounded-lg py-2.5 pl-8 focus:bg-white/5"
                    >
                      <span className="flex flex-col">
                        <span className="text-[13px] font-semibold leading-tight text-foreground">
                          {COMMITTEE_HEADER_LABELS[key]}
                        </span>
                        <span className="mt-1 text-[11px] leading-4 text-muted-foreground">
                          {COMMITTEES[key].tagline}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ),
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-white/5"
                aria-label="Experience Tier"
              >
                <span className="flex flex-col items-start leading-tight">
                  <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
                    Experience Tier
                  </span>
                  <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
                    {SKILLS[skill].label}
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="w-64 rounded-xl border-white/10 bg-popover/95 shadow-2xl backdrop-blur-xl"
            >
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Experience Tier
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={skill}
                onValueChange={(value) => onSkillChange(value as SkillLevel)}
              >
                {(Object.keys(SKILLS) as SkillLevel[]).map((key) => (
                  <DropdownMenuRadioItem
                    key={key}
                    value={key}
                    className="cursor-pointer items-start gap-3 rounded-lg py-2.5 pl-8 focus:bg-white/5"
                  >
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold leading-tight text-foreground">
                        {SKILLS[key].label}
                      </span>
                      <span className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        {SKILLS[key].tagline}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User menu */}
        <div className="flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-1.5 py-1.5 transition-colors hover:bg-white/10"
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  <AvatarImage src={user?.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-accent/20 text-[10px] font-bold text-accent">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-xl border-white/10 bg-popover/95 shadow-2xl backdrop-blur-xl"
            >
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {user?.name ?? "Guest Delegate"}
                </span>
                {user?.email && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={onSignOut}
                variant="destructive"
                className="cursor-pointer rounded-lg focus:bg-white/5"
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
