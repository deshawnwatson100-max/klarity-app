/**
 * Person Context Types
 *
 * Data model for the "Person Context" feature in Klarity.
 * Allows users to save context about people they interact with,
 * enabling more grounded, human responses.
 *
 * LANGUAGE GUIDELINES (avoid clinical/serious wording):
 * - Use: "keep in mind", "taken together", "this adds context", "this keeps coming up"
 * - Avoid: "tracking", "patterns", "signals", "risk analysis", "escalation",
 *          "frequency", "timeline", "data points", "toxic", "predator", "unsafe"
 * - Never label people as good/bad/unsafe/toxic
 * - Never claim to verify anything externally
 * - Always preserve user agency
 */

/**
 * Relationship context types - broad categories for organization
 * Intentionally open-ended to avoid prescriptive framing
 */
export type RelationshipContextType =
  | "dating"
  | "romantic"
  | "family"
  | "friend"
  | "work"
  | "acquaintance"
  | "other";

/**
 * User perception state - how the user feels about accumulated context
 * Framed as self-reflection, not system judgment
 */
export type PerceptionFeeling = "feels_fine" | "unsure" | "feels_like_a_lot";

/**
 * User perception snapshot - captures how info lands for the user at a moment
 */
export interface UserPerceptionState {
  feeling: PerceptionFeeling;
  note?: string; // Optional user note explaining their feeling
  recordedAt: string; // ISO date string
}

/**
 * Tags for organizing notes - user-defined or suggested
 */
export interface PersonContextTag {
  id: string;
  label: string; // e.g., "communication", "boundary", "support", "conflict"
  color?: string; // Optional color for visual distinction
}

/**
 * A single note entry about a person
 */
export interface PersonContextNote {
  id: string;
  content: string; // The actual note content
  source?: "user_input" | "chat_context" | "insight"; // Where this came from
  tagIds: string[]; // Associated tag IDs
  createdAt: string;
  updatedAt: string;
}

/**
 * Generated insight section - identity-safe language only
 */
export interface PersonContextInsightSection {
  id: string;
  title: string; // e.g., "What keeps coming up", "Things to keep in mind"
  content: string; // The insight text
  basedOnNoteIds: string[]; // Which notes informed this insight
  generatedAt: string;
}

/**
 * Generated summary/insight for a person
 * Uses identity-safe, non-clinical language
 */
export interface PersonContextInsight {
  id: string;
  personContextId: string;

  // Summary sections - framed carefully
  sections: PersonContextInsightSection[];

  // Overall context summary (1-2 sentences)
  overviewSummary?: string;

  // What the user might want to keep in mind
  keepInMind?: string[];

  // Things that seem to come up often (not "patterns")
  recurringThemes?: string[];

  generatedAt: string;
  updatedAt: string;
}

/**
 * Core Person Context record
 */
export interface PersonContext {
  id: string;

  // Basic identification
  name: string; // User-provided name/label for this person
  relationshipContext: RelationshipContextType;
  customRelationshipLabel?: string; // If "other", user can specify

  // User's intent for tracking this context
  userIntent?: string; // e.g., "I want to understand our dynamic better"

  // Notes and observations
  notes: PersonContextNote[];
  tags: PersonContextTag[];

  // User perception history
  perceptionHistory: UserPerceptionState[];

  // Generated insights (optional, regenerated as needed)
  currentInsight?: PersonContextInsight;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Privacy
  isArchived: boolean;
}

/**
 * Active person context selection - which person is currently "in focus"
 * for chat responses to reference
 */
export interface ActivePersonContextSelection {
  personContextId: string | null;
  selectedAt: string | null; // ISO date string
}

/**
 * Default tags available for all person contexts
 */
export const DEFAULT_PERSON_CONTEXT_TAGS: Omit<PersonContextTag, "id">[] = [
  { label: "communication", color: "#6366F1" },
  { label: "boundary", color: "#F59E0B" },
  { label: "support", color: "#10B981" },
  { label: "tension", color: "#EF4444" },
  { label: "growth", color: "#8B5CF6" },
  { label: "connection", color: "#EC4899" },
];

/**
 * Helper to create a new person context with defaults
 */
export function createPersonContext(
  name: string,
  relationshipContext: RelationshipContextType
): PersonContext {
  const now = new Date().toISOString();
  return {
    id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    relationshipContext,
    notes: [],
    tags: DEFAULT_PERSON_CONTEXT_TAGS.map((tag, index) => ({
      ...tag,
      id: `tag_${Date.now()}_${index}`,
    })),
    perceptionHistory: [],
    createdAt: now,
    updatedAt: now,
    isArchived: false,
  };
}

/**
 * Helper to create a new note
 */
export function createPersonContextNote(
  content: string,
  source: PersonContextNote["source"] = "user_input",
  tagIds: string[] = []
): PersonContextNote {
  const now = new Date().toISOString();
  return {
    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content,
    source,
    tagIds,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper to create a perception state entry
 */
export function createPerceptionState(
  feeling: PerceptionFeeling,
  note?: string
): UserPerceptionState {
  return {
    feeling,
    note,
    recordedAt: new Date().toISOString(),
  };
}
