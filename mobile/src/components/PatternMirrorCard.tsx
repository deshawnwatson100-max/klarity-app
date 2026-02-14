import React from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { PatternMirrorInsight } from "../types/chat";

interface PatternMirrorCardProps {
  insight: PatternMirrorInsight;
  onDismiss?: () => void;
}

export function PatternMirrorCard({ insight, onDismiss }: PatternMirrorCardProps) {
  const { colors, isDark } = useTheme();

  const accentColor = isDark ? "#A78BFA" : "#7C3AED"; // Purple for pattern insights

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.();
  };

  return (
    <View
      style={{
        marginBottom: 16,
        alignSelf: "flex-start",
        maxWidth: "92%",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isDark ? "rgba(167, 139, 250, 0.15)" : "rgba(124, 58, 237, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons name="analytics-outline" size={14} color={accentColor} />
        </View>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 12,
            fontWeight: "500",
          }}
        >
          Pattern Mirror
        </Text>
      </View>

      {/* Main Card */}
      <View
        style={{
          backgroundColor: isDark ? "rgba(167, 139, 250, 0.08)" : "rgba(124, 58, 237, 0.04)",
          borderRadius: 16,
          borderLeftWidth: 3,
          borderLeftColor: accentColor,
          padding: 14,
          gap: 12,
        }}
      >
        {/* Behavioral Insight */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Pattern Detected
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {insight.behavioralInsight}
          </Text>
        </View>

        {/* Strategic Interpretation */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Strategic Read
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {insight.strategicInterpretation}
          </Text>
        </View>

        {/* Growth Adjustment */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            borderRadius: 10,
            padding: 10,
          }}
        >
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Adjustment
          </Text>
          <Text
            style={{
              color: accentColor,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "500",
            }}
          >
            {insight.growthAdjustment}
          </Text>
        </View>

        {/* Global Reinforcement (if contact-specific pattern also appears globally) */}
        {insight.globalReinforcement && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingTop: 4,
            }}
          >
            <Ionicons name="globe-outline" size={12} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 11,
                fontStyle: "italic",
              }}
            >
              {insight.globalReinforcement}
            </Text>
          </View>
        )}

        {/* Occurrence indicator */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons name="repeat-outline" size={12} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 11,
              }}
            >
              Observed {insight.occurrenceCount}x
            </Text>
          </View>

          {onDismiss && (
            <Pressable
              onPress={handleDismiss}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                }}
              >
                Got it
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
