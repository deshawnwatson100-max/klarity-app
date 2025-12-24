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

// Animation timing
const FADE_IN_DURATION = 600;
const HOLD_DURATION = 1000;
const SCREEN_FADE_DURATION = 500;

/**
 * SplashScreen Component - Klarity AI
 *
 * Simple, calm splash transition:
 * 1. Orb + "Klarity" text fade in centered together
 * 2. Hold
 * 3. Haptic
 * 4. Splash fades out, input screen appears
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animation values
  const contentOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

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

    // Phase 2: Haptic after hold
    const hapticTime = FADE_IN_DURATION + HOLD_DURATION;
    setTimeout(() => {
      triggerHaptic();
    }, hapticTime);

    // Phase 3: Smooth fade out splash
    const fadeOutTime = hapticTime + 100;

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
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
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
        <Animated.View style={[styles.logoRow, contentStyle]}>
          <View style={styles.orbWrapper}>
            <KlarityOrb size="small" />
          </View>

          <View style={styles.textWrapper}>
            <Text style={styles.appName}>Klarity</Text>
          </View>
        </Animated.View>
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
