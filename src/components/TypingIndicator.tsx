import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const thinkingWords = [
  "Thinking...",
  "Processing...",
  "Analyzing...",
  "Reflecting...",
  "Understanding...",
];

export function TypingIndicator() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });

      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % thinkingWords.length);
        opacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        });
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="self-start mb-4 px-4">
      <Animated.View style={textAnimatedStyle}>
        <Text
          style={{
            fontSize: 15,
            color: "#9CA3AF",
            fontWeight: "400",
          }}
        >
          {thinkingWords[currentWordIndex]}
        </Text>
      </Animated.View>
    </View>
  );
}
