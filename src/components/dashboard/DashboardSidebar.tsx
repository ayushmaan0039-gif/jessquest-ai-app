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
    <aside className="fixed inset-y-0 left-0 top-16 z-30 hidden w-60 flex-col border-r border-border bg-sidebar/70 backdrop-blur-md lg:flex">
      {/* Chamber echo */}
      <div className="px-5 pb-4 pt-5">
        <p className="eyebrow text-muted-foreground">Current chamber</p>
        <p className="mt-1.5 font-serif text-[15px] leading-snug text-foreground">
          {COMMITTEES[committee].label}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {SKILLS[skill].label} tier
        </p>
      </div>

      {/* Module rail */}
      <nav className="flex-1 space-y-1 px-3">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors",
                active
                  ? "bg-white/8 text-white"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <tab.icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              />
              <span className="leading-tight">{tab.label}</span>
              {active && (
                <span className="ml-auto size-1.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Session
        </p>
        <p className="mt-1 font-serif text-[13px]">
          {COMMITTEES[committee].committees[0]} · {COMMITTEES[committee].short}
        </p>
      </div>
    </aside>
  );
}
