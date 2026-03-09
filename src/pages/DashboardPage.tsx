import { useFamilies } from "@/hooks/use-families";
import StatCard from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Baby, CheckCircle, Zap, Trophy, Activity } from "lucide-react";
import { AUDIT_LABELS } from "@/lib/constants";
import { timeAgo, isThisWeek } from "@/lib/date-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["hsl(262,83%,58%)", "hsl(173,58%,39%)", "hsl(43,74%,66%)", "hsl(27,87%,67%)", "hsl(197,37%,24%)"];

export default function DashboardPage() {
  const { data, isLoading } = useFamilies();

  if (isLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );

  const { summaries = [], allData = {} } = data || {};

  // Compute KPIs
  const totalFamilies = summaries.length;
  const totalChildren = summaries.reduce((s, f) => s + f.childCount, 0);
  const activeFamilies = summaries.filter((f) => f.isActive).length;
  const totalXp = summaries.reduce((s, f) => s + f.totalXp, 0);

  // Tasks completed this week
  let weekTasksDone = 0;
  let weekTasksTotal = 0;
  Object.values(allData).forEach((fd: any) => {
    const completions = fd?.completions || {};
    Object.entries(completions).forEach(([, val]: [string, any]) => {
      if (val?.ts && isThisWeek(val.ts)) {
        weekTasksTotal++;
        if (val.done) weekTasksDone++;
      }
    });
  });

  const avgCompletion = summaries.length > 0
    ? Math.round(summaries.reduce((s, f) => s + f.weeklyCompletionPct, 0) / summaries.length)
    : 0;

  // Recent activity across all families
  const allActivity: Array<{ family: string; action: string; ts: number; by: string }> = [];
  Object.entries(allData).forEach(([fid, fd]: [string, any]) => {
    const config = fd?.["family-config"];
    const familyName = config?.familyName || fid;
    const log = fd?.auditLog || [];
    log.forEach((entry: any) => {
      allActivity.push({
        family: familyName,
        action: entry.action,
        ts: entry.ts,
        by: entry.by || "?",
      });
    });
  });
  allActivity.sort((a, b) => b.ts - a.ts);
  const recentActivity = allActivity.slice(0, 20);

  // XP per family chart data
  const xpChartData = summaries
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, 10)
    .map((f) => ({ name: f.familyName, xp: f.totalXp }));

  // Task type distribution
  let personalCount = 0, sharedCount = 0, bonusCount = 0;
  Object.values(allData).forEach((fd: any) => {
    (fd?.tasks || []).forEach((t: any) => {
      if (t.bonus) bonusCount++;
      else if (t.type === "personal") personalCount++;
      else sharedCount++;
    });
  });
  const taskTypeData = [
    { name: "Personal", value: personalCount },
    { name: "Shared", value: sharedCount },
    { name: "Bonus", value: bonusCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge variant="outline" className="text-xs">
          Live Data
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Families" value={totalFamilies} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Children" value={totalChildren} icon={<Baby className="h-5 w-5" />} />
        <StatCard title="Tasks Done This Week" value={weekTasksDone} icon={<CheckCircle className="h-5 w-5" />}
          description={`out of ${weekTasksTotal} tasks`} />
        <StatCard title="Active Families" value={activeFamilies} icon={<Activity className="h-5 w-5" />}
          description="Active in last 7 days" />
        <StatCard title="Total XP Distributed" value={totalXp.toLocaleString()} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="Avg Completion Rate" value={`${avgCompletion}%`} icon={<Trophy className="h-5 w-5" />} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP per family */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XP by Family</CardTitle>
          </CardHeader>
          <CardContent>
            {xpChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={xpChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="xp" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Task type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {taskTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={taskTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={5} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {taskTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                  <span className="text-lg shrink-0">
                    {AUDIT_LABELS[entry.action]?.split(" ")[0] || "📋"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{entry.family}</span>
                      {" — "}
                      {AUDIT_LABELS[entry.action]?.split(" ").slice(1).join(" ") || entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground">by {entry.by}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(entry.ts)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No activity recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
