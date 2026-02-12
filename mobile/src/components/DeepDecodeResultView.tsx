import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../theme";
import { DeepDecodeResult } from "../api/klarity-api";

interface DeepDecodeResultViewProps {
  result: DeepDecodeResult;
  onClose: () => void;
  onNewAnalysis: () => void;
}

export function DeepDecodeResultView({
  result,
  onClose,
  onNewAnalysis,
}: DeepDecodeResultViewProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const accentColor = isDark ? "#7DD3C0" : "#059669";

  // Get health gauge color based on score
  const getHealthColor = (score: number) => {
    if (score >= 70) return "#10B981"; // Green
    if (score >= 40) return "#F59E0B"; // Yellow/Orange
    return "#EF4444"; // Red
  };

  const healthColor = getHealthColor(result.healthScore);

  const handleCopyResponse = async (response: string) => {
    await Clipboard.setStringAsync(response);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.headerBackground,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            Decode
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNewAnalysis();
            }}
          >
            <Ionicons name="refresh" size={22} color={accentColor} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Health Gauge */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "600" }}>
              Conversation Health
            </Text>
            <View
              style={{
                backgroundColor: healthColor + "20",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: healthColor, fontSize: 13, fontWeight: "600" }}>
                {result.healthLabel}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${result.healthScore}%`,
                backgroundColor: healthColor,
                borderRadius: 4,
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Toxic</Text>
            <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Healthy</Text>
          </View>
        </View>

        {/* Overview Section */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            Overview
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {result.overview}
          </Text>
        </View>

        {/* Tone */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
            Tone
          </Text>
          <Text style={{ color: accentColor, fontSize: 15, fontWeight: "500" }}>
            {result.tone}
          </Text>
        </View>

        {/* What Stands Out */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
            What stands out
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {result.whatStandsOut}
          </Text>
        </View>

        {/* Hidden Undertones */}
        {result.hiddenUndertones.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginBottom: 12 }}>
              Possible meanings
            </Text>
            <View style={{ gap: 10 }}>
              {result.hiddenUndertones.map((item, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderRadius: 12,
                    padding: 14,
                    borderLeftWidth: 3,
                    borderLeftColor: accentColor,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="bulb-outline" size={16} color={accentColor} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600" }}>
                      {item.undertone}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    {item.explanation}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Suggested Responses */}
        {result.suggestedResponses.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginBottom: 12 }}>
              How to respond
            </Text>
            <View style={{ gap: 10 }}>
              {result.suggestedResponses.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleCopyResponse(item.response)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed
                      ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
                      : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderRadius: 12,
                    padding: 14,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <View
                      style={{
                        backgroundColor: accentColor + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: accentColor, fontSize: 12, fontWeight: "600" }}>
                        {item.tone}
                      </Text>
                    </View>
                    <Ionicons name="copy-outline" size={16} color={colors.textTertiary} />
                  </View>
                  <Text style={{ color: colors.textPrimary, fontSize: 15, lineHeight: 21 }}>
                    {item.response}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Something to Consider */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(125, 211, 192, 0.08)" : "rgba(5, 150, 105, 0.06)",
            borderRadius: 14,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: accentColor,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={accentColor}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Something to consider
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {result.somethingToConsider}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
