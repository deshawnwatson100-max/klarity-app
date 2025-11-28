import { ChatMessage } from "./chat";

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
