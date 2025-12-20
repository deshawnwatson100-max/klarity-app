import { ChatMessage } from "./chat";

/**
 * Relationship type categories
 */
export type RelationshipType = "family" | "romantic" | "friend" | "work" | "other";

/**
 * Reply Timeline Entry - Auto-generated insights about interactions with a person
 * These entries are created automatically from chat analysis, no manual logging required
 */
export interface ReplyTimelineEntry {
  id: string;
  relationshipId: string; // Link to the tracked relationship
  loopId: string; // Link to the chat loop that generated this entry
  createdAt: string; // ISO date string
  insight: string; // Human-readable insight sentence
  insightType: "boundary-held" | "boundary-softened" | "communication-style" | "friction-pattern" | "positive-outcome";
  metadata?: {
    boundaryType?: string; // e.g., "time", "emotional", "physical"
    communicationStyle?: string; // e.g., "direct", "indirect", "brief"
    emotionTrigger?: string; // e.g., "guilt", "pressure", "conflict"
  };
}

/**
 * Adaptive summary for a relationship - updates over time
 */
export interface RelationshipInsightSummary {
  relationshipId: string;
  summary: string; // e.g., "With this person, being brief and direct works best."
  lastUpdated: string; // ISO date string
  confidence: number; // 0-100, how confident the AI is in this insight
}

/**
 * Settings for relationship timeline learning
 */
export interface RelationshipTimelineSettings {
  relationshipId: string;
  learningPaused: boolean; // If true, no new entries are created
  pausedAt?: string; // ISO date string when paused
}

/**
 * Represents a tracked relationship for long-term clarity
 */
export interface TrackedRelationship {
  id: string;
  name: string; // User-provided label (e.g., "Mom", "Manager", "Alex")
  relationshipType?: RelationshipType; // Optional category
  note?: string; // Optional context note (e.g., "What usually causes tension here?")
  createdAt: string;
  loopIds: string[]; // IDs of associated chat loops
}

/**
 * Represents a single conversation loop/session with Klarity AI
 * Each loop maintains its own conversation history and metadata
 */
export interface KlarityLoop {
  id: string; // Unique identifier for this loop
  title: string; // User-facing title (e.g., "Argument with coworker")
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string - updated when messages are added
  messages: ChatMessage[]; // Full conversation history for this loop
  summary?: string; // Optional emotional clarity summary
  emotionalClarity?: number; // Optional percentage (0-100)
  relationshipId?: string; // Optional link to a tracked relationship
}

/**
 * Helper function to generate a title from the first user message
 * Truncates long messages to keep titles concise
 */
export function generateLoopTitle(firstMessage: string): string {
  const maxLength = 40;
  const cleaned = firstMessage.trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.substring(0, maxLength) + "...";
}

/**
 * Helper function to create a new empty loop
 */
export function createNewLoop(): KlarityLoop {
  const now = new Date().toISOString();
  return {
    id: `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}
