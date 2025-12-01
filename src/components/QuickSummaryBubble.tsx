import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

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
  const translateY = useSharedValue(10);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const summaryItems = [
    { label: "Tone", value: tone, color: "#4C9CFF" },
    { label: "Pattern", value: pattern, color: "#B47CFF" },
    { label: "Emotional Impact", value: emotionalImpact, color: "#FF884D" },
    { label: "Core Issue", value: coreIssue, color: "#FFD755" },
  ];

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          maxWidth: "90%",
          marginBottom: 16,
        },
        animatedStyle,
      ]}
    >
      <View
        className="rounded-3xl px-5 py-5"
        style={{
          backgroundColor: "#0A0A0A",
          borderWidth: 1,
          borderColor: "#B47CFF30",
          shadowColor: "#B47CFF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        }}
      >
        {/* Header with icon */}
        <View className="flex-row items-center gap-2 mb-4">
          <Ionicons name="sparkles" size={18} color="#B47CFF" />
          <Text
            className="text-white text-base font-semibold"
            style={{ fontFamily: "SF Pro Display" }}
          >
            Quick Summary
          </Text>
        </View>

        {/* Summary items */}
        <View className="gap-3">
          {summaryItems.map((item, index) => (
            <View key={index} className="flex-row gap-3">
              {/* Color indicator */}
              <View
                style={{
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: item.color,
                  shadowColor: item.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                }}
              />
              {/* Content */}
              <View className="flex-1">
                <Text
                  className="text-white text-sm font-semibold mb-0.5"
                  style={{ fontFamily: "SF Pro Display" }}
                >
                  {item.label}:
                </Text>
                <Text
                  className="text-neutral-300 text-sm leading-5"
                  style={{ fontFamily: "SF Pro Display" }}
                >
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
