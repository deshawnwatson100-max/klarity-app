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
  const segment1 = useSharedValue(0);
  const segment2 = useSharedValue(0);
  const segment3 = useSharedValue(0);

  useEffect(() => {
    const duration = 800;
    const easing = Easing.bezier(0.4, 0.0, 0.2, 1);

    segment1.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing }),
        withTiming(0, { duration, easing })
      ),
      -1,
      false
    );

    segment2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing }),
          withTiming(0, { duration, easing })
        ),
        -1,
        false
      )
    );

    segment3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing }),
          withTiming(0, { duration, easing })
        ),
        -1,
        false
      )
    );
  }, []);

  const segment1Style = useAnimatedStyle(() => ({
    opacity: 0.2 + segment1.value * 0.6,
    transform: [{ scaleX: 0.6 + segment1.value * 0.4 }],
  }));

  const segment2Style = useAnimatedStyle(() => ({
    opacity: 0.2 + segment2.value * 0.7,
    transform: [{ scaleX: 0.6 + segment2.value * 0.4 }],
  }));

  const segment3Style = useAnimatedStyle(() => ({
    opacity: 0.2 + segment3.value * 0.6,
    transform: [{ scaleX: 0.6 + segment3.value * 0.4 }],
  }));

  return (
    <View className="self-start mb-4 ml-4">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Animated.View
          style={[
            {
              width: 12,
              height: 2,
              borderRadius: 1,
              backgroundColor: "#9CA3AF",
            },
            segment1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 16,
              height: 2,
              borderRadius: 1,
              backgroundColor: "#D1D5DB",
            },
            segment2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 10,
              height: 2,
              borderRadius: 1,
              backgroundColor: "#9CA3AF",
            },
            segment3Style,
          ]}
        />
      </View>
    </View>
  );
}
