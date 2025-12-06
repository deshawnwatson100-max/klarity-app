import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const thinkingWords = [
  "Thinking…",
  "Processing…",
  "Analyzing…",
  "Reflecting…",
  "Understanding…",
];

export function TypingIndicator() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Start with fade in
    opacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });

    // Cycle through words
    const wordInterval = setInterval(() => {
      // Fade out
      opacity.value = withTiming(
        0,
        {
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        },
        () => {
          // Change word while invisible
          setCurrentWordIndex((prev) => (prev + 1) % thinkingWords.length);
          // Fade back in
          opacity.value = withTiming(1, {
            duration: 300,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          });
        }
      );
    }, 2000);

    return () => clearInterval(wordInterval);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="self-start mb-4 px-4">
      <Animated.View style={textAnimatedStyle}>
        <Text
          style={{
            fontFamily: "SF Pro Display",
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
