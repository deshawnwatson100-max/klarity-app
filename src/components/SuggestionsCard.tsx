import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SuggestedResponse } from "../types/chat";

interface SuggestionsCardProps {
  suggestions: SuggestedResponse[];
  onSelectResponse: (response: SuggestedResponse) => void;
}

export function SuggestionsCard({
  suggestions,
  onSelectResponse,
}: SuggestionsCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case "soften":
        return "heart-outline";
      case "direct":
        return "arrow-forward-outline";
      case "playful":
        return "happy-outline";
      default:
        return "chatbubble-outline";
    }
  };

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case "soften":
        return "Soften response";
      case "direct":
        return "Make it direct";
      case "playful":
        return "Make it playful";
      default:
        return tone;
    }
  };

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-4">
          Suggested Responses
        </Text>

        <View className="gap-3">
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              onPress={() => onSelectResponse(suggestion)}
              className="active:opacity-70"
            >
              <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                {/* Tone Badge */}
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons
                    name={getToneIcon(suggestion.tone) as any}
                    size={16}
                    color="#B4FF39"
                  />
                  <Text className="text-[#B4FF39] text-xs font-medium">
                    {getToneLabel(suggestion.tone)}
                  </Text>
                </View>

                {/* Response Text */}
                <Text className="text-neutral-200 text-base leading-6 mb-3">
                  {suggestion.text}
                </Text>

                {/* Use Button */}
                <View className="flex-row justify-end">
                  <View className="bg-[#B4FF39] px-4 py-2 rounded-full">
                    <Text className="text-black text-sm font-semibold">
                      Use this reply
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
