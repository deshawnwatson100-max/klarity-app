import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface DysfunctionalCommunicationCardProps {
  summary: string;
  patterns?: string[];
}

export function DysfunctionalCommunicationCard({
  summary,
  patterns,
}: DysfunctionalCommunicationCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
    scale.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View
        className="rounded-2xl px-5 py-4 overflow-hidden"
        style={{
          backgroundColor: "#111113",
          borderWidth: 1,
          borderColor: "#262628",
        }}
      >
        {/* Header row with icon */}
        <View className="flex-row items-center mb-3">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#1F1F22",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={14} color="#9CA3AF" />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#9CA3AF",
              letterSpacing: 0.3,
            }}
          >
            Communication Pattern
          </Text>
        </View>

        {/* Summary - emotionally intelligent framing without advice */}
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: "#E5E7EB",
            letterSpacing: 0.2,
          }}
        >
          {summary}
        </Text>

        {/* Pattern labels if provided */}
        {patterns && patterns.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {patterns.map((pattern, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#1A1A1C",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 0.5,
                  borderColor: "#333336",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#9CA3AF",
                    fontWeight: "500",
                  }}
                >
                  {pattern}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
