import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolateColor,
  Easing,
} from "react-native-reanimated";

export function TypingIndicator() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0.0, 0.2, 1) }),
        withTiming(0, { duration: 1200, easing: Easing.bezier(0.4, 0.0, 0.2, 1) })
      ),
      -1,
      false
    );
  }, []);

  const bar1Style = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 0.5, 1],
      ["#6366F1", "#8B5CF6", "#6366F1"]
    );
    return {
      backgroundColor,
      opacity: 0.4 + progress.value * 0.6,
    };
  });

  const bar2Style = useAnimatedStyle(() => {
    const delayed = (progress.value + 0.33) % 1;
    const backgroundColor = interpolateColor(
      delayed,
      [0, 0.5, 1],
      ["#8B5CF6", "#EC4899", "#8B5CF6"]
    );
    return {
      backgroundColor,
      opacity: 0.4 + delayed * 0.6,
    };
  });

  const bar3Style = useAnimatedStyle(() => {
    const delayed = (progress.value + 0.66) % 1;
    const backgroundColor = interpolateColor(
      delayed,
      [0, 0.5, 1],
      ["#EC4899", "#6366F1", "#EC4899"]
    );
    return {
      backgroundColor,
      opacity: 0.4 + delayed * 0.6,
    };
  });

  return (
    <View className="self-start mb-4 ml-4">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Animated.View
          style={[
            {
              width: 4,
              height: 16,
              borderRadius: 2,
            },
            bar1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 4,
              height: 16,
              borderRadius: 2,
            },
            bar2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 4,
              height: 16,
              borderRadius: 2,
            },
            bar3Style,
          ]}
        />
      </View>
    </View>
  );
}
