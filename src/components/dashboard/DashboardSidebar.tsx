import { cn } from "@/lib/utils";
import type {
  ActiveTab,
  CommitteeFramework,
  SkillLevel,
} from "@/convex/shared";
import { COMMITTEES, SKILLS, TABS } from "@/components/dashboard/data";

export function DashboardSidebar({
  activeTab,
  onTabChange,
  committee,
  skill,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  committee: CommitteeFramework;
  skill: SkillLevel;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 top-16 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
      {/* Chamber summary */}
      <div className="border-b border-border px-5 py-4">
        <p className="eyebrow text-muted-foreground">Current chamber</p>
        <p className="mt-1.5 font-serif text-[15px] leading-snug">
          {COMMITTEES[committee].label}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {SKILLS[skill].label} track
        </p>
      </div>

      {/* Primary tabs */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors",
                active
                  ? "border-border bg-card shadow-xs"
                  : "border-transparent hover:bg-muted",
              )}
            >
              <tab.icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[13px] font-semibold leading-tight",
                    active ? "text-foreground" : "text-foreground/80",
                  )}
                >
                  {tab.label}
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                  {tab.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Floor status */}
      <div className="border-t border-border px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Floor session
        </p>
        <p className="mt-1 font-serif text-sm">
          {COMMITTEES[committee].committees[0]} · {COMMITTEES[committee].short}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {COMMITTEES[committee].floorNote}
        </p>
      </div>
    </aside>
  );
}
