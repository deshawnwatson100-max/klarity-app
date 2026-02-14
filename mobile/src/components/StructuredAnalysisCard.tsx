import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import {
  StructuredAnalysisResult,
  SignalStrength,
  ReplyStyle,
} from "../types/chat";

interface StructuredAnalysisCardProps {
  analysis: StructuredAnalysisResult;
  onReplySelect?: (reply: string) => void;
}

// Signal Strength Indicator Component
function SignalStrengthIndicator({
  strength,
  label,
}: {
  strength: SignalStrength;
  label: string;
}) {
  const { isDark } = useTheme();

  const getSignalConfig = () => {
    switch (strength) {
      case "green":
        return {
          color: "#10B981",
          bgColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
          iconName: "checkmark-circle" as const,
        };
      case "yellow":
        return {
          color: "#F59E0B",
          bgColor: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)",
          iconName: "remove-circle" as const,
        };
      case "red":
        return {
          color: "#EF4444",
          bgColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
          iconName: "alert-circle" as const,
        };
    }
  };

  const config = getSignalConfig();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: config.bgColor,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
      }}
    >
      <Ionicons name={config.iconName} size={18} color={config.color} />
      <Text
        style={{
          color: config.color,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Power Move Reply Button Component
function ReplyStyleButton({
  style,
  message,
  isSelected,
  onPress,
  onCopy,
}: {
  style: ReplyStyle;
  message: string;
  isSelected: boolean;
  onPress: () => void;
  onCopy: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const getStyleConfig = () => {
    switch (style) {
      case "calm":
        return {
          label: "Calm",
          color: isDark ? "#7DD3C0" : "#059669",
          bgColor: isDark ? "rgba(125, 211, 192, 0.1)" : "rgba(5, 150, 105, 0.08)",
        };
      case "direct":
        return {
          label: "Direct",
          color: isDark ? "#60A5FA" : "#2563EB",
          bgColor: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(37, 99, 235, 0.08)",
        };
      case "detached":
        return {
          label: "Detached",
          color: isDark ? "#A78BFA" : "#7C3AED",
          bgColor: isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(124, 58, 237, 0.08)",
        };
    }
  };

  const config = getStyleConfig();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isSelected
          ? config.bgColor
          : pressed
          ? isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.02)"
          : "transparent",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: isSelected ? config.color + "40" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View
          style={{
            backgroundColor: config.color + "20",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: config.color, fontSize: 12, fontWeight: "600" }}>
            {config.label}
          </Text>
        </View>
        {isSelected && (
          <Pressable onPress={handleCopy} hitSlop={8}>
            {copied ? (
              <Ionicons name="checkmark" size={16} color={config.color} />
            ) : (
              <Ionicons name="copy-outline" size={16} color={colors.textTertiary} />
            )}
          </Pressable>
        )}
      </View>
      {isSelected && (
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      )}
    </Pressable>
  );
}

// Deeper Pattern Expansion Component
function DeeperPatternExpansion({
  analysis,
}: {
  analysis: StructuredAnalysisResult["deeperPattern"];
}) {
  const { colors, isDark } = useTheme();

  if (!analysis) return null;

  const getAttachmentColor = () => {
    switch (analysis.attachmentStyle) {
      case "secure":
        return "#10B981";
      case "anxious":
        return "#F59E0B";
      case "avoidant":
        return "#EF4444";
      case "disorganized":
        return "#EF4444";
      default:
        return colors.textSecondary;
    }
  };

  const getIntentColor = () => {
    switch (analysis.intentProbability) {
      case "genuine":
        return "#10B981";
      case "uncertain":
        return "#F59E0B";
      case "likely_avoidant":
        return "#EF4444";
      case "testing":
        return "#F59E0B";
      default:
        return colors.textSecondary;
    }
  };

  const getRiskColor = () => {
    switch (analysis.patternRisk) {
      case "low":
        return "#10B981";
      case "moderate":
        return "#F59E0B";
      case "high":
        return "#EF4444";
    }
  };

  const formatLabel = (str: string) => {
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        borderRadius: 14,
        padding: 14,
        gap: 14,
      }}
    >
      {/* Attachment Style */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: "500" }}>
            Attachment Style Possibility
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <View
            style={{
              backgroundColor: getAttachmentColor() + "20",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: getAttachmentColor(), fontSize: 12, fontWeight: "600" }}>
              {formatLabel(analysis.attachmentStyle)}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          {analysis.attachmentExplanation}
        </Text>
      </View>

      {/* Intent Probability */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: "500" }}>
            Intent Probability
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <View
            style={{
              backgroundColor: getIntentColor() + "20",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: getIntentColor(), fontSize: 12, fontWeight: "600" }}>
              {formatLabel(analysis.intentProbability)}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          {analysis.intentExplanation}
        </Text>
      </View>

      {/* Pattern Risk */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: "500" }}>
            Long-term Pattern Risk
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <View
            style={{
              backgroundColor: getRiskColor() + "20",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: getRiskColor(), fontSize: 12, fontWeight: "600" }}>
              {formatLabel(analysis.patternRisk)} Risk
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          {analysis.patternRiskExplanation}
        </Text>
      </View>
    </View>
  );
}

