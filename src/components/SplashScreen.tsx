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

// Animation timing
const FADE_IN_DURATION = 400;
const INITIAL_HOLD = 600;
const SLIDE_DURATION = 450;
const ASCEND_DURATION = 550;
const PULSE_DURATION = 250;
const SCREEN_FADE_DURATION = 350;

// Orb wrapper size (matches KlarityOrb small: glowRadius = 40)
const ORB_WRAPPER_SIZE = 40;
const ORB_SIZE_HEADER = 40; // medium orb in header

/**
 * SplashScreen Component - Klarity AI
 *
 * Klarna-inspired premium splash transition:
 * 1. Initial State: Orb (left) + "Klarity" text (right) centered together
 * 2. Orb slides left → right, passing over text (text fades)
 * 3. Orb ascends to header position (shrinks slightly)
 * 4. Haptic + subtle pulse on final placement
 * 5. Splash fades out, input screen appears beneath
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  // Calculate final orb position (header center)
  const HEADER_CENTER_Y = insets.top + 28;
  const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

  // Animation values
  const contentOpacity = useSharedValue(1); // Start visible for debugging
  const textOpacity = useSharedValue(1); // Start visible for debugging
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
    // Phase 1: Fade in orb and text together
    contentOpacity.value = withTiming(1, {
      duration: FADE_IN_DURATION,
      easing: Easing.out(Easing.ease),
    });

    textOpacity.value = withDelay(
      50,
      withTiming(1, {
        duration: FADE_IN_DURATION - 50,
        easing: Easing.out(Easing.ease),
      })
    );

    // Phase 2: After hold, orb slides right over text
    const slideStartTime = FADE_IN_DURATION + INITIAL_HOLD;
    const slideDistance = GAP + ORB_WRAPPER_SIZE / 2 + TEXT_WIDTH;

    orbTranslateX.value = withDelay(
      slideStartTime,
      withTiming(slideDistance, {
        duration: SLIDE_DURATION,
        easing: Easing.inOut(Easing.ease),
      })
    );

    // Text fades as orb passes over it
    textOpacity.value = withDelay(
      slideStartTime + 100,
      withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.ease),
      })
    );

    // Phase 3: Orb ascends to header
    const ascendStartTime = slideStartTime + SLIDE_DURATION;
    const targetY = HEADER_CENTER_Y - SCREEN_CENTER_Y;

    orbTranslateX.value = withDelay(
      ascendStartTime,
      withTiming(0, {
        duration: ASCEND_DURATION,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    orbTranslateY.value = withDelay(
      ascendStartTime,
      withTiming(targetY, {
        duration: ASCEND_DURATION,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Scale up slightly to match header orb (small -> medium)
    orbScale.value = withDelay(
      ascendStartTime,
      withTiming(1.25, {
        duration: ASCEND_DURATION,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Phase 4: Haptic and pulse on arrival
    const arrivalTime = ascendStartTime + ASCEND_DURATION;

    setTimeout(() => {
      triggerHaptic();
    }, arrivalTime);

    pulseOpacity.value = withDelay(
      arrivalTime,
      withSequence(
        withTiming(0.5, { duration: 120, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) })
      )
    );

    // Phase 5: Fade out splash
    const fadeOutTime = arrivalTime + PULSE_DURATION;

    screenOpacity.value = withDelay(
      fadeOutTime,
      withTiming(0, {
        duration: SCREEN_FADE_DURATION,
        easing: Easing.out(Easing.ease),
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

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    marginLeft: 8,
    zIndex: 10,
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
                  "rgba(125, 211, 192, 0.35)",
                  "rgba(184, 163, 232, 0.25)",
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
          <View style={{ marginLeft: 8 }}>
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
