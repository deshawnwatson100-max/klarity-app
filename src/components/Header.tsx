import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { useLoopsStore } from "../state/loopsStore";
import { PersonContextHeaderIcon } from "./PersonContextHeaderIcon";

/**
 * Klarity Logo Icon - Abstract geometric outline with curves and edges
 * Minimalist style with organic and angular elements
 */
function KlarityLogoIcon({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer rounded hexagon with soft corners */}
      <Path
        d="M12 2C12 2 18 5 20 8C22 11 22 13 20 16C18 19 12 22 12 22C12 22 6 19 4 16C2 13 2 11 4 8C6 5 12 2 12 2Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner angular crystal shape */}
      <Path
        d="M12 6L16.5 10L14 12L16.5 14L12 18L7.5 14L10 12L7.5 10L12 6Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center curved element */}
      <Path
        d="M10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14C10.9 14 10 13.1 10 12Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

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
}: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const createNewLoop = useLoopsStore((s) => s.createNewLoop);

  const handleNewLoop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          <View style={{ marginLeft: 10 }}>
            <KlarityLogoIcon size={22} color="#FFFFFF" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#EDEDED",
              marginLeft: 6,
              letterSpacing: 0.5,
            }}
          >
            Klarity
          </Text>
        </View>


        {/* Right - Person Context Icon + Mode Toggle + New Loop Button */}
        <View className="flex-row items-center">
          {/* Person Context Icon */}
          {showPersonContext && onPersonContextPress && (
            <PersonContextHeaderIcon onPress={onPersonContextPress} />
          )}

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
                onPress={() => handleModeChange("understand")}
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
                  Decode
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleModeChange("rewrite")}
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
                  Reply
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
