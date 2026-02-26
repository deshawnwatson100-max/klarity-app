import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";
import { useLoopsStore } from "../state/loopsStore";
import { useTheme } from "../theme";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function ArchivedChatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();

  const archivedLoops = useLoopsStore((s) => s.archivedLoops);
  const unarchiveLoop = useLoopsStore((s) => s.unarchiveLoop);
  const deleteArchivedLoop = useLoopsStore((s) => s.deleteArchivedLoop);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.divider,
        }}
      >
        <View className="flex-row items-center justify-between px-4 h-14">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            className="active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </Pressable>
          <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            Archived Chats
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      {archivedLoops.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.surfaceElevated,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="archive-outline" size={32} color={colors.textTertiary} />
          </View>
          <Text className="text-base font-semibold text-center mb-2" style={{ color: colors.textPrimary }}>
            No archived chats
          </Text>
          <Text className="text-sm text-center" style={{ color: colors.textTertiary }}>
            Swipe left on a chat in the drawer to archive it
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}
        >
          {archivedLoops.map((loop, index) => (
            <View
              key={loop.id}
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                backgroundColor: colors.surface,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <View className="px-4 py-3.5">
                {/* Title row */}
                <View className="flex-row items-start justify-between mb-1.5">
                  <Text
                    className="text-sm font-semibold flex-1 mr-3"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {loop.title}
                  </Text>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        unarchiveLoop(loop.id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="active:opacity-60"
                    >
                      <Ionicons name="arrow-undo-outline" size={18} color="#10B981" />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        deleteArchivedLoop(loop.id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="active:opacity-60"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error || "#EF4444"} />
                    </Pressable>
                  </View>
                </View>
                {/* Preview */}
                <Text
                  className="text-xs"
                  style={{ color: colors.textTertiary }}
                  numberOfLines={2}
                >
                  {loop.messages.filter((m) => m.role === "user")[0]?.content?.substring(0, 80) || "No messages"}
                </Text>
                {/* Clarity badge */}
                {loop.emotionalClarity !== undefined && (
                  <View className="flex-row items-center mt-2">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          loop.emotionalClarity >= 70
                            ? "#10B981"
                            : loop.emotionalClarity >= 40
                            ? "#F59E0B"
                            : "#EF4444",
                        marginRight: 5,
                      }}
                    />
                    <Text className="text-xs" style={{ color: colors.textTertiary }}>
                      {loop.emotionalClarity}% clarity
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
