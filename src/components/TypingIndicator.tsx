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
  const dot1TranslateY = useSharedValue(0);
  const dot2TranslateY = useSharedValue(0);
  const dot3TranslateY = useSharedValue(0);
  const dot1Scale = useSharedValue(1);
  const dot2Scale = useSharedValue(1);
  const dot3Scale = useSharedValue(1);

  useEffect(() => {
    // ChatGPT-style bouncing animation with scale
    const animationConfig = {
      duration: 500,
      easing: Easing.bezier(0.33, 0.66, 0.66, 1),
    };

    // Dot 1 - bounce up and down with scale
    dot1TranslateY.value = withRepeat(
      withSequence(
        withTiming(-6, animationConfig),
        withTiming(0, animationConfig)
      ),
      -1,
      false
    );
    dot1Scale.value = withRepeat(
      withSequence(
        withTiming(0.85, animationConfig),
        withTiming(1, animationConfig)
      ),
      -1,
      false
    );

    // Dot 2 - delayed bounce
    dot2TranslateY.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(-6, animationConfig),
          withTiming(0, animationConfig)
        ),
        -1,
        false
      )
    );
    dot2Scale.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(0.85, animationConfig),
          withTiming(1, animationConfig)
        ),
        -1,
        false
      )
    );

    // Dot 3 - delayed bounce
    dot3TranslateY.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-6, animationConfig),
          withTiming(0, animationConfig)
        ),
        -1,
        false
      )
    );
    dot3Scale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(0.85, animationConfig),
          withTiming(1, animationConfig)
        ),
        -1,
        false
      )
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: dot1TranslateY.value },
      { scale: dot1Scale.value },
    ],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: dot2TranslateY.value },
      { scale: dot2Scale.value },
    ],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: dot3TranslateY.value },
      { scale: dot3Scale.value },
    ],
  }));

  return (
    <View className="flex-row items-center self-start mb-4">
      {/* Klarity bubble with typing dots */}
      <View
        className="rounded-3xl px-6 py-4"
        style={{
          backgroundColor: "#0A0A0C",
          borderWidth: 1,
          borderColor: "#9CA3AF15",
          shadowColor: "#505050",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        <View className="flex-row items-center gap-2">
          <Animated.View
            style={[
              {
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: "#9CA3AF",
              },
              dot1Style,
            ]}
          />
          <Animated.View
            style={[
              {
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: "#9CA3AF",
              },
              dot2Style,
            ]}
          />
          <Animated.View
            style={[
              {
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: "#9CA3AF",
              },
              dot3Style,
            ]}
          />
        </View>
      </View>
    </View>
  );
}
