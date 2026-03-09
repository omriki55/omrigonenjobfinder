export interface FamilyMember {
  name: string;
  role: "parent" | "child";
  emoji: string;
  color: string;
  weeklyPay: number;
}

export interface FamilyConfig {
  family: Record<string, FamilyMember>;
  children: string[];
  pins: Record<string, string>;
  familyName: string;
  familyId: string;
}

export interface Task {
  id: string;
  title: string;
  icon: string;
  weight: number;
  assignedTo: string[];
  bonus: boolean;
  type: "personal" | "shared";
  requirePhoto?: boolean;
  activeDays?: number[] | null;
  recurrence?: string;
  skippedDates?: string[];
  timeLimit?: number | null;
}

export interface Completion {
  done: boolean;
  approved?: boolean;
  approvedBy?: string;
  photo?: string | null;
  ts: number;
  timerBonus?: number;
}

export interface AuditEntry {
  id?: string;
  action: string;
  by: string;
  ts: number;
  details?: string;
  [key: string]: any;
}

export interface Message {
  id: string;
  from: string;
  to?: string;
  text: string;
  type?: "praise" | "bonus" | "system" | "nudge" | "free";
  ts: number;
  reactions?: Record<string, string>;
  photo?: string;
  star?: string;
}

export interface Penalty {
  id: string;
  childId: string;
  title: string;
  icon: string;
  xp: number;
  ts: number;
  by?: string;
}

export interface EarnedBadge {
  id: string;
  ts: number;
}

export interface Reward {
  id: string;
  title: string;
  icon: string;
  cost: number;
  active: boolean;
}

export interface Purchase {
  id: string;
  rewardId: string;
  rewardTitle?: string;
  childId: string;
  cost: number;
  ts: number;
  status?: "pending" | "fulfilled";
}

export interface Challenge {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  type: "family" | "individual";
  condition: string;
  value: number;
  xpReward: number;
  week?: string;
}

export interface ChildReminder {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
}

export interface FamilyData {
  config: FamilyConfig | null;
  tasks: Task[];
  completions: Record<string, Completion>;
  xp: Record<string, number>;
  totalXpEarned: Record<string, number>;
  streaks: Record<string, number>;
  approvedCount: Record<string, number>;
  earnedBadges: Record<string, EarnedBadge[]>;
  messages: Message[];
  penalties: Penalty[];
  auditLog: AuditEntry[];
  challenges: Challenge[];
  customChallenges: Challenge[];
  rewards: Reward[];
  purchaseHistory: Purchase[];
  groceries: any[];
  calEvents: any[];
  exams: any[];
  goals: any[];
  avatars: Record<string, string>;
  childReminders: Record<string, ChildReminder[]>;
  locations: Record<string, any>;
  taskTemplates: any[];
  swaps: any[];
  spentXp: Record<string, number>;
}

export interface FamilySummary {
  familyId: string;
  familyName: string;
  memberCount: number;
  childCount: number;
  totalTasks: number;
  weeklyCompletionPct: number;
  totalXp: number;
  lastActivity: number | null;
  isActive: boolean;
  registeredAt?: string;
}
