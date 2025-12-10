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
    <View className="mb-4 mr-12">
      {/* Voice Emotion Scan Result Card */}
      <View className="bg-neutral-900/60 border border-purple-500/20 rounded-2xl p-5 shadow-lg">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-10 h-10 bg-purple-500/10 rounded-full items-center justify-center">
            <Ionicons name="mic" size={20} color="#B47CFF" />
          </View>
          <Text className="text-white font-semibold text-lg flex-1">
            🎙️ Voice Emotion Analysis
          </Text>
        </View>

        {/* Primary Emotions */}
        <View className="mb-4 pb-4 border-b border-neutral-800">
          <Text className="text-purple-300 font-medium text-sm mb-2">
            Primary Detected Emotion(s)
          </Text>
          <Text className="text-white text-base leading-relaxed">
            {voiceEmotionAnalysis.primaryEmotions}
          </Text>
        </View>

        {/* Voice Indicators */}
        <View className="mb-4 pb-4 border-b border-neutral-800">
          <Text className="text-blue-300 font-medium text-sm mb-3">
            Voice Indicators
          </Text>
          {voiceEmotionAnalysis.voiceIndicators.map((indicator, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-2">
              <Text className="text-blue-400 mt-1">•</Text>
              <Text className="text-neutral-300 text-sm leading-relaxed flex-1">
                {indicator}
              </Text>
            </View>
          ))}
        </View>

        {/* Emotional Meaning Summary */}
        <View className="mb-4 pb-4 border-b border-neutral-800">
          <Text className="text-orange-300 font-medium text-sm mb-2">
            Emotional Meaning Summary
          </Text>
          <Text className="text-neutral-200 text-sm leading-relaxed italic">
            {voiceEmotionAnalysis.emotionalMeaningSummary}
          </Text>
        </View>

        {/* Context & Situation Understanding */}
        <View className="mb-4 pb-4 border-b border-neutral-800">
          <Text className="text-yellow-300 font-medium text-sm mb-2">
            🧩 Context & Situation Understanding
          </Text>
          <Text className="text-neutral-200 text-sm leading-relaxed">
            {voiceEmotionAnalysis.contextUnderstanding}
          </Text>
        </View>

        {/* Supportive Reflection */}
        <View className="mb-4">
          <Text className="text-blue-300 font-medium text-sm mb-2">
            Supportive Reflection
          </Text>
          <View className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
            <Text className="text-neutral-200 text-sm leading-relaxed">
              {voiceEmotionAnalysis.supportiveReflection}
            </Text>
          </View>
        </View>

        {/* Next Steps Section */}
        <View className="mt-4 pt-4 border-t border-neutral-800">
          <Text className="text-neutral-400 font-medium text-xs mb-3">
            🔍 OPTIONS FOR NEXT STEP
          </Text>
          <View className="gap-2">
            <Pressable
              onPress={() => onFollowUpAction?.("add-context")}
              className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-3 active:opacity-70"
            >
              <Text className="text-white text-sm font-medium">
                [ 1 ] Add more context / voice or text input
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFollowUpAction?.("choose-direction")}
              className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-3 active:opacity-70"
            >
              <Text className="text-white text-sm font-medium">
                [ 2 ] Choose relationship direction
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFollowUpAction?.("generate-replies")}
              className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-3 active:opacity-70"
            >
              <Text className="text-white text-sm font-medium">
                [ 3 ] Generate reply suggestions
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFollowUpAction?.("check-outcomes")}
              className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-3 active:opacity-70"
            >
              <Text className="text-white text-sm font-medium">
                [ 4 ] Check possible outcomes of responding this way
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
