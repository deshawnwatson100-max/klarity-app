import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
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

export function VoiceProcessingIndicator() {
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
    <View className="absolute inset-0 bg-black/80 items-center justify-center z-50">
      <View className="bg-neutral-900 rounded-2xl p-6 items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Animated.View style={textAnimatedStyle} className="mt-4">
          <Text className="text-white text-base text-center">
            {thinkingWords[currentWordIndex]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
