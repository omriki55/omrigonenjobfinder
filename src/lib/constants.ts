export const LEVELS = [
  { name: "מתחיל", emoji: "🌱", min: 0 },
  { name: "חרוץ", emoji: "💪", min: 100 },
  { name: "מסודר", emoji: "📋", min: 250 },
  { name: "אחראי", emoji: "🎯", min: 500 },
  { name: "כוכב", emoji: "⭐", min: 800 },
  { name: "גיבור", emoji: "🦸", min: 1200 },
  { name: "מקצוען", emoji: "🏅", min: 1700 },
  { name: "מאסטר", emoji: "🎓", min: 2300 },
  { name: "מומחה", emoji: "💎", min: 3000 },
  { name: "אלוף", emoji: "🏆", min: 4000 },
  { name: "נינג'ה", emoji: "🥷", min: 5200 },
  { name: "סופר-סטאר", emoji: "🌟", min: 6500 },
  { name: "מלך/מלכה", emoji: "👑", min: 8000 },
  { name: "אגדה", emoji: "🐉", min: 10000 },
  { name: "אלוף העולם", emoji: "🌍", min: 13000 },
];

export const AUDIT_LABELS: Record<string, string> = {
  task_done: "✅ ביצוע משימה",
  approved: "👍 אישור",
  rejected: "❌ דחייה",
  penalty_added: "⚠️ קנס",
  task_created: "✨ יצירת משימה",
  task_deleted: "🗑️ מחיקת משימה",
  task_updated: "✏️ עדכון משימה",
  pin_changed: "🔒 שינוי PIN",
  bonus_submitted: "⭐ יוזמה",
  swap_requested: "🔄 בקשת החלפה",
  swap_approved: "🔄 החלפה אושרה",
  swap_rejected: "❌ החלפה נדחתה",
  exam_added: "📝 מבחן",
  cal_event_added: "📅 אירוע חדש",
  cal_event_deleted: "🗑️ מחיקת אירוע",
};

export const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const DS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export function getLevel(xp: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) level = l;
    else break;
  }
  return level;
}

export function getLevelIndex(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
    else break;
  }
  return idx;
}

export function getLevelProgress(xp: number) {
  const idx = getLevelIndex(xp);
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1];
  if (!next) return 100;
  return Math.round(((xp - current.min) / (next.min - current.min)) * 100);
}
