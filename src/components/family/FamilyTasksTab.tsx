import { useMemo } from "react";
import type { FamilyData } from "@/lib/types";
import { DS } from "@/lib/constants";
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
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: FamilyData;
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function FamilyTasksTab({ data }: Props) {
  const members = data.config?.family ?? {};
  const children = data.config?.children ?? [];

  const pieData = useMemo(
    () =>
      data.tasks.map((t) => ({
        name: `${t.icon} ${t.title}`,
        value: t.weight,
      })),
    [data.tasks]
  );

  const barData = useMemo(() => {
    return children.map((childId) => {
      const name = members[childId]?.name ?? childId;
      const count = data.tasks.filter((t) =>
        t.assignedTo.includes(childId)
      ).length;
      return { name, tasks: count };
    });
  }, [data.tasks, children, members]);

  return (
    <div className="space-y-6">
      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            All Tasks ({data.tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Icon</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-20">Weight</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-32">Active Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="text-lg">{task.icon}</TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.weight}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.type === "shared" ? "default" : "secondary"
                      }
                    >
                      {task.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {task.assignedTo.map((id) => (
                        <span key={id} className="text-xs">
                          {members[id]?.emoji ?? ""} {members[id]?.name ?? id}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.activeDays
                      ? task.activeDays.map((d) => DS[d]).join(", ")
                      : "All"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weight Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }: any) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasks per Child</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
