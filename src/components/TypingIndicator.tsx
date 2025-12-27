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

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="self-start mb-4 ml-4">
      <View
        style={{
          width: 24,
          height: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Orbit track */}
        <View
          style={{
            position: "absolute",
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(156, 163, 175, 0.15)",
          }}
        />
        {/* Rotating container */}
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              alignItems: "center",
              justifyContent: "flex-start",
            },
            orbitStyle,
          ]}
        >
          {/* Ball */}
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#9CA3AF",
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
