/**
 * Klarity Theme Colors
 *
 * Defines color palettes for dark and light themes.
 * All colors are carefully chosen to maintain the premium Klarity aesthetic
 * while ensuring readability and accessibility in both modes.
 */

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderLight: string;
  divider: string;

  // Interactive
  buttonBackground: string;
  buttonText: string;
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Status Colors (same in both themes)
  success: string;
  warning: string;
  error: string;
  info: string;

  // Accent Colors
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;

  // Intention Colors (same in both themes for consistency)
  intentionImprove: string;
  intentionDistance: string;
  intentionMaintain: string;
  intentionClarity: string;

  // Overlays
  overlay: string;
  overlayLight: string;

  // Cards
  cardBackground: string;
  cardBorder: string;

  // Header
  headerBackground: string;
  headerText: string;
  headerIcon: string;

  // Navigation
  drawerBackground: string;
  drawerItemActive: string;
  drawerItemText: string;

  // Switch/Toggle
  switchTrackOff: string;
  switchTrackOn: string;
  switchThumb: string;

  // Shadows (for light theme primarily)
  shadowColor: string;
}

export const darkColors: ThemeColors = {
  // Backgrounds
  background: "#0A0A0B",
  backgroundSecondary: "#111111",
  backgroundTertiary: "#171717",
  surface: "rgba(255, 255, 255, 0.03)",
  surfaceElevated: "rgba(255, 255, 255, 0.05)",

  // Text
  textPrimary: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",
  textInverse: "#0A0A0B",

  // Borders & Dividers
  border: "rgba(255, 255, 255, 0.1)",
  borderLight: "rgba(255, 255, 255, 0.06)",
  divider: "rgba(255, 255, 255, 0.06)",

  // Interactive
  buttonBackground: "rgba(255, 255, 255, 0.08)",
  buttonText: "#E5E7EB",
  inputBackground: "#111111",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputPlaceholder: "#6B7280",

  // Status Colors
  success: "#34C759",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Accent Colors
  accentPrimary: "#8B5CF6",
  accentSecondary: "#6366F1",
  accentTertiary: "#A855F7",

  // Intention Colors
  intentionImprove: "#4C9CFF",
  intentionDistance: "#FF884D",
  intentionMaintain: "#FFD755",
  intentionClarity: "#B47CFF",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.5)",

  // Cards
  cardBackground: "rgba(255, 255, 255, 0.03)",
  cardBorder: "rgba(255, 255, 255, 0.06)",

  // Header
  headerBackground: "#111111",
  headerText: "#EDEDED",
  headerIcon: "#9CA3AF",

  // Navigation
  drawerBackground: "#171717",
  drawerItemActive: "rgba(255, 255, 255, 0.1)",
  drawerItemText: "#E5E7EB",

  // Switch/Toggle
  switchTrackOff: "#3A3A3C",
  switchTrackOn: "#34C759",
  switchThumb: "#FFFFFF",

  // Shadows
  shadowColor: "#000000",
};

export const lightColors: ThemeColors = {
  // Backgrounds
  background: "#FFFFFF",
  backgroundSecondary: "#F5F5F7",
  backgroundTertiary: "#EBEBED",
  surface: "rgba(0, 0, 0, 0.02)",
  surfaceElevated: "rgba(0, 0, 0, 0.04)",

  // Text
  textPrimary: "#1C1C1E",
  textSecondary: "#636366",
  textTertiary: "#8E8E93",
  textInverse: "#FFFFFF",

  // Borders & Dividers
  border: "rgba(0, 0, 0, 0.12)",
  borderLight: "rgba(0, 0, 0, 0.06)",
  divider: "rgba(0, 0, 0, 0.08)",

  // Interactive
  buttonBackground: "rgba(0, 0, 0, 0.05)",
  buttonText: "#1C1C1E",
  inputBackground: "#FFFFFF",
  inputBorder: "rgba(0, 0, 0, 0.12)",
  inputPlaceholder: "#8E8E93",

  // Status Colors
  success: "#34C759",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Accent Colors
  accentPrimary: "#8B5CF6",
  accentSecondary: "#6366F1",
  accentTertiary: "#A855F7",

  // Intention Colors
  intentionImprove: "#4C9CFF",
  intentionDistance: "#FF884D",
  intentionMaintain: "#FFD755",
  intentionClarity: "#B47CFF",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",

  // Cards
  cardBackground: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.08)",

  // Header
  headerBackground: "#F5F5F7",
  headerText: "#1C1C1E",
  headerIcon: "#636366",

  // Navigation
  drawerBackground: "#FFFFFF",
  drawerItemActive: "rgba(0, 0, 0, 0.06)",
  drawerItemText: "#1C1C1E",

  // Switch/Toggle
  switchTrackOff: "#E5E5EA",
  switchTrackOn: "#34C759",
  switchThumb: "#FFFFFF",

  // Shadows
  shadowColor: "#000000",
};
