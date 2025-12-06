import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

const thinkingWords = [
  "processing",
  "thinking",
  "analyzing",
  "structuring response",
  "clarifying",
];

export function TypingIndicator() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const opacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Cycle through words every 2 seconds
    const wordInterval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % thinkingWords.length);
    }, 2000);

    // Fade in/out animation for word transitions
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.bezier(0.4, 0.0, 0.2, 1) }),
        withTiming(1, { duration: 800 }), // Hold visible
        withTiming(0, { duration: 600, easing: Easing.bezier(0.4, 0.0, 0.2, 1) })
      ),
      -1,
      false
    );

    // Gentle glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.bezier(0.4, 0.0, 0.2, 1) }),
        withTiming(0.3, { duration: 1500, easing: Easing.bezier(0.4, 0.0, 0.2, 1) })
      ),
      -1,
      false
    );

    return () => clearInterval(wordInterval);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View className="flex-row items-center self-start mb-4 px-4">
      {/* Free-floating text with glow */}
      <View className="relative">
        {/* Glow effect behind text */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -8,
              left: -12,
              right: -12,
              bottom: -8,
              backgroundColor: "#B4FF39",
              borderRadius: 16,
              opacity: 0.15,
            },
            glowAnimatedStyle,
          ]}
        />

        {/* Animated text */}
        <Animated.View style={textAnimatedStyle}>
          <Text
            style={{
              fontFamily: "SF Pro Display",
              fontSize: 15,
              color: "#9CA3AF",
              fontWeight: "400",
              letterSpacing: 0.3,
            }}
          >
            {thinkingWords[currentWordIndex]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
