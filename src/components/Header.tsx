import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoopsStore } from "../state/loopsStore";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

/**
 * Header Component
 *
 * Top navigation bar with:
 * - Left: Past Loops button (clock icon)
 * - Center: App title
 * - Right: New Loop button
 */
export function Header({
  title = "Klarity AI 1.0",
  showBackButton = false,
  onBackPress,
}: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const toggleHistoryPanel = useLoopsStore((s) => s.toggleHistoryPanel);

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

  return (
    <View
      className="bg-black border-b border-neutral-900"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Past Loops Button */}
        <Pressable
          onPress={toggleHistoryPanel}
          className="active:opacity-60"
        >
          <Ionicons name="time-outline" size={24} color="#9CA3AF" />
        </Pressable>

        {/* Center - Title */}
        <Text className="text-white text-base font-semibold tracking-wide">
          {title}
        </Text>

        {/* Right - New Loop Button */}
        <Pressable onPress={handleNewLoop} className="active:opacity-60">
          <Ionicons name="add-circle-outline" size={24} color="#9CA3AF" />
        </Pressable>
      </View>
    </View>
  );
}
