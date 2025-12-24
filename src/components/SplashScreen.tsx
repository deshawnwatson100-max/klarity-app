import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { KlarityOrb } from "./KlarityOrb";

interface SplashScreenProps {
  onFinish: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Smooth easing curves
const EASE_OUT_SMOOTH = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const EASE_IN_OUT_SMOOTH = Easing.bezier(0.42, 0, 0.58, 1);
const EASE_OUT_EXPO = Easing.bezier(0.19, 1, 0.22, 1);

// Animation timing - slower for smoothness
const FADE_IN_DURATION = 600;
const INITIAL_HOLD = 800;
const SLIDE_DURATION = 700;
const ASCEND_DURATION = 900;
const PULSE_DURATION = 350;
const SCREEN_FADE_DURATION = 500;

// Orb wrapper size (matches KlarityOrb small: glowRadius = 40)
const ORB_WRAPPER_SIZE = 40;

/**
 * SplashScreen Component - Klarity AI
 *
 * Klarna-inspired premium splash transition with ultra-smooth animations:
 * 1. Initial State: Orb (left) + "Klarity" text (right) centered together
 * 2. Orb slides left → right, passing over text (text fades)
 * 3. Orb ascends to header position
 * 4. Haptic + subtle pulse on final placement
 * 5. Splash fades out, input screen appears beneath
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  // Calculate final orb position (header center)
  const HEADER_CENTER_Y = insets.top + 28;
  const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

  // Animation values
  const contentOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const orbTranslateX = useSharedValue(0);
  const orbTranslateY = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
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

    textOpacity.value = withDelay(
      100,
      withTiming(1, {
        duration: FADE_IN_DURATION - 100,
        easing: EASE_OUT_SMOOTH,
      })
    );

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

    // Text fades smoothly as orb passes over it
    textOpacity.value = withDelay(
      slideStartTime + 150,
      withTiming(0, {
        duration: 450,
        easing: EASE_OUT_SMOOTH,
      })
    );

    // Phase 3: Orb ascends smoothly to header
    const ascendStartTime = slideStartTime + SLIDE_DURATION;
    const targetY = HEADER_CENTER_Y - SCREEN_CENTER_Y;

    // Smooth diagonal movement back to center and up
    orbTranslateX.value = withDelay(
      ascendStartTime,
      withTiming(0, {
        duration: ASCEND_DURATION,
        easing: EASE_OUT_EXPO,
      })
    );

    orbTranslateY.value = withDelay(
      ascendStartTime,
      withTiming(targetY, {
        duration: ASCEND_DURATION,
        easing: EASE_OUT_EXPO,
      })
    );

    // Scale up smoothly to match header orb (small -> medium)
    orbScale.value = withDelay(
      ascendStartTime,
      withTiming(1.25, {
        duration: ASCEND_DURATION,
        easing: EASE_OUT_EXPO,
      })
    );

    // Phase 4: Haptic and gentle pulse on arrival
    const arrivalTime = ascendStartTime + ASCEND_DURATION;

    setTimeout(() => {
      triggerHaptic();
    }, arrivalTime);

    // Very subtle pulse glow
    pulseOpacity.value = withDelay(
      arrivalTime,
      withSequence(
        withTiming(0.4, { duration: 200, easing: EASE_OUT_SMOOTH }),
        withTiming(0, { duration: 300, easing: EASE_IN_OUT_SMOOTH })
      )
    );

    // Phase 5: Smooth fade out splash
    const fadeOutTime = arrivalTime + PULSE_DURATION;

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
      { translateY: orbTranslateY.value },
      { scale: orbScale.value },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1.5 }],
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
            {/* Pulse glow (final placement) */}
            <Animated.View style={[styles.pulseGlow, pulseStyle]}>
              <LinearGradient
                colors={[
                  "rgba(125, 211, 192, 0.3)",
                  "rgba(184, 163, 232, 0.2)",
                  "transparent",
                ]}
                style={styles.pulseGradient}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <KlarityOrb size="small" />
          </Animated.View>

          {/* Klarity text - matching SlideOverDrawer styling */}
          <Animated.View style={[styles.textWrapper, textAnimatedStyle]}>
            <Text style={styles.appName}>Klarity</Text>
          </Animated.View>
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
  pulseGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  pulseGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
});
