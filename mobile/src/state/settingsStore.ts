import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Settings Store
 *
 * Manages all app settings and user preferences for Klarity AI.
 * - Persists settings to AsyncStorage
 * - Provides appearance, notification, AI, and privacy settings
 */

export type ThemeMode = "dark" | "light" | "system";
export type FontSize = "small" | "medium" | "large";
export type ResponseStyle = "formal" | "casual" | "balanced";
export type ResponseLength = "concise" | "balanced" | "detailed";

interface SettingsState {
  // Appearance
  theme: ThemeMode;
  fontSize: FontSize;
  hapticsEnabled: boolean;

  // Notifications
  pushNotificationsEnabled: boolean;
  dailyRemindersEnabled: boolean;
  reminderTime: string; // HH:mm format

  // AI/Chat Preferences
  responseStyle: ResponseStyle;
  responseLength: ResponseLength;
  autoSuggestReplies: boolean;

  // Data & Privacy
  cloudSyncEnabled: boolean;
  analyticsEnabled: boolean;

  // Actions - Appearance
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setHapticsEnabled: (enabled: boolean) => void;

  // Actions - Notifications
  setPushNotificationsEnabled: (enabled: boolean) => void;
  setDailyRemindersEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;

  // Actions - AI/Chat Preferences
  setResponseStyle: (style: ResponseStyle) => void;
  setResponseLength: (length: ResponseLength) => void;
  setAutoSuggestReplies: (enabled: boolean) => void;

  // Actions - Data & Privacy
  setCloudSyncEnabled: (enabled: boolean) => void;
  setAnalyticsEnabled: (enabled: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

const defaultSettings = {
  // Appearance
  theme: "system" as ThemeMode,
  fontSize: "medium" as FontSize,
  hapticsEnabled: true,

  // Notifications
  pushNotificationsEnabled: true,
  dailyRemindersEnabled: false,
  reminderTime: "09:00",

  // AI/Chat Preferences
  responseStyle: "balanced" as ResponseStyle,
  responseLength: "balanced" as ResponseLength,
  autoSuggestReplies: true,

  // Data & Privacy
  cloudSyncEnabled: false,
  analyticsEnabled: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      // Actions - Appearance
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),

      // Actions - Notifications
      setPushNotificationsEnabled: (pushNotificationsEnabled) =>
        set({ pushNotificationsEnabled }),
      setDailyRemindersEnabled: (dailyRemindersEnabled) =>
        set({ dailyRemindersEnabled }),
      setReminderTime: (reminderTime) => set({ reminderTime }),

      // Actions - AI/Chat Preferences
      setResponseStyle: (responseStyle) => set({ responseStyle }),
      setResponseLength: (responseLength) => set({ responseLength }),
      setAutoSuggestReplies: (autoSuggestReplies) => set({ autoSuggestReplies }),

      // Actions - Data & Privacy
      setCloudSyncEnabled: (cloudSyncEnabled) => set({ cloudSyncEnabled }),
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),

      // Reset
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: "klarity-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
