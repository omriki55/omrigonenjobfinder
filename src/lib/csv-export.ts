export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
  const BOM = "\uFEFF";
  const csv =
    BOM +
    [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
