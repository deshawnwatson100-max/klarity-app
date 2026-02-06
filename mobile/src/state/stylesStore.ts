import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CommunicationStyleProfile,
  StyleLearningEvent,
  createDefaultStyleProfile,
  DirectnessLevel,
  FormalityLevel,
  EmotionalOpennessLevel,
  EmojiUsageLevel,
  MessageLengthPreference,
  ConflictStyle,
} from "../types/communicationStyle";

interface CommunicationStylesState {
  // State
  profiles: CommunicationStyleProfile[];

  // Getters
  getProfileByContactName: (contactName: string) => CommunicationStyleProfile | undefined;
  getProfileById: (id: string) => CommunicationStyleProfile | undefined;
  getAllProfiles: () => CommunicationStyleProfile[];

  // Actions - Profile Management
  createProfile: (contactName: string) => CommunicationStyleProfile;
  updateProfile: (id: string, updates: Partial<CommunicationStyleProfile>) => void;
  deleteProfile: (id: string) => void;

  // Actions - Style Adjustments
  updateDirectness: (id: string, directness: DirectnessLevel) => void;
  updateFormality: (id: string, formality: FormalityLevel) => void;
  updateEmotionalOpenness: (id: string, openness: EmotionalOpennessLevel) => void;
  updateEmojiUsage: (id: string, usage: EmojiUsageLevel) => void;
  updateLanguageStyle: (id: string, languageStyle: string) => void;
  updateMessageLengthPreference: (id: string, preference: MessageLengthPreference) => void;
  updateConflictStyle: (id: string, style: ConflictStyle) => void;

  // Actions - Learning
  addLearningEvent: (id: string, event: Omit<StyleLearningEvent, "id" | "timestamp">) => void;
  incrementMessageCount: (id: string) => void;

  // Actions - Get or Create
  getOrCreateProfile: (contactName: string) => CommunicationStyleProfile;
}

export const useStylesStore = create<CommunicationStylesState>()(
  persist(
    (set, get) => ({
      // Initial State
      profiles: [],

      // Getters
      getProfileByContactName: (contactName: string) => {
        return get().profiles.find(
          (p) => p.contactName.toLowerCase() === contactName.toLowerCase()
        );
      },

      getProfileById: (id: string) => {
        return get().profiles.find((p) => p.id === id);
      },

      getAllProfiles: () => {
        return get().profiles;
      },

      // Profile Management
      createProfile: (contactName: string) => {
        const newProfile = createDefaultStyleProfile(contactName);
        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));
        return newProfile;
      },

      updateProfile: (id: string, updates: Partial<CommunicationStyleProfile>) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? {
                  ...profile,
                  ...updates,
                  lastUpdated: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      deleteProfile: (id: string) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        }));
      },

      // Style Adjustments
      updateDirectness: (id: string, directness: DirectnessLevel) => {
        get().updateProfile(id, { directness });
      },

      updateFormality: (id: string, formality: FormalityLevel) => {
        get().updateProfile(id, { formality });
      },

      updateEmotionalOpenness: (id: string, openness: EmotionalOpennessLevel) => {
        get().updateProfile(id, { emotionalOpenness: openness });
      },

      updateEmojiUsage: (id: string, usage: EmojiUsageLevel) => {
        get().updateProfile(id, { emojiUsage: usage });
      },

      updateLanguageStyle: (id: string, languageStyle: string) => {
        get().updateProfile(id, { languageStyle });
      },

      updateMessageLengthPreference: (id: string, preference: MessageLengthPreference) => {
        get().updateProfile(id, { messageLengthPreference: preference });
      },

      updateConflictStyle: (id: string, style: ConflictStyle) => {
        get().updateProfile(id, { conflictStyle: style });
      },

      // Learning
      addLearningEvent: (
        id: string,
        event: Omit<StyleLearningEvent, "id" | "timestamp">
      ) => {
        const learningEvent: StyleLearningEvent = {
          ...event,
          id: Date.now().toString() + "_" + Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? {
                  ...profile,
                  learningHistory: [...profile.learningHistory, learningEvent],
                  lastUpdated: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      incrementMessageCount: (id: string) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? {
                  ...profile,
                  messageCount: profile.messageCount + 1,
                  lastUpdated: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      // Get or Create
      getOrCreateProfile: (contactName: string) => {
        const existing = get().getProfileByContactName(contactName);
        if (existing) {
          return existing;
        }
        return get().createProfile(contactName);
      },
    }),
    {
      name: "klarity-communication-styles-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
