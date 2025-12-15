import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VoiceEmotionAnalysis } from "../types/chat";

interface VoiceEmotionScanBubbleProps {
  voiceEmotionAnalysis: VoiceEmotionAnalysis;
  onFollowUpAction?: (action: string) => void;
}

export function VoiceEmotionScanBubble({
  voiceEmotionAnalysis,
  onFollowUpAction,
}: VoiceEmotionScanBubbleProps) {
  return (
    <View className="mb-4">
      {/* Voice Emotion Scan Result Card */}
      <View
        className="rounded-3xl p-6 overflow-hidden"
        style={{
          backgroundColor: "#1A1A1C",
          borderWidth: 1.5,
          borderColor: "#9CA3AF30",
          shadowColor: "#9CA3AF",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
        }}
      >
        {/* Subtle inner glow at top */}
        <View
          className="absolute top-0 left-0 right-0 h-px"
          style={{ backgroundColor: "#9CA3AF", opacity: 0.3 }}
        />

        {/* Header */}
        <Text
          className="text-lg font-bold mb-1"
          style={{
            fontFamily: "SF Pro Display",
            color: "#E5E7EB",
          }}
        >
          Voice Emotion Analysis
        </Text>
        <Text
          className="text-xs uppercase tracking-wider mb-4"
          style={{
            fontFamily: "SF Pro Display",
            color: "#9CA3AF",
          }}
        >
          Emotional Insight
        </Text>

        {/* Primary Emotions */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Primary Detected Emotion(s)
          </Text>
          <Text
            className="text-base leading-6"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            {voiceEmotionAnalysis.primaryEmotions}
          </Text>
        </View>

        {/* Voice Indicators */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-3"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Voice Indicators
          </Text>
          <View className="gap-3">
            {voiceEmotionAnalysis.voiceIndicators.map((indicator, index) => (
              <View
                key={index}
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "#0F0F11",
                  borderWidth: 1,
                  borderColor: "#9CA3AF20",
                }}
              >
                <Text
                  className="text-sm leading-5"
                  style={{
                    fontFamily: "SF Pro Display",
                    color: "#D1D5DB",
                  }}
                >
                  {indicator}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Emotional Meaning Summary */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Emotional Meaning Summary
          </Text>
          <Text
            className="text-base leading-6 italic"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            {voiceEmotionAnalysis.emotionalMeaningSummary}
          </Text>
        </View>

        {/* Context & Situation Understanding */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Context & Situation Understanding
          </Text>
          <Text
            className="text-base leading-6"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            {voiceEmotionAnalysis.contextUnderstanding}
          </Text>
        </View>

        {/* Supportive Reflection */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Supportive Reflection
          </Text>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: "#0F0F11",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm leading-5"
              style={{
                fontFamily: "SF Pro Display",
                color: "#D1D5DB",
              }}
            >
              {voiceEmotionAnalysis.supportiveReflection}
            </Text>
          </View>
        </View>

        {/* Next Steps Section */}
        <View className="mb-0">
          <Text
            className="text-xs uppercase tracking-wider mb-3"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Options for Next Step
          </Text>
          <View className="gap-3">
            <Pressable
              onPress={() => onFollowUpAction?.("add-context")}
              className="rounded-xl p-3 active:opacity-70"
              style={{
                backgroundColor: "#0F0F11",
                borderWidth: 1,
                borderColor: "#9CA3AF20",
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  fontFamily: "SF Pro Display",
                  color: "#E5E7EB",
                }}
              >
                [ 1 ] Add more context / voice or text input
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFollowUpAction?.("choose-direction")}
              className="rounded-xl p-3 active:opacity-70"
              style={{
                backgroundColor: "#0F0F11",
                borderWidth: 1,
                borderColor: "#9CA3AF20",
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  fontFamily: "SF Pro Display",
                  color: "#E5E7EB",
                }}
              >
                [ 2 ] Choose relationship direction
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFollowUpAction?.("generate-replies")}
              className="rounded-xl p-3 active:opacity-70"
              style={{
                backgroundColor: "#0F0F11",
                borderWidth: 1,
                borderColor: "#9CA3AF20",
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  fontFamily: "SF Pro Display",
                  color: "#E5E7EB",
                }}
              >
                [ 3 ] Generate reply suggestions
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFollowUpAction?.("check-outcomes")}
              className="rounded-xl p-3 active:opacity-70"
              style={{
                backgroundColor: "#0F0F11",
                borderWidth: 1,
                borderColor: "#9CA3AF20",
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  fontFamily: "SF Pro Display",
                  color: "#E5E7EB",
                }}
              >
                [ 4 ] Check possible outcomes of responding this way
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
