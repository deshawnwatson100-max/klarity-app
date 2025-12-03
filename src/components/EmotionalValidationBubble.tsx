import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface EmotionalValidationBubbleProps {
  content: string;
}

export function EmotionalValidationBubble({ content }: EmotionalValidationBubbleProps) {
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
          backgroundColor: "#050608",
          borderWidth: 1,
          borderColor: "#B5FF4B20",
          shadowColor: "#B5FF4B",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        }}
      >
        <Text
          className="text-base leading-6"
          style={{ fontFamily: "SF Pro Display", color: "#F9FAFB" }}
        >
          {content}
        </Text>
      </View>
    </Animated.View>
  );
}
