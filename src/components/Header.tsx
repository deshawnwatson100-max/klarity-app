import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityOrb } from "./KlarityOrb";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onNavigateHome?: () => void;
  isAnalyzing?: boolean;
  onMenuPress?: () => void;
}

/**
 * Header Component
 *
 * Premium iOS-style top bar with Klarity AI orb logo.
 *
 * Features:
 * - Left: Menu button that opens slide-over drawer
 * - Center: Multicolor glowing orb with breathing animation
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
        backgroundColor: "rgba(0, 0, 0, 0.18)",
      }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Menu Button */}
        {renderLeftMenu()}

        {/* Center - Klarity AI Orb */}
        <View className="flex-1 items-center">
          <KlarityOrb size="medium" isAnalyzing={isAnalyzing} />
        </View>

        {/* Right - New Loop Button */}
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
  );
}
