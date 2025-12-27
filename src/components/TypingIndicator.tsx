import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";

export function TypingIndicator() {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    const duration = 400;
    const easing = Easing.bezier(0.4, 0.0, 0.2, 1);

    // Staggered pulse animation for each dot
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing }),
        withTiming(0.3, { duration, easing })
      ),
      -1,
      false
    );

    dot2Opacity.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing }),
          withTiming(0.3, { duration, easing })
        ),
        -1,
        false
      )
    );

    dot3Opacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing }),
          withTiming(0.3, { duration, easing })
        ),
        -1,
        false
      )
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View className="self-start mb-4 ml-4">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 16,
          gap: 6,
        }}
      >
        <Animated.View
          style={[
            {
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#6B7280",
            },
            dot1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#6B7280",
            },
            dot2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#6B7280",
            },
            dot3Style,
          ]}
        />
      </View>
    </View>
  );
}
