import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BoundaryAnalysis } from "../types/chat";

interface BoundaryDetectionCardProps {
  analysis: BoundaryAnalysis;
  onAddMoreContext?: () => void;
  onExploreResponse?: () => void;
  onUnderstandBoundaries?: () => void;
}

export function BoundaryDetectionCard({
  analysis,
  onAddMoreContext,
  onExploreResponse,
  onUnderstandBoundaries,
}: BoundaryDetectionCardProps) {
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

        {/* Header with Icon */}
        <View className="flex-row items-center mb-1">
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: "#9CA3AF15" }}
          >
            <Ionicons name="shield-outline" size={14} color="#9CA3AF" />
          </View>
          <Text
            className="text-lg font-bold flex-1"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            Possible Boundary Tension Detected
          </Text>
        </View>
        <Text
          className="text-xs uppercase tracking-wider mb-4"
          style={{
            fontFamily: "SF Pro Display",
            color: "#9CA3AF",
          }}
        >
          Awareness Insight
        </Text>

        {/* Primary Message */}
        <View className="mb-5">
          <Text
            className="text-base leading-6"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            {analysis.primaryMessage}
          </Text>
        </View>

        {/* What Was Noticed (Detected Signals) - max 2 */}
        {analysis.detectedSignals && analysis.detectedSignals.length > 0 && (
          <View className="mb-5">
            <Text
              className="text-sm font-semibold mb-3"
              style={{
                fontFamily: "SF Pro Display",
                color: "#9CA3AF",
              }}
            >
              What Was Noticed
            </Text>
            <View className="gap-2">
              {analysis.detectedSignals.slice(0, 2).map((signal, index) => (
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
                    {signal}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Supportive Reassurance */}
        {analysis.supportiveNote && (
          <View className="mb-5">
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
                {analysis.supportiveNote}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="gap-3">
          <Pressable
            onPress={onAddMoreContext}
            className="rounded-xl p-3 active:opacity-70"
            style={{
              backgroundColor: "#0F0F11",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm font-medium text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: "#E5E7EB",
              }}
            >
              Add more context
            </Text>
          </Pressable>

          <Pressable
            onPress={onExploreResponse}
            className="rounded-xl p-3 active:opacity-70"
            style={{
              backgroundColor: "#0F0F11",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm font-medium text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: "#E5E7EB",
              }}
            >
              Explore a healthier response
            </Text>
          </Pressable>

          <Pressable
            onPress={onUnderstandBoundaries}
            className="rounded-xl p-3 active:opacity-70"
            style={{
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm font-medium text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: "#9CA3AF",
              }}
            >
              Understand my boundaries better
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
