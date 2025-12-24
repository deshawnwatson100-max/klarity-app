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
  interpolate,
} from "react-native-reanimated";

interface SplashScreenProps {
  onFinish: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Orb sizes
const ORB_SIZE_INITIAL = 56; // Starting size in center
const ORB_SIZE_HEADER = 40; // Final size in header (matches KlarityOrb medium)
const GLOW_SIZE_INITIAL = ORB_SIZE_INITIAL * 1.5;
const GLOW_SIZE_HEADER = ORB_SIZE_HEADER * 1.25;

// Animation timing
const INITIAL_HOLD = 600; // ms before animation starts
const SLIDE_DURATION = 500; // orb slides right over text
const ASCEND_DURATION = 600; // orb floats up to header
const PULSE_DURATION = 300; // final pulse glow
const FADE_IN_DURATION = 400; // input screen fade in

/**
 * SplashScreen Component - Klarity AI
 *
 * Klarna-inspired premium splash transition:
 * 1. Initial State: Orb + "Klarity" text centered
 * 2. Orb slides right, passing over text (text fades out)
 * 3. Orb ascends to header position (shrinks slightly)
 * 4. Haptic + subtle pulse on final placement
 * 5. Input screen fades in beneath
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  // Calculate final orb position (header center)
  const HEADER_CENTER_Y = insets.top + 28; // paddingTop + half of header height (56/2)
  const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;
  const SCREEN_CENTER_X = SCREEN_WIDTH / 2;

  // Animation values
  const orbOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const orbTranslateX = useSharedValue(0);
  const orbTranslateY = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  // Calculate the text width and orb starting position
  // Orb starts to the left of "Klarity" text
  const TEXT_WIDTH = 100; // approximate "Klarity" text width
  const GAP = 12; // gap between orb and text
  const ORB_START_X = -(TEXT_WIDTH / 2 + GAP + ORB_SIZE_INITIAL / 2); // orb left of center

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const finishSplash = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Phase 1: Fade in orb and text (centered together)
    orbOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });

    textOpacity.value = withDelay(
      100,
      withTiming(1, {
        duration: 350,
        easing: Easing.out(Easing.ease),
      })
    );

    // Phase 2: After initial hold, orb slides right over text
    const slideStartTime = INITIAL_HOLD;

    // Orb slides from left position to right (passing over text)
    orbTranslateX.value = withDelay(
      slideStartTime,
      withTiming(TEXT_WIDTH + GAP + ORB_SIZE_INITIAL, {
        duration: SLIDE_DURATION,
        easing: Easing.inOut(Easing.ease),
      })
    );

    // Text fades out as orb passes over it
    textOpacity.value = withDelay(
      slideStartTime + 150, // slight delay so orb starts moving first
      withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      })
    );

    // Phase 3: Orb ascends to header position
    const ascendStartTime = slideStartTime + SLIDE_DURATION;
    const targetY = HEADER_CENTER_Y - SCREEN_CENTER_Y;
    const targetScale = ORB_SIZE_HEADER / ORB_SIZE_INITIAL;

    orbTranslateY.value = withDelay(
      ascendStartTime,
      withTiming(targetY, {
        duration: ASCEND_DURATION,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Reset X to center as it ascends (smooth diagonal movement)
    orbTranslateX.value = withDelay(
      ascendStartTime,
      withTiming(0, {
        duration: ASCEND_DURATION,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Shrink orb to header size
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

    // Subtle pulse glow
    pulseOpacity.value = withDelay(
      arrivalTime,
      withSequence(
        withTiming(0.6, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) })
      )
    );

    // Phase 5: Fade out splash screen (input screen appears)
    const fadeOutTime = arrivalTime + PULSE_DURATION;

    screenOpacity.value = withDelay(
      fadeOutTime,
      withTiming(0, {
        duration: FADE_IN_DURATION,
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
    transform: [{ scale: 1.3 }],
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Deep charcoal background */}
      <LinearGradient
        colors={["#050608", "#0A0A0C", "#050608"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Centered content area */}
      <View style={styles.centerContent}>
        {/* Orb + Text row */}
        <View style={styles.logoRow}>
          {/* Animated Orb */}
          <Animated.View style={[styles.orbContainer, orbContainerStyle]}>
            {/* Pulse glow (appears on final placement) */}
            <Animated.View style={[styles.pulseGlow, pulseStyle]}>
              <LinearGradient
                colors={[
                  "rgba(125, 211, 192, 0.4)",
                  "rgba(184, 163, 232, 0.3)",
                  "transparent",
                ]}
                style={styles.pulseGradient}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            {/* Soft ambient glow */}
            <View style={styles.glowOuter}>
              <LinearGradient
                colors={[
                  "rgba(125, 211, 192, 0.12)",
                  "rgba(184, 163, 232, 0.08)",
                  "rgba(255, 179, 198, 0.05)",
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
                  "#A8D5BA", // Soft green
                  "#B8A3E8", // Violet
                  "#E8B4C8", // Rose
                  "#7DD3C0", // Back to teal
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                style={styles.orbGradient}
              />

              {/* Glass overlay */}
              <View style={styles.glassOverlay} />

              {/* Highlight reflection */}
              <View style={styles.highlight} />
            </View>
          </Animated.View>

          {/* Klarity text (to the right of orb) */}
          <Animated.Text style={[styles.appName, textStyle]}>
            Klarity
          </Animated.Text>
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
  orbContainer: {
    width: GLOW_SIZE_INITIAL,
    height: GLOW_SIZE_INITIAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pulseGlow: {
    position: "absolute",
    width: GLOW_SIZE_INITIAL * 1.5,
    height: GLOW_SIZE_INITIAL * 1.5,
    borderRadius: (GLOW_SIZE_INITIAL * 1.5) / 2,
  },
  pulseGradient: {
    width: "100%",
    height: "100%",
    borderRadius: (GLOW_SIZE_INITIAL * 1.5) / 2,
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
    shadowOpacity: 0.25,
    shadowRadius: 16,
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: ORB_SIZE_INITIAL / 2,
  },
  highlight: {
    position: "absolute",
    top: ORB_SIZE_INITIAL * 0.12,
    left: ORB_SIZE_INITIAL * 0.18,
    width: ORB_SIZE_INITIAL * 0.35,
    height: ORB_SIZE_INITIAL * 0.2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: ORB_SIZE_INITIAL,
    transform: [{ rotate: "-35deg" }],
  },
  appName: {
    fontSize: 26,
    fontWeight: "300",
    color: "#F5F5F7",
    letterSpacing: 2,
  },
});
