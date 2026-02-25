import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;

  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
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
    }),
    {
      name: "klarity-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
