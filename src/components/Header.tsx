import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatStore } from "../state/chatStore";

interface HeaderProps {
  title?: string;
  showMenu?: boolean;
  onMenuPress?: () => void;
}

export function Header({ title = "Klarity AI 1.0", showMenu = true }: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const clearMessages = useChatStore((s) => s.clearMessages);

  const handleNewChat = () => {
    clearMessages();
    navigation.navigate("InputScreen" as never);
  };

  return (
    <View
      className="bg-black border-b border-neutral-900"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Menu (placeholder for now) */}
        <View className="w-10">
          {showMenu && (
            <Pressable
              onPress={handleNewChat}
              className="active:opacity-60"
            >
              <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Center - Title */}
        <Text className="text-white text-base font-semibold tracking-wide">
          {title}
        </Text>

        {/* Right - Actions */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={handleNewChat}
            className="active:opacity-60"
          >
            <Ionicons name="add" size={22} color="#9CA3AF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
