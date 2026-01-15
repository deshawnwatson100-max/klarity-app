import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Onboarding Store
 *
 * Manages onboarding state and collected user profile information.
 * Persists to AsyncStorage so onboarding only shows once.
 */

export interface UserProfile {
  name: string;
  primaryUseCase: string | null;
  communicationGoal: string | null;
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
  resetOnboarding: () => void;
}

const defaultUserProfile: UserProfile = {
  name: "",
  primaryUseCase: null,
  communicationGoal: null,
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
