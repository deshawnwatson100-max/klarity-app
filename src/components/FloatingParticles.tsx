import React, { useEffect, useMemo } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  duration: number;
  delay: number;
}

interface FloatingParticlesProps {
  count?: number;
}

/**
 * FloatingParticles Component
 *
 * Creates a subtle ambient effect with tiny floating particles
 * that drift slowly across the screen with minimal motion.
 *
 * Features:
 * - Tiny 1-3px dots and micro-orbs
 * - 5-12% opacity with soft blur
 * - Slow vertical drift animation
 * - Gradient-tinted colors (blue, purple, aqua)
 * - Particles near center are slightly brighter
 */
export function FloatingParticles({ count = 25 }: FloatingParticlesProps) {
  // Generate particles with randomized properties
  const particles = useMemo<Particle[]>(() => {
    // Minimal cool-toned colors: cool gray and faint teal/blue tint
    const colors = ["#606060", "#4A5A6A", "#4A6A6A"];

    return Array.from({ length: count }, (_, i) => {
      const x = Math.random() * SCREEN_WIDTH;
      const y = Math.random() * SCREEN_HEIGHT;
      const size = Math.random() * 2 + 1; // 1-3px

      // Calculate distance from center (0 = center, 1 = edge)
      const centerX = SCREEN_WIDTH / 2;
      const centerY = SCREEN_HEIGHT / 2;
      const distanceFromCenter = Math.sqrt(
        Math.pow((x - centerX) / SCREEN_WIDTH, 2) +
        Math.pow((y - centerY) / SCREEN_HEIGHT, 2)
      );

      // Ultra-minimal opacity: 4-10%
      const opacity = 0.10 - (distanceFromCenter * 0.06);

      return {
        id: i,
        x,
        y,
        size,
        opacity: Math.max(0.04, opacity),
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 10000 + Math.random() * 8000, // 10-18 seconds (slower)
        delay: Math.random() * 5000, // 0-5 second delay
      };
    });
  }, [count]);

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
      {particles.map((particle) => (
        <AnimatedParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

function AnimatedParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(particle.opacity);

  useEffect(() => {
    // Slow vertical drift (upward)
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(-100, {
          duration: particle.duration,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false
      )
    );

    // Very subtle horizontal sway
    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(Math.random() * 20 - 10, {
          duration: particle.duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true // Reverse on repeat
      )
    );

    // Gentle opacity pulse
    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(particle.opacity * 0.5, {
          duration: particle.duration * 0.7,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
          // Very soft blur effect (1-3px)
          shadowColor: particle.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
}
