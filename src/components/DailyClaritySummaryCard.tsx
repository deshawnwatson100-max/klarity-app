import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

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
          backgroundColor: "rgba(20, 20, 24, 0.6)",
          borderWidth: 1,
          borderColor: "rgba(156, 163, 175, 0.1)",
        }}
      >
        <View className="p-6 items-center">
          <Ionicons name="analytics-outline" size={48} color="#6B7280" />
          <Text
            className="text-center text-base mt-4 leading-6"
            style={{
              color: "#9CA3AF",
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
            backgroundColor: "rgba(156, 163, 175, 0.15)",
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
        backgroundColor: "rgba(20, 20, 24, 0.6)",
        borderWidth: 1,
        borderColor: "rgba(156, 163, 175, 0.1)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      }}
    >
      <View className="p-5">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="analytics" size={20} color="#60A5FA" />
            <Text
              className="text-lg font-semibold"
              style={{
                color: "#F9FAFB",
                fontFamily: "SF Pro Display",
              }}
            >
              Daily Clarity Summary
            </Text>
          </View>
          <Text
            className="text-sm font-medium"
            style={{
              color: "#9CA3AF",
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
              color: "#E5E7EB",
              letterSpacing: 0.3,
            }}
          >
            What you navigated:
          </Text>
          {summary.navigatedItems.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1.5">
              <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2 }}>
                •
              </Text>
              <Text
                className="text-sm flex-1 leading-5"
                style={{
                  color: "#D1D5DB",
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
              color: "#E5E7EB",
              letterSpacing: 0.3,
            }}
          >
            Emotional impact:
          </Text>
          <Text
            className="text-sm leading-5 mb-1"
            style={{
              color: "#D1D5DB",
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
              color: "#E5E7EB",
              letterSpacing: 0.3,
            }}
          >
            What you did well:
          </Text>
          {summary.whatYouDidWell.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1.5">
              <Text style={{ color: "#10B981", fontSize: 12, marginTop: 2 }}>
                ✓
              </Text>
              <Text
                className="text-sm flex-1 leading-5"
                style={{
                  color: "#D1D5DB",
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
              color: "#E5E7EB",
              letterSpacing: 0.3,
            }}
          >
            What you can improve:
          </Text>
          {summary.whatToImprove.map((item, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1.5">
              <Text style={{ color: "#F59E0B", fontSize: 12, marginTop: 2 }}>
                →
              </Text>
              <Text
                className="text-sm flex-1 leading-5"
                style={{
                  color: "#D1D5DB",
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
              color: "#E5E7EB",
              letterSpacing: 0.3,
            }}
          >
            Intention for tomorrow:
          </Text>
          <Text
            className="text-sm leading-5 italic"
            style={{
              color: "#D1D5DB",
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
            borderTopColor: "rgba(156, 163, 175, 0.15)",
          }}
        >
          <View className="flex-row items-center gap-2">
            <Text
              className="text-sm font-medium"
              style={{
                color: "#60A5FA",
                letterSpacing: 0.2,
              }}
            >
              View full chat loops
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#60A5FA" />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
