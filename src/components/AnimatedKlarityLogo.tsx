import React from "react";
import { View, Text } from "react-native";

interface AnimatedKlarityLogoProps {
  size?: "small" | "medium" | "large";
}

/**
 * AnimatedKlarityLogo Component
 *
 * Clean, minimal logo without gradient animation.
 *
 * Features:
 * - Simple white text
 * - Clean, minimal aesthetic
 * - No animation to avoid rendering issues
 */
export function AnimatedKlarityLogo({ size = "medium" }: AnimatedKlarityLogoProps) {
  // Size configurations
  const sizeConfig = {
    small: { fontSize: 18 },
    medium: { fontSize: 20 },
    large: { fontSize: 24 },
  };

  const { fontSize } = sizeConfig[size];

  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize,
          fontWeight: "700",
          letterSpacing: 0.5,
          color: "#CFCFCF",
        }}
      >
        Klarity AI ✨
      </Text>
    </View>
  );
}
