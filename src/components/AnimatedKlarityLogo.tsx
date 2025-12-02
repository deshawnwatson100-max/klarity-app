import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";

interface AnimatedKlarityLogoProps {
  size?: "small" | "medium" | "large";
}

/**
 * AnimatedKlarityLogo Component
 *
 * Premium animated logo with gradient drift.
 *
 * Features:
 * - Gradient drift: Slow left-to-right movement (12s cycle)
 * - Colors: Purple (#A66BFF), Blue (#4C9EFF), Aqua (#4FFFD7)
 * - Clean, minimal aesthetic without breathing glow
 */
export function AnimatedKlarityLogo({ size = "medium" }: AnimatedKlarityLogoProps) {
  // Size configurations
  const sizeConfig = {
    small: { fontSize: 18, height: 22 },
    medium: { fontSize: 20, height: 26 },
    large: { fontSize: 24, height: 30 },
  };

  const { fontSize, height } = sizeConfig[size];

  // Gradient drift animation
  const gradientPosition = useSharedValue(0);

  useEffect(() => {
    // Gradient drift: 12-second cycle (slow left-to-right)
    gradientPosition.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const gradientAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: gradientPosition.value * 200 - 100, // Wider drift range
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
          <Animated.View style={[{ width: 500, height }, gradientAnimatedStyle]}>
            <LinearGradient
              colors={[
                "#A66BFF",
                "#4C9EFF",
                "#4FFFD7",
                "#4C9EFF",
                "#A66BFF",
                "#4C9EFF",
                "#4FFFD7",
              ]}
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
