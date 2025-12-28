import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { TypewriterText } from "./TypewriterText";

interface DysfunctionalCommunicationCardProps {
  summary: string;
  patterns?: string[];
}

export function DysfunctionalCommunicationCard({
  summary,
  patterns,
}: DysfunctionalCommunicationCardProps) {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [hasAnimated, setHasAnimated] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false); // Track when to start animation

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(4); // Subtle 4px drift
  const contentHeight = useSharedValue(0); // Start minimized

  useEffect(() => {
    // Gentle fade and drift - no bouncing, no elastic motion
    opacity.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const handleMinimize = () => {
    if (isMinimized) {
      contentHeight.value = withTiming(1, { duration: 300 });
      setIsMinimized(false);
      // Start the typewriter animation when card opens (only first time)
      if (!hasAnimated) {
        setTimeout(() => setShouldAnimate(true), 150);
      }
    } else {
      contentHeight.value = withTiming(0, { duration: 300 });
      setIsMinimized(true);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      contentHeight.value,
      [0, 1],
      [0, 500],
      Extrapolation.CLAMP
    ),
    opacity: contentHeight.value,
    overflow: "hidden" as const,
  }));

  const firstPattern = patterns && patterns.length > 0 ? patterns[0] : null;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          alignSelf: "flex-start",
          width: "100%",
          marginBottom: 20, // Generous vertical spacing
        },
      ]}
    >
      {/* Pitch black card background */}
      <Pressable onPress={handleMinimize}>
        <View
          style={{
            backgroundColor: "#000000",
            borderRadius: 16,
            padding: 16,
          }}
        >
          {/* Header row */}
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="chatbubbles-outline"
              size={14}
              color="#3B82F6"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: "#3B82F6",
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              COMMUNICATION SUMMARY
            </Text>
          </View>

          {/* Minimized state */}
          {isMinimized && firstPattern && (
            <Text
              style={{
                fontSize: 14,
                color: "#9CA3AF",
                fontStyle: "italic",
              }}
            >
              {firstPattern} detected — tap to expand
            </Text>
          )}

          {/* Full content */}
          <Animated.View style={contentAnimatedStyle}>
            {/* Summary text - ChatGPT style typewriter animation (starts on expand) */}
            {shouldAnimate && !hasAnimated ? (
              <TypewriterText
                text={summary}
                style={{
                  fontSize: 15,
                  lineHeight: 26,
                  color: "#ECECF1",
                }}
                speed={120}
                onComplete={() => setHasAnimated(true)}
              />
            ) : hasAnimated ? (
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 26,
                  color: "#ECECF1",
                }}
              >
                {summary}
              </Text>
            ) : null}

            {/* Pattern labels */}
            {patterns && patterns.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {patterns.map((pattern, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "transparent",
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "#374151",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#9CA3AF",
                        fontWeight: "400",
                      }}
                    >
                      {pattern}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
