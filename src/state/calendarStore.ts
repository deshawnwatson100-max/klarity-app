import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalendarLogEntry, IntentionType, MonthlyPattern } from "../types/calendar";

interface CalendarState {
  entries: CalendarLogEntry[];

  // Actions
  addEntry: (entry: CalendarLogEntry) => void;
  updateEntry: (id: string, updates: Partial<CalendarLogEntry>) => void;
  deleteEntry: (id: string) => void;
  getEntriesForDate: (date: string) => CalendarLogEntry[];
  getEntriesForMonth: (year: number, month: number) => CalendarLogEntry[];
  getMonthlyPattern: (year: number, month: number) => MonthlyPattern | null;
  getAllEntries: () => CalendarLogEntry[];
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        set((state) => ({
          entries: [...state.entries, entry].sort(
            (a, b) => b.timestamp - a.timestamp
          ),
        }));
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }));
      },

      getEntriesForDate: (date) => {
        return get().entries.filter((entry) => entry.date === date);
      },

      getEntriesForMonth: (year, month) => {
        const monthStr = `${year}-${String(month).padStart(2, "0")}`;
        return get().entries.filter((entry) => entry.date.startsWith(monthStr));
      },

      getMonthlyPattern: (year, month) => {
        const entries = get().getEntriesForMonth(year, month);

        if (entries.length === 0) return null;

        // Count intentions
        const intentionCounts: Record<IntentionType, number> = {
          improve: 0,
          distance: 0,
          maintain: 0,
          "gain-clarity": 0,
        };

        entries.forEach((entry) => {
          intentionCounts[entry.intention]++;
        });

        // Find most common intention
        const mostCommonIntention = (
          Object.entries(intentionCounts) as [IntentionType, number][]
        ).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

        // Extract emotional states from analyses
        const emotionalStates: Record<string, number> = {};
        entries.forEach((entry) => {
          const tone = entry.analysis.tone;
          emotionalStates[tone] = (emotionalStates[tone] || 0) + 1;
        });

        // Extract patterns
        const patterns = entries.map((entry) => entry.analysis.pattern);
        const repeatedPatterns = patterns.filter(
          (pattern, index) => patterns.indexOf(pattern) !== index
        );

        // Identify positive progress (entries where user responded)
        const positiveProgress = entries
          .filter((entry) => entry.userResponse)
          .map((entry) => entry.quickSummary);

        return {
          month: `${year}-${String(month).padStart(2, "0")}`,
          totalEntries: entries.length,
          mostCommonIntention,
          emotionalStates,
          repeatedPatterns: Array.from(new Set(repeatedPatterns)),
          positiveProgress,
        };
      },

      getAllEntries: () => {
        return get().entries;
      },
    }),
    {
      name: "klarity-calendar-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
