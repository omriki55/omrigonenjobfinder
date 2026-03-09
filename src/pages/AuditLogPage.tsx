import { useState, useMemo } from "react";
import { useFamilies } from "@/hooks/use-families";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AUDIT_LABELS } from "@/lib/constants";
import { timeAgo, formatDateTime } from "@/lib/date-utils";
import { exportToCSV } from "@/lib/csv-export";
import { Search, FileDown } from "lucide-react";
import type { FamilyConfig } from "@/lib/types";

interface MergedAuditEntry {
  ts: number;
  familyName: string;
  familyId: string;
  by: string;
  action: string;
  details: string;
}

export default function AuditLogPage() {
  const { data, isLoading } = useFamilies();
  const [search, setSearch] = useState("");

  // Merge all audit logs from all families
  const allEntries = useMemo(() => {
    if (!data) return [];
    const { allData } = data;
    const entries: MergedAuditEntry[] = [];

    Object.entries(allData).forEach(([fid, fd]) => {
      const config = fd["family-config"] as FamilyConfig | null;
      const familyName = config?.familyName || fid;
      const log = (fd.auditLog || []) as any[];

      log.forEach((entry: any) => {
        entries.push({
          ts: entry.ts || 0,
          familyName,
          familyId: fid,
          by: entry.by || "?",
          action: entry.action || "unknown",
          details: entry.details || entry.title || entry.taskTitle || "",
        });
      });
    });

    entries.sort((a, b) => b.ts - a.ts);
    return entries;
  }, [data]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return allEntries;
    const q = search.toLowerCase();
    return allEntries.filter(
      (e) =>
        e.familyName.toLowerCase().includes(q) ||
        e.by.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (AUDIT_LABELS[e.action] || "").toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q)
    );
  }, [allEntries, search]);

  const handleExport = () => {
    const headers = ["Timestamp", "Family", "User", "Action", "Details"];
    const rows = filtered.map((e) => [
      e.ts ? formatDateTime(e.ts) : "",
      e.familyName,
      e.by,
      AUDIT_LABELS[e.action] || e.action,
      e.details,
    ]);
    exportToCSV(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (isLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <Badge variant="outline" className="text-xs">
            {filtered.length} entries
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by family, user, action, or details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {search ? "No entries match your search" : "No audit log entries found"}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((entry, i) => (
                  <TableRow key={`${entry.ts}-${entry.familyId}-${i}`}>
                    <TableCell className="text-xs whitespace-nowrap">
                      <div>{entry.ts ? formatDateTime(entry.ts) : "---"}</div>
                      <div className="text-muted-foreground">{entry.ts ? timeAgo(entry.ts) : ""}</div>
                    </TableCell>
                    <TableCell className="font-medium">{entry.familyName}</TableCell>
                    <TableCell>{entry.by}</TableCell>
                    <TableCell>
                      <span className="text-lg mr-1.5">
                        {AUDIT_LABELS[entry.action]?.split(" ")[0] || "\uD83D\uDCCB"}
                      </span>
                      <span className="text-sm">
                        {AUDIT_LABELS[entry.action]?.split(" ").slice(1).join(" ") || entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {entry.details}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
