export type DirectnessLevel = "soft" | "balanced" | "direct" | "very-direct";
export type FormalityLevel = "casual" | "neutral" | "polished" | "professional";
export type EmotionalOpennessLevel = "low" | "medium" | "open" | "very-open";
export type EmojiUsageLevel = "none" | "light" | "moderate" | "frequent";
export type MessageLengthPreference = "short" | "medium" | "long";
export type ConflictStyle = "avoidant" | "calmly-assertive" | "direct" | "blunt";

export interface CommunicationStyleProfile {
  id: string; // Unique ID for this profile
  contactName: string; // Name of the person
  contactInitials?: string; // For avatar display
  contactAvatarUrl?: string; // Optional custom avatar

  // Core style dimensions
  directness: DirectnessLevel;
  formality: FormalityLevel;
  emotionalOpenness: EmotionalOpennessLevel;
  emojiUsage: EmojiUsageLevel;

  // Optional preferences
  languageStyle?: string; // User-provided slang, dialect, phrases
  messageLengthPreference?: MessageLengthPreference;
  conflictStyle?: ConflictStyle;
  respectHierarchyTone?: boolean; // For parents, bosses, elders

  // AI Learning metadata
  learningHistory: StyleLearningEvent[];
  lastUpdated: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  messageCount: number; // Number of messages exchanged with this person
}

export interface StyleLearningEvent {
  id: string;
  timestamp: string;
  eventType: "user-edit" | "style-adjustment" | "explicit-setting";
  description: string; // Human-readable description of what was learned
  beforeValue?: string;
  afterValue?: string;
}

// Helper function to generate style summary tag
export function getStyleSummaryTag(profile: CommunicationStyleProfile): string {
  const { directness, formality, emotionalOpenness, emojiUsage } = profile;

  // Create descriptive tag based on style combination
  if (formality === "professional" && directness === "direct") {
    return "Professional & Direct";
  }
  if (formality === "professional" && directness !== "very-direct") {
    return "Professional & Polished";
  }
  if (directness === "soft" && emotionalOpenness === "open") {
    return "Respectful & Soft";
  }
  if (directness === "soft" && emotionalOpenness !== "low") {
    return "Gentle & Warm";
  }
  if (formality === "casual" && emojiUsage === "frequent") {
    return "Casual & Expressive";
  }
  if (formality === "casual" && directness === "direct") {
    return "Direct & Casual";
  }
  if (emotionalOpenness === "very-open" && emojiUsage !== "none") {
    return "Open & Expressive";
  }
  if (directness === "balanced" && formality === "neutral") {
    return "Balanced & Natural";
  }
  if (emojiUsage === "frequent" && emotionalOpenness === "open") {
    return "Playful & Honest";
  }

  // Default fallback
  return "Balanced";
}

// Helper function to get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Default style profile
export function createDefaultStyleProfile(contactName: string): CommunicationStyleProfile {
  return {
    id: Date.now().toString() + "_" + Math.random().toString(36).substring(7),
    contactName,
    contactInitials: getInitials(contactName),
    directness: "balanced",
    formality: "neutral",
    emotionalOpenness: "medium",
    emojiUsage: "light",
    learningHistory: [],
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    messageCount: 0,
  };
}
