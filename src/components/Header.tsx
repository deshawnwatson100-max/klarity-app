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
 * Klarity Logo Icon - Represents clarity with an eye/lens and light rays
 * Minimalist style with organic and angular elements
 */
function KlarityLogoIcon({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer eye/lens shape - curved organic form */}
      <Path
        d="M2 12C2 12 6 5 12 5C18 5 22 12 22 12C22 12 18 19 12 19C6 19 2 12 2 12Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner iris circle */}
      <Path
        d="M12 8.5C13.933 8.5 15.5 10.067 15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* Center pupil/focus point */}
      <Path
        d="M12 10.5C12.8284 10.5 13.5 11.1716 13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5Z"
        stroke={color}
        strokeWidth={1.3}
      />
      {/* Light ray - top */}
      <Path
        d="M12 2V4"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* Light ray - bottom */}
      <Path
        d="M12 20V22"
        stroke={color}
        strokeWidth={1.4}
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
