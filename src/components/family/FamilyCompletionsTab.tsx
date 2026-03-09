import { useMemo, useState } from "react";
import type { FamilyData } from "@/lib/types";
import { DAYS } from "@/lib/constants";
import { formatDateTime } from "@/lib/date-utils";
import { exportToCSV } from "@/lib/csv-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search } from "lucide-react";

interface Props {
  data: FamilyData;
}

interface ParsedCompletion {
  key: string;
  week: string;
  taskId: string;
  childId: string;
  day: number;
  taskTitle: string;
  childName: string;
  done: boolean;
  approved: boolean;
  hasPhoto: boolean;
  ts: number;
}

export default function FamilyCompletionsTab({ data }: Props) {
  const [search, setSearch] = useState("");
  const members = data.config?.family ?? {};

  const parsed = useMemo<ParsedCompletion[]>(() => {
    return Object.entries(data.completions).map(([key, c]) => {
      const parts = key.split("_");
      const week = parts[0] ?? "";
      const taskId = parts[1] ?? "";
      const childId = parts[2] ?? "";
      const day = parseInt(parts[3] ?? "0", 10);
      const task = data.tasks.find((t) => t.id === taskId);
      return {
        key,
        week,
        taskId,
        childId,
        day,
        taskTitle: task?.title ?? taskId,
        childName: members[childId]?.name ?? childId,
        done: c.done,
        approved: c.approved ?? false,
        hasPhoto: !!c.photo,
        ts: c.ts,
      };
    });
  }, [data.completions, data.tasks, members]);

  const filtered = useMemo(() => {
    if (!search) return parsed;
    const q = search.toLowerCase();
    return parsed.filter(
      (c) =>
        c.taskTitle.toLowerCase().includes(q) ||
        c.childName.toLowerCase().includes(q) ||
        c.week.includes(q)
    );
  }, [parsed, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.ts - a.ts),
    [filtered]
  );

  const handleExport = () => {
    exportToCSV(
      "completions.csv",
      ["Week", "Task", "Child", "Day", "Done", "Approved", "Photo", "Timestamp"],
      sorted.map((c) => [
        c.week,
        c.taskTitle,
        c.childName,
        DAYS[c.day] ?? c.day,
        c.done ? "Yes" : "No",
        c.approved ? "Yes" : "No",
        c.hasPhoto ? "Yes" : "No",
        c.ts ? formatDateTime(c.ts) : "",
      ])
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Completions ({sorted.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-56"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Child</TableHead>
              <TableHead>Day</TableHead>
              <TableHead className="w-16 text-center">Done</TableHead>
              <TableHead className="w-20 text-center">Approved</TableHead>
              <TableHead className="w-16 text-center">Photo</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, 500).map((c) => (
              <TableRow key={c.key}>
                <TableCell className="font-mono text-xs">{c.week}</TableCell>
                <TableCell>{c.taskTitle}</TableCell>
                <TableCell>{c.childName}</TableCell>
                <TableCell>{DAYS[c.day] ?? c.day}</TableCell>
                <TableCell className="text-center">
                  {c.done ? "\u2705" : "\u274C"}
                </TableCell>
                <TableCell className="text-center">
                  {c.approved ? "\u2705" : "\u274C"}
                </TableCell>
                <TableCell className="text-center">
                  {c.hasPhoto ? "\uD83D\uDCF7" : ""}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.ts ? formatDateTime(c.ts) : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length > 500 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing 500 of {sorted.length} entries
          </p>
        )}
      </CardContent>
    </Card>
  );
}
