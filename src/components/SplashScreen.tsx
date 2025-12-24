import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { KlarityOrb } from "./KlarityOrb";

interface SplashScreenProps {
  onFinish: () => void;
}

// Smooth easing curves
const EASE_OUT_SMOOTH = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const EASE_IN_OUT_SMOOTH = Easing.bezier(0.42, 0, 0.58, 1);

// Animation timing - slower for smoothness
const FADE_IN_DURATION = 600;
const INITIAL_HOLD = 800;
const SLIDE_DURATION = 700;
const SCREEN_FADE_DURATION = 500;

// Orb wrapper size (matches KlarityOrb small: glowRadius = 40)
const ORB_WRAPPER_SIZE = 40;

/**
 * SplashScreen Component - Klarity AI
 *
 * Klarna-inspired premium splash transition with ultra-smooth animations:
 * 1. Initial State: Orb (left) + "Klarity" text (right) centered together
 * 2. Orb slides left → right, passing over text
 * 3. Orb ascends to header position
 * 4. Haptic on final placement
 * 5. Splash fades out, input screen appears beneath
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animation values
  const contentOpacity = useSharedValue(0);
  const orbTranslateX = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  // Layout constants
  const TEXT_WIDTH = 70;
  const GAP = 8;

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const finishSplash = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Phase 1: Smooth fade in orb and text together
    contentOpacity.value = withTiming(1, {
      duration: FADE_IN_DURATION,
      easing: EASE_OUT_SMOOTH,
    });

    // Phase 2: After hold, orb slides smoothly right over text
    const slideStartTime = FADE_IN_DURATION + INITIAL_HOLD;
    const slideDistance = GAP + ORB_WRAPPER_SIZE / 2 + TEXT_WIDTH;

    orbTranslateX.value = withDelay(
      slideStartTime,
      withTiming(slideDistance, {
        duration: SLIDE_DURATION,
        easing: EASE_IN_OUT_SMOOTH,
      })
    );

    // Phase 3: Haptic after slide completes
    const arrivalTime = slideStartTime + SLIDE_DURATION;

    setTimeout(() => {
      triggerHaptic();
    }, arrivalTime);

    // Phase 4: Smooth fade out splash
    const fadeOutTime = arrivalTime + 200;

    screenOpacity.value = withDelay(
      fadeOutTime,
      withTiming(0, {
        duration: SCREEN_FADE_DURATION,
        easing: EASE_OUT_SMOOTH,
      }, () => {
        runOnJS(finishSplash)();
      })
    );
  }, []);

  // Animated styles
  const orbContainerStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateX: orbTranslateX.value },
    ],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Background matching InputScreen */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#050608", "#0A0A0C", "#050608"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Centered content */}
      <View style={styles.centerContent}>
        {/* Logo row: Orb on left, Text on right */}
        <View style={styles.logoRow}>
          {/* Animated Orb using KlarityOrb component */}
          <Animated.View style={[styles.orbWrapper, orbContainerStyle]}>
            <KlarityOrb size="small" />
          </Animated.View>

          {/* Klarity text - matching SlideOverDrawer styling */}
          <View style={styles.textWrapper}>
            <Text style={styles.appName}>Klarity</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050608",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    marginLeft: 8,
  },
  orbWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
});
