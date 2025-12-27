import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

export function TypingIndicator() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => {
    const width = 24 + progress.value * 16;
    const opacity = 0.3 + progress.value * 0.5;
    return {
      width,
      opacity,
    };
  });

  return (
    <View className="self-start mb-4 ml-4">
      <Animated.View
        style={[
          {
            height: 2,
            borderRadius: 1,
            backgroundColor: "#6B7280",
          },
          lineStyle,
        ]}
      />
    </View>
  );
}
