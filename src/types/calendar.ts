export type IntentionType = "improve" | "distance" | "maintain" | "gain-clarity";

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

  // Reflection
  reflectionNotes?: string;

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
