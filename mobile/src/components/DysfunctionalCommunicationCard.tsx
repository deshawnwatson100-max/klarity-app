import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TypewriterText } from "./TypewriterText";
import { useTheme } from "../theme/ThemeContext";

interface DysfunctionalCommunicationCardProps {
  summary: string;
  patterns?: string[];
  responseGuidance?: string;
  communicationMistake?: {
    mistake: string;
    whyAvoid: string;
  };
}

export function DysfunctionalCommunicationCard({
  summary,
  patterns,
  responseGuidance,
  communicationMistake,
}: DysfunctionalCommunicationCardProps) {
  const { colors, isDark } = useTheme();
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
    outputRange: [0, 700],
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
      {/* Card background - adapts to theme */}
      <Pressable onPress={handleMinimize}>
        <View
          style={{
            backgroundColor: isDark ? "#000000" : colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            borderWidth: isDark ? 0 : 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: isDark ? 0 : 2 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: isDark ? 0 : 8,
          }}
        >
          {/* Header row */}
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="chatbubbles-outline"
              size={14}
              color={colors.info}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: colors.info,
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
                color: colors.textSecondary,
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
                  color: isDark ? "#ECECF1" : colors.textPrimary,
                }}
                speed={85}
                onComplete={() => setHasAnimated(true)}
              />
            ) : hasAnimated ? (
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 26,
                  color: isDark ? "#ECECF1" : colors.textPrimary,
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
                      borderColor: isDark ? "#374151" : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        fontWeight: "400",
                      }}
                    >
                      {pattern}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Response Guidance */}
            {responseGuidance && (
              <View style={{ marginTop: 16 }}>
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name="bulb-outline"
                    size={13}
                    color={isDark ? "#60A5FA" : "#3B82F6"}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isDark ? "#60A5FA" : "#3B82F6",
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                    }}
                  >
                    How to Respond
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: isDark ? "#D1D5DB" : colors.textSecondary,
                  }}
                >
                  {responseGuidance}
                </Text>
              </View>
            )}

            {/* Communication Mistake Warning */}
            {communicationMistake && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: isDark ? "#1C1917" : "#FEF3C7",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: isDark ? "#44403C" : "#FCD34D",
                }}
              >
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color={isDark ? "#FBBF24" : "#D97706"}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isDark ? "#FBBF24" : "#D97706",
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                    }}
                  >
                    Watch Out For
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: isDark ? "#FDE68A" : "#92400E",
                    fontWeight: "500",
                    marginBottom: 4,
                  }}
                >
                  {communicationMistake.mistake}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 20,
                    color: isDark ? "#D6D3D1" : "#78716C",
                  }}
                >
                  {communicationMistake.whyAvoid}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
