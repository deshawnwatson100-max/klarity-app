import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Feedback Store
 *
 * Tracks user feedback on suggested replies to improve future suggestions.
 * - Stores liked/disliked replies with their characteristics
 * - Builds a preference profile over time
 * - Used by reply generation to tailor responses
 */

export interface ReplyFeedback {
  id: string;
  replyText: string;
  feedback: "like" | "dislike";
  timestamp: number;
  // Characteristics we can learn from
  characteristics: {
    length: "short" | "medium" | "long";
    tone: string; // e.g., "warm", "direct", "casual", "formal"
    hasEmoji: boolean;
    hasQuestion: boolean;
  };
}

export interface UserPreferences {
  // Aggregated preferences based on feedback
  preferredLength: "short" | "medium" | "long" | null;
  preferredTones: string[];
  dislikedTones: string[];
  likesEmoji: boolean | null;
  likesQuestions: boolean | null;
  // Stats
  totalLikes: number;
  totalDislikes: number;
}

interface FeedbackState {
  // State
  feedbackHistory: ReplyFeedback[];
  preferences: UserPreferences;

  // Actions
  addFeedback: (replyText: string, feedback: "like" | "dislike") => void;
  clearFeedback: () => void;
  getPreferenceSummary: () => string;
}

// Helper to analyze reply characteristics
function analyzeReply(text: string): ReplyFeedback["characteristics"] {
  const wordCount = text.split(/\s+/).length;
  const length: "short" | "medium" | "long" =
    wordCount <= 15 ? "short" : wordCount <= 40 ? "medium" : "long";

  // Detect tone indicators
  let tone = "neutral";
  const lowerText = text.toLowerCase();
  if (lowerText.includes("!") || /\b(love|great|awesome|amazing)\b/.test(lowerText)) {
    tone = "warm";
  } else if (/\b(honestly|actually|look|listen)\b/.test(lowerText)) {
    tone = "direct";
  } else if (/\b(hey|yeah|gonna|wanna|kinda)\b/.test(lowerText)) {
    tone = "casual";
  } else if (/\b(perhaps|regarding|furthermore|however)\b/.test(lowerText)) {
    tone = "formal";
  } else if (/\b(sorry|understand|feel|appreciate)\b/.test(lowerText)) {
    tone = "empathetic";
  }

  const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
  const hasQuestion = text.includes("?");

  return { length, tone, hasEmoji, hasQuestion };
}

// Helper to compute preferences from feedback history
function computePreferences(history: ReplyFeedback[]): UserPreferences {
  const likes = history.filter((f) => f.feedback === "like");
  const dislikes = history.filter((f) => f.feedback === "dislike");

  // Length preference
  const lengthCounts = { short: 0, medium: 0, long: 0 };
  likes.forEach((f) => lengthCounts[f.characteristics.length]++);
  dislikes.forEach((f) => lengthCounts[f.characteristics.length]--);

  let preferredLength: "short" | "medium" | "long" | null = null;
  const maxLength = Math.max(...Object.values(lengthCounts));
  if (maxLength > 0) {
    preferredLength = (Object.entries(lengthCounts).find(
      ([, count]) => count === maxLength
    )?.[0] as "short" | "medium" | "long") || null;
  }

  // Tone preferences
  const toneCounts: Record<string, number> = {};
  likes.forEach((f) => {
    toneCounts[f.characteristics.tone] = (toneCounts[f.characteristics.tone] || 0) + 1;
  });
  dislikes.forEach((f) => {
    toneCounts[f.characteristics.tone] = (toneCounts[f.characteristics.tone] || 0) - 1;
  });

  const preferredTones = Object.entries(toneCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tone]) => tone);

  const dislikedTones = Object.entries(toneCounts)
    .filter(([, count]) => count < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([tone]) => tone);

  // Emoji preference
  const emojiLikes = likes.filter((f) => f.characteristics.hasEmoji).length;
  const emojiDislikes = dislikes.filter((f) => f.characteristics.hasEmoji).length;
  let likesEmoji: boolean | null = null;
  if (emojiLikes > emojiDislikes + 1) likesEmoji = true;
  else if (emojiDislikes > emojiLikes + 1) likesEmoji = false;

  // Question preference
  const questionLikes = likes.filter((f) => f.characteristics.hasQuestion).length;
  const questionDislikes = dislikes.filter((f) => f.characteristics.hasQuestion).length;
  let likesQuestions: boolean | null = null;
  if (questionLikes > questionDislikes + 1) likesQuestions = true;
  else if (questionDislikes > questionLikes + 1) likesQuestions = false;

  return {
    preferredLength,
    preferredTones,
    dislikedTones,
    likesEmoji,
    likesQuestions,
    totalLikes: likes.length,
    totalDislikes: dislikes.length,
  };
}

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      // Initial State
      feedbackHistory: [],
      preferences: {
        preferredLength: null,
        preferredTones: [],
        dislikedTones: [],
        likesEmoji: null,
        likesQuestions: null,
        totalLikes: 0,
        totalDislikes: 0,
      },

      // Actions
      addFeedback: (replyText: string, feedback: "like" | "dislike") => {
        const characteristics = analyzeReply(replyText);
        const newFeedback: ReplyFeedback = {
          id: Date.now().toString(),
          replyText,
          feedback,
          timestamp: Date.now(),
          characteristics,
        };

        set((state) => {
          // Keep last 50 feedback items to prevent unbounded growth
          const updatedHistory = [...state.feedbackHistory, newFeedback].slice(-50);
          const preferences = computePreferences(updatedHistory);
          return { feedbackHistory: updatedHistory, preferences };
        });
      },

      clearFeedback: () => {
        set({
          feedbackHistory: [],
          preferences: {
            preferredLength: null,
            preferredTones: [],
            dislikedTones: [],
            likesEmoji: null,
            likesQuestions: null,
            totalLikes: 0,
            totalDislikes: 0,
          },
        });
      },

      getPreferenceSummary: () => {
        const { preferences } = get();
        const parts: string[] = [];

        if (preferences.totalLikes + preferences.totalDislikes < 3) {
          return ""; // Not enough feedback yet
        }

        if (preferences.preferredLength) {
          parts.push(`The user prefers ${preferences.preferredLength} replies.`);
        }

        if (preferences.preferredTones.length > 0) {
          parts.push(`Preferred tones: ${preferences.preferredTones.slice(0, 2).join(", ")}.`);
        }

        if (preferences.dislikedTones.length > 0) {
          parts.push(`Avoid these tones: ${preferences.dislikedTones.slice(0, 2).join(", ")}.`);
        }

        if (preferences.likesEmoji === true) {
          parts.push("The user likes replies with emojis.");
        } else if (preferences.likesEmoji === false) {
          parts.push("The user prefers replies without emojis.");
        }

        if (preferences.likesQuestions === true) {
          parts.push("The user likes replies that include questions.");
        } else if (preferences.likesQuestions === false) {
          parts.push("The user prefers replies without questions.");
        }

        return parts.join(" ");
      },
    }),
    {
      name: "klarity-feedback-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
