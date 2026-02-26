import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profileImage?: string | null;
  profileColor?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;

  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
  updateProfile: (updates: Partial<Pick<AuthUser, "name" | "profileImage" | "profileColor">>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,

      setSession: (user, token) =>
        set({ user, sessionToken: token, isAuthenticated: true }),

      clearSession: () =>
        set({ user: null, sessionToken: null, isAuthenticated: false }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "klarity-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
