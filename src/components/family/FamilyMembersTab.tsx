import type { FamilyData } from "@/lib/types";
import { getLevel, getLevelProgress } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  data: FamilyData;
}

export default function FamilyMembersTab({ data }: Props) {
  const members = data.config?.family ?? {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(members).map(([id, member]) => {
        const xp = data.xp[id] ?? 0;
        const level = getLevel(xp);
        const progress = getLevelProgress(xp);
        const streak = data.streaks[id] ?? 0;
        const badgeCount = (data.earnedBadges[id] ?? []).length;
        const approved = data.approvedCount[id] ?? 0;
        const avatarEmoji = data.avatars[id] || member.emoji;

        return (
          <Card key={id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{avatarEmoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <Badge
                      variant={
                        member.role === "parent" ? "default" : "secondary"
                      }
                    >
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      Weekly pay: {member.weeklyPay} XP
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            {member.role === "child" && (
              <CardContent className="space-y-3">
                {/* Level & XP */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {level.emoji} {level.name}
                    </span>
                    <span className="text-muted-foreground">
                      {xp.toLocaleString()} XP
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {progress}% to next level
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold">{streak}</p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold">{badgeCount}</p>
                    <p className="text-xs text-muted-foreground">Badges</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold">{approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
