import React, { useEffect } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

interface KlarityOrbProps {
  size?: "small" | "medium" | "large";
  isAnalyzing?: boolean;
}

export function KlarityOrb({ size = "medium", isAnalyzing = false }: KlarityOrbProps) {
  const glowOpacity = useSharedValue(0.6);
  const rotation = useSharedValue(0);

  // Size configurations
  const sizeConfig = {
    small: { diameter: 32, glowRadius: 40 },
    medium: { diameter: 40, glowRadius: 50 },
    large: { diameter: 60, glowRadius: 70 },
  };

  const { diameter, glowRadius } = sizeConfig[size];

  useEffect(() => {
    // Breathing glow animation (5-second cycle) - always active
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  // Rotation animation - only when analyzing
  useEffect(() => {
    if (isAnalyzing) {
      // Start rotation when analyzing (3-second cycle for faster, noticeable spin)
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      // Stop rotation and smoothly return to 0
      cancelAnimation(rotation);
      // Smoothly animate back to nearest 0 position
      const currentRotation = rotation.value % 360;
      if (currentRotation !== 0) {
        // Animate to 0 or 360 depending on which is closer
        const targetRotation = currentRotation > 180 ? 360 : 0;
        rotation.value = withTiming(targetRotation, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
      }
    }
  }, [isAnalyzing]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const rotationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={{
        width: glowRadius,
        height: glowRadius,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer glow - breathing animation */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: glowRadius,
            height: glowRadius,
            borderRadius: glowRadius / 2,
            backgroundColor: "transparent",
          },
          glowAnimatedStyle,
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(181, 255, 75, 0.3)", // Lime
            "rgba(125, 211, 192, 0.3)", // Teal
            "rgba(184, 163, 232, 0.3)", // Purple
            "rgba(255, 179, 198, 0.3)", // Rose
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: glowRadius / 2,
          }}
        />
      </Animated.View>

      {/* Main orb with rotating gradient */}
      <Animated.View
        style={[
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            overflow: "hidden",
          },
          rotationAnimatedStyle,
        ]}
      >
        <LinearGradient
          colors={[
            "#B5FF4B", // Lime
            "#7DD3C0", // Teal
            "#B8A3E8", // Purple
            "#FFB3C6", // Rose
            "#FFFFFF", // White
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.25, 0.5, 0.75, 1]}
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

        {/* Inner shadow for depth */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: diameter * 0.3,
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            borderBottomLeftRadius: diameter / 2,
            borderBottomRightRadius: diameter / 2,
          }}
        />
      </Animated.View>
    </View>
  );
}
