import { useQuery } from "@tanstack/react-query";
import {
  getAllFamilyData, getFamilyRegistry, registerFamily,
  discoverFromLegacy, getLegacyFamilyData,
} from "@/lib/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FamilySummary, FamilyConfig, Completion } from "@/lib/types";

// Special marker for data that lives in the legacy "family-chores" collection
const LEGACY_FAMILY_ID = "__legacy__";

async function discoverFamilyIds(): Promise<string[]> {
  const found: string[] = [];

  // 1. Try registry first
  const registry = await getFamilyRegistry();
  if (registry.length > 0) {
    found.push(...registry.map((r) => r.familyId));
  }

  // 2. Scan families collection for parent docs
  if (found.length === 0) {
    try {
      const colRef = collection(db, "families");
      const snapshot = await getDocs(colRef);
      snapshot.forEach((d) => {
        if (!found.includes(d.id)) found.push(d.id);
      });
    } catch {}
  }

  // 3. Check legacy "family-chores" collection for family-config
  if (found.length === 0) {
    try {
      const legacy = await discoverFromLegacy();
      if (legacy.familyId) {
        // Found a familyId in legacy collection — data should be in families/{id}/data/
        // Auto-register it for future use
        try {
          await registerFamily(legacy.familyId, {
            familyName: legacy.familyName || legacy.familyId,
            autoDiscovered: true,
            source: "legacy",
          });
        } catch {}
        found.push(legacy.familyId);
      } else if (legacy.hasLegacyData) {
        // Data in legacy collection but no familyId — use special marker
        found.push(LEGACY_FAMILY_ID);
      }
    } catch {}
  }

  // 4. Even if we found families in the registry, also check if there's legacy data
  //    that isn't covered by any registered family
  if (found.length > 0 && !found.includes(LEGACY_FAMILY_ID)) {
    try {
      const legacy = await discoverFromLegacy();
      if (legacy.hasLegacyData && legacy.familyId && !found.includes(legacy.familyId)) {
        try {
          await registerFamily(legacy.familyId, {
            familyName: legacy.familyName || legacy.familyId,
            autoDiscovered: true,
            source: "legacy",
          });
        } catch {}
        found.push(legacy.familyId);
      }
    } catch {}
  }

  return found;
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

  const displayId = familyId === LEGACY_FAMILY_ID ? "default" : familyId;

  return {
    familyId: displayId,
    familyName: config?.familyName || displayId,
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
          let data: Record<string, any>;
          if (id === LEGACY_FAMILY_ID) {
            data = await getLegacyFamilyData();
          } else {
            data = await getAllFamilyData(id);
            // If no data found in families/{id}/data/, try legacy collection
            if (Object.keys(data).length === 0) {
              data = await getLegacyFamilyData();
            }
          }
          const displayId = id === LEGACY_FAMILY_ID ? "default" : id;
          allData[displayId] = data;
          summaries.push(computeFamilySummary(id, data));
        })
      );

      return { summaries, allData };
    },
    staleTime: 60000,
  });
}
