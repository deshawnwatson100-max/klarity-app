import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ImageAnalysis } from "../types/chat";
import { Ionicons } from "@expo/vector-icons";

interface ImageAnalysisCardProps {
  analysis: ImageAnalysis;
}

export function ImageAnalysisCard({ analysis }: ImageAnalysisCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="mb-4">
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

        {/* Title */}
        <Text
          className="text-lg font-bold mb-1"
          style={{
            fontFamily: "SF Pro Display",
            color: "#E5E7EB",
          }}
        >
          Dysfunctional Communication Detected
        </Text>
        <Text
          className="text-xs uppercase tracking-wider mb-4"
          style={{
            fontFamily: "SF Pro Display",
            color: "#9CA3AF",
          }}
        >
          Image Analysis
        </Text>

        {/* Section 1: Quick Summary */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Quick Summary
          </Text>
          <Text
            className="text-base leading-6"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            {analysis.summary}
          </Text>
        </View>

        {/* Section 2: Labeled Patterns */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-3"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Communication Patterns
          </Text>
          <View className="gap-3">
            {analysis.labels.map((label, index) => (
              <View
                key={index}
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "#0F0F11",
                  borderWidth: 1,
                  borderColor: "#9CA3AF20",
                }}
              >
                {/* Tag Badge */}
                <View className="flex-row items-center mb-2">
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: "#9CA3AF20",
                    }}
                  >
                    <Text
                      className="text-xs font-bold uppercase tracking-wide"
                      style={{
                        fontFamily: "SF Pro Display",
                        color: "#9CA3AF",
                      }}
                    >
                      {label.tag}
                    </Text>
                  </View>
                </View>
                {/* Description */}
                <Text
                  className="text-sm leading-5"
                  style={{
                    fontFamily: "SF Pro Display",
                    color: "#D1D5DB",
                  }}
                >
                  {label.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: Emotional Impact */}
        <View className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#9CA3AF",
            }}
          >
            Emotional Impact
          </Text>
          <Text
            className="text-base leading-6"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            {analysis.emotionalImpact}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
