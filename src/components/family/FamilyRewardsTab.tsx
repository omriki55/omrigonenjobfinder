import type { FamilyData } from "@/lib/types";
import { formatDateTime } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, ShoppingBag } from "lucide-react";

interface Props {
  data: FamilyData;
}

export default function FamilyRewardsTab({ data }: Props) {
  const members = data.config?.family ?? {};
  const children = data.config?.children ?? [];

  return (
    <div className="space-y-6">
      {/* XP Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {children.map((id) => {
          const member = members[id];
          const total = data.xp[id] ?? 0;
          const spent = data.spentXp[id] ?? 0;
          const balance = total - spent;
          return (
            <Card key={id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{member?.emoji ?? "?"}</span>
                  <span className="font-medium text-sm">
                    {member?.name ?? id}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Total XP:</span>
                    <span>{total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spent:</span>
                    <span>{spent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground">
                    <span>Balance:</span>
                    <span>{balance.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reward Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-4 w-4" />
            Reward Catalog ({data.rewards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Icon</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Cost (XP)</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rewards.map((reward) => (
                <TableRow key={reward.id}>
                  <TableCell className="text-lg">{reward.icon}</TableCell>
                  <TableCell className="font-medium">{reward.title}</TableCell>
                  <TableCell>{reward.cost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={reward.active ? "default" : "secondary"}
                    >
                      {reward.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.rewards.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No rewards configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-4 w-4" />
            Purchase History ({data.purchaseHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead className="w-24">Cost (XP)</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-44">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.purchaseHistory]
                .sort((a, b) => b.ts - a.ts)
                .map((purchase) => {
                  const child = members[purchase.childId];
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {child?.emoji ?? ""} {child?.name ?? purchase.childId}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {purchase.rewardTitle ?? purchase.rewardId}
                      </TableCell>
                      <TableCell>{purchase.cost.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            purchase.status === "fulfilled"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            purchase.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : ""
                          }
                        >
                          {purchase.status ?? "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {purchase.ts ? formatDateTime(purchase.ts) : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              {data.purchaseHistory.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No purchases yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
