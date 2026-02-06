import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { EmotionAnalysis } from "../types/chat";

interface EmotionalClaritySummaryBubbleProps {
  emotionAnalysis: EmotionAnalysis;
  onFollowUpAction?: (action: string) => void;
  selectedIntention?: "improve" | "distance" | "maintain" | "clarity";
}

export function EmotionalClaritySummaryBubble({
  emotionAnalysis,
  onFollowUpAction,
  selectedIntention,
}: EmotionalClaritySummaryBubbleProps) {
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);

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

  const microFlowOptions = [
    {
      id: "explore",
      label: "Explore this feeling",
      icon: "leaf-outline" as const,
      description: "Reflect on what might be triggering this emotion",
    },
    {
      id: "connect",
      label: "Connect it to your situation",
      icon: "link-outline" as const,
      description: "See how this emotion relates to your context",
    },
    {
      id: "log",
      label: "Log this for insight later",
      icon: "bookmark-outline" as const,
      description: "Save to calendar and track patterns over time",
    },
  ];

  const handleMicroFlowSelect = (flowId: string) => {
    setSelectedFlow(flowId);
    onFollowUpAction?.(flowId);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      className="mb-4 mx-4"
    >
      {/* Main Summary Card */}
      <View
        className="rounded-3xl overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 20, 24, 0.7)",
          borderWidth: 1,
          borderColor: `${intentionColor}20`,
        }}
      >
        {/* Header with emotion and intensity */}
        <View className="px-5 pt-5 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: intentionColor,
                }}
              />
              <Text
                className="text-base font-medium"
                style={{ color: "#F9FAFB", letterSpacing: 0.3 }}
              >
                {emotionAnalysis.primaryEmotion}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text
                className="text-sm font-light"
                style={{ color: "#9CA3AF", letterSpacing: 0.2 }}
              >
                Intensity
              </Text>
              <Text
                className="text-sm font-medium"
                style={{ color: intentionColor }}
              >
                {emotionAnalysis.emotionalIntensity}%
              </Text>
            </View>
          </View>

          {/* Thin divider */}
          <View
            style={{
              height: 0.5,
              backgroundColor: "rgba(156, 163, 175, 0.15)",
              marginBottom: 16,
            }}
          />

          {/* Emotional Summary - Short and validating */}
          <Text
            className="text-base leading-relaxed"
            style={{
              color: "#E5E7EB",
              letterSpacing: 0.2,
              lineHeight: 24,
            }}
          >
            {emotionAnalysis.fullSummary}
          </Text>
        </View>

        {/* Micro-Flow Options */}
        {!selectedFlow && (
          <Animated.View
            entering={FadeIn.duration(300).delay(200)}
            className="px-3 pb-3"
            style={{
              borderTopWidth: 0.5,
              borderTopColor: "rgba(156, 163, 175, 0.12)",
              paddingTop: 12,
            }}
          >
            {microFlowOptions.map((option, index) => (
              <Pressable
                key={option.id}
                onPress={() => handleMicroFlowSelect(option.id)}
                className="active:opacity-70"
                style={{
                  marginTop: index === 0 ? 0 : 8,
                }}
              >
                {({ pressed }) => (
                  <View
                    className="flex-row items-center px-4 py-3.5 rounded-2xl"
                    style={{
                      backgroundColor: pressed
                        ? `${intentionColor}15`
                        : `${intentionColor}08`,
                      borderWidth: 1,
                      borderColor: `${intentionColor}20`,
                    }}
                  >
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
                        name={option.icon}
                        size={20}
                        color={intentionColor}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium mb-0.5"
                        style={{ color: "#F9FAFB", letterSpacing: 0.2 }}
                      >
                        {option.label}
                      </Text>
                      <Text
                        className="text-xs font-light"
                        style={{ color: "#9CA3AF", letterSpacing: 0.1 }}
                      >
                        {option.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#9CA3AF"
                    />
                  </View>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Selected Flow Indicator */}
        {selectedFlow && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="px-5 py-3"
            style={{
              borderTopWidth: 0.5,
              borderTopColor: "rgba(156, 163, 175, 0.12)",
              backgroundColor: `${intentionColor}08`,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={intentionColor}
              />
              <Text
                className="text-sm font-light"
                style={{ color: "#E5E7EB", letterSpacing: 0.2 }}
              >
                {microFlowOptions.find((o) => o.id === selectedFlow)?.label}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
