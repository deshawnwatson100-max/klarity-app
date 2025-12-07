import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface ReflectiveUnderstandingBubbleProps {
  reflectiveUnderstanding: string;
  situationClarity: string;
}

export function ReflectiveUnderstandingBubble({
  reflectiveUnderstanding,
  situationClarity,
}: ReflectiveUnderstandingBubbleProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      style={{
        marginVertical: 12,
        marginHorizontal: 16,
        alignSelf: "flex-start",
        maxWidth: "85%",
      }}
    >
      {/* Part 1: Reflective Understanding (Empathy + Validation) */}
      <View
        style={{
          backgroundColor: "#0A0A0A",
          borderRadius: 16,
          padding: 16,
          borderWidth: 0.5,
          borderColor: "#B8A3E8",
          shadowColor: "#B8A3E8",
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          marginBottom: 8,
        }}
      >
        {/* Label */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
            paddingBottom: 8,
            borderBottomWidth: 0.5,
            borderBottomColor: "#262626",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: "#B8A3E8",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            💜 Reflective Understanding
          </Text>
        </View>

        {/* Content */}
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: "#F9FAFB",
            fontWeight: "400",
            letterSpacing: 0.2,
          }}
        >
          {reflectiveUnderstanding}
        </Text>
      </View>

      {/* Part 2: Situation Clarity (Neutral Summary) */}
      <View
        style={{
          backgroundColor: "#0A0A0A",
          borderRadius: 16,
          padding: 16,
          borderWidth: 0.5,
          borderColor: "#6B7280",
          shadowColor: "#6B7280",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {/* Label */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
            paddingBottom: 8,
            borderBottomWidth: 0.5,
            borderBottomColor: "#262626",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: "#9CA3AF",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            📊 Situation Clarity
          </Text>
        </View>

        {/* Content */}
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: "#D1D5DB",
            fontWeight: "400",
            letterSpacing: 0.2,
          }}
        >
          {situationClarity}
        </Text>
      </View>
    </Animated.View>
  );
}
