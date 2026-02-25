import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps) {
  const opacities = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];
  const { isDark } = useTheme();

  // Transparent blue — visible on both light and dark
  const barColor = isDark ? "rgba(96,165,250,0.55)" : "rgba(59,130,246,0.45)";
  const labelColor = isDark ? "rgba(255,255,255,0.28)" : "rgba(59,130,246,0.6)";

  useEffect(() => {
    const delays = [0, 160, 320];

    const animations = opacities.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delays[i]),
          Animated.timing(anim, {
            toValue: 0.18,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.5,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  const widths: `${number}%`[] = ["65%", "88%", "48%"];

  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 4, marginBottom: 12, gap: 0 }}>
      {label ? (
        <Text
          style={{
            fontFamily: "SF Pro Display",
            fontSize: 11,
            fontWeight: "600",
            color: labelColor,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View style={{ gap: 8 }}>
        {opacities.map((anim, i) => (
          <Animated.View
            key={i}
            style={{
              height: 10,
              width: widths[i],
              borderRadius: 5,
              backgroundColor: barColor,
              opacity: anim,
            }}
          />
        ))}
      </View>
    </View>
  );
}
