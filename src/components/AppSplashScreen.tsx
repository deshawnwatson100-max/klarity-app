import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface AppSplashScreenProps {
  onComplete: () => void;
}

export function AppSplashScreen({ onComplete }: AppSplashScreenProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Show splash for 2 seconds, then fade out over 400ms
    opacity.value = withDelay(
      2000,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
        >
          Klarity
        </Text>
        {/* Chat loop icon - matching PaywallScreen */}
        <View style={{ position: "relative" }}>
          <Ionicons name="chatbubble-outline" size={28} color={colors.textPrimary} />
          <View
            style={{
              position: "absolute",
              top: 4,
              left: 0,
              right: 0,
              bottom: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={14} color={colors.textPrimary} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
