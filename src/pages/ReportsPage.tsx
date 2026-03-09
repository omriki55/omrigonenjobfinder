import { useState, useMemo } from "react";
import { useFamilies } from "@/hooks/use-families";
import { useFamilyData } from "@/hooks/use-family-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToCSV } from "@/lib/csv-export";
import { formatDateTime } from "@/lib/date-utils";
import { FileDown, FileText } from "lucide-react";
import type { FamilyConfig, Completion } from "@/lib/types";

type ReportType = "weekly" | "monthly" | "child-progress" | "all-completions";

interface ReportRow {
  [key: string]: string | number;
}

export default function ReportsPage() {
  const { data: familiesData, isLoading: familiesLoading } = useFamilies();
  const [reportType, setReportType] = useState<ReportType>("weekly");
  const [selectedFamily, setSelectedFamily] = useState<string>("__all__");
  const [generated, setGenerated] = useState(false);

  const summaries = familiesData?.summaries || [];
  const allData = familiesData?.allData || {};

  // Load single family data if a specific family is selected
  const singleFamilyQuery = useFamilyData(
    selectedFamily !== "__all__" ? selectedFamily : undefined
  );

  const isLoading = familiesLoading || (selectedFamily !== "__all__" && singleFamilyQuery.isLoading);

  // Compute report data
  const { headers, rows } = useMemo(() => {
    if (!generated) return { headers: [] as string[], rows: [] as ReportRow[] };

    const familyIds = selectedFamily === "__all__"
      ? Object.keys(allData)
      : [selectedFamily];

    const targetData: Record<string, Record<string, any>> = {};
    for (const fid of familyIds) {
      if (allData[fid]) targetData[fid] = allData[fid];
    }

    if (reportType === "weekly") {
      // Weekly Summary: per-child completion count, XP earned, streaks
      const h = ["Family", "Child", "Tasks Completed", "XP", "Streak"];
      const r: ReportRow[] = [];

      for (const [fid, fd] of Object.entries(targetData)) {
        const config = fd["family-config"] as FamilyConfig | null;
        const familyName = config?.familyName || fid;
        const children = config?.children || [];
        const xp = (fd.xp || {}) as Record<string, number>;
        const streaks = (fd.streaks || {}) as Record<string, number>;
        const completions = (fd.completions || {}) as Record<string, Completion>;

        for (const childId of children) {
          const childName = config?.family?.[childId]?.name || childId;
          let tasksDone = 0;
          Object.entries(completions).forEach(([key, val]) => {
            if (key.includes(childId) && val.done) tasksDone++;
          });
          r.push({
            Family: familyName,
            Child: childName,
            "Tasks Completed": tasksDone,
            XP: xp[childId] || 0,
            Streak: streaks[childId] || 0,
          });
        }
      }
      return { headers: h, rows: r };
    }

    if (reportType === "monthly") {
      // Monthly Performance: weekly trends per family
      const h = ["Family", "Total Tasks", "Completion %", "Total XP", "Active Members", "Status"];
      const r: ReportRow[] = [];

      for (const summary of summaries) {
        if (selectedFamily !== "__all__" && summary.familyId !== selectedFamily) continue;
        r.push({
          Family: summary.familyName,
          "Total Tasks": summary.totalTasks,
          "Completion %": `${summary.weeklyCompletionPct}%`,
          "Total XP": summary.totalXp,
          "Active Members": summary.memberCount,
          Status: summary.isActive ? "Active" : "Inactive",
        });
      }
      return { headers: h, rows: r };
    }

    if (reportType === "child-progress") {
      // Child Progress: detailed per-child view
      const h = ["Family", "Child", "Role", "XP", "Streak", "Tasks Done", "Approved Count"];
      const r: ReportRow[] = [];

      for (const [fid, fd] of Object.entries(targetData)) {
        const config = fd["family-config"] as FamilyConfig | null;
        const familyName = config?.familyName || fid;
        const children = config?.children || [];
        const xp = (fd.xp || {}) as Record<string, number>;
        const streaks = (fd.streaks || {}) as Record<string, number>;
        const approvedCount = (fd.approvedCount || {}) as Record<string, number>;
        const completions = (fd.completions || {}) as Record<string, Completion>;

        for (const childId of children) {
          const member = config?.family?.[childId];
          let tasksDone = 0;
          Object.entries(completions).forEach(([key, val]) => {
            if (key.includes(childId) && val.done) tasksDone++;
          });
          r.push({
            Family: familyName,
            Child: member?.name || childId,
            Role: member?.role || "child",
            XP: xp[childId] || 0,
            Streak: streaks[childId] || 0,
            "Tasks Done": tasksDone,
            "Approved Count": approvedCount[childId] || 0,
          });
        }
      }
      return { headers: h, rows: r };
    }

    if (reportType === "all-completions") {
      // All Completions: raw completion data
      const h = ["Family", "Key", "Done", "Approved", "Approved By", "Timestamp", "Timer Bonus"];
      const r: ReportRow[] = [];

      for (const [fid, fd] of Object.entries(targetData)) {
        const config = fd["family-config"] as FamilyConfig | null;
        const familyName = config?.familyName || fid;
        const completions = (fd.completions || {}) as Record<string, Completion>;

        Object.entries(completions).forEach(([key, val]) => {
          r.push({
            Family: familyName,
            Key: key,
            Done: val.done ? "Yes" : "No",
            Approved: val.approved ? "Yes" : "No",
            "Approved By": val.approvedBy || "",
            Timestamp: val.ts ? formatDateTime(val.ts) : "",
            "Timer Bonus": val.timerBonus || 0,
          });
        });
      }

      r.sort((a, b) => {
        const tsA = String(a.Timestamp);
        const tsB = String(b.Timestamp);
        return tsB.localeCompare(tsA);
      });

      return { headers: h, rows: r };
    }

    return { headers: [], rows: [] };
  }, [generated, reportType, selectedFamily, allData, summaries]);

  const handleGenerate = () => {
    setGenerated(true);
  };

  const handleExport = () => {
    if (headers.length === 0 || rows.length === 0) return;
    const csvRows = rows.map((row) => headers.map((h) => row[h]));
    const reportNames: Record<ReportType, string> = {
      weekly: "weekly-summary",
      monthly: "monthly-performance",
      "child-progress": "child-progress",
      "all-completions": "all-completions",
    };
    exportToCSV(`${reportNames[reportType]}-${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows);
  };

  if (familiesLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Report Type */}
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Report Type</label>
              <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setGenerated(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="monthly">Monthly Performance</SelectItem>
                  <SelectItem value="child-progress">Child Progress</SelectItem>
                  <SelectItem value="all-completions">All Completions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Family Selector */}
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Family</label>
              <Select value={selectedFamily} onValueChange={(v) => { setSelectedFamily(v); setGenerated(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Families</SelectItem>
                  {summaries.map((f) => (
                    <SelectItem key={f.familyId} value={f.familyId}>
                      {f.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={isLoading}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {generated && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Report Preview</CardTitle>
              <Badge variant="outline" className="text-xs">{rows.length} rows</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data available for this report</p>
            ) : (
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell key={h}>{String(row[h] ?? "")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
