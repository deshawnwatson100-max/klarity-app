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
    icon: "heart" as const,
    color: "#C9F7D8",
    description: "Better communication",
  },
  {
    id: "distance" as IntentionType,
    label: "Distance",
    icon: "shield" as const,
    color: "#FF8B8B",
    description: "Healthy space",
  },
  {
    id: "maintain" as IntentionType,
    label: "Maintain",
    icon: "eye" as const,
    color: "#FFCE9E",
    description: "Observe patterns",
  },
  {
    id: "clarity" as IntentionType,
    label: "Gain Clarity",
    icon: "bulb" as const,
    color: "#C7B5FF",
    description: "Understanding first",
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
      {/* Prompt bubble */}
      <View
        className="rounded-3xl px-5 py-4 mb-4"
        style={{
          backgroundColor: "#0E0E0F",
          borderWidth: 1,
          borderColor: "#C7B5FF20",
          maxWidth: "85%",
        }}
      >
        <Text
          className="text-base leading-6"
          style={{ fontFamily: "SF Pro Display", color: "#C7B5FF" }}
        >
          Before I help you respond, which direction do you want to go with this relationship?
        </Text>
      </View>

      {/* Direction buttons */}
      <View className="flex-row flex-wrap gap-2">
        {intentions.map((intention) => {
          const isSelected = selectedIntention === intention.id;

          return (
            <Pressable
              key={intention.id}
              onPress={() => onSelectIntention(intention.id)}
              className="active:opacity-70"
              style={{
                backgroundColor: isSelected ? intention.color : "#0E0E0F",
                borderWidth: 1.5,
                borderColor: isSelected ? intention.color : `${intention.color}40`,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: isSelected ? "#F7B8D4" : intention.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isSelected ? 0.5 : 0.2,
                shadowRadius: isSelected ? 12 : 6,
              }}
            >
              <Ionicons
                name={intention.icon}
                size={18}
                color={isSelected ? "#000000" : intention.color}
              />
              <Text
                className="font-semibold text-base"
                style={{
                  fontFamily: "SF Pro Display",
                  color: isSelected ? "#000000" : "#FFFFFF",
                }}
              >
                {intention.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
