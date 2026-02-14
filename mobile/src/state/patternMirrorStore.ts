import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BehavioralSignal,
  BehavioralSignalType,
  BehavioralPattern,
  PatternMirrorInsight,
  PatternScope,
} from "../types/chat";

// Minimum occurrences before surfacing a pattern
const MIN_OCCURRENCES_TO_SURFACE = 3;

// Pattern labels for insights
const PATTERN_LABELS: Record<BehavioralSignalType, string> = {
  // Negative patterns
  effort_ratio: "effort imbalance",
  double_texting: "multiple messages before response",
  emotional_intensity: "emotional escalation",
  apology_frequency: "frequent apologizing",
  follow_up_timing: "quick follow-ups",
  response_speed: "response timing gap",
  // Positive patterns
  consistent_pacing: "consistent pacing",
  emotional_restraint: "emotional restraint",
  balanced_effort: "balanced effort",
  boundary_maintenance: "boundary maintenance",
  reduced_overexplaining: "reduced over-explaining",
  controlled_tone: "controlled tone",
};

// Strategic interpretations (why this matters)
const STRATEGIC_INTERPRETATIONS: Record<BehavioralSignalType, string> = {
  // Negative patterns
  effort_ratio: "This can shift perceived investment levels. The one writing more often appears more invested.",
  double_texting: "Multiple messages before a response can create unintended pressure and shift the dynamic.",
  emotional_intensity: "Escalating emotional tone can put you in a reactive position rather than a strategic one.",
  apology_frequency: "Repeated apologies can signal uncertainty even when none exists. It shifts the frame.",
  follow_up_timing: "Quick follow-ups before they respond can reduce your positioning leverage.",
  response_speed: "Consistently faster responses can create an uneven tempo that affects perceived value.",
  // Positive patterns (why this matters)
  consistent_pacing: "Steady tempo signals composure. It removes urgency from the dynamic.",
  emotional_restraint: "Measured expression preserves clarity. The message lands without noise.",
  balanced_effort: "Proportional investment keeps the exchange neutral. Neither side over-commits.",
  boundary_maintenance: "Clear limits establish frame. The other person knows where they stand.",
  reduced_overexplaining: "Brevity signals confidence. Over-justification weakens position.",
  controlled_tone: "Stable tone across exchanges projects steadiness. It anchors the conversation.",
};

// Growth adjustments / reinforcement lines
const GROWTH_ADJUSTMENTS: Record<BehavioralSignalType, string> = {
  // Negative patterns
  effort_ratio: "Consider matching their message length. Let the ratio balance naturally.",
  double_texting: "Try waiting for their response before adding more. Let them close the gap.",
  emotional_intensity: "Observe before reacting. A measured response often has more impact.",
  apology_frequency: "Reserve apologies for actual missteps. Your default position is neutral.",
  follow_up_timing: "Give more space between messages. Their silence is information too.",
  response_speed: "Match their tempo. If they're slow, you're slower.",
  // Positive patterns (reinforcement lines)
  consistent_pacing: "This strengthens your position.",
  emotional_restraint: "This preserves your leverage.",
  balanced_effort: "This keeps the dynamic even.",
  boundary_maintenance: "This anchors your frame.",
  reduced_overexplaining: "This signals confidence.",
  controlled_tone: "This steadies the exchange.",
};

// Key for contact-specific insight cooldowns
type InsightCooldownKey = string; // "global:{type}" or "contact:{contactId}:{type}"

interface PatternMirrorState {
  // All recorded signals
  signals: BehavioralSignal[];

  // Aggregated patterns - both global and contact-specific
  globalPatterns: BehavioralPattern[];
  contactPatterns: Map<string, BehavioralPattern[]>; // contactId -> patterns

  // Last time an insight was shown (to avoid spam)
  lastInsightShown: Partial<Record<InsightCooldownKey, number>>;

  // Actions
  recordSignal: (
    type: BehavioralSignalType,
    context?: string,
    severity?: "low" | "medium" | "high",
    contactId?: string,
    contactName?: string
  ) => void;
  getGlobalPatterns: () => BehavioralPattern[];
  getContactPatterns: (contactId: string) => BehavioralPattern[];
  getInsightIfReady: (contactId?: string, contactName?: string) => PatternMirrorInsight | null;
  markInsightShown: (type: BehavioralSignalType, scope: PatternScope, contactId?: string) => void;
  clearOldSignals: () => void;
  resetPatterns: () => void;
}

