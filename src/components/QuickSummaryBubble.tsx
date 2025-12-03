import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface QuickSummaryBubbleProps {
  tone: string;
  pattern: string;
  emotionalImpact: string;
  coreIssue: string;
}

export function QuickSummaryBubble({
  tone,
  pattern,
  emotionalImpact,
  coreIssue,
}: QuickSummaryBubbleProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const summaryItems = [
    { label: "Tone", value: tone, color: "#A3E635" },
    { label: "Pattern", value: pattern, color: "#A3E635" },
    { label: "Emotional Impact", value: emotionalImpact, color: "#A3E635" },
    { label: "Core Issue", value: coreIssue, color: "#A3E635" },
  ];

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          marginVertical: 20,
          paddingHorizontal: 16,
        },
        animatedStyle,
      ]}
    >
      <View
        className="rounded-2xl px-6 py-6"
        style={{
          backgroundColor: "#0A0A0A",
          borderWidth: 1.5,
          borderColor: "#A3E63540",
          shadowColor: "#A3E635",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        }}
      >
        {/* Header */}
        <Text
          className="text-white text-lg font-bold mb-5"
          style={{ fontFamily: "SF Pro Display" }}
        >
          Quick Summary
        </Text>

        {/* Summary items */}
        <View className="gap-4">
          {summaryItems.map((item, index) => (
            <View key={index}>
              {/* Section title */}
              <Text
                className="text-sm font-semibold mb-1.5"
                style={{
                  fontFamily: "SF Pro Display",
                  color: item.color,
                }}
              >
                {item.label}
              </Text>
              {/* Section content */}
              <Text
                className="text-neutral-300 text-sm leading-5"
                style={{ fontFamily: "SF Pro Display" }}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