// Main Structured Analysis Card Component
export function StructuredAnalysisCard({ analysis, onReplySelect }: StructuredAnalysisCardProps) {
  const { colors, isDark } = useTheme();
  const [selectedReplyStyle, setSelectedReplyStyle] = useState<ReplyStyle | null>(null);
  const [showDeeperPattern, setShowDeeperPattern] = useState(false);

  const accentColor = isDark ? "#7DD3C0" : "#059669";

  const handleReplySelect = (style: ReplyStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReplyStyle(selectedReplyStyle === style ? null : style);
  };

  const handleToggleDeeperPattern = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDeeperPattern(!showDeeperPattern);
  };

  return (
    <View
      style={{
        marginBottom: 16,
        alignSelf: "flex-start",
        maxWidth: "92%",
      }}
    >
      {/* Main Card */}
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
          borderRadius: 20,
          padding: 16,
          gap: 16,
        }}
      >
        {/* Section 1: Surface Meaning */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            What this is saying on the surface
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {analysis.surfaceMeaning}
          </Text>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        />

        {/* Section 2: Hidden Subtext */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            What this could actually mean emotionally
          </Text>
          <View style={{ gap: 8 }}>
            {analysis.hiddenSubtext.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: accentColor,
                    marginTop: 7,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    <Text style={{ fontWeight: "600" }}>{item.meaning}</Text>
                    {item.explanation ? ` — ${item.explanation}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        />

        {/* Section 3: Signal Strength */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Signal Strength
          </Text>
          <SignalStrengthIndicator
            strength={analysis.signalStrength}
            label={analysis.signalLabel}
          />
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        />

        {/* Section 4: Power Move Recommendation */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Your Strongest Move
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 12,
            }}
          >
            {analysis.powerMoveExplanation}
          </Text>
          <View style={{ gap: 8 }}>
            {analysis.powerMoveReplies.map((reply, index) => (
              <ReplyStyleButton
                key={index}
                style={reply.style}
                message={reply.message}
                isSelected={selectedReplyStyle === reply.style}
                onPress={() => handleReplySelect(reply.style)}
                onCopy={() => onReplySelect?.(reply.message)}
              />
            ))}
          </View>
        </View>

        {/* Section 5: Deeper Pattern Button */}
        {analysis.deeperPattern && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
            />

            <Pressable
              onPress={handleToggleDeeperPattern}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: pressed
                  ? isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)"
                  : "transparent",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              })}
            >
              <Text
                style={{
                  color: accentColor,
                  fontSize: 13,
                  fontWeight: "500",
                  marginRight: 6,
                }}
              >
                {showDeeperPattern ? "Hide deeper pattern" : "Understand the deeper pattern"}
              </Text>
              <Ionicons
                name={showDeeperPattern ? "chevron-up" : "chevron-down"}
                size={16}
                color={accentColor}
              />
            </Pressable>

            {showDeeperPattern && (
              <DeeperPatternExpansion analysis={analysis.deeperPattern} />
            )}
          </>
        )}
      </View>
    </View>
  );
}
