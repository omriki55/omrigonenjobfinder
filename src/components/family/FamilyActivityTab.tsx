import { useMemo, useState } from "react";
import type { FamilyData } from "@/lib/types";
import { AUDIT_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

interface Props {
  data: FamilyData;
}

export default function FamilyActivityTab({ data }: Props) {
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...data.auditLog].sort((a, b) => b.ts - a.ts),
    [data.auditLog]
  );

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (entry) =>
        (entry.action && entry.action.toLowerCase().includes(q)) ||
        (entry.by && entry.by.toLowerCase().includes(q)) ||
        (entry.details && entry.details.toLowerCase().includes(q)) ||
        (AUDIT_LABELS[entry.action] &&
          AUDIT_LABELS[entry.action].toLowerCase().includes(q))
    );
  }, [sorted, search]);

  const displayed = filtered.slice(0, 500);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Audit Log ({filtered.length} entries)
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Timestamp</TableHead>
              <TableHead className="w-48">Action</TableHead>
              <TableHead className="w-32">User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((entry, i) => (
              <TableRow key={entry.id ?? i}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {entry.ts ? formatDateTime(entry.ts) : ""}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {AUDIT_LABELS[entry.action] ?? entry.action}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{entry.by}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {entry.details ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 500 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing 500 of {filtered.length} entries
          </p>
        )}
      </CardContent>
    </Card>
  );
}
