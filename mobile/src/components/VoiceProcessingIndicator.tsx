import React, { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, Animated, Easing } from "react-native";

const thinkingWords = [
  "Thinking...",
  "Processing...",
  "Analyzing...",
  "Reflecting...",
  "Understanding...",
];

export function VoiceProcessingIndicator() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        // Change word and fade in
        setCurrentWordIndex((prev) => (prev + 1) % thinkingWords.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }).start();
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <View
        style={{
          backgroundColor: "#171717",
          borderRadius: 16,
          padding: 24,
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Animated.View style={{ marginTop: 16, opacity: opacity }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              textAlign: "center",
            }}
          >
            {thinkingWords[currentWordIndex]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
