import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type IntentionType = "improve" | "distance" | "maintain" | "clarity";

interface TailoredGuidanceBubbleProps {
  content: string;
  intention: IntentionType;
}

const intentionColors: Record<IntentionType, string> = {
  improve: "#4C9CFF",
  distance: "#FF884D",
  maintain: "#FFD755",
  clarity: "#B47CFF",
};

export function TailoredGuidanceBubble({
  content,
  intention,
}: TailoredGuidanceBubbleProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const color = intentionColors[intention];

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          maxWidth: "85%",
          marginBottom: 16,
        },
        animatedStyle,
      ]}
    >
      <View
        className="rounded-3xl px-5 py-4"
        style={{
          backgroundColor: "#0A0A0A",
          borderWidth: 1,
          borderColor: `${color}30`,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }}
      >
        <Text
          className="text-white text-base leading-6"
          style={{ fontFamily: "SF Pro Display" }}
        >
          {content}
        </Text>
      </View>
    </Animated.View>
  );
}
