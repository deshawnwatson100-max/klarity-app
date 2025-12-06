import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";

export function TypingIndicator() {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);
  const dot1Scale = useSharedValue(0.9);
  const dot2Scale = useSharedValue(0.9);
  const dot3Scale = useSharedValue(0.9);

  useEffect(() => {
    // Elegant breathing animation - fade and scale
    const breathingConfig = {
      duration: 800,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material design easing
    };

    // Dot 1 - breathing fade and scale
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, breathingConfig),
        withTiming(0.3, breathingConfig)
      ),
      -1,
      false
    );
    dot1Scale.value = withRepeat(
      withSequence(
        withTiming(1, breathingConfig),
        withTiming(0.9, breathingConfig)
      ),
      -1,
      false
    );

    // Dot 2 - delayed breathing
    dot2Opacity.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, breathingConfig),
          withTiming(0.3, breathingConfig)
        ),
        -1,
        false
      )
    );
    dot2Scale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, breathingConfig),
          withTiming(0.9, breathingConfig)
        ),
        -1,
        false
      )
    );

    // Dot 3 - delayed breathing
    dot3Opacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, breathingConfig),
          withTiming(0.3, breathingConfig)
        ),
        -1,
        false
      )
    );
    dot3Scale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, breathingConfig),
          withTiming(0.9, breathingConfig)
        ),
        -1,
        false
      )
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
    transform: [{ scale: dot1Scale.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
    transform: [{ scale: dot2Scale.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
    transform: [{ scale: dot3Scale.value }],
  }));

  return (
    <View className="flex-row items-center self-start mb-4 px-4">
      {/* Free-floating dots with no container */}
      <View className="flex-row items-center gap-2.5">
        <Animated.View
          style={[
            {
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#9CA3AF",
              shadowColor: "#9CA3AF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            },
            dot1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#9CA3AF",
              shadowColor: "#9CA3AF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            },
            dot2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#9CA3AF",
              shadowColor: "#9CA3AF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            },
            dot3Style,
          ]}
        />
      </View>
    </View>
  );
}
