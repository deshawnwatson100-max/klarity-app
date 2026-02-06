import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeContext";

export interface DailyClaritySummary {
  date: string; // YYYY-MM-DD
  navigatedItems: string[];
  emotionalImpact: {
    summary: string;
    intensity: number; // 1-10
  };
  whatYouDidWell: string[];
  whatToImprove: string[];
  intentionForTomorrow: string;
}

interface DailyClaritySummaryCardProps {
  summary: DailyClaritySummary | null;
  onViewChatLoops: () => void;
}

export function DailyClaritySummaryCard({
  summary,
  onViewChatLoops,
}: DailyClaritySummaryCardProps) {
  const { colors, isDark } = useTheme();

  // Format date for display (e.g., "Jan 25")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Empty state
  if (!summary) {
    return (
      <Animated.View
        entering={FadeInDown.duration(300).springify()}
        className="mx-6 mb-4 rounded-3xl overflow-hidden"
        style={{
          backgroundColor: isDark ? "rgba(20, 20, 24, 0.6)" : colors.cardBackground,
          borderWidth: 1,
          borderColor: isDark ? "rgba(156, 163, 175, 0.1)" : colors.cardBorder,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: isDark ? 0 : 2 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: isDark ? 0 : 8,
        }}
      >
        <View className="p-6 items-center">
          <Ionicons name="analytics-outline" size={48} color={colors.textTertiary} />
          <Text
            className="text-center text-base mt-4 leading-6"
            style={{
              color: colors.textSecondary,
              fontFamily: "SF Pro Display",
            }}
          >
            No clarity summary yet. Reflect on today with Klarity to see your
            growth here.
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Render intensity bar (1-10 scale)
  const renderIntensityBar = (intensity: number) => {
    const percentage = (intensity / 10) * 100;
    const color =
      intensity <= 3
        ? "#10B981" // Green - low intensity
        : intensity <= 6
        ? "#F59E0B" // Orange - medium intensity
        : "#EF4444"; // Red - high intensity

    return (
      <View className="flex-row items-center gap-3 mt-2">
        <View
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{
            backgroundColor: isDark ? "rgba(156, 163, 175, 0.15)" : "rgba(0, 0, 0, 0.08)",
          }}
        >
          <LinearGradient
            colors={[color, color + "CC", color + "88"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: `${percentage}%`,
              height: "100%",
              borderRadius: 9999,
            }}
          />
        </View>
        <Text
          className="text-sm font-semibold"
          style={{
            color: color,
            minWidth: 30,
          }}
        >
          {intensity}/10
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      className="mx-6 mb-4 rounded-3xl overflow-hidden"
      style={{
        backgroundColor: isDark ? "rgba(20, 20, 24, 0.6)" : colors.cardBackground,
        borderWidth: 1,
        borderColor: isDark ? "rgba(156, 163, 175, 0.1)" : colors.cardBorder,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: isDark ? 4 : 2 },
        shadowOpacity: isDark ? 0.15 : 0.08,
        shadowRadius: isDark ? 12 : 10,
      }}
    >
      <View className="p-5">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="analytics" size={20} color={colors.info} />
            <Text
              className="text-lg font-semibold"
              style={{
                color: colors.textPrimary,
                fontFamily: "SF Pro Display",
              }}
            >
              Daily Clarity Summary
            </Text>
          </View>
          <Text
            className="text-sm font-medium"
            style={{
              color: colors.textSecondary,
            }}
          >
            {formatDate(summary.date)}
          </Text>
        </View>

        {/* Section 1: What you navigated */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              color: isDark ? "#E5E7EB" : colors.textPrimary,
              letterSpacing: 0.3,
            }}
          >
            What you navigated:
          </Text>
          {summary.navigatedItems.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1.5">
              <Text style={{ color: colors.info, fontSize: 12, marginTop: 2 }}>
                •
              </Text>
              <Text
                className="text-sm flex-1 leading-5"
                style={{
                  color: colors.textSecondary,
                  fontFamily: "SF Pro Display",
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Section 2: Emotional impact */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              color: isDark ? "#E5E7EB" : colors.textPrimary,
              letterSpacing: 0.3,
            }}
          >
            Emotional impact:
          </Text>
          <Text
            className="text-sm leading-5 mb-1"
            style={{
              color: colors.textSecondary,
              fontFamily: "SF Pro Display",
            }}
          >
            {summary.emotionalImpact.summary}
          </Text>
          {renderIntensityBar(summary.emotionalImpact.intensity)}
        </View>

        {/* Section 3: What you did well */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              color: isDark ? "#E5E7EB" : colors.textPrimary,
              letterSpacing: 0.3,
            }}
          >
            What you did well:
          </Text>
          {summary.whatYouDidWell.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1.5">
              <Text style={{ color: colors.success, fontSize: 12, marginTop: 2 }}>
                ✓
              </Text>
              <Text
                className="text-sm flex-1 leading-5"
                style={{
                  color: colors.textSecondary,
                  fontFamily: "SF Pro Display",
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Section 4: What you can improve */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              color: isDark ? "#E5E7EB" : colors.textPrimary,
              letterSpacing: 0.3,
            }}
          >
            What you can improve:
          </Text>
          {summary.whatToImprove.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1.5">
              <Text style={{ color: colors.warning, fontSize: 12, marginTop: 2 }}>
                →
              </Text>
              <Text
                className="text-sm flex-1 leading-5"
                style={{
                  color: colors.textSecondary,
                  fontFamily: "SF Pro Display",
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Section 5: Intention for tomorrow */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              color: isDark ? "#E5E7EB" : colors.textPrimary,
              letterSpacing: 0.3,
            }}
          >
            Intention for tomorrow:
          </Text>
          <Text
            className="text-sm leading-5 italic"
            style={{
              color: colors.textSecondary,
              fontFamily: "SF Pro Display",
            }}
          >
            {summary.intentionForTomorrow}
          </Text>
        </View>

        {/* View full chat loops button */}
        <Pressable
          onPress={onViewChatLoops}
          className="active:opacity-70 items-center pt-3"
          style={{
            borderTopWidth: 0.5,
            borderTopColor: isDark ? "rgba(156, 163, 175, 0.15)" : colors.divider,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Text
              className="text-sm font-medium"
              style={{
                color: colors.info,
                letterSpacing: 0.2,
              }}
            >
              View full chat loops
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.info} />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
