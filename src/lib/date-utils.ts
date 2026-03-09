export function getWeekNumber(d: Date = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek) + 1);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("he-IL", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("he-IL", {
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatDateTime(ts: number): string {
  return `${formatDate(ts)} ${formatTime(ts)}`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `לפני ${days} ימים`;
  return formatDate(ts);
}

export function isThisWeek(ts: number): boolean {
  return getWeekNumber(new Date(ts)) === getWeekNumber();
}

export function getDayOfWeek(ts: number): number {
  return new Date(ts).getDay();
}

export function getHourOfDay(ts: number): number {
  return new Date(ts).getHours();
}
