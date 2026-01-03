import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
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

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current; // Subtle 4px drift
  const contentHeight = useRef(new Animated.Value(0)).current; // Start minimized

  useEffect(() => {
    // Gentle fade and drift - no bouncing, no elastic motion
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleMinimize = () => {
    if (isMinimized) {
      Animated.timing(contentHeight, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setIsMinimized(false);
      // Start the typewriter animation when card opens (only first time)
      if (!hasAnimated) {
        setTimeout(() => setShouldAnimate(true), 150);
      }
    } else {
      Animated.timing(contentHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setIsMinimized(true);
    }
  };

  const firstPattern = patterns && patterns.length > 0 ? patterns[0] : null;

  // Interpolate content height for expand/collapse animation
  const contentMaxHeight = contentHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        alignSelf: "flex-start",
        width: "100%",
        marginBottom: 20, // Generous vertical spacing
      }}
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
          <Animated.View
            style={{
              maxHeight: contentMaxHeight,
              opacity: contentHeight,
              overflow: "hidden",
            }}
          >
            {/* Summary text - ChatGPT style typewriter animation (starts on expand) */}
            {shouldAnimate && !hasAnimated ? (
              <TypewriterText
                text={summary}
                style={{
                  fontSize: 15,
                  lineHeight: 26,
                  color: "#ECECF1",
                }}
                speed={85}
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
