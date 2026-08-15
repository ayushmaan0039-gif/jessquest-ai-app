import { useCallback } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import type {
  ActiveTab,
  CommitteeFramework,
  SkillLevel,
} from "@/convex/shared";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { InterventionsView } from "@/components/dashboard/InterventionsView";
import { PoiVaultView } from "@/components/dashboard/PoiVaultView";
import { ResolutionsView } from "@/components/dashboard/ResolutionsView";
import { COMMITTEES, SKILLS, TABS } from "@/components/dashboard/data";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const config = useQuery(api.config.getConfig);
  const setConfig = useMutation(api.config.setConfig);

  const committee: CommitteeFramework = config?.committeeFramework ?? "un";
  const skill: SkillLevel = config?.skillLevel ?? "beginner";
  const activeTab: ActiveTab = config?.activeTab ?? "interventions";

  const updateConfig = useCallback(
    (patch: {
      committeeFramework?: CommitteeFramework;
      skillLevel?: SkillLevel;
      activeTab?: ActiveTab;
    }) => {
      setConfig(patch);
      if (patch.committeeFramework) {
        toast.success(
          `Committee framework: ${COMMITTEES[patch.committeeFramework].label}`,
        );
      }
      if (patch.skillLevel) {
        toast.success(`Skill level: ${SKILLS[patch.skillLevel].label}`);
      }
    },
    [setConfig],
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        committee={committee}
        skill={skill}
        onCommitteeChange={(framework) =>
          updateConfig({ committeeFramework: framework })
        }
        onSkillChange={(level) => updateConfig({ skillLevel: level })}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Mobile tab strip */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-sm lg:hidden">
        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateConfig({ activeTab: tab.id })}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                  active
                    ? "border-border bg-card text-foreground shadow-xs"
                    : "border-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <tab.icon
                  className={cn("size-3.5", active && "text-accent")}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={(tab) => updateConfig({ activeTab: tab })}
        committee={committee}
        skill={skill}
      />

      <div className="lg:pl-64">
        <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
          {activeTab === "interventions" && (
            <InterventionsView committee={committee} skill={skill} />
          )}
          {activeTab === "poiVault" && (
            <PoiVaultView committee={committee} skill={skill} />
          )}
          {activeTab === "resolutions" && (
            <ResolutionsView committee={committee} skill={skill} />
          )}
        </main>
      </div>
    </div>
  );
}
