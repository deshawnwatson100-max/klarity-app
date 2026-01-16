import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
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
            Deep Decode
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
        {/* Overview Section */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="scan" size={18} color={accentColor} />
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Overview
            </Text>
          </View>
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

        {/* Communication Dynamics */}
        {result.communicationDynamics.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="git-network-outline" size={18} color={accentColor} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Communication Dynamics
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {result.communicationDynamics.map((dynamic, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    {dynamic.pattern}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {dynamic.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tone Analysis */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="pulse-outline" size={18} color={accentColor} />
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Tone Analysis
            </Text>
          </View>
          <View
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                Overall:{" "}
              </Text>
              <Text
                style={{
                  color: accentColor,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {result.toneAnalysis.overallTone}
              </Text>
            </View>
            {result.toneAnalysis.toneShifts && (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {result.toneAnalysis.toneShifts}
              </Text>
            )}
          </View>
        </View>

        {/* Key Observations */}
        {result.keyObservations.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="eye-outline" size={18} color={accentColor} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Key Observations
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {result.keyObservations.map((observation, index) => (
                <View
                  key={index}
                  style={{ flexDirection: "row", alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: accentColor,
                      marginTop: 7,
                      marginRight: 10,
                    }}
                  />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      lineHeight: 20,
                      flex: 1,
                    }}
                  >
                    {observation}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* What Might Be Happening */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="bulb-outline" size={18} color={accentColor} />
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              What Might Be Happening
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {result.whatMightBeHappening}
          </Text>
        </View>

        {/* Things to Consider */}
        {result.thingsToConsider.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="help-circle-outline" size={18} color={accentColor} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Things to Consider
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {result.thingsToConsider.map((item, index) => (
                <View
                  key={index}
                  style={{ flexDirection: "row", alignItems: "flex-start" }}
                >
                  <Text
                    style={{
                      color: accentColor,
                      fontSize: 14,
                      fontWeight: "600",
                      marginRight: 8,
                    }}
                  >
                    {index + 1}.
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      lineHeight: 20,
                      flex: 1,
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Navigation Guidance */}
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
              name="compass-outline"
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
              Moving Forward
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {result.navigationGuidance}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
