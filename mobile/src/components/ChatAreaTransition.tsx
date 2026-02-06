import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// iOS-native easing curve (ease-in-out-cubic approximation)
const TRANSITION_DURATION = 250; // 200-300ms as specified
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0); // iOS standard easing

interface ChatAreaTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: "up" | "down"; // up = entering from bottom, down = exiting to bottom
  onTransitionComplete?: () => void;
}

/**
 * ChatAreaTransition
 *
 * Animates the chat content area with a subtle vertical slide and fade.
 * The animation is designed to feel calm, lightweight, and intentional.
 *
 * Design intent:
 * - Reduce cognitive load
 * - Make transitions feel calm and grounding
 * - Reinforce Klarity AI as a stable environment
 */
export function ChatAreaTransition({
  children,
  isVisible,
  direction = "up",
  onTransitionComplete,
}: ChatAreaTransitionProps) {
  const progress = useSharedValue(isVisible ? 1 : 0);
  const translateOffset = direction === "up" ? 40 : -40; // Subtle 40px movement

  useEffect(() => {
    progress.value = withTiming(
      isVisible ? 1 : 0,
      {
        duration: TRANSITION_DURATION,
        easing: EASING,
      },
      (finished) => {
        if (finished && onTransitionComplete) {
          runOnJS(onTransitionComplete)();
        }
      }
    );
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [translateOffset, 0]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/**
 * useChatAreaAnimation
 *
 * Hook for controlling chat area transitions manually.
 * Returns animation values and controls for more fine-grained control.
 */
export function useChatAreaAnimation() {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animateIn = (callback?: () => void) => {
    // Start from below and fade in
    opacity.value = 0;
    translateY.value = 40;

    opacity.value = withTiming(1, {
      duration: TRANSITION_DURATION,
      easing: EASING,
    });

    translateY.value = withTiming(
      0,
      {
        duration: TRANSITION_DURATION,
        easing: EASING,
      },
      (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      }
    );
  };

  const animateOut = (callback?: () => void) => {
    // Fade out and slide down slightly
    opacity.value = withTiming(0, {
      duration: TRANSITION_DURATION,
      easing: EASING,
    });

    translateY.value = withTiming(
      -30, // Slide up slightly as it fades
      {
        duration: TRANSITION_DURATION,
        easing: EASING,
      },
      (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      }
    );
  };

  const reset = () => {
    opacity.value = 1;
    translateY.value = 0;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return {
    opacity,
    translateY,
    animatedStyle,
    animateIn,
    animateOut,
    reset,
  };
}
