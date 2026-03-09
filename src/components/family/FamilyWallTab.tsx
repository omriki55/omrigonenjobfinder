import { useMemo } from "react";
import type { FamilyData } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface Props {
  data: FamilyData;
}

const TYPE_COLORS: Record<string, string> = {
  praise: "bg-green-100 text-green-800 border-green-200",
  bonus: "bg-yellow-100 text-yellow-800 border-yellow-200",
  system: "bg-gray-100 text-gray-800 border-gray-200",
  nudge: "bg-blue-100 text-blue-800 border-blue-200",
  free: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function FamilyWallTab({ data }: Props) {
  const members = data.config?.family ?? {};

  const grouped = useMemo(() => {
    const sorted = [...data.messages].sort((a, b) => b.ts - a.ts);
    const groups: Record<string, typeof sorted> = {};
    for (const msg of sorted) {
      const dateKey = formatDate(msg.ts);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    }
    return groups;
  }, [data.messages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-4 w-4" />
          Family Wall ({data.messages.length} messages)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, messages]) => (
              <div key={dateLabel}>
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2">
                    {dateLabel}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const sender = members[msg.from];
                    const typeClass =
                      TYPE_COLORS[msg.type ?? "free"] ?? TYPE_COLORS.free;
                    return (
                      <div
                        key={msg.id}
                        className="flex gap-3 rounded-lg border p-3"
                      >
                        <span className="text-xl shrink-0">
                          {sender?.emoji ?? "?"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {sender?.name ?? msg.from}
                            </span>
                            {msg.type && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${typeClass}`}
                              >
                                {msg.type}
                              </Badge>
                            )}
                            {msg.photo && (
                              <span className="text-xs" title="Has photo">
                                {"\uD83D\uDCF7"}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatTime(msg.ts)}
                            </span>
                          </div>
                          <p className="text-sm mt-1 text-muted-foreground">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
