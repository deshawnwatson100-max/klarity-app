import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface AppSplashScreenProps {
  onComplete: () => void;
}

export function AppSplashScreen({ onComplete }: AppSplashScreenProps) {
  const { colors } = useTheme();
  const [splashOpacity, setSplashOpacity] = useState(1);

  useEffect(() => {
    const transitionFromSplash = async () => {
      // Show splash for 2 seconds, then fade out
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fade out splash
      setSplashOpacity(0);

      // Wait for fade animation, then complete
      await new Promise((resolve) => setTimeout(resolve, 400));
      onComplete();
    };

    transitionFromSplash();
  }, [onComplete]);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        opacity: splashOpacity,
      }}
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
    </View>
  );
}
