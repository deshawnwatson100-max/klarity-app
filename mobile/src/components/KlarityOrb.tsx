import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface KlarityOrbProps {
  size?: "small" | "medium" | "large";
  isAnalyzing?: boolean;
}

/**
 * Static orb component - no animations to avoid reanimated initialization issues
 */
export function KlarityOrb({ size = "medium" }: KlarityOrbProps) {
  // Size configurations
  const sizeConfig = {
    small: { diameter: 32 },
    medium: { diameter: 40 },
    large: { diameter: 60 },
  };

  const { diameter } = sizeConfig[size];

  return (
    <View
      style={{
        width: diameter,
        height: diameter,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Main orb */}
      <View
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[
            "#B5FF4B", // Lime
            "#7DD3C0", // Teal
            "#B8A3E8", // Purple
            "#FFB3C6", // Rose
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
          }}
        />

        {/* Glass-like overlay for depth */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: diameter / 2,
          }}
        />

        {/* Subtle highlight for glass effect */}
        <View
          style={{
            position: "absolute",
            top: diameter * 0.15,
            left: diameter * 0.2,
            width: diameter * 0.4,
            height: diameter * 0.3,
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            borderRadius: diameter,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </View>
    </View>
  );
}
