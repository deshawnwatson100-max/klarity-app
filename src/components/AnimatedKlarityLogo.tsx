import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";

interface AnimatedKlarityLogoProps {
  size?: "small" | "medium" | "large";
}

/**
 * AnimatedKlarityLogo Component
 *
 * Premium animated logo with breathing glow and gradient drift.
 *
 * Features:
 * - Breathing glow: Slow pulse (4-6s cycle) with gradient colors
 * - Glow opacity: 3% → 10% → 3%
 * - Glow scale: Subtle expansion (8-15%)
 * - Gradient drift: Slow left-to-right movement (10-15s cycle)
 * - Colors: Purple (#A66BFF), Blue (#4C9EFF), Aqua (#4FFFD7)
 */
export function AnimatedKlarityLogo({ size = "medium" }: AnimatedKlarityLogoProps) {
  // Size configurations
  const sizeConfig = {
    small: { fontSize: 18, height: 22 },
    medium: { fontSize: 20, height: 26 },
    large: { fontSize: 24, height: 30 },
  };

  const { fontSize, height } = sizeConfig[size];

  // Breathing glow animation
  const glowOpacity = useSharedValue(0.03);
  const glowScale = useSharedValue(1);

  // Gradient drift animation
  const gradientPosition = useSharedValue(0);

  useEffect(() => {
    // Breathing glow: 5-second cycle
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.03, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite
      false
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Gradient drift: 12-second cycle (slow left-to-right)
    gradientPosition.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const gradientAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: gradientPosition.value * 100 - 50, // Drift left to right
      },
    ],
  }));

  return (
    <View
      style={{
        height,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Breathing glow layers (behind text) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 200,
            height: 80,
            borderRadius: 40,
          },
          glowAnimatedStyle,
        ]}
      >
        <LinearGradient
          colors={["rgba(166, 107, 255, 0.4)", "rgba(76, 158, 255, 0.4)", "rgba(79, 255, 215, 0.3)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            flex: 1,
            borderRadius: 40,
            // Heavy blur effect
            shadowColor: "#A66BFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 40,
          }}
        />
      </Animated.View>

      {/* Logo text with gradient */}
      <View style={{ overflow: "hidden", width: 180 }}>
        <MaskedView
          maskElement={
            <View
              style={{
                backgroundColor: "transparent",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  color: "white",
                }}
              >
                Klarity AI ✨
              </Text>
            </View>
          }
        >
          <Animated.View style={[{ width: 300, height }, gradientAnimatedStyle]}>
            <LinearGradient
              colors={["#A66BFF", "#4C9EFF", "#4FFFD7", "#A66BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flex: 1,
              }}
            />
          </Animated.View>
        </MaskedView>
      </View>
    </View>
  );
}
