import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
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
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Function to cycle to next word
    const cycleWord = () => {
      setCurrentWordIndex((prev) => (prev + 1) % thinkingWords.length);
    };

    // Start animation loop
    const startAnimation = () => {
      opacity.value = withSequence(
        withTiming(1, { duration: 300 }), // Hold visible
        withTiming(0, {
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1)
        }), // Fade out
        withTiming(0, { duration: 0 }, (finished) => {
          if (finished) {
            runOnJS(cycleWord)();
          }
        }), // Change word
        withTiming(1, {
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1)
        }) // Fade in
      );
    };

    // Initial animation
    startAnimation();

    // Set interval to restart animation
    const interval = setInterval(() => {
      startAnimation();
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
