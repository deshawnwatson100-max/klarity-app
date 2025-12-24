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

interface SplashScreenProps {
  onFinish: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Orb sizes
const ORB_SIZE_INITIAL = 48; // Starting size - small-medium, not oversized
const ORB_SIZE_HEADER = 40; // Final size in header
const GLOW_SIZE_INITIAL = ORB_SIZE_INITIAL * 1.4;
const GAP = 10; // gap between orb and text

// Animation timing
const FADE_IN_DURATION = 400; // initial fade in
const INITIAL_HOLD = 600; // ms before slide starts
const SLIDE_DURATION = 450; // orb slides left to right
const ASCEND_DURATION = 550; // orb floats up to header
const PULSE_DURATION = 250; // final pulse glow
const SCREEN_FADE_DURATION = 350; // splash fades out

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
  const HEADER_CENTER_Y = insets.top + 28; // paddingTop + half of header height
  const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

  // Animation values
  const orbOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const orbTranslateX = useSharedValue(0);
  const orbTranslateY = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  // Layout constants
  const TEXT_WIDTH = 90; // "Klarity" text approximate width

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const finishSplash = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Phase 1: Fade in orb and text together
    orbOpacity.value = withTiming(1, {
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

    // Calculate slide distance: orb needs to move past the text
    // Orb center to text center distance + half text width to clear it
    const slideDistance = GAP + GLOW_SIZE_INITIAL / 2 + TEXT_WIDTH;

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
    const targetScale = ORB_SIZE_HEADER / ORB_SIZE_INITIAL;

    // Move to center X and up to header Y
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

    // Shrink to header size
    orbScale.value = withDelay(
      ascendStartTime,
      withTiming(targetScale, {
        duration: ASCEND_DURATION,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Phase 4: Haptic and pulse on arrival
    const arrivalTime = ascendStartTime + ASCEND_DURATION;

    setTimeout(() => {
      triggerHaptic();
    }, arrivalTime);

    // Brief pulse glow
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
    opacity: orbOpacity.value,
    transform: [
      { translateX: orbTranslateX.value },
      { translateY: orbTranslateY.value },
      { scale: orbScale.value },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1.4 }],
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Black background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#000000", "#050505", "#000000"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Centered content */}
      <View style={styles.centerContent}>
        {/* Logo row: Orb on left, Text on right */}
        <View style={styles.logoRow}>
          {/* Animated Orb */}
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

            {/* Subtle ambient glow */}
            <View style={styles.glowOuter}>
              <LinearGradient
                colors={[
                  "rgba(125, 211, 192, 0.1)",
                  "rgba(184, 163, 232, 0.06)",
                  "transparent",
                ]}
                style={styles.glowGradient}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
              />
            </View>

            {/* Main orb */}
            <View style={styles.orb}>
              <LinearGradient
                colors={[
                  "#7DD3C0", // Teal
                  "#9ECFB8", // Soft mint
                  "#B8A3E8", // Violet
                  "#E4B8C8", // Rose
                  "#7DD3C0", // Teal loop
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                style={styles.orbGradient}
              />

              {/* Glass overlay */}
              <View style={styles.glassOverlay} />

              {/* Highlight */}
              <View style={styles.highlight} />
            </View>
          </Animated.View>

          {/* Klarity text */}
          <Animated.View style={[styles.textWrapper, textStyle]}>
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
    backgroundColor: "#000000",
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
    justifyContent: "center",
  },
  orbWrapper: {
    width: GLOW_SIZE_INITIAL,
    height: GLOW_SIZE_INITIAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: GAP,
  },
  pulseGlow: {
    position: "absolute",
    width: GLOW_SIZE_INITIAL * 1.6,
    height: GLOW_SIZE_INITIAL * 1.6,
    borderRadius: (GLOW_SIZE_INITIAL * 1.6) / 2,
  },
  pulseGradient: {
    width: "100%",
    height: "100%",
    borderRadius: (GLOW_SIZE_INITIAL * 1.6) / 2,
  },
  glowOuter: {
    position: "absolute",
    width: GLOW_SIZE_INITIAL,
    height: GLOW_SIZE_INITIAL,
    borderRadius: GLOW_SIZE_INITIAL / 2,
  },
  glowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: GLOW_SIZE_INITIAL / 2,
  },
  orb: {
    width: ORB_SIZE_INITIAL,
    height: ORB_SIZE_INITIAL,
    borderRadius: ORB_SIZE_INITIAL / 2,
    overflow: "hidden",
    shadowColor: "#7DD3C0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
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
    borderRadius: ORB_SIZE_INITIAL / 2,
  },
  highlight: {
    position: "absolute",
    top: ORB_SIZE_INITIAL * 0.14,
    left: ORB_SIZE_INITIAL * 0.2,
    width: ORB_SIZE_INITIAL * 0.32,
    height: ORB_SIZE_INITIAL * 0.18,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: ORB_SIZE_INITIAL,
    transform: [{ rotate: "-40deg" }],
  },
  appName: {
    fontSize: 24,
    fontWeight: "300",
    color: "#F8F8FA", // Soft white
    letterSpacing: 1.5,
  },
});
