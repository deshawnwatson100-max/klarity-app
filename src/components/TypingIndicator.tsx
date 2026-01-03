import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";

const thinkingWords = [
  "Thinking...",
  "Processing...",
  "Analyzing...",
  "Reflecting...",
  "Understanding...",
];

export function TypingIndicator() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const wordIndexRef = useRef(0);

  useEffect(() => {
    const animateWord = () => {
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        // Update word index after fade out completes
        wordIndexRef.current = (wordIndexRef.current + 1) % thinkingWords.length;
        // Use setTimeout to defer state update outside animation callback
        setTimeout(() => {
          setCurrentWordIndex(wordIndexRef.current);
        }, 0);

        // Fade in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(animateWord, 2000);

    return () => clearInterval(interval);
  }, [opacity]);

  return (
    <View className="self-start mb-4 px-4">
      <Animated.View style={{ opacity }}>
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
