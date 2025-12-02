import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * SoftFlares Component
 *
 * Adds subtle lens flares and glow streaks to create depth and warmth.
 *
 * Features:
 * - Wide, diffused glows
 * - Soft vertical streaks (5-10% opacity)
 * - Gradient colors: grape-purple, ocean blue, teal
 * - Heavy blur (30-60px equivalent)
 * - Positioned behind text for ambience
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
      {/* Top-left corner flare */}
      <View
        style={{
          position: "absolute",
          top: "10%",
          left: "-10%",
          width: 250,
          height: 400,
          opacity: 0.06,
        }}
      >
        <LinearGradient
          colors={["rgba(166, 107, 255, 0.3)", "rgba(76, 158, 255, 0.2)", "transparent"]}
          style={{
            flex: 1,
            borderRadius: 200,
            transform: [{ rotate: "15deg" }],
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Top-right corner flare */}
      <View
        style={{
          position: "absolute",
          top: "5%",
          right: "-15%",
          width: 300,
          height: 450,
          opacity: 0.05,
        }}
      >
        <LinearGradient
          colors={["rgba(79, 255, 215, 0.25)", "rgba(166, 107, 255, 0.15)", "transparent"]}
          style={{
            flex: 1,
            borderRadius: 250,
            transform: [{ rotate: "-20deg" }],
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
      </View>

      {/* Center vertical streak - behind text */}
      <View
        style={{
          position: "absolute",
          top: "25%",
          left: "20%",
          right: "20%",
          height: 500,
          opacity: 0.04,
        }}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(76, 158, 255, 0.15)",
            "rgba(166, 107, 255, 0.2)",
            "rgba(79, 255, 215, 0.1)",
            "transparent",
          ]}
          style={{
            flex: 1,
            borderRadius: 150,
          }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Bottom ambient glow */}
      <View
        style={{
          position: "absolute",
          bottom: "15%",
          left: "15%",
          right: "15%",
          height: 350,
          opacity: 0.05,
        }}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(166, 107, 255, 0.2)",
            "rgba(76, 158, 255, 0.15)",
            "transparent",
          ]}
          style={{
            flex: 1,
            borderRadius: 200,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
        />
      </View>
    </View>
  );
}
