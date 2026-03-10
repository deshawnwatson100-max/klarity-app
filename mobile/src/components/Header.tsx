import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useLoopsStore } from "../state/loopsStore";
import { PersonContextHeaderIcon } from "./PersonContextHeaderIcon";
import { useTheme } from "../theme";

export type InputMode = "understand" | "rewrite";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onNavigateHome?: () => void;
  isAnalyzing?: boolean;
  onMenuPress?: () => void;
  inputMode?: InputMode;
  onModeChange?: (mode: InputMode) => void;
  onPersonContextPress?: () => void;
  showPersonContext?: boolean;
  onDeepDecodePress?: () => void;
  showDeepDecode?: boolean;
  /** When provided, overrides the default new-loop behavior for the top-right button */
  onNewLoopPress?: () => void;
}

/**
 * Header Component
 *
 * Premium iOS-style top bar.
 *
 * Features:
 * - Left: Menu button with "Klarity" text
 * - Center: Animated orb appears only during analysis
 * - Right: New Loop button
 * - Semi-transparent black glass background (18% opacity)
 */
export function Header({
  title = "Klarity AI 1.0",
  showBackButton = false,
  onBackPress,
  onNavigateHome,
  isAnalyzing = false,
  onMenuPress,
  inputMode,
  onModeChange,
  onPersonContextPress,
  showPersonContext = true,
  onDeepDecodePress,
  showDeepDecode = true,
  onNewLoopPress,
}: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const createNewLoop = useLoopsStore((s) => s.createNewLoop);

  const handleNewLoop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onNewLoopPress) {
      onNewLoopPress();
      return;
    }
    createNewLoop();
    navigation.navigate("InputScreen" as never);
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.navigate("InputScreen" as never);
    }
  };

  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onMenuPress) {
      onMenuPress();
    }
  };

  const handleModeChange = (mode: InputMode) => {
    Haptics.selectionAsync();
    onModeChange?.(mode);
  };

  // Render the left side menu based on screen type
  const renderLeftMenu = () => {
    if (showBackButton) {
      return (
        <Pressable onPress={handleBackPress} className="active:opacity-60">
          <Ionicons name="chevron-back" size={28} color={colors.headerIcon} />
        </Pressable>
      );
    }

    // Menu button that opens the slide-over drawer
    return (
      <Pressable onPress={handleMenuPress} className="active:opacity-60">
        <Ionicons name="menu" size={28} color={colors.headerIcon} />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.headerBackground,
      }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Menu Button and Klarity text */}
        <View className="flex-row items-center">
          {renderLeftMenu()}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.headerText,
              marginLeft: 12,
            }}
          >
            Klarity
          </Text>
        </View>


        {/* Right - Deep Decode + Person Context Icon + Mode Toggle + New Loop Button */}
        <View className="flex-row items-center">
          {/* Deep Decode Button */}
          {showDeepDecode && onDeepDecodePress && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDeepDecodePress();
              }}
              className="active:opacity-60"
              style={{ marginRight: 12 }}
            >
              <Ionicons
                name="search-outline"
                size={22}
                color={colors.textTertiary}
              />
            </Pressable>
          )}

          {/* Person Context Icon - HIDDEN FOR NOW */}
          {/* {showPersonContext && onPersonContextPress && (
            <PersonContextHeaderIcon onPress={onPersonContextPress} />
          )} */}

          {/* Mode Toggle (only when onModeChange is provided) */}
          {onModeChange && inputMode && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: isDark ? "#1A1A1C" : "rgba(0, 0, 0, 0.06)",
                borderRadius: 14,
                padding: 2,
                marginRight: 12,
              }}
            >
              <Pressable
                onPress={() => handleModeChange("understand")}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: inputMode === "understand" ? (isDark ? "#2A2A2C" : "#FFFFFF") : "transparent",
                }}
              >
                <Text
                  style={{
                    color: inputMode === "understand" ? colors.textPrimary : colors.textTertiary,
                    fontSize: 11,
                    fontWeight: inputMode === "understand" ? "600" : "400",
                  }}
                >
                  Decode
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleModeChange("rewrite")}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: inputMode === "rewrite" ? (isDark ? "#2A2A2C" : "#FFFFFF") : "transparent",
                }}
              >
                <Text
                  style={{
                    color: inputMode === "rewrite" ? colors.textPrimary : colors.textTertiary,
                    fontSize: 11,
                    fontWeight: inputMode === "rewrite" ? "600" : "400",
                  }}
                >
                  Reply
                </Text>
              </Pressable>
            </View>
          )}

          {/* New Loop Button */}
          <Pressable onPress={handleNewLoop} className="active:opacity-60">
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.headerIcon} />
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 0,
                  right: 0,
                  bottom: 4,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={12} color={colors.headerIcon} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
