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
    label: "Get Closer",
    icon: "heart" as const,
    color: "#B8A3E8", // Muted purple
    description: "Build deeper connection",
  },
  {
    id: "distance" as IntentionType,
    label: "Set Boundaries",
    icon: "shield" as const,
    color: "#B5FF4B", // Calm lime
    description: "Protect your energy",
  },
  {
    id: "maintain" as IntentionType,
    label: "Detach Emotionally",
    icon: "remove-circle" as const,
    color: "#7DD3C0", // Soft teal
    description: "Create emotional space",
  },
  {
    id: "clarity" as IntentionType,
    label: "Cut Ties",
    icon: "cut" as const,
    color: "#FFB3C6", // Warm pink
    description: "End the relationship",
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
                  backgroundColor: isSelected ? `${intention.color}15` : "#0F0F11",
                  borderWidth: 1.5,
                  borderColor: isSelected ? intention.color : `${intention.color}35`,
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  shadowColor: intention.color,
                  shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                  shadowOpacity: isSelected ? 0.4 : 0.2,
                  shadowRadius: isSelected ? 16 : 8,
                }}
              >
                {/* Icon with color glow */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isSelected ? `${intention.color}25` : `${intention.color}15`,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: `${intention.color}40`,
                  }}
                >
                  <Ionicons
                    name={intention.icon}
                    size={20}
                    color={intention.color}
                  />
                </View>

                {/* Label and description */}
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-semibold text-base mb-0.5"
                    style={{
                      fontFamily: "SF Pro Display",
                      color: isSelected ? intention.color : "#F9FAFB",
                    }}
                  >
                    {intention.label}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{
                      fontFamily: "SF Pro Display",
                      color: "#9CA3AF",
                    }}
                  >
                    {intention.description}
                  </Text>
                </View>

                {/* Selection indicator */}
                {isSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: intention.color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
