import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

export function TypingIndicator() {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // Pulsing animation for each dot with staggered timing
    dot1Opacity.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    dot2Opacity.value = withDelay(
      200,
      withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    dot3Opacity.value = withDelay(
      400,
      withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
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
    <View className="flex-row items-center self-start mb-4">
      {/* Klarity bubble with typing dots */}
      <View
        className="rounded-3xl px-5 py-4"
        style={{
          backgroundColor: "#0A0A0A",
          borderWidth: 1,
          borderColor: "#B47CFF40",
          shadowColor: "#B47CFF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }}
      >
        <View className="flex-row items-center gap-1.5">
          <Animated.View
            style={[
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#B47CFF",
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
                backgroundColor: "#B47CFF",
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
                backgroundColor: "#B47CFF",
              },
              dot3Style,
            ]}
          />
        </View>
      </View>
    </View>
  );
}
