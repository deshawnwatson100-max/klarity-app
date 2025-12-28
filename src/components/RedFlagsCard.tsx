import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";
import { TypewriterText } from "./TypewriterText";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAnimatedIntro, setHasAnimatedIntro] = useState(false);
  const [animatedFlagIndex, setAnimatedFlagIndex] = useState(-1);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(4);
  const contentHeight = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  useEffect(() => {
    // Gentle fade and drift on mount
    opacity.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    contentHeight.value = withTiming(newExpanded ? 1 : 0, { duration: 300 });
    contentOpacity.value = withTiming(newExpanded ? 1 : 0, {
      duration: newExpanded ? 350 : 200,
      easing: Easing.out(Easing.quad),
    });
    chevronRotation.value = withTiming(newExpanded ? 180 : 0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      contentHeight.value,
      [0, 1],
      [0, 400],
      Extrapolation.CLAMP
    ),
    opacity: contentOpacity.value,
    overflow: "hidden" as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  // Don't render if no flags
  if (!flags || flags.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          alignSelf: "flex-start",
          width: "100%",
          marginBottom: 20,
        },
      ]}
    >
      <Pressable onPress={handleToggle}>
        <View
          style={{
            backgroundColor: "#000000",
            borderRadius: 16,
            padding: 16,
          }}
        >
          {/* Header row - always visible */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text style={{ fontSize: 14, marginRight: 6 }}>🚩</Text>
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

            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </Animated.View>
          </View>

          {/* Expandable content */}
          <Animated.View style={contentAnimatedStyle}>
            {/* Intro text */}
            {!hasAnimatedIntro ? (
              <TypewriterText
                text={introText}
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: "#9CA3AF",
                  marginTop: 12,
                  fontStyle: "italic",
                }}
                speed={45}
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
                  color: "#9CA3AF",
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
                    <TypewriterText
                      text={flag.text}
                      style={{
                        fontSize: 14,
                        lineHeight: 21,
                        color: "#D1D5DB",
                        flex: 1,
                      }}
                      speed={40}
                      onComplete={() => setAnimatedFlagIndex(index + 1)}
                    />
                  ) : animatedFlagIndex > index ? (
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 21,
                        color: "#D1D5DB",
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
