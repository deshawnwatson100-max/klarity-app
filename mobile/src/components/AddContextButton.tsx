import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AddContextButtonProps {
  onPress: () => void;
  selectedIntention?: "improve" | "distance" | "maintain" | "clarity";
}

export function AddContextButton({
  onPress,
  selectedIntention,
}: AddContextButtonProps) {
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

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(300).springify()}
      className="mb-4 mx-4"
    >
      <Pressable onPress={onPress} className="active:opacity-70">
        {({ pressed }) => (
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: pressed
                ? `${intentionColor}10`
                : `${intentionColor}06`,
              borderWidth: 1,
              borderColor: `${intentionColor}15`,
            }}
          >
            <View className="flex-row items-center px-5 py-3.5">
              <View
                className="items-center justify-center mr-3"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: `${intentionColor}15`,
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={intentionColor}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-medium"
                  style={{ color: "#F9FAFB", letterSpacing: 0.2 }}
                >
                  Add More Context
                </Text>
                <Text
                  className="text-xs font-light mt-0.5"
                  style={{ color: "#9CA3AF", letterSpacing: 0.1 }}
                >
                  Share additional details for better guidance
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
