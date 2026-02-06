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
import { useTheme } from "../theme";

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
  const { isDark } = useTheme();
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

  // Theme-aware colors
  const cardBg = isDark ? "#1A1A1C" : "#FFFFFF";
  const cardBorderColor = isDark ? "#9CA3AF30" : "rgba(0, 0, 0, 0.08)";
  const accentColor = isDark ? "#9CA3AF" : "#636366";
  const headingColor = isDark ? "#E5E7EB" : "#1C1C1E";
  const labelColor = isDark ? "#9CA3AF" : "#636366";
  const textColor = isDark ? "#E5E7EB" : "#1C1C1E";
  const detailTextColor = isDark ? "#D1D5DB" : "#3C3C43";
  const itemBg = isDark ? "#0F0F11" : "#F5F5F7";
  const itemBorderColor = isDark ? "#9CA3AF20" : "rgba(0, 0, 0, 0.06)";
  const buttonTextColor = isDark ? "#E5E7EB" : "#1C1C1E";
  const secondaryButtonTextColor = isDark ? "#9CA3AF" : "#636366";

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View
        className="rounded-3xl p-6 overflow-hidden"
        style={{
          backgroundColor: cardBg,
          borderWidth: 1.5,
          borderColor: cardBorderColor,
          shadowColor: isDark ? "#9CA3AF" : "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 20,
        }}
      >
        {/* Subtle inner glow at top */}
        <View
          className="absolute top-0 left-0 right-0 h-px"
          style={{ backgroundColor: accentColor, opacity: 0.3 }}
        />

        {/* Header with Icon */}
        <View className="flex-row items-center mb-1">
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: isDark ? "#9CA3AF15" : "rgba(0, 0, 0, 0.05)" }}
          >
            <Ionicons name="shield-outline" size={14} color={accentColor} />
          </View>
          <Text
            className="text-lg font-bold flex-1"
            style={{
              fontFamily: "SF Pro Display",
              color: headingColor,
            }}
          >
            Possible Boundary Tension Detected
          </Text>
        </View>
        <Text
          className="text-xs uppercase tracking-wider mb-4"
          style={{
            fontFamily: "SF Pro Display",
            color: labelColor,
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
              color: textColor,
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
                color: labelColor,
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
                    backgroundColor: itemBg,
                    borderWidth: 1,
                    borderColor: itemBorderColor,
                  }}
                >
                  <Text
                    className="text-sm leading-5"
                    style={{
                      fontFamily: "SF Pro Display",
                      color: detailTextColor,
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
                backgroundColor: itemBg,
                borderWidth: 1,
                borderColor: itemBorderColor,
              }}
            >
              <Text
                className="text-sm leading-5"
                style={{
                  fontFamily: "SF Pro Display",
                  color: detailTextColor,
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
              backgroundColor: itemBg,
              borderWidth: 1,
              borderColor: itemBorderColor,
            }}
          >
            <Text
              className="text-sm font-medium text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: buttonTextColor,
              }}
            >
              Add more context
            </Text>
          </Pressable>

          <Pressable
            onPress={onExploreResponse}
            className="rounded-xl p-3 active:opacity-70"
            style={{
              backgroundColor: itemBg,
              borderWidth: 1,
              borderColor: itemBorderColor,
            }}
          >
            <Text
              className="text-sm font-medium text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: buttonTextColor,
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
              borderColor: itemBorderColor,
            }}
          >
            <Text
              className="text-sm font-medium text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: secondaryButtonTextColor,
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