// Helper to compute average severity
function computeAvgSeverity(signals: BehavioralSignal[]): "low" | "medium" | "high" {
  if (signals.length === 0) return "low";

  const severityMap = { low: 1, medium: 2, high: 3 };
  const total = signals.reduce((sum, s) => sum + severityMap[s.severity], 0);
  const avg = total / signals.length;

  if (avg >= 2.5) return "high";
  if (avg >= 1.5) return "medium";
  return "low";
}

// Helper to aggregate signals into patterns (for a specific set of signals)
function aggregateSignalsToPatterns(signals: BehavioralSignal[], contactId?: string, contactName?: string): BehavioralPattern[] {
  const byType = new Map<BehavioralSignalType, BehavioralSignal[]>();

  // Group signals by type
  for (const signal of signals) {
    const existing = byType.get(signal.type) || [];
    existing.push(signal);
    byType.set(signal.type, existing);
  }

  // Convert to patterns
  const patterns: BehavioralPattern[] = [];
  for (const [type, typeSignals] of byType) {
    if (typeSignals.length >= 2) { // At least 2 to start tracking
      const sortedByTime = [...typeSignals].sort((a, b) => b.timestamp - a.timestamp);
      patterns.push({
        type,
        occurrences: typeSignals.length,
        lastSeen: sortedByTime[0].timestamp,
        avgSeverity: computeAvgSeverity(typeSignals),
        contexts: sortedByTime.slice(0, 3).map(s => s.context || "").filter(Boolean),
        contactId,
        contactName,
      });
    }
  }

  return patterns;
}

// Recompute all patterns from signals
function recomputeAllPatterns(signals: BehavioralSignal[]): {
  globalPatterns: BehavioralPattern[];
  contactPatterns: Map<string, BehavioralPattern[]>;
} {
  // Global patterns (all signals)
  const globalPatterns = aggregateSignalsToPatterns(signals);

  // Contact-specific patterns
  const contactPatterns = new Map<string, BehavioralPattern[]>();
  const byContact = new Map<string, BehavioralSignal[]>();

  for (const signal of signals) {
    if (signal.contactId) {
      const existing = byContact.get(signal.contactId) || [];
      existing.push(signal);
      byContact.set(signal.contactId, existing);
    }
  }

  for (const [contactId, contactSignals] of byContact) {
    const contactName = contactSignals[0]?.contactName;
    const patterns = aggregateSignalsToPatterns(contactSignals, contactId, contactName);
    if (patterns.length > 0) {
      contactPatterns.set(contactId, patterns);
    }
  }

  return { globalPatterns, contactPatterns };
}

