import { Link } from "react-router";
import {
  ChevronDown,
  Gauge,
  Landmark,
  LogOut,
} from "lucide-react";
import { Wordmark } from "@/components/BrandMark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <Link
          to="/"
          className="shrink-0 transition-opacity hover:opacity-80"
          aria-label="MUN Apex AI — home"
        >
          <Wordmark compact />
        </Link>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          {/* Committee Framework */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-auto gap-2 rounded-md border-border bg-card px-3 py-2 shadow-xs"
                aria-label="Committee Framework"
              >
                <Landmark className="size-4 shrink-0 text-primary" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:block">
                    Committee Framework
                  </span>
                  <span className="text-xs font-semibold">
                    {COMMITTEES[committee].short}
                  </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[min(320px,calc(100vw-2rem))] rounded-md border-border bg-popover"
            >
              <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                      className="cursor-pointer items-start gap-3 py-2.5 pl-8"
                    >
                      <span className="flex flex-col">
                        <span className="text-[13px] font-semibold leading-tight">
                          {COMMITTEES[key].label}
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

          {/* Skill Level */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-auto gap-2 rounded-md border-border bg-card px-3 py-2 shadow-xs"
                aria-label="Skill Level"
              >
                <Gauge className="size-4 shrink-0 text-primary" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:block">
                    Skill Level
                  </span>
                  <span className="text-xs font-semibold">
                    {SKILLS[skill].label}
                  </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-md border-border bg-popover"
            >
              <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Skill Level
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={skill}
                onValueChange={(value) =>
                  onSkillChange(value as SkillLevel)
                }
              >
                {(Object.keys(SKILLS) as SkillLevel[]).map((key) => (
                  <DropdownMenuRadioItem
                    key={key}
                    value={key}
                    className="cursor-pointer items-start gap-3 py-2.5 pl-8"
                  >
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold leading-tight">
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

          <span className="hidden h-6 w-px bg-border sm:block" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-1.5 shadow-xs transition-colors hover:bg-muted"
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  <AvatarImage src={user?.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-md border-border bg-popover"
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onSignOut}
                variant="destructive"
                className="cursor-pointer"
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
