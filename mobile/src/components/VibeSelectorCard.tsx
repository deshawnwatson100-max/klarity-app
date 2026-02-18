import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
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
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelect = (vibe: VibeOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectVibe(vibe);
  };

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          maxWidth: "100%",
          marginBottom: 16,
          paddingHorizontal: 4,
        },
        animatedStyle,
      ]}
    >
      {/* Card container */}
      <View
        className="rounded-3xl px-6 py-6 mb-3"
        style={{
          backgroundColor: "rgba(20, 20, 24, 0.6)",
          borderWidth: 1,
          borderColor: "rgba(156, 163, 175, 0.1)",
          shadowColor: "#9CA3AF",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          maxWidth: "95%",
        }}
      >
        {/* Acknowledgment text */}
        <Text
          className="text-sm leading-6 mb-4"
          style={{
            fontFamily: "SF Pro Display",
            color: "#9CA3AF",
          }}
        >
          {acknowledgment}
        </Text>

        {/* Question */}
        <Text
          className="text-base leading-7 mb-5"
          style={{
            fontFamily: "SF Pro Display",
            color: "#E5E7EB",
            fontWeight: "500",
          }}
        >
          How do you want to show up in this conversation?
        </Text>

        {/* Vibe chips */}
        <View
          className="flex-row flex-wrap gap-3"
          style={{ marginHorizontal: -2 }}
        >
          {vibes.map((vibe, index) => {
            const isSelected = selectedVibe?.label === vibe.label;

            return (
              <Animated.View
                key={vibe.label}
                entering={FadeIn.delay(index * 80).duration(300)}
              >
                <Pressable
                  onPress={() => handleSelect(vibe)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  className="active:opacity-80"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "rgba(255, 255, 255, 0.3)"
                      : "rgba(255, 255, 255, 0.1)",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{vibe.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: "SF Pro Display",
                      fontSize: 14,
                      fontWeight: isSelected ? "600" : "400",
                      color: isSelected ? "#FFFFFF" : "#D1D5DB",
                    }}
                  >
                    {vibe.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
