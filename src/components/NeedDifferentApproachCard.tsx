import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

interface NeedDifferentApproachCardProps {
  onSelectApproach: (approach: "more-direct" | "more-gentle" | "more-neutral" | "add-context") => void;
}

export function NeedDifferentApproachCard({
  onSelectApproach,
}: NeedDifferentApproachCardProps) {
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null);

  const approaches = [
    {
      id: "more-direct" as const,
      label: "More direct",
      icon: "arrow-forward-outline" as const,
    },
    {
      id: "more-gentle" as const,
      label: "More gentle",
      icon: "heart-outline" as const,
    },
    {
      id: "more-neutral" as const,
      label: "More neutral",
      icon: "remove-outline" as const,
    },
    {
      id: "add-context" as const,
      label: "Add context",
      icon: "add-outline" as const,
    },
  ];

  const handleSelect = (approach: "more-direct" | "more-gentle" | "more-neutral" | "add-context") => {
    setSelectedApproach(approach);
    onSelectApproach(approach);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={{ marginBottom: 16 }}
    >
      {/* Simple text prompt */}
      <Text
        style={{
          fontSize: 14,
          color: "#6B7280",
          marginBottom: 12,
        }}
      >
        Need a different approach?
      </Text>

      {/* Inline horizontal options */}
      <View className="flex-row flex-wrap gap-2">
        {approaches.map((approach) => {
          const isSelected = selectedApproach === approach.id;
          return (
            <Pressable
              key={approach.id}
              onPress={() => handleSelect(approach.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: isSelected ? "#1F1F22" : "transparent",
                borderWidth: 1,
                borderColor: isSelected ? "#4B5563" : "#374151",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons
                name={approach.icon}
                size={14}
                color={isSelected ? "#E5E7EB" : "#6B7280"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: isSelected ? "#E5E7EB" : "#9CA3AF",
                }}
              >
                {approach.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Subtle bottom divider */}
      <View
        style={{
          height: 1,
          backgroundColor: "#1F1F22",
          marginTop: 16,
        }}
      />
    </Animated.View>
  );
}
