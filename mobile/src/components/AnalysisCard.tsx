import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { EmotionalAnalysis } from "../types/chat";
import { useTheme } from "../theme";

interface AnalysisCardProps {
  analysis: EmotionalAnalysis;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "#10B981";
      case "medium":
        return "#F59E0B";
      case "high":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  // Theme-aware colors
  const accentColor = isDark ? "#B4FF39" : "#34C759";
  const cardBg = isDark ? "#0A0A0B" : "#FFFFFF";
  const cardBorderColor = isDark ? "#B4FF39" : "rgba(0, 0, 0, 0.08)";
  const labelColor = isDark ? "#9CA3AF" : "#636366";
  const valueColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const trackBg = isDark ? "#262626" : "#E5E5EA";
  const dividerColor = isDark ? "#262626" : "rgba(0, 0, 0, 0.08)";
  const summaryTextColor = isDark ? "#D4D4D4" : "#3C3C43";

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View
        className="rounded-2xl p-5 overflow-hidden"
        style={{
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: cardBorderColor,
          shadowColor: isDark ? "transparent" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 8,
        }}
      >
        {/* Subtle glow effect */}
        <View
          className="absolute top-0 left-0 right-0 h-px"
          style={{ backgroundColor: accentColor, opacity: isDark ? 0.3 : 0.5 }}
        />

        <Text
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: accentColor }}
        >
          Emotional Analysis
        </Text>

        {/* Grid of metrics */}
        <View className="gap-4">
          {/* Emotional Clarity */}
          <View>
            <Text className="text-sm mb-2" style={{ color: labelColor }}>
              Emotional Clarity
            </Text>
            <View className="flex-row items-center gap-3">
              <View
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: trackBg }}
              >
                <View
                  className="h-full rounded-full"
                  style={{ width: `${analysis.emotionalClarity}%`, backgroundColor: accentColor }}
                />
              </View>
              <Text
                className="text-lg font-semibold w-12 text-right"
                style={{ color: valueColor }}
              >
                {analysis.emotionalClarity}%
              </Text>
            </View>
          </View>

          {/* Detected State */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: labelColor }}>Detected State</Text>
            <Text className="text-base font-medium" style={{ color: valueColor }}>
              {analysis.detectedState}
            </Text>
          </View>

          {/* Relationship Risk */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: labelColor }}>Relationship Risk</Text>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getRiskColor(analysis.relationshipRisk) + "20" }}
            >
              <Text
                className="text-sm font-semibold uppercase"
                style={{ color: getRiskColor(analysis.relationshipRisk) }}
              >
                {analysis.relationshipRisk}
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View className="mt-2 pt-4" style={{ borderTopWidth: 1, borderTopColor: dividerColor }}>
            <Text className="text-sm mb-2" style={{ color: labelColor }}>Summary</Text>
            <Text className="text-base leading-6" style={{ color: summaryTextColor }}>
              {analysis.summary}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
