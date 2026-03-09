import type { FamilyData, Challenge } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles } from "lucide-react";

interface Props {
  data: FamilyData;
}

function ChallengeCard({
  challenge,
  isCustom,
}: {
  challenge: Challenge;
  isCustom?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{challenge.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{challenge.title}</h4>
              <Badge
                variant={
                  challenge.type === "family" ? "default" : "secondary"
                }
                className="text-[10px]"
              >
                {challenge.type}
              </Badge>
              {isCustom && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-purple-50 text-purple-700 border-purple-200"
                >
                  Custom
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {challenge.desc}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                Condition: <span className="font-medium">{challenge.condition}</span>
              </span>
              <span>
                Reward:{" "}
                <span className="font-medium text-amber-600">
                  {challenge.xpReward} XP
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FamilyChallengesTab({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Built-in Challenges */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4" />
          <h3 className="font-semibold">
            Challenges ({data.challenges.length})
          </h3>
        </div>
        {data.challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No challenges configured.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.challenges.map((ch) => (
              <ChallengeCard key={ch.id} challenge={ch} />
            ))}
          </div>
        )}
      </div>

      {/* Custom Challenges */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" />
          <h3 className="font-semibold">
            Custom Challenges ({data.customChallenges.length})
          </h3>
        </div>
        {data.customChallenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom challenges configured.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.customChallenges.map((ch) => (
              <ChallengeCard key={ch.id} challenge={ch} isCustom />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
