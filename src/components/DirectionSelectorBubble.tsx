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
    color: "#B5FF4B", // Calm lime
    description: "Work toward better communication and connection",
  },
  {
    id: "distance" as IntentionType,
    label: "Distance",
    icon: "shield-outline" as const,
    color: "#9CA3AF", // Luxury grey
    description: "Create healthy space and protect your energy",
  },
  {
    id: "maintain" as IntentionType,
    label: "Maintain",
    icon: "eye-outline" as const,
    color: "#9CA3AF", // Luxury grey
    description: "Observe patterns before making decisions",
  },
  {
    id: "clarity" as IntentionType,
    label: "Gain Clarity",
    icon: "bulb-outline" as const,
    color: "#B5FF4B", // Calm lime
    description: "Understand your feelings and the situation better",
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
                className="active:opacity-80"
                style={{
                  backgroundColor: isSelected ? `${intention.color}12` : "#0F0F11",
                  borderWidth: 1.5,
                  borderColor: isSelected ? intention.color : "#9CA3AF25",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  shadowColor: isSelected ? intention.color : "#000000",
                  shadowOffset: { width: 0, height: isSelected ? 3 : 1 },
                  shadowOpacity: isSelected ? 0.35 : 0.1,
                  shadowRadius: isSelected ? 12 : 4,
                }}
              >
                {/* Minimal line icon */}
                <Ionicons
                  name={intention.icon}
                  size={22}
                  color={isSelected ? intention.color : "#9CA3AF"}
                  style={{ width: 28 }}
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
                      color: "#9CA3AF",
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