export const usePatternMirrorStore = create<PatternMirrorState>()(
  persist(
    (set, get) => ({
      signals: [],
      globalPatterns: [],
      contactPatterns: new Map(),
      lastInsightShown: {},

      recordSignal: (type, context, severity = "medium", contactId, contactName) => {
        const newSignal: BehavioralSignal = {
          type,
          timestamp: Date.now(),
          context,
          severity,
          contactId,
          contactName,
        };

        set((state) => {
          const updatedSignals = [...state.signals, newSignal];
          // Keep only last 30 days of signals
          const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const filteredSignals = updatedSignals.filter(s => s.timestamp > cutoff);

          const { globalPatterns, contactPatterns } = recomputeAllPatterns(filteredSignals);

          return {
            signals: filteredSignals,
            globalPatterns,
            contactPatterns,
          };
        });
      },

      getGlobalPatterns: () => {
        return get().globalPatterns;
      },

      getContactPatterns: (contactId: string) => {
        return get().contactPatterns.get(contactId) || [];
      },

      getInsightIfReady: (contactId?: string, contactName?: string) => {
        const state = get();
        const now = Date.now();
        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours between same insight type

        // Priority 1: Contact-specific patterns (if contactId provided)
        if (contactId) {
          const contactPatternsForId = state.contactPatterns.get(contactId) || [];

          for (const pattern of contactPatternsForId) {
            if (pattern.occurrences >= MIN_OCCURRENCES_TO_SURFACE) {
              const cooldownKey = `contact:${contactId}:${pattern.type}`;
              const lastShown = state.lastInsightShown[cooldownKey] || 0;

              if (now - lastShown > cooldownPeriod) {
                const impactLevel: "moderate" | "significant" =
                  pattern.occurrences >= 5 || pattern.avgSeverity === "high"
                    ? "significant"
                    : "moderate";

                // Check if there's also a global pattern (for reinforcement)
                const globalPattern = state.globalPatterns.find(p => p.type === pattern.type);
                const hasGlobalReinforcement = globalPattern && globalPattern.occurrences >= MIN_OCCURRENCES_TO_SURFACE;

                const displayName = contactName || pattern.contactName || "this person";

                const insight: PatternMirrorInsight = {
                  patternType: pattern.type,
                  scope: "contact",
                  behavioralInsight: `Across recent exchanges with ${displayName}, there's a pattern of ${PATTERN_LABELS[pattern.type]}.`,
                  strategicInterpretation: STRATEGIC_INTERPRETATIONS[pattern.type],
                  growthAdjustment: GROWTH_ADJUSTMENTS[pattern.type],
                  occurrenceCount: pattern.occurrences,
                  impactLevel,
                  contactName: displayName,
                  globalReinforcement: hasGlobalReinforcement
                    ? `This pattern also appears across your other conversations.`
                    : undefined,
                };

                return insight;
              }
            }
          }
        }

        // Priority 2: Global patterns
        for (const pattern of state.globalPatterns) {
          if (pattern.occurrences >= MIN_OCCURRENCES_TO_SURFACE) {
            const cooldownKey = `global:${pattern.type}`;
            const lastShown = state.lastInsightShown[cooldownKey] || 0;

            if (now - lastShown > cooldownPeriod) {
              const impactLevel: "moderate" | "significant" =
                pattern.occurrences >= 5 || pattern.avgSeverity === "high"
                  ? "significant"
                  : "moderate";

              const insight: PatternMirrorInsight = {
                patternType: pattern.type,
                scope: "global",
                behavioralInsight: `Across multiple conversations, there's a pattern of ${PATTERN_LABELS[pattern.type]}.`,
                strategicInterpretation: STRATEGIC_INTERPRETATIONS[pattern.type],
                growthAdjustment: GROWTH_ADJUSTMENTS[pattern.type],
                occurrenceCount: pattern.occurrences,
                impactLevel,
              };

              return insight;
            }
          }
        }

        return null;
      },

      markInsightShown: (type, scope, contactId) => {
        const cooldownKey = scope === "contact" && contactId
          ? `contact:${contactId}:${type}`
          : `global:${type}`;

        set((state) => ({
          lastInsightShown: {
            ...state.lastInsightShown,
            [cooldownKey]: Date.now(),
          },
        }));
      },

      clearOldSignals: () => {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        set((state) => {
          const filteredSignals = state.signals.filter(s => s.timestamp > cutoff);
          const { globalPatterns, contactPatterns } = recomputeAllPatterns(filteredSignals);
          return {
            signals: filteredSignals,
            globalPatterns,
            contactPatterns,
          };
        });
      },

      resetPatterns: () => {
        set({
          signals: [],
          globalPatterns: [],
          contactPatterns: new Map(),
          lastInsightShown: {},
        });
      },
    }),
    {
      name: "pattern-mirror-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Map
      partialize: (state) => ({
        signals: state.signals,
        lastInsightShown: state.lastInsightShown,
        // Don't persist computed patterns - they'll be recomputed on load
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recompute patterns after rehydration
          const { globalPatterns, contactPatterns } = recomputeAllPatterns(state.signals);
          state.globalPatterns = globalPatterns;
          state.contactPatterns = contactPatterns;
        }
      },
    }
  )
);

// Selector hooks for optimized re-renders
export const usePatternCount = (type: BehavioralSignalType) =>
  usePatternMirrorStore((s) => s.globalPatterns.find(p => p.type === type)?.occurrences || 0);

export const useHasActivePatterns = () =>
  usePatternMirrorStore((s) => s.globalPatterns.some(p => p.occurrences >= MIN_OCCURRENCES_TO_SURFACE));

export const useContactPatternCount = (contactId: string, type: BehavioralSignalType) =>
  usePatternMirrorStore((s) => s.contactPatterns.get(contactId)?.find(p => p.type === type)?.occurrences || 0);
