import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";

interface SplashScreenProps {
  onFinish: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ORB_SIZE = Math.min(SCREEN_WIDTH * 0.28, 120);
const GLOW_SIZE = ORB_SIZE * 1.6;

/**
 * SplashScreen Component - Klarity AI
 *
 * A minimal, luxury splash screen that emotionally grounds the user
 * and reinforces Klarity as a calm, trusted space.
 *
 * Animation Sequence:
 * 1. Orb fade-in (600ms, ease-out)
 * 2. Synchronized haptic at full opacity
 * 3. Text reveal with upward motion (400ms, 150ms delay)
 * 4. Hold for 500ms
 * 5. Smooth crossfade transition
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animation values
  const orbOpacity = useSharedValue(0);
  const orbScale = useSharedValue(0.95);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(4);
  const screenOpacity = useSharedValue(1);

  // Internal color motion for the orb
  const colorRotation = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const startTransition = useCallback(() => {
    // Smooth crossfade out
    screenOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    }, () => {
      runOnJS(onFinish)();
    });
  }, [onFinish]);

  useEffect(() => {
    // Subtle internal color motion (continuous, slow rotation feel via opacity shifts)
    colorRotation.value = withTiming(1, {
      duration: 3000,
      easing: Easing.linear,
    });

    // Step 1: Orb fade-in (600ms)
    orbOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    }, () => {
      // Step 2: Trigger haptic when orb reaches full opacity
      runOnJS(triggerHaptic)();
    });

    orbScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    // Step 3: Text reveal (400ms, 150ms after orb completes)
    textOpacity.value = withDelay(
      750, // 600ms orb + 150ms delay
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      })
    );

    textTranslateY.value = withDelay(
      750,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      })
    );

    // Step 4: Hold for 500ms, then transition
    // Total: 600ms (orb) + 150ms (delay) + 400ms (text) + 500ms (hold) = 1650ms
    const transitionTimer = setTimeout(() => {
      startTransition();
    }, 1650);

    return () => clearTimeout(transitionTimer);
  }, []);

  // Animated styles
  const orbContainerStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  // Animated glow style with subtle pulsing
  const glowStyle = useAnimatedStyle(() => {
    const pulseScale = interpolate(
      colorRotation.value,
      [0, 0.5, 1],
      [1, 1.05, 1]
    );
    return {
      transform: [{ scale: pulseScale }],
    };
  });

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Centered content */}
      <View style={styles.content}>
        {/* Orb with glow */}
        <Animated.View style={[styles.orbContainer, orbContainerStyle]}>
          {/* Soft ambient glow - no harsh edges */}
          <Animated.View style={[styles.glowOuter, glowStyle]}>
            <LinearGradient
              colors={[
                "rgba(125, 211, 192, 0.08)",
                "rgba(184, 163, 232, 0.06)",
                "rgba(255, 179, 198, 0.04)",
                "transparent",
              ]}
              style={styles.glowGradient}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Main orb */}
          <View style={styles.orb}>
            <LinearGradient
              colors={[
                "#7DD3C0", // Teal
                "#A8D5BA", // Soft green
                "#B8A3E8", // Violet
                "#E8B4C8", // Rose
                "#7DD3C0", // Back to teal for smooth loop
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              style={styles.orbGradient}
            />

            {/* Glass-like overlay for luxury depth */}
            <View style={styles.glassOverlay} />

            {/* Subtle highlight reflection */}
            <View style={styles.highlight} />

            {/* Inner soft glow */}
            <View style={styles.innerGlow} />
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.appName, textStyle]}>
          Klarity
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C", // Deep charcoal, not pure black
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orbContainer: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  glowOuter: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
  },
  glowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: GLOW_SIZE / 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
    // Subtle shadow for depth
    shadowColor: "#7DD3C0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  orbGradient: {
    width: "100%",
    height: "100%",
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: ORB_SIZE / 2,
  },
  highlight: {
    position: "absolute",
    top: ORB_SIZE * 0.12,
    left: ORB_SIZE * 0.18,
    width: ORB_SIZE * 0.35,
    height: ORB_SIZE * 0.2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: ORB_SIZE,
    transform: [{ rotate: "-35deg" }],
  },
  innerGlow: {
    position: "absolute",
    top: ORB_SIZE * 0.3,
    left: ORB_SIZE * 0.3,
    width: ORB_SIZE * 0.4,
    height: ORB_SIZE * 0.4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: ORB_SIZE * 0.2,
  },
  appName: {
    fontSize: 28,
    fontWeight: "400",
    color: "#F5F5F7", // Soft off-white
    letterSpacing: 3,
    fontFamily: undefined, // Uses system font (SF Pro on iOS)
  },
});
