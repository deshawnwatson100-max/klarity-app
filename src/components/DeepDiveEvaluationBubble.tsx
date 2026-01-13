import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DeepDiveResultQuality } from "../types/chat";

const COLORS = {
  text: "#EDEDED",
  textSecondary: "#A0A0A0",
  textMuted: "#6B7280",
  link: "#60A5FA",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  buttonBg: "rgba(255, 255, 255, 0.08)",
  buttonBgHover: "rgba(255, 255, 255, 0.12)",
};

interface DeepDiveEvaluationBubbleProps {
  personName: string;
  resultQuality: DeepDiveResultQuality;
  sourcesCount: number;
  acknowledgmentText: string;
  suggestFollowUp: boolean;
  followUpReason?: string;
  missingDataTypes?: string[];
  onProvideMoreInfo?: () => void;
  onContinueWithResults?: () => void;
}

/**
 * AI acknowledgment bubble that evaluates deep dive results and offers collaboration
 * This creates trust by being transparent about what was found and what might help
 */
export function DeepDiveEvaluationBubble({
  personName,
  resultQuality,
  sourcesCount,
  acknowledgmentText,
  suggestFollowUp,
  followUpReason,
  missingDataTypes,
  onProvideMoreInfo,
  onContinueWithResults,
}: DeepDiveEvaluationBubbleProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger button animations
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(buttonTranslateY, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);
  }, []);

  // Get quality indicator
  const getQualityIndicator = () => {
    switch (resultQuality) {
      case "strong":
        return { icon: "checkmark-circle" as const, color: COLORS.success, label: "Good results" };
      case "moderate":
        return { icon: "information-circle" as const, color: COLORS.link, label: "Some results" };
      case "weak":
        return { icon: "alert-circle" as const, color: COLORS.warning, label: "Limited results" };
      case "no_results":
        return { icon: "close-circle" as const, color: COLORS.error, label: "No results" };
    }
  };

  const qualityIndicator = getQualityIndicator();

  // Format missing data types for display
  const formatMissingTypes = (types: string[]): string => {
    if (types.length === 0) return "";
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]} or ${types[1]}`;
    return `${types.slice(0, -1).join(", ")}, or ${types[types.length - 1]}`;
  };

  return (
    <Animated.View
      style={{
        marginBottom: 24,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Quality indicator pill */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.buttonBg,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
          }}
        >
          <Ionicons name={qualityIndicator.icon} size={14} color={qualityIndicator.color} />
          <Text style={{ fontSize: 12, color: qualityIndicator.color, marginLeft: 4, fontWeight: "500" }}>
            {qualityIndicator.label}
          </Text>
          {sourcesCount > 0 && (
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>
              · {sourcesCount} source{sourcesCount !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>

      {/* Main acknowledgment text */}
      <Text
        style={{
          fontSize: 17,
          lineHeight: 26,
          color: COLORS.text,
          letterSpacing: 0.2,
          marginBottom: suggestFollowUp ? 16 : 0,
        }}
      >
        {acknowledgmentText}
      </Text>

      {/* Follow-up suggestion section */}
      {suggestFollowUp && (
        <View style={{ marginTop: 4 }}>
          {/* Reason for needing more info */}
          {followUpReason && (
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: COLORS.textSecondary,
                marginBottom: 12,
              }}
            >
              {followUpReason}
            </Text>
          )}

          {/* Missing data types hint */}
          {missingDataTypes && missingDataTypes.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                backgroundColor: "rgba(96, 165, 250, 0.08)",
                padding: 12,
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <Ionicons name="bulb-outline" size={16} color={COLORS.link} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginLeft: 8, flex: 1 }}>
                Adding a <Text style={{ color: COLORS.link, fontWeight: "500" }}>{formatMissingTypes(missingDataTypes)}</Text> could help me find more about {personName}.
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <Animated.View
            style={{
              flexDirection: "row",
              gap: 10,
              flexWrap: "wrap",
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }],
            }}
          >
            {/* Provide more info button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onProvideMoreInfo?.();
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: pressed ? "rgba(96, 165, 250, 0.2)" : "rgba(96, 165, 250, 0.12)",
              })}
            >
              <Ionicons name="add-circle-outline" size={16} color={COLORS.link} />
              <Text style={{ color: COLORS.link, fontSize: 14, fontWeight: "500", marginLeft: 6 }}>
                Add more details
              </Text>
            </Pressable>

            {/* Continue with current results button (only if we have some results) */}
            {resultQuality !== "no_results" && onContinueWithResults && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onContinueWithResults();
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: pressed ? COLORS.buttonBgHover : COLORS.buttonBg,
                })}
              >
                <Ionicons name="arrow-forward-outline" size={16} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginLeft: 6 }}>
                  Continue with these
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}
