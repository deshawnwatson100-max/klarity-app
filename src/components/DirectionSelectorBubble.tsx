import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type IntentionType = "improve" | "distance" | "maintain" | "clarity";

interface DirectionSelectorBubbleProps {
  onSelectIntention: (intention: IntentionType) => void;
  selectedIntention?: IntentionType;
}

const intentions = [
  {
    id: "improve" as IntentionType,
    label: "Improve",
    icon: "heart-outline" as const,
    color: "#6BB6FF", // Cool Sky Blue
    glowColor: "#6BB6FF40", // Soft blue glow
    textTint: "#A8D1FF", // Muted blue for description
    description: "Work toward better communication and connection",
  },
  {
    id: "distance" as IntentionType,
    label: "Distance",
    icon: "shield-outline" as const,
    color: "#FF9B6B", // Warm Orange
    glowColor: "#FF9B6B40", // Soft orange glow
    textTint: "#FFBFA0", // Muted orange for description
    description: "Create healthy space and protect your energy",
  },
  {
    id: "maintain" as IntentionType,
    label: "Maintain",
    icon: "eye-outline" as const,
    color: "#FFB84D", // Soft Amber/Gold
    glowColor: "#FFB84D40", // Soft gold glow
    textTint: "#FFD699", // Muted gold for description
    description: "Observe patterns before making decisions",
  },
  {
    id: "clarity" as IntentionType,
    label: "Set Boundaries",
    icon: "hand-left-outline" as const,
    color: "#B8A3E8", // Lavender/Soft Purple
    glowColor: "#B8A3E840", // Soft purple glow
    textTint: "#CDB8FF", // Muted lavender for description
    description: "Communicate your limits clearly and protect your well-being",
  },
];

export function DirectionSelectorBubble({
  onSelectIntention,
  selectedIntention,
}: DirectionSelectorBubbleProps) {
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
      {/* Luxury grey card container */}
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
        {/* Question text */}
        <Text
          className="text-base leading-7 mb-5"
          style={{
            fontFamily: "SF Pro Display",
            color: "#E5E7EB",
            fontWeight: "500",
          }}
        >
          Before I help you respond, which direction do you want to go with this relationship?
        </Text>

        {/* Direction option cards */}
        <View className="gap-3">
          {intentions.map((intention) => {
            const isSelected = selectedIntention === intention.id;

            return (
              <Pressable
                key={intention.id}
                onPress={() => onSelectIntention(intention.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="active:opacity-80"
                style={{
                  backgroundColor: isSelected ? `${intention.color}18` : "#0F0F11",
                  borderWidth: 1.5,
                  borderColor: isSelected ? intention.color : intention.glowColor,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  shadowColor: intention.color,
                  shadowOffset: { width: 0, height: isSelected ? 1 : 0 },
                  shadowOpacity: isSelected ? 0.08 : 0,
                  shadowRadius: isSelected ? 4 : 0,
                }}
              >
                {/* Minimal modern icon with color tint */}
                <Ionicons
                  name={intention.icon}
                  size={22}
                  color={isSelected ? intention.color : intention.textTint}
                  style={{ width: 28, opacity: isSelected ? 1 : 0.85 }}
                />

                {/* Label and description */}
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-semibold text-base mb-1"
                    style={{
                      fontFamily: "SF Pro Display",
                      color: isSelected ? intention.color : "#F9FAFB",
                    }}
                  >
                    {intention.label}
                  </Text>
                  <Text
                    className="text-xs leading-4"
                    style={{
                      fontFamily: "SF Pro Display",
                      color: isSelected ? intention.textTint : "#9CA3AF",
                    }}
                  >
                    {intention.description}
                  </Text>
                </View>

                {/* Selection indicator - minimal checkmark */}
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={intention.color}
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
