import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../theme";
import { DeepDecodeResultMessage } from "../types/chat";

interface DeepDecodeResultBubbleProps {
  result: DeepDecodeResultMessage["decodeResult"];
}

export function DeepDecodeResultBubble({ result }: DeepDecodeResultBubbleProps) {
  const { colors, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const accentColor = isDark ? "#7DD3C0" : "#059669";

  // Get health gauge color based on score
  const getHealthColor = (score: number) => {
    if (score >= 70) return "#10B981"; // Green
    if (score >= 40) return "#F59E0B"; // Yellow/Orange
    return "#EF4444"; // Red
  };

  const healthColor = getHealthColor(result.healthScore);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  const handleCopyResponse = async (response: string) => {
    await Clipboard.setStringAsync(response);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View
      style={{
        marginBottom: 16,
        alignSelf: "flex-start",
        maxWidth: "92%",
      }}
    >
      {/* Header with icon */}
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
            backgroundColor: isDark ? "rgba(125, 211, 192, 0.15)" : "rgba(5, 150, 105, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons name="scan" size={14} color={accentColor} />
        </View>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 12,
            fontWeight: "500",
          }}
        >
          Decode Analysis
        </Text>
      </View>

      {/* Main bubble content */}
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
          borderRadius: 18,
          borderTopLeftRadius: 4,
          padding: 16,
        }}
      >
        {/* Health Gauge - always visible */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            Conversation Health
          </Text>
          <View
            style={{
              backgroundColor: healthColor + "20",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: healthColor, fontSize: 12, fontWeight: "600" }}>
              {result.healthLabel}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 6,
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            borderRadius: 3,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${result.healthScore}%`,
              backgroundColor: healthColor,
              borderRadius: 3,
            }}
          />
        </View>

        {/* Overview - always visible */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: isExpanded ? 16 : 0,
          }}
        >
          {result.overview}
        </Text>

        {/* Expanded content */}
        {isExpanded && (
          <View>
            {/* Tone */}
            <View
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Ionicons
                  name="pulse-outline"
                  size={14}
                  color={accentColor}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Tone
                </Text>
              </View>
              <Text
                style={{
                  color: accentColor,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {result.tone}
              </Text>
            </View>

            {/* What Stands Out */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons
                  name="eye-outline"
                  size={14}
                  color={accentColor}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  What stands out
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {result.whatStandsOut}
              </Text>
            </View>

            {/* Hidden Undertones */}
            {result.hiddenUndertones.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons
                    name="bulb-outline"
                    size={14}
                    color={accentColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Possible meanings
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {result.hiddenUndertones.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        borderRadius: 10,
                        padding: 10,
                        borderLeftWidth: 2,
                        borderLeftColor: accentColor,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: 13,
                          fontWeight: "600",
                          marginBottom: 2,
                        }}
                      >
                        {item.undertone}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          lineHeight: 18,
                        }}
                      >
                        {item.explanation}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Suggested Responses */}
            {result.suggestedResponses.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={14}
                    color={accentColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    How to respond
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {result.suggestedResponses.map((item, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleCopyResponse(item.response)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed
                          ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
                          : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        borderRadius: 10,
                        padding: 10,
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <View
                          style={{
                            backgroundColor: accentColor + "20",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: accentColor, fontSize: 11, fontWeight: "600" }}>
                            {item.tone}
                          </Text>
                        </View>
                        <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
                      </View>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: 13,
                          lineHeight: 18,
                        }}
                      >
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
                borderRadius: 12,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: accentColor,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Ionicons
                  name="help-circle-outline"
                  size={14}
                  color={accentColor}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Something to consider
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {result.somethingToConsider}
              </Text>
            </View>
          </View>
        )}

        {/* Expand/Collapse button */}
        <Pressable
          onPress={handleToggle}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: pressed
              ? isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.04)"
              : "transparent",
          })}
        >
          <Text
            style={{
              color: accentColor,
              fontSize: 13,
              fontWeight: "500",
              marginRight: 4,
            }}
          >
            {isExpanded ? "Show less" : "See full analysis"}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={accentColor}
          />
        </Pressable>
      </View>
    </View>
  );
}
