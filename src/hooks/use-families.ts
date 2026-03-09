import { useQuery } from "@tanstack/react-query";
import { getAllFamilyData, getFamilyRegistry } from "@/lib/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FamilySummary, FamilyConfig, Completion } from "@/lib/types";

async function discoverFamilyIds(): Promise<string[]> {
  // Try registry first
  const registry = await getFamilyRegistry();
  if (registry.length > 0) return registry.map((r) => r.familyId);

  // Fallback: scan families collection
  try {
    const colRef = collection(db, "families");
    const snapshot = await getDocs(colRef);
    const ids: string[] = [];
    snapshot.forEach((d) => ids.push(d.id));
    return ids;
  } catch {
    return [];
  }
}

function getWeekNumber(d: Date = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const weekNum = Math.ceil(diff / 604800000 + 1);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function computeFamilySummary(familyId: string, data: Record<string, any>): FamilySummary {
  const config = data["family-config"] as FamilyConfig | null;
  const tasks = (data["tasks"] || []) as any[];
  const completions = (data["completions"] || {}) as Record<string, Completion>;
  const xp = (data["xp"] || {}) as Record<string, number>;
  const auditLog = (data["auditLog"] || []) as any[];

  const wk = getWeekNumber();
  let weekDone = 0, weekTotal = 0;
  Object.entries(completions).forEach(([key, val]) => {
    if (key.startsWith(wk)) {
      weekTotal++;
      if (val.done) weekDone++;
    }
  });

  const totalXp = Object.values(xp).reduce((s, v) => s + (v || 0), 0);
  const lastTs = auditLog.length > 0 ? Math.max(...auditLog.map((e: any) => e.ts || 0)) : null;
  const isActive = lastTs ? Date.now() - lastTs < 7 * 86400000 : false;

  return {
    familyId,
    familyName: config?.familyName || familyId,
    memberCount: config ? Object.keys(config.family || {}).length : 0,
    childCount: config?.children?.length || 0,
    totalTasks: tasks.length,
    weeklyCompletionPct: weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0,
    totalXp,
    lastActivity: lastTs,
    isActive,
  };
}

export function useFamilies() {
  return useQuery({
    queryKey: ["families"],
    queryFn: async (): Promise<{ summaries: FamilySummary[]; allData: Record<string, Record<string, any>> }> => {
      const ids = await discoverFamilyIds();
      const allData: Record<string, Record<string, any>> = {};
      const summaries: FamilySummary[] = [];

      await Promise.all(
        ids.map(async (id) => {
          const data = await getAllFamilyData(id);
          allData[id] = data;
          summaries.push(computeFamilySummary(id, data));
        })
      );

      return { summaries, allData };
    },
    staleTime: 60000,
  });
}
