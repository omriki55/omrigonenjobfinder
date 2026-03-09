import { useFamilies } from "@/hooks/use-families";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function AnalyticsPage() {
  const { data, isLoading } = useFamilies();

  if (isLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-80" />)}
      </div>
    </div>
  );

  const { summaries = [], allData = {} } = data || {};

  // --- Completion Rates by Family ---
  const completionData = summaries
    .map((f) => ({ name: f.familyName, completion: f.weeklyCompletionPct }))
    .sort((a, b) => b.completion - a.completion);

  // --- XP Distribution ---
  const xpData = summaries
    .map((f) => ({ name: f.familyName, xp: f.totalXp }))
    .sort((a, b) => b.xp - a.xp);

  // --- Task Volume ---
  const taskVolumeData = summaries
    .map((f) => ({ name: f.familyName, tasks: f.totalTasks }))
    .sort((a, b) => b.tasks - a.tasks);

  // --- Activity Status ---
  const activeFamilies = summaries.filter((f) => f.isActive).length;
  const inactiveFamilies = summaries.length - activeFamilies;
  const activityData = [
    { name: "Active", value: activeFamilies },
    { name: "Inactive", value: inactiveFamilies },
  ].filter((d) => d.value > 0);

  // --- Feature Usage ---
  const featureUsage = summaries.map((f) => {
    const fd = allData[f.familyId] || {};
    return {
      familyName: f.familyName,
      hasRewards: (fd.rewards || []).length > 0,
      hasChallenges: (fd.challenges || []).length > 0 || (fd.customChallenges || []).length > 0,
      hasCalendarEvents: (fd.calEvents || []).length > 0,
      hasGroceryList: (fd.groceries || []).length > 0,
      hasCustomChallenges: (fd.customChallenges || []).length > 0,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rates by Family */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion Rates by Family</CardTitle>
          </CardHeader>
          <CardContent>
            {completionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(250, completionData.length * 40)}>
                <BarChart data={completionData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Bar dataKey="completion" fill="hsl(262,83%,58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* XP Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XP Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {xpData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={xpData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="xp" fill="hsl(173,58%,39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Task Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {taskVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={taskVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="hsl(43,74%,66%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Status</CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={activityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {activityData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(173,58%,39%)" : "hsl(0,0%,70%)"} />
                    ))}
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

      {/* Feature Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Usage</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family</TableHead>
                <TableHead className="text-center">Rewards</TableHead>
                <TableHead className="text-center">Challenges</TableHead>
                <TableHead className="text-center">Calendar Events</TableHead>
                <TableHead className="text-center">Grocery List</TableHead>
                <TableHead className="text-center">Custom Challenges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureUsage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No families found
                  </TableCell>
                </TableRow>
              ) : featureUsage.map((f) => (
                <TableRow key={f.familyName}>
                  <TableCell className="font-medium">{f.familyName}</TableCell>
                  <TableCell className="text-center text-lg">{f.hasRewards ? "\u2705" : "\u274C"}</TableCell>
                  <TableCell className="text-center text-lg">{f.hasChallenges ? "\u2705" : "\u274C"}</TableCell>
                  <TableCell className="text-center text-lg">{f.hasCalendarEvents ? "\u2705" : "\u274C"}</TableCell>
                  <TableCell className="text-center text-lg">{f.hasGroceryList ? "\u2705" : "\u274C"}</TableCell>
                  <TableCell className="text-center text-lg">{f.hasCustomChallenges ? "\u2705" : "\u274C"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
