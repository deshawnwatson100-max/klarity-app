import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Subscription Store
 *
 * Tracks trial start date and subscription state locally.
 * Trial period is 3 days from first app launch after onboarding.
 * RevenueCat is the source of truth for paid subscriptions;
 * this store handles the trial window and caching.
 */

const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

interface SubscriptionState {
  // When the trial started (timestamp in ms). Null = trial not yet started.
  trialStartedAt: number | null;

  // Whether the user has an active paid subscription (cached from RevenueCat).
  // We always re-check RevenueCat at launch, but this prevents flash-of-paywall.
  hasPaidSubscription: boolean;

  // Set to true when app goes to background — forces hard paywall on next foreground/request.
  requiresPaywallOnResume: boolean;

  // Controls hard paywall visibility. Stored in the store so any screen can set it
  // directly and synchronously (no useEffect hop = no visible lag).
  showHardPaywall: boolean;

  // Actions
  startTrial: () => void;
  setHasPaidSubscription: (value: boolean) => void;
  resetSubscription: () => void;
  expireTrialForPreview: () => void;
  setRequiresPaywallOnResume: (value: boolean) => void;
  setShowHardPaywall: (value: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      trialStartedAt: null,
      hasPaidSubscription: false,
      requiresPaywallOnResume: false,
      showHardPaywall: false,

      startTrial: () =>
        set((state) => ({
          trialStartedAt: state.trialStartedAt ?? Date.now(),
        })),

      setHasPaidSubscription: (value: boolean) =>
        set({ hasPaidSubscription: value }),

      resetSubscription: () =>
        set({ trialStartedAt: null, hasPaidSubscription: false, requiresPaywallOnResume: false, showHardPaywall: false }),

      expireTrialForPreview: () =>
        set({ trialStartedAt: 0, hasPaidSubscription: false }),

      setRequiresPaywallOnResume: (value: boolean) =>
        set({ requiresPaywallOnResume: value }),

      setShowHardPaywall: (value: boolean) =>
        set({ showHardPaywall: value }),
    }),
    {
      name: "klarity-subscription-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist showHardPaywall — always starts as false on fresh launch
      partialize: (state) => ({
        trialStartedAt: state.trialStartedAt,
        hasPaidSubscription: state.hasPaidSubscription,
        requiresPaywallOnResume: state.requiresPaywallOnResume,
      }),
    }
  )
);

/**
 * Returns whether the user is currently within the 3-day trial window.
 * Does NOT check RevenueCat — call getSubscriptionStatus() for the full check.
 */
export function isInTrialWindow(trialStartedAt: number | null): boolean {
  if (trialStartedAt === null) return false;
  return Date.now() - trialStartedAt < TRIAL_DURATION_MS;
}

/**
 * Returns how many days remain in the trial (0 if expired or not started).
 */
export function trialDaysRemaining(trialStartedAt: number | null): number {
  if (trialStartedAt === null) return 0;
  const elapsed = Date.now() - trialStartedAt;
  const remaining = TRIAL_DURATION_MS - elapsed;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}
