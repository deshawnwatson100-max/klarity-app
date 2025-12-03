import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface DeepAnalysisBubbleProps {
  content: string;
}

export function DeepAnalysisBubble({ content }: DeepAnalysisBubbleProps) {
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
          borderColor: "#9CA3AF15",
          shadowColor: "#505050",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        }}
      >
        <Text
          style={{ fontFamily: "SF Pro Display", color: "#E5E7EB" }}
          className="text-base leading-6"
        >
          {content}
        </Text>
      </View>
    </Animated.View>
  );
}
