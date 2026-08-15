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
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { COMMITTEES, SKILLS } from "@/components/dashboard/data";

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
        toast.success(`Experience tier: ${SKILLS[patch.skillLevel].label}`);
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

      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={(tab) => updateConfig({ activeTab: tab })}
        committee={committee}
        skill={skill}
      />

      <div className="lg:pl-60">
        <main className="h-[calc(100vh-4rem)]">
          <ChatView committee={committee} skill={skill} />
        </main>
      </div>
    </div>
  );
}
