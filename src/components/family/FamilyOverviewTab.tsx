import { useMemo } from "react";
import type { FamilyData } from "@/lib/types";
import { getLevel } from "@/lib/constants";
import { timeAgo, getWeekNumber } from "@/lib/date-utils";
import StatCard from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Flame, ListChecks, MessageSquare } from "lucide-react";

interface Props {
  data: FamilyData;
}

export default function FamilyOverviewTab({ data }: Props) {
  const members = data.config?.family ?? {};
  const children = data.config?.children ?? [];
  const currentWeek = getWeekNumber();

  const weeklyCompletionPct = useMemo(() => {
    const weekCompletions = Object.entries(data.completions).filter(([key]) =>
      key.startsWith(currentWeek)
    );
    if (weekCompletions.length === 0) return 0;
    const doneCount = weekCompletions.filter(([, c]) => c.done).length;
    return Math.round((doneCount / weekCompletions.length) * 100);
  }, [data.completions, currentWeek]);

  const totalXp = useMemo(
    () => Object.values(data.xp).reduce((sum, v) => sum + (v || 0), 0),
    [data.xp]
  );

  const familyStreak = useMemo(
    () =>
      children.length > 0
        ? Math.min(...children.map((c) => data.streaks[c] ?? 0))
        : 0,
    [data.streaks, children]
  );

  const recentMessages = useMemo(
    () =>
      [...data.messages]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 5),
    [data.messages]
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Weekly Completion"
          value={`${weeklyCompletionPct}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Total XP"
          value={totalXp.toLocaleString()}
          icon={<Star className="h-5 w-5" />}
        />
        <StatCard
          title="Family Streak"
          value={`${familyStreak} days`}
          icon={<Flame className="h-5 w-5" />}
        />
        <StatCard
          title="Total Tasks"
          value={data.tasks.length}
          icon={<ListChecks className="h-5 w-5" />}
        />
      </div>

      {/* Member Mini Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Family Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(members).map(([id, member]) => {
              const level = getLevel(data.xp[id] ?? 0);
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span className="text-2xl">
                    {data.avatars[id] || member.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {member.name}
                      </span>
                      <Badge
                        variant={
                          member.role === "parent" ? "default" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {member.role}
                      </Badge>
                    </div>
                    {member.role === "child" && (
                      <div className="text-xs text-muted-foreground">
                        {level.emoji} {level.name} &middot;{" "}
                        {(data.xp[id] ?? 0).toLocaleString()} XP
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-4 w-4" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {recentMessages.map((msg) => {
                const sender = members[msg.from];
                return (
                  <div key={msg.id} className="flex gap-3 text-sm">
                    <span className="text-lg shrink-0">
                      {sender?.emoji ?? "?"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {sender?.name ?? msg.from}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(msg.ts)}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
