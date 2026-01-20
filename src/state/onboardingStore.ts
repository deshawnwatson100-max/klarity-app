import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Onboarding Store
 *
 * Manages onboarding state and collected user profile information.
 * Persists to AsyncStorage so onboarding only shows once.
 */

export interface OnboardingAnswers {
  conversationTrigger: string | null;
  responseOutcome: string | null;
  conversationCost: string | null;
  afterConfusion: string | null;
  klarityHelps: string | null;
  bestOutcome: string | null;
  reminderPreference: string | null;
}

export interface UserProfile {
  name: string;
  primaryUseCase: string | null;
  communicationGoal: string | null;
  onboardingAnswers: OnboardingAnswers;
}

interface OnboardingState {
  // Onboarding status
  hasCompletedOnboarding: boolean;

  // User profile collected during onboarding
  userProfile: UserProfile;

  // Actions
  setHasCompletedOnboarding: (completed: boolean) => void;
  setUserName: (name: string) => void;
  setPrimaryUseCase: (useCase: string) => void;
  setCommunicationGoal: (goal: string) => void;
  setOnboardingAnswer: (key: keyof OnboardingAnswers, value: string) => void;
  resetOnboarding: () => void;
}

const defaultOnboardingAnswers: OnboardingAnswers = {
  conversationTrigger: null,
  responseOutcome: null,
  conversationCost: null,
  afterConfusion: null,
  klarityHelps: null,
  bestOutcome: null,
  reminderPreference: null,
};

const defaultUserProfile: UserProfile = {
  name: "",
  primaryUseCase: null,
  communicationGoal: null,
  onboardingAnswers: defaultOnboardingAnswers,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      userProfile: defaultUserProfile,

      setHasCompletedOnboarding: (completed) =>
        set({ hasCompletedOnboarding: completed }),

      setUserName: (name) =>
        set((state) => ({
          userProfile: { ...state.userProfile, name },
        })),

      setPrimaryUseCase: (useCase) =>
        set((state) => ({
          userProfile: { ...state.userProfile, primaryUseCase: useCase },
        })),

      setCommunicationGoal: (goal) =>
        set((state) => ({
          userProfile: { ...state.userProfile, communicationGoal: goal },
        })),

      setOnboardingAnswer: (key, value) =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            onboardingAnswers: {
              ...state.userProfile.onboardingAnswers,
              [key]: value,
            },
          },
        })),

      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          userProfile: defaultUserProfile,
        }),
    }),
    {
      name: "klarity-onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
