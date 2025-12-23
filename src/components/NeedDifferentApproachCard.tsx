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
      label: "More Direct",
      icon: "arrow-forward-outline" as const,
      description: "Say it clearly",
    },
    {
      id: "more-gentle" as const,
      label: "More Gentle",
      icon: "heart-outline" as const,
      description: "Soften the tone",
    },
    {
      id: "more-neutral" as const,
      label: "More Neutral",
      icon: "remove-outline" as const,
      description: "Keep it balanced",
    },
    {
      id: "add-context" as const,
      label: "Add Context",
      icon: "add-outline" as const,
      description: "Share more details",
    },
  ];

  const handleSelect = (approach: "more-direct" | "more-gentle" | "more-neutral" | "add-context") => {
    setSelectedApproach(approach);
    onSelectApproach(approach);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      className="mb-4"
    >
      <View
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "#0F0F11",
          borderWidth: 1,
          borderColor: "#1F1F22",
        }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#9CA3AF",
              letterSpacing: 0.2,
            }}
          >
            Need a different approach?
          </Text>
        </View>

        {/* Options - 2x2 grid */}
        <View className="px-4 pb-4 pt-2">
          <View className="flex-row gap-2 mb-2">
            {approaches.slice(0, 2).map((approach) => {
              const isSelected = selectedApproach === approach.id;
              return (
                <Pressable
                  key={approach.id}
                  onPress={() => handleSelect(approach.id)}
                  className="flex-1"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? "#1A1A1C" : "#141416",
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? "#4B5563" : "#262628",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={approach.icon}
                      size={20}
                      color={isSelected ? "#E5E7EB" : "#6B7280"}
                      style={{ marginBottom: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: isSelected ? "#E5E7EB" : "#9CA3AF",
                        marginBottom: 2,
                      }}
                    >
                      {approach.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                      }}
                    >
                      {approach.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2">
            {approaches.slice(2, 4).map((approach) => {
              const isSelected = selectedApproach === approach.id;
              return (
                <Pressable
                  key={approach.id}
                  onPress={() => handleSelect(approach.id)}
                  className="flex-1"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? "#1A1A1C" : "#141416",
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? "#4B5563" : "#262628",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={approach.icon}
                      size={20}
                      color={isSelected ? "#E5E7EB" : "#6B7280"}
                      style={{ marginBottom: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: isSelected ? "#E5E7EB" : "#9CA3AF",
                        marginBottom: 2,
                      }}
                    >
                      {approach.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                      }}
                    >
                      {approach.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
