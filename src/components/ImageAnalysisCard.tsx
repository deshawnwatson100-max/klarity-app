import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { ImageAnalysis } from "../types/chat";
import { Ionicons } from "@expo/vector-icons";

interface ImageAnalysisCardProps {
  analysis: ImageAnalysis;
}

export function ImageAnalysisCard({ analysis }: ImageAnalysisCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleCopyResponse = async () => {
    await Clipboard.setStringAsync(analysis.suggestedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View className="bg-neutral-950 border border-[#B4FF39] rounded-2xl p-5 overflow-hidden">
        {/* Glow effect */}
        <View
          className="absolute top-0 left-0 right-0 h-px"
          style={{ backgroundColor: "#B4FF39", opacity: 0.3 }}
        />

        {/* Title */}
        <Text className="text-[#B4FF39] text-lg font-bold mb-1">
          Dysfunctional Communication Detected
        </Text>
        <Text className="text-neutral-500 text-xs uppercase tracking-wider mb-4">
          Image Analysis
        </Text>

        {/* Section 1: Quick Summary */}
        <View className="mb-5">
          <Text className="text-[#B4FF39] text-sm font-semibold mb-2">
            Quick Summary
          </Text>
          <Text className="text-neutral-200 text-base leading-6">
            {analysis.summary}
          </Text>
        </View>

        {/* Section 2: Labeled Patterns */}
        <View className="mb-5">
          <Text className="text-[#B4FF39] text-sm font-semibold mb-3">
            Communication Patterns
          </Text>
          <View className="gap-3">
            {analysis.labels.map((label, index) => (
              <View
                key={index}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-3"
              >
                {/* Tag Badge */}
                <View className="flex-row items-center mb-2">
                  <View className="bg-[#B4FF39] bg-opacity-20 px-3 py-1 rounded-full">
                    <Text className="text-[#B4FF39] text-xs font-bold uppercase tracking-wide">
                      {label.tag}
                    </Text>
                  </View>
                </View>
                {/* Description */}
                <Text className="text-neutral-300 text-sm leading-5">
                  {label.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: Emotional Impact */}
        <View className="mb-5">
          <Text className="text-[#B4FF39] text-sm font-semibold mb-2">
            Emotional Impact
          </Text>
          <Text className="text-neutral-200 text-base leading-6">
            {analysis.emotionalImpact}
          </Text>
        </View>

        {/* Section 4: Suggested Response */}
        <View>
          <Text className="text-[#B4FF39] text-sm font-semibold mb-2">
            Suggested Response
          </Text>
          <View className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 mb-3">
            <Text className="text-neutral-200 text-base leading-6 font-mono">
              {analysis.suggestedResponse}
            </Text>
          </View>
          <Pressable
            onPress={handleCopyResponse}
            className="bg-[#B4FF39] rounded-lg py-3 px-4 active:opacity-80"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons
                name={copied ? "checkmark-circle" : "copy-outline"}
                size={20}
                color="#000000"
              />
              <Text className="text-black text-base font-semibold">
                {copied ? "Copied!" : "Copy Reply"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
