import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityOrb } from "./KlarityOrb";
import * as DropdownMenu from "zeego/dropdown-menu";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

/**
 * Header Component
 *
 * Premium iOS-style top bar with Klarity AI orb logo.
 *
 * Features:
 * - Left: Menu dropdown (Calendar, Past Loops)
 * - Center: Multicolor glowing orb with breathing animation
 * - Right: New Loop button
 * - Semi-transparent black glass background (18% opacity)
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

  const handleCalendar = () => {
    navigation.navigate("CalendarScreen" as never);
  };

  const handlePastLoops = () => {
    toggleHistoryPanel();
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "rgba(0, 0, 0, 0.18)",
      }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Back Button or Menu Dropdown */}
        {showBackButton ? (
          <Pressable onPress={handleBackPress} className="active:opacity-60">
            <Ionicons name="chevron-back" size={28} color="#9CA3AF" />
          </Pressable>
        ) : (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Pressable className="active:opacity-60">
                <Ionicons name="menu" size={28} color="#9CA3AF" />
              </Pressable>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              <DropdownMenu.Item key="calendar" onSelect={handleCalendar}>
                <DropdownMenu.ItemIcon
                  ios={{
                    name: "calendar",
                    pointSize: 18,
                  }}
                />
                <DropdownMenu.ItemTitle>Calendar</DropdownMenu.ItemTitle>
              </DropdownMenu.Item>

              <DropdownMenu.Item key="past-loops" onSelect={handlePastLoops}>
                <DropdownMenu.ItemIcon
                  ios={{
                    name: "clock",
                    pointSize: 18,
                  }}
                />
                <DropdownMenu.ItemTitle>Past Loops</DropdownMenu.ItemTitle>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}

        {/* Center - Klarity AI Orb */}
        <View className="flex-1 items-center">
          <KlarityOrb size="medium" />
        </View>

        {/* Right - New Loop Button */}
        <Pressable onPress={handleNewLoop} className="active:opacity-60">
          <Ionicons name="add-circle-outline" size={24} color="#9CA3AF" />
        </Pressable>
      </View>
    </View>
  );
}
