import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`mb-4 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-neutral-900 border border-[#B4FF39]"
            : "bg-neutral-900 border border-neutral-800"
        }`}
      >
        <Text className="text-white text-base leading-6">{content}</Text>
      </View>
    </Animated.View>
  );
}
