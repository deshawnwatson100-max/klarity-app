import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityOrb } from "./KlarityOrb";

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
}: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const createNewLoop = useLoopsStore((s) => s.createNewLoop);

  const handleNewLoop = () => {
    createNewLoop();
    navigation.navigate("InputScreen" as never);
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.navigate("InputScreen" as never);
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
  };

  // Render the left side menu based on screen type
  const renderLeftMenu = () => {
    if (showBackButton) {
      return (
        <Pressable onPress={handleBackPress} className="active:opacity-60">
          <Ionicons name="chevron-back" size={28} color="#9CA3AF" />
        </Pressable>
      );
    }

    // Menu button that opens the slide-over drawer
    return (
      <Pressable onPress={handleMenuPress} className="active:opacity-60">
        <Ionicons name="menu" size={28} color="#9CA3AF" />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "#111111",
      }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Menu Button and Klarity text */}
        <View className="flex-row items-center">
          {renderLeftMenu()}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#EDEDED",
              marginLeft: 12,
              letterSpacing: 0.5,
            }}
          >
            Klarity
          </Text>
        </View>

        {/* Center - Klarity Orb (only when analyzing) */}
        {isAnalyzing && (
          <View className="absolute left-0 right-0 items-center" pointerEvents="none">
            <KlarityOrb size="medium" isAnalyzing={isAnalyzing} />
          </View>
        )}

        {/* Right - Mode Toggle + New Loop Button */}
        <View className="flex-row items-center">
          {/* Mode Toggle (only when onModeChange is provided) */}
          {onModeChange && inputMode && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#1A1A1C",
                borderRadius: 14,
                padding: 2,
                marginRight: 12,
              }}
            >
              <Pressable
                onPress={() => onModeChange("understand")}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: inputMode === "understand" ? "#2A2A2C" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: inputMode === "understand" ? "#F9FAFB" : "#6B7280",
                    fontSize: 11,
                    fontWeight: inputMode === "understand" ? "600" : "400",
                  }}
                >
                  Understand
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onModeChange("rewrite")}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: inputMode === "rewrite" ? "#2A2A2C" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: inputMode === "rewrite" ? "#F9FAFB" : "#6B7280",
                    fontSize: 11,
                    fontWeight: inputMode === "rewrite" ? "600" : "400",
                  }}
                >
                  Rewrite
                </Text>
              </Pressable>
            </View>
          )}

          {/* New Loop Button */}
          <Pressable onPress={handleNewLoop} className="active:opacity-60">
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
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
                <Ionicons name="add" size={12} color="#9CA3AF" />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
