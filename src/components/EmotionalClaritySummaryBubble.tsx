import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { EmotionAnalysis } from "../types/chat";

interface EmotionalClaritySummaryBubbleProps {
  emotionAnalysis: EmotionAnalysis;
  onFollowUpAction?: (action: string) => void;
}

export function EmotionalClaritySummaryBubble({
  emotionAnalysis,
  onFollowUpAction,
}: EmotionalClaritySummaryBubbleProps) {
  const [showFollowUps, setShowFollowUps] = useState(false);

  const followUpActions = [
    {
      id: "understand",
      label: "Help me understand the emotion more",
      icon: "bulb-outline" as const,
    },
    {
      id: "calendar",
      label: "Show emotional trend on calendar",
      icon: "calendar-outline" as const,
    },
    {
      id: "respond",
      label: "Help me respond to the situation",
      icon: "chatbubble-outline" as const,
    },
    {
      id: "reflect",
      label: "Reflect on what triggered this feeling",
      icon: "leaf-outline" as const,
    },
  ];

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
          borderColor: "rgba(156, 163, 175, 0.12)",
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
                  backgroundColor: "#5EEAD4",
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
                style={{ color: "#5EEAD4" }}
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

          {/* Full Summary */}
          <Text
            className="text-base leading-relaxed mb-3"
            style={{
              color: "#E5E7EB",
              letterSpacing: 0.2,
              lineHeight: 24,
            }}
          >
            {emotionAnalysis.fullSummary}
          </Text>

          {/* Suggested Direction - Highlighted */}
          {emotionAnalysis.suggestedDirection && (
            <View
              className="mt-3 p-4 rounded-2xl"
              style={{
                backgroundColor: "rgba(94, 234, 212, 0.06)",
                borderWidth: 1,
                borderColor: "rgba(94, 234, 212, 0.15)",
              }}
            >
              <Text
                className="text-sm font-light mb-1"
                style={{ color: "#5EEAD4", letterSpacing: 0.3 }}
              >
                Suggested Direction
              </Text>
              <Text
                className="text-sm leading-relaxed"
                style={{
                  color: "#F9FAFB",
                  letterSpacing: 0.2,
                  lineHeight: 20,
                }}
              >
                {emotionAnalysis.suggestedDirection}
              </Text>
            </View>
          )}
        </View>

        {/* Follow-up Actions Toggle */}
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: "rgba(156, 163, 175, 0.12)",
          }}
        >
          <Pressable
            onPress={() => setShowFollowUps(!showFollowUps)}
            className="px-5 py-3 flex-row items-center justify-between active:opacity-70"
          >
            <Text
              className="text-sm font-light"
              style={{ color: "#9CA3AF", letterSpacing: 0.3 }}
            >
              {showFollowUps ? "Hide options" : "Explore deeper insights"}
            </Text>
            <Ionicons
              name={showFollowUps ? "chevron-up" : "chevron-down"}
              size={20}
              color="#9CA3AF"
            />
          </Pressable>
        </View>

        {/* Follow-up Action Buttons */}
        {showFollowUps && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="px-3 pb-3"
          >
            {followUpActions.map((action, index) => (
              <Pressable
                key={action.id}
                onPress={() => onFollowUpAction?.(action.id)}
                className="active:opacity-70"
                style={{
                  marginTop: index === 0 ? 0 : 8,
                }}
              >
                {({ pressed }) => (
                  <View
                    className="flex-row items-center px-4 py-3 rounded-2xl"
                    style={{
                      backgroundColor: pressed
                        ? "rgba(156, 163, 175, 0.12)"
                        : "rgba(156, 163, 175, 0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(156, 163, 175, 0.1)",
                    }}
                  >
                    <View
                      className="items-center justify-center mr-3"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "rgba(94, 234, 212, 0.1)",
                      }}
                    >
                      <Ionicons
                        name={action.icon}
                        size={18}
                        color="#5EEAD4"
                      />
                    </View>
                    <Text
                      className="text-sm font-light flex-1"
                      style={{ color: "#F9FAFB", letterSpacing: 0.2 }}
                    >
                      {action.label}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#9CA3AF"
                    />
                  </View>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
