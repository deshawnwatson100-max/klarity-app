import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * SoftFlares Component
 *
 * Extremely soft monochromatic flares for minimal depth and mood.
 *
 * Features:
 * - 1-2 faint light flares
 * - Whisper-soft cool gray-blue tones
 * - Heavy blur (40-70px equivalent)
 * - Adds depth without distraction
 */
export function SoftFlares() {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      {/* Soft horizontal glow near bottom */}
      <View
        style={{
          position: "absolute",
          bottom: "20%",
          left: "10%",
          right: "10%",
          height: 400,
          opacity: 0.03,
        }}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(90, 110, 130, 0.2)",
            "rgba(80, 100, 120, 0.15)",
            "transparent",
          ]}
          style={{
            flex: 1,
            borderRadius: 250,
          }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </View>
    </View>
  );
}
