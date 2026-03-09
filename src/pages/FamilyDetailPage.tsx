import { useParams, useNavigate } from "react-router-dom";
import { useFamilyData } from "@/hooks/use-family-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import FamilyOverviewTab from "@/components/family/FamilyOverviewTab";
import FamilyMembersTab from "@/components/family/FamilyMembersTab";
import FamilyTasksTab from "@/components/family/FamilyTasksTab";
import FamilyCompletionsTab from "@/components/family/FamilyCompletionsTab";
import FamilyAnalyticsTab from "@/components/family/FamilyAnalyticsTab";
import FamilyActivityTab from "@/components/family/FamilyActivityTab";
import FamilyWallTab from "@/components/family/FamilyWallTab";
import FamilyRewardsTab from "@/components/family/FamilyRewardsTab";
import FamilyChallengesTab from "@/components/family/FamilyChallengesTab";

export default function FamilyDetailPage() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useFamilyData(familyId);

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (error || !data) return (
    <div className="text-center py-12">
      <p className="text-lg text-muted-foreground">Family not found or failed to load</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/families")}>Back to Families</Button>
    </div>
  );

  const { config } = data;
  const familyName = config?.familyName || familyId || "Unknown";
  const members = config?.family ? Object.entries(config.family) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/families")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{familyName}</h1>
            <Badge variant="outline" className="text-xs">
              <code>{familyId}</code>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {members.length} members · {members.map(([, m]) => m.emoji).join(" ")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="completions">Completions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="wall">Wall</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><FamilyOverviewTab data={data} /></TabsContent>
        <TabsContent value="members"><FamilyMembersTab data={data} /></TabsContent>
        <TabsContent value="tasks"><FamilyTasksTab data={data} /></TabsContent>
        <TabsContent value="completions"><FamilyCompletionsTab data={data} /></TabsContent>
        <TabsContent value="analytics"><FamilyAnalyticsTab data={data} /></TabsContent>
        <TabsContent value="activity"><FamilyActivityTab data={data} /></TabsContent>
        <TabsContent value="wall"><FamilyWallTab data={data} /></TabsContent>
        <TabsContent value="rewards"><FamilyRewardsTab data={data} /></TabsContent>
        <TabsContent value="challenges"><FamilyChallengesTab data={data} /></TabsContent>
      </Tabs>
    </div>
  );
}
