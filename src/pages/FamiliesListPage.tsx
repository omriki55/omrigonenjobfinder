import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFamilies } from "@/hooks/use-families";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Users, ArrowUpDown } from "lucide-react";
import { timeAgo } from "@/lib/date-utils";
import { registerFamily } from "@/lib/firestore";
import { toast } from "sonner";

type SortKey = "familyName" | "memberCount" | "totalXp" | "weeklyCompletionPct" | "lastActivity";

export default function FamiliesListPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useFamilies();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("familyName");
  const [sortAsc, setSortAsc] = useState(true);
  const [newFamilyId, setNewFamilyId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleAddFamily = async () => {
    if (!newFamilyId.trim()) return;
    try {
      await registerFamily(newFamilyId.trim(), { familyName: newFamilyId.trim(), addedManually: true });
      toast.success("Family added to registry");
      setNewFamilyId("");
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast.error("Failed to add family");
    }
  };

  const summaries = data?.summaries || [];
  const filtered = summaries
    .filter((f) => f.familyName.toLowerCase().includes(search.toLowerCase()) || f.familyId.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sortAsc ? cmp : -cmp;
    });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (isLoading) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Families</h1>
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Families</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Family</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family by ID</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Family ID (e.g., ABC123)" value={newFamilyId}
                onChange={(e) => setNewFamilyId(e.target.value)} />
              <Button onClick={handleAddFamily} className="w-full">Add to Registry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search families..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Family" field="familyName" />
                <TableHead>Code</TableHead>
                <SortHeader label="Members" field="memberCount" />
                <TableHead>Tasks</TableHead>
                <SortHeader label="Weekly %" field="weeklyCompletionPct" />
                <SortHeader label="Total XP" field="totalXp" />
                <SortHeader label="Last Activity" field="lastActivity" />
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search ? "No families match your search" : "No families registered"}
                  </TableCell>
                </TableRow>
              ) : filtered.map((f) => (
                <TableRow key={f.familyId} className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/families/${f.familyId}`)}>
                  <TableCell className="font-medium">{f.familyName}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.familyId}</code></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {f.memberCount}
                    </div>
                  </TableCell>
                  <TableCell>{f.totalTasks}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${f.weeklyCompletionPct}%` }} />
                      </div>
                      <span className="text-xs">{f.weeklyCompletionPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{f.totalXp.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {f.lastActivity ? timeAgo(f.lastActivity) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.isActive ? "default" : "secondary"} className="text-xs">
                      {f.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
