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

interface AnalysisCardProps {
  analysis: EmotionalAnalysis;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
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

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View className="bg-neutral-950 border border-[#B4FF39] rounded-2xl p-5 overflow-hidden">
        {/* Subtle glow effect */}
        <View
          className="absolute top-0 left-0 right-0 h-px"
          style={{ backgroundColor: "#B4FF39", opacity: 0.3 }}
        />

        <Text className="text-[#B4FF39] text-xs font-semibold uppercase tracking-wider mb-4">
          Emotional Analysis
        </Text>

        {/* Grid of metrics */}
        <View className="gap-4">
          {/* Emotional Clarity */}
          <View>
            <Text className="text-neutral-400 text-sm mb-2">
              Emotional Clarity
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-[#B4FF39] rounded-full"
                  style={{ width: `${analysis.emotionalClarity}%` }}
                />
              </View>
              <Text className="text-white text-lg font-semibold w-12 text-right">
                {analysis.emotionalClarity}%
              </Text>
            </View>
          </View>

          {/* Detected State */}
          <View className="flex-row items-center justify-between">
            <Text className="text-neutral-400 text-sm">Detected State</Text>
            <Text className="text-white text-base font-medium">
              {analysis.detectedState}
            </Text>
          </View>

          {/* Relationship Risk */}
          <View className="flex-row items-center justify-between">
            <Text className="text-neutral-400 text-sm">Relationship Risk</Text>
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
          <View className="mt-2 pt-4 border-t border-neutral-800">
            <Text className="text-neutral-400 text-sm mb-2">Summary</Text>
            <Text className="text-neutral-200 text-base leading-6">
              {analysis.summary}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
