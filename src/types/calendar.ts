export type IntentionType = "improve" | "distance" | "maintain" | "gain-clarity";

export type EventType =
  | "active-loop" // Purple - Active conversation loop
  | "scheduled-talk" // Gold - Scheduled high-stakes talk
  | "reflection" // Blue - Reflection logged
  | "emotional-spike"; // Red-orange - Emotional spike day

export interface EventTypeConfig {
  label: string;
  color: string;
  glowColor: string;
  icon: string; // Ionicons name
}

export const EVENT_TYPES: Record<EventType, EventTypeConfig> = {
  "active-loop": {
    label: "Active Loop",
    color: "#A855F7", // Purple
    glowColor: "rgba(168, 85, 247, 0.6)",
    icon: "chatbubbles",
  },
  "scheduled-talk": {
    label: "Scheduled Talk",
    color: "#F59E0B", // Gold/Amber
    glowColor: "rgba(245, 158, 11, 0.6)",
    icon: "calendar",
  },
  "reflection": {
    label: "Reflection",
    color: "#3B82F6", // Blue
    glowColor: "rgba(59, 130, 246, 0.6)",
    icon: "bulb",
  },
  "emotional-spike": {
    label: "Emotional Spike",
    color: "#F97316", // Red-orange
    glowColor: "rgba(249, 115, 22, 0.6)",
    icon: "pulse",
  },
};

export interface IntentionConfig {
  label: string;
  color: string;
  description: string;
}

export const INTENTIONS: Record<IntentionType, IntentionConfig> = {
  improve: {
    label: "Improve",
    color: "#3B82F6", // Blue
    description: "Working to improve the relationship",
  },
  distance: {
    label: "Distance",
    color: "#F97316", // Orange
    description: "Creating healthy distance",
  },
  maintain: {
    label: "Maintain",
    color: "#EAB308", // Yellow
    description: "Maintaining current boundaries",
  },
  "gain-clarity": {
    label: "Gain Clarity",
    color: "#A855F7", // Purple
    description: "Understanding the situation better",
  },
};

export interface KlarityAnalysisSummary {
  tone: string;
  pattern: string;
  emotionalImpact: string;
  coreIssue: string;
  fullAnalysis: string;
}

export interface CalendarLogEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: number; // Full timestamp

  // Event metadata
  eventType: EventType;
  status: "upcoming" | "in-progress" | "completed";
  title?: string; // Auto-generated or user-provided
  tags?: string[]; // family, romantic, work, etc.

  // User input
  situationText: string;

  // Klarity analysis
  quickSummary: string; // One-line main issue
  analysis: KlarityAnalysisSummary;

  // User intention
  intention: IntentionType;

  // Guidance provided
  suggestedReplies: string[];
  emotionalAdvice: string;
  boundaryWording?: string;
  safetyNotes?: string;

  // User response
  userResponse?: string;
  userResponseTimestamp?: number;

  // Reflection (for past events)
  reflectionNotes?: string;
  clarityScore?: number; // 1-10 slider

  // Related conversation
  loopId?: string; // Link to the conversation loop
}

export interface MonthlyPattern {
  month: string; // YYYY-MM
  totalEntries: number;
  mostCommonIntention: IntentionType;
  emotionalStates: Record<string, number>;
  repeatedPatterns: string[];
  positiveProgress: string[];
}
