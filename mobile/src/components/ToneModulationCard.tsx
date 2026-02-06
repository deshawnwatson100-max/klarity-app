import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

interface ToneOption {
  id: "direct" | "gentle" | "neutral";
  label: string;
  icon: string;
}

interface ToneModulationCardProps {
  onToneSelect: (tone: "direct" | "gentle" | "neutral") => void;
  selectedIntention?: "improve" | "distance" | "maintain" | "clarity";
}

export function ToneModulationCard({
  onToneSelect,
  selectedIntention,
}: ToneModulationCardProps) {
  const [selectedTone, setSelectedTone] = useState<string | null>(null);

  // Get color based on relationship direction
  const getIntentionColor = () => {
    const colors = {
      improve: "#B4FF39", // Lime green
      distance: "#F97316", // Orange
      maintain: "#6366F1", // Indigo
      clarity: "#5EEAD4", // Teal (default)
    };
    return colors[selectedIntention || "clarity"];
  };

  const intentionColor = getIntentionColor();

  const toneOptions: ToneOption[] = [
    {
      id: "direct",
      label: "More Direct",
      icon: "arrow-forward-circle-outline",
    },
    {
      id: "gentle",
      label: "More Gentle",
      icon: "heart-outline",
    },
    {
      id: "neutral",
      label: "More Neutral",
      icon: "remove-circle-outline",
    },
  ];

  const handleToneSelect = (tone: "direct" | "gentle" | "neutral") => {
    setSelectedTone(tone);
    onToneSelect(tone);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200).springify()}
      className="mb-4 mx-4"
    >
      <View
        className="rounded-3xl overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 20, 24, 0.6)",
          borderWidth: 1,
          borderColor: "rgba(156, 163, 175, 0.1)",
        }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text
            className="text-sm font-light"
            style={{
              color: "#9CA3AF",
              letterSpacing: 0.3,
            }}
          >
            Need a Different Approach?
          </Text>
        </View>

        {/* Tone Options - Horizontal Row */}
        <View className="px-3 pb-3">
          <View className="flex-row items-center justify-between gap-2">
            {toneOptions.map((option) => {
              const isSelected = selectedTone === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleToneSelect(option.id)}
                  className="flex-1 active:opacity-70"
                >
                  {({ pressed }) => (
                    <View
                      className="items-center py-3.5 px-2 rounded-2xl"
                      style={{
                        backgroundColor: isSelected
                          ? `${intentionColor}15`
                          : pressed
                          ? "rgba(156, 163, 175, 0.08)"
                          : "rgba(156, 163, 175, 0.04)",
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected
                          ? intentionColor
                          : "rgba(156, 163, 175, 0.12)",
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={22}
                        color={isSelected ? intentionColor : "#9CA3AF"}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        className="text-xs font-light text-center"
                        style={{
                          color: isSelected ? "#F9FAFB" : "#9CA3AF",
                          letterSpacing: 0.2,
                        }}
                      >
                        {option.label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
