import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";

interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps) {
  const opacities = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

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
            color: "rgba(255,255,255,0.28)",
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
              backgroundColor: "#fff",
              opacity: anim,
            }}
          />
        ))}
      </View>
    </View>
  );
}
