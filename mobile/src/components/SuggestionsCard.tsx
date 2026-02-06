import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SuggestedResponse } from "../types/chat";
import { useTheme } from "../theme";

interface SuggestionsCardProps {
  suggestions: SuggestedResponse[];
  onSelectResponse: (response: SuggestedResponse) => void;
}

export function SuggestionsCard({
  suggestions,
  onSelectResponse,
}: SuggestionsCardProps) {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case "soften":
        return "heart-outline";
      case "direct":
        return "arrow-forward-outline";
      case "playful":
        return "happy-outline";
      default:
        return "chatbubble-outline";
    }
  };

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case "soften":
        return "Soften response";
      case "direct":
        return "Make it direct";
      case "playful":
        return "Make it playful";
      default:
        return tone;
    }
  };

  // Theme-aware colors
  const accentColor = isDark ? "#B4FF39" : "#34C759";
  const cardBg = isDark ? "#0A0A0B" : "#FFFFFF";
  const cardBorderColor = isDark ? "#262626" : "rgba(0, 0, 0, 0.08)";
  const itemBg = isDark ? "#171717" : "#F5F5F7";
  const itemBorderColor = isDark ? "#262626" : "rgba(0, 0, 0, 0.06)";
  const labelColor = isDark ? "#9CA3AF" : "#636366";
  const textColor = isDark ? "#D4D4D4" : "#3C3C43";
  const buttonBg = isDark ? "#B4FF39" : "#34C759";
  const buttonTextColor = isDark ? "#000000" : "#FFFFFF";

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View
        className="rounded-2xl p-5"
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
        <Text
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: labelColor }}
        >
          Suggested Responses
        </Text>

        <View className="gap-3">
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              onPress={() => onSelectResponse(suggestion)}
              className="active:opacity-70"
            >
              <View
                className="rounded-xl p-4"
                style={{
                  backgroundColor: itemBg,
                  borderWidth: 1,
                  borderColor: itemBorderColor,
                }}
              >
                {/* Tone Badge */}
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons
                    name={getToneIcon(suggestion.tone) as any}
                    size={16}
                    color={accentColor}
                  />
                  <Text className="text-xs font-medium" style={{ color: accentColor }}>
                    {getToneLabel(suggestion.tone)}
                  </Text>
                </View>

                {/* Response Text */}
                <Text className="text-base leading-6 mb-3" style={{ color: textColor }}>
                  {suggestion.text}
                </Text>

                {/* Use Button */}
                <View className="flex-row justify-end">
                  <View className="px-4 py-2 rounded-full" style={{ backgroundColor: buttonBg }}>
                    <Text className="text-sm font-semibold" style={{ color: buttonTextColor }}>
                      Use this reply
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
