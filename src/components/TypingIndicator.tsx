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
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const arc1Style = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.value * 0.5,
  }));

  const arc2Style = useAnimatedStyle(() => ({
    opacity: 0.2 + pulse.value * 0.4,
  }));

  const arc3Style = useAnimatedStyle(() => ({
    opacity: 0.15 + pulse.value * 0.25,
  }));

  return (
    <View className="self-start mb-4 ml-4">
      <Animated.View
        style={[
          {
            width: 28,
            height: 28,
            alignItems: "center",
            justifyContent: "center",
          },
          containerStyle,
        ]}
      >
        {/* Outer arc */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: "transparent",
              borderTopColor: "#E5E7EB",
              borderRightColor: "#9CA3AF",
            },
            arc1Style,
          ]}
        />
        {/* Middle arc */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: "transparent",
              borderTopColor: "#D1D5DB",
              borderLeftColor: "#6B7280",
            },
            arc2Style,
          ]}
        />
        {/* Inner arc */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 12,
              height: 12,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: "transparent",
              borderBottomColor: "#9CA3AF",
            },
            arc3Style,
          ]}
        />
        {/* Center point */}
        <View
          style={{
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: "#6B7280",
            opacity: 0.6,
          }}
        />
      </Animated.View>
    </View>
  );
}
