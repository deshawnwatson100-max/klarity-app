import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { ThemeColors, darkColors, lightColors } from "./colors";
import { useSettingsStore, ThemeMode } from "../state/settingsStore";

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: darkColors,
  isDark: true,
  themeMode: "dark",
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const themeSetting = useSettingsStore((s) => s.theme);

  // Determine actual theme based on setting and system preference
  const isDark = useMemo(() => {
    if (themeSetting === "system") {
      return systemColorScheme !== "light";
    }
    return themeSetting === "dark";
  }, [themeSetting, systemColorScheme]);

  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      colors,
      isDark,
      themeMode: themeSetting,
    }),
    [colors, isDark, themeSetting]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme colors and state
 *
 * @example
 * const { colors, isDark } = useTheme();
 * <View style={{ backgroundColor: colors.background }}>
 *   <Text style={{ color: colors.textPrimary }}>Hello</Text>
 * </View>
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Hook to get just the colors (convenience)
 */
export function useColors() {
  const { colors } = useTheme();
  return colors;
}

/**
 * Hook to check if dark mode is active
 */
export function useIsDark() {
  const { isDark } = useTheme();
  return isDark;
}
