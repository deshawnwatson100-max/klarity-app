import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TypewriterText } from "./TypewriterText";
import { DECODE_EMOJIS } from "../utils/decodeEmoji";
import { useTheme } from "../theme";

interface RedFlag {
  text: string;
}

interface RedFlagsCardProps {
  introText: string;
  flags: RedFlag[];
}

// Muted red color palette for luxury feel
const MUTED_RED = "#B86B6B";
const MUTED_RED_SOFT = "rgba(184, 107, 107, 0.6)";

export function RedFlagsCard({ introText, flags }: RedFlagsCardProps) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAnimatedIntro, setHasAnimatedIntro] = useState(false);
  const [animatedFlagIndex, setAnimatedFlagIndex] = useState(-1);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;
  const contentHeight = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle fade and drift on mount
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

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    Animated.parallel([
      Animated.timing(contentHeight, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: newExpanded ? 1 : 0,
        duration: newExpanded ? 350 : 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(chevronRotation, {
        toValue: newExpanded ? 180 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Interpolate content height for expand/collapse animation
  const contentMaxHeight = contentHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
    extrapolate: "clamp",
  });

  const chevronRotate = chevronRotation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  // Don't render if no flags
  if (!flags || flags.length === 0) {
    return null;
  }

  // Theme-aware colors
  const cardBg = isDark ? "#000000" : "#FFFFFF";
  const cardBorderColor = isDark ? "transparent" : "rgba(0, 0, 0, 0.08)";
  const chevronColor = isDark ? "#6B7280" : "#8E8E93";
  const introTextColor = isDark ? "#9CA3AF" : "#636366";
  const flagTextColor = isDark ? "#D1D5DB" : "#3C3C43";

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        alignSelf: "flex-start",
        width: "100%",
        marginBottom: 20,
      }}
    >
      <Pressable onPress={handleToggle}>
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 16,
            borderWidth: isDark ? 0 : 1,
            borderColor: cardBorderColor,
            shadowColor: isDark ? "transparent" : "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 8,
          }}
        >
          {/* Header row - always visible */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text style={{ fontSize: 14, marginRight: 6 }}>{DECODE_EMOJIS.RED_FLAG}</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: MUTED_RED,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                Red Flags
              </Text>
            </View>

            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <Ionicons name="chevron-down" size={16} color={chevronColor} />
            </Animated.View>
          </View>

          {/* Expandable content */}
          <Animated.View
            style={{
              maxHeight: contentMaxHeight,
              opacity: contentOpacity,
              overflow: "hidden",
            }}
          >
            {/* Intro text */}
            {!hasAnimatedIntro ? (
              <TypewriterText
                text={introText}
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: introTextColor,
                  marginTop: 12,
                  fontStyle: "italic",
                }}
                speed={85}
                onComplete={() => {
                  setHasAnimatedIntro(true);
                  setAnimatedFlagIndex(0);
                }}
              />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: introTextColor,
                  marginTop: 12,
                  fontStyle: "italic",
                }}
              >
                {introText}
              </Text>
            )}

            {/* Flags list */}
            <View style={{ marginTop: 12 }}>
              {flags.map((flag, index) => (
                <View
                  key={index}
                  className="flex-row items-start"
                  style={{ marginBottom: index < flags.length - 1 ? 10 : 0 }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: MUTED_RED_SOFT,
                      marginTop: 6,
                      marginRight: 10,
                    }}
                  />
                  {animatedFlagIndex === index ? (
                    <View style={{ flex: 1 }}>
                      <TypewriterText
                        text={flag.text}
                        style={{
                          fontSize: 14,
                          lineHeight: 21,
                          color: flagTextColor,
                        }}
                        speed={70}
                        onComplete={() => setAnimatedFlagIndex(index + 1)}
                      />
                    </View>
                  ) : animatedFlagIndex > index ? (
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 21,
                        color: flagTextColor,
                        flex: 1,
                      }}
                    >
                      {flag.text}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
