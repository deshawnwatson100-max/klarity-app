import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type ToneType = "calm" | "direct" | "empathetic" | "assertive";

interface ToneSelectionBubbleProps {
  onSelectTone: (tone: ToneType) => void;
  selectedTone?: ToneType;
}

const tones = [
  {
    id: "calm" as ToneType,
    label: "Calm",
    icon: "water-outline" as const,
    color: "#7DD3C0", // Soft Teal
  },
  {
    id: "direct" as ToneType,
    label: "Direct",
    icon: "arrow-forward-outline" as const,
    color: "#FFB84D", // Soft Amber/Gold
  },
  {
    id: "empathetic" as ToneType,
    label: "Empathetic",
    icon: "heart-outline" as const,
    color: "#FFB3C6", // Warm Pink/Rose
  },
  {
    id: "assertive" as ToneType,
    label: "Assertive",
    icon: "shield-checkmark-outline" as const,
    color: "#B8A3E8", // Lavender/Purple
  },
];

export function ToneSelectionBubble({
  onSelectTone,
  selectedTone,
}: ToneSelectionBubbleProps) {
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
      {/* Luxury grey card container with gradient */}
      <View
        className="rounded-3xl px-6 py-6 mb-3"
        style={{
          backgroundColor: "#1A1A1C",
          borderWidth: 1.5,
          borderColor: "#9CA3AF30",
          shadowColor: "#9CA3AF",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          maxWidth: "95%",
        }}
      >
        {/* Title text */}
        <Text
          className="text-base leading-7 mb-5 text-center"
          style={{
            fontFamily: "SF Pro Display",
            color: "#E5E7EB",
            fontWeight: "500",
          }}
        >
          Choose Your Tone
        </Text>

        {/* Tone pill buttons in 2x2 grid */}
        <View className="flex-row flex-wrap gap-3 justify-center">
          {tones.map((tone) => {
            const isSelected = selectedTone === tone.id;

            return (
              <Pressable
                key={tone.id}
                onPress={() => onSelectTone(tone.id)}
                className="active:opacity-80"
                style={{
                  backgroundColor: isSelected ? `${tone.color}20` : "#0F0F11",
                  borderWidth: 1.5,
                  borderColor: isSelected ? tone.color : `${tone.color}40`,
                  borderRadius: 24,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  shadowColor: tone.color,
                  shadowOffset: { width: 0, height: isSelected ? 3 : 1 },
                  shadowOpacity: isSelected ? 0.4 : 0.2,
                  shadowRadius: isSelected ? 12 : 6,
                  minWidth: "45%",
                  justifyContent: "center",
                }}
              >
                {/* Icon */}
                <Ionicons
                  name={tone.icon}
                  size={18}
                  color={isSelected ? tone.color : `${tone.color}80`}
                  style={{ opacity: isSelected ? 1 : 0.8 }}
                />

                {/* Label */}
                <Text
                  className="font-semibold text-sm"
                  style={{
                    fontFamily: "SF Pro Display",
                    color: isSelected ? "#E5E7EB" : "#9CA3AF",
                  }}
                >
                  {tone.label}
                </Text>

                {/* Selection indicator */}
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={tone.color}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
