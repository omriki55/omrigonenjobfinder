import { useMemo } from "react";
import type { FamilyData } from "@/lib/types";
import { DAYS } from "@/lib/constants";
import { getWeekNumber, getDayOfWeek } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: FamilyData;
}

const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function FamilyAnalyticsTab({ data }: Props) {
  const members = data.config?.family ?? {};
  const children = data.config?.children ?? [];
  const currentWeek = getWeekNumber();

  // XP per child
  const xpData = useMemo(
    () =>
      children.map((id, i) => ({
        name: members[id]?.name ?? id,
        xp: data.xp[id] ?? 0,
        color: members[id]?.color ?? CHART_COLORS[i % CHART_COLORS.length],
      })),
    [children, members, data.xp]
  );

  // Completion rate per child for current week
  const completionRateData = useMemo(() => {
    return children.map((id, i) => {
      const entries = Object.entries(data.completions).filter(
        ([key]) => key.startsWith(currentWeek) && key.includes(`_${id}_`)
      );
      const total = entries.length;
      const done = entries.filter(([, c]) => c.done).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        name: members[id]?.name ?? id,
        rate,
        color: members[id]?.color ?? CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [children, members, data.completions, currentWeek]);

  // Streak comparison
  const streakData = useMemo(
    () =>
      children.map((id, i) => ({
        name: members[id]?.name ?? id,
        streak: data.streaks[id] ?? 0,
        color: members[id]?.color ?? CHART_COLORS[i % CHART_COLORS.length],
      })),
    [children, members, data.streaks]
  );

  // Daily distribution of completions
  const dailyData = useMemo(() => {
    const counts = new Array(7).fill(0);
    Object.values(data.completions).forEach((c) => {
      if (c.done && c.ts) {
        const day = getDayOfWeek(c.ts);
        counts[day]++;
      }
    });
    return DAYS.map((name, i) => ({ name, completions: counts[i] }));
  }, [data.completions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* XP per Child */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">XP per Child</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={xpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="xp" radius={[4, 4, 0, 0]}>
                {xpData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Weekly Completion Rate (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={completionRateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {completionRateData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Streak Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Streak Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={streakData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="streak" radius={[4, 4, 0, 0]}>
                {streakData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Completions by Day of Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="completions"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
