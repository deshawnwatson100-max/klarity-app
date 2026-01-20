import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface AppSplashScreenProps {
  onComplete: () => void;
}

export function AppSplashScreen({ onComplete }: AppSplashScreenProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wait 2 seconds, then fade out over 400ms
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, onComplete]);

  return (
    <Animated.View
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
        opacity: fadeAnim,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: colors.textPrimary,
            marginRight: 10,
          }}
        >
          Klarity
        </Text>
        <View style={{ position: "relative", width: 28, height: 28 }}>
          <Ionicons
            name="chatbubble-outline"
            size={28}
            color={colors.textPrimary}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
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
