import { useQuery } from "@tanstack/react-query";
import { getAllFamilyData } from "@/lib/firestore";
import type { FamilyData } from "@/lib/types";

function parseFamilyData(raw: Record<string, any>): FamilyData {
  return {
    config: raw["family-config"] || null,
    tasks: raw["tasks"] || [],
    completions: raw["completions"] || {},
    xp: raw["xp"] || {},
    totalXpEarned: raw["totalXpEarned"] || {},
    streaks: raw["streaks"] || {},
    approvedCount: raw["approvedCount"] || {},
    earnedBadges: raw["earnedBadges"] || {},
    messages: raw["messages"] || [],
    penalties: raw["penalties"] || [],
    auditLog: raw["auditLog"] || [],
    challenges: raw["challenges"] || [],
    customChallenges: raw["customChallenges"] || [],
    rewards: raw["rewards"] || [],
    purchaseHistory: raw["purchaseHistory"] || [],
    groceries: raw["groceries"] || [],
    calEvents: raw["calEvents"] || [],
    exams: raw["exams"] || [],
    goals: raw["goals"] || [],
    avatars: raw["avatars"] || {},
    childReminders: raw["childReminders"] || {},
    locations: raw["locations"] || {},
    taskTemplates: raw["taskTemplates"] || [],
    swaps: raw["swaps"] || [],
    spentXp: raw["spentXp"] || {},
  };
}

export function useFamilyData(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family", familyId],
    queryFn: async (): Promise<FamilyData> => {
      if (!familyId) throw new Error("No familyId");
      const raw = await getAllFamilyData(familyId);
      return parseFamilyData(raw);
    },
    enabled: !!familyId,
    staleTime: 30000,
  });
}
