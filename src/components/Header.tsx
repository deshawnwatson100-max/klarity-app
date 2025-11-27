import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderProps {
  title?: string;
  showMenu?: boolean;
  onMenuPress?: () => void;
}

export function Header({ title = "Klarity AI 1.0", showMenu = true }: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-black border-b border-neutral-900"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 h-14">
        {/* Left - Menu */}
        <View className="w-10">
          {showMenu && (
            <Pressable
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              className="active:opacity-60"
            >
              <Ionicons name="menu" size={24} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Center - Title */}
        <Text className="text-white text-base font-semibold tracking-wide">
          {title}
        </Text>

        {/* Right - Actions */}
        <View className="flex-row items-center gap-3">
          <Pressable className="active:opacity-60">
            <Ionicons name="chevron-up" size={20} color="#9CA3AF" />
          </Pressable>
          <Pressable className="active:opacity-60">
            <Ionicons name="create-outline" size={20} color="#9CA3AF" />
          </Pressable>
          <Pressable className="active:opacity-60">
            <Ionicons name="add" size={20} color="#9CA3AF" />
          </Pressable>
          <Pressable className="active:opacity-60">
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
