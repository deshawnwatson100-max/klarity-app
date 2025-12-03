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
          backgroundColor: "#0E0E0F",
          borderWidth: 1,
          borderColor: "#C7B5FF20",
          shadowColor: "#F7B8D4",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        }}
      >
        <Text
          style={{ fontFamily: "SF Pro Display", color: "#E6E6E6" }}
          className="text-base leading-6"
        >
          {content}
        </Text>
      </View>
    </Animated.View>
  );
}
