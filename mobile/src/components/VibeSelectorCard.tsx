import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { VibeOption } from "../types/chat";
import * as Haptics from "expo-haptics";

interface VibeSelectorCardProps {
  acknowledgment: string;
  vibes: VibeOption[];
  selectedVibe?: VibeOption;
  onSelectVibe: (vibe: VibeOption) => void;
}

export function VibeSelectorCard({
  acknowledgment,
  vibes,
  selectedVibe,
  onSelectVibe,
}: VibeSelectorCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSelect = (vibe: VibeOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectVibe(vibe);
  };

  return (
    <Animated.View
      style={{
        alignSelf: "flex-start",
        maxWidth: "85%",
        marginBottom: 8,
        paddingHorizontal: 4,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Acknowledgment text - floating style */}
      <Text
        className="text-sm leading-6 mb-3"
        style={{
          fontFamily: "SF Pro Display",
          color: "#9CA3AF",
        }}
      >
        {acknowledgment}
      </Text>

      {/* Question - floating style */}
      <Text
        className="text-base leading-7 mb-4"
        style={{
          fontFamily: "SF Pro Display",
          color: "#E5E7EB",
          fontWeight: "500",
        }}
      >
        How do you want to show up in this conversation?
      </Text>

      {/* Vibe buttons - floating text style, no card background */}
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {vibes.map((vibe) => {
          const isSelected = selectedVibe?.label === vibe.label;

          return (
            <Pressable
              key={vibe.label}
              onPress={() => handleSelect(vibe)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="active:opacity-60"
            >
              <Text
                style={{
                  fontFamily: "SF Pro Display",
                  fontSize: 15,
                  fontWeight: "700",
                  color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)",
                  letterSpacing: 0.1,
                }}
              >
                {vibe.emoji} {vibe.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
