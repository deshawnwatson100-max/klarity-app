import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../theme";
import { DeepDecodeResultMessage } from "../types/chat";

interface DeepDecodeResultBubbleProps {
  result: DeepDecodeResultMessage["decodeResult"];
}

export function DeepDecodeResultBubble({ result }: DeepDecodeResultBubbleProps) {
  const { colors, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const accentColor = isDark ? "#7DD3C0" : "#059669";

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
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
          Deep Decode Analysis
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
          <Animated.View entering={FadeIn.duration(300)}>
            {/* Tone Analysis */}
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
                  marginBottom: 4,
                }}
              >
                {result.toneAnalysis.overallTone}
              </Text>
              {result.toneAnalysis.toneShifts && (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {result.toneAnalysis.toneShifts}
                </Text>
              )}
            </View>

            {/* Communication Dynamics */}
            {result.communicationDynamics.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons
                    name="git-network-outline"
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
                    Communication Dynamics
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {result.communicationDynamics.map((dynamic, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        borderRadius: 10,
                        padding: 10,
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
                        {dynamic.pattern}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          lineHeight: 18,
                        }}
                      >
                        {dynamic.description}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Key Observations */}
            {result.keyObservations.length > 0 && (
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
                    Key Observations
                  </Text>
                </View>
                <View style={{ gap: 6 }}>
                  {result.keyObservations.map((observation, index) => (
                    <View
                      key={index}
                      style={{ flexDirection: "row", alignItems: "flex-start" }}
                    >
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 2.5,
                          backgroundColor: accentColor,
                          marginTop: 6,
                          marginRight: 8,
                        }}
                      />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          lineHeight: 18,
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
                  What Might Be Happening
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {result.whatMightBeHappening}
              </Text>
            </View>

            {/* Things to Consider */}
            {result.thingsToConsider.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
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
                    Things to Consider
                  </Text>
                </View>
                <View style={{ gap: 6 }}>
                  {result.thingsToConsider.map((item, index) => (
                    <View
                      key={index}
                      style={{ flexDirection: "row", alignItems: "flex-start" }}
                    >
                      <Text
                        style={{
                          color: accentColor,
                          fontSize: 13,
                          fontWeight: "600",
                          marginRight: 6,
                          minWidth: 16,
                        }}
                      >
                        {index + 1}.
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          lineHeight: 18,
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
                borderRadius: 12,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: accentColor,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Ionicons
                  name="compass-outline"
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
                  Moving Forward
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {result.navigationGuidance}
              </Text>
            </View>
          </Animated.View>
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
    </Animated.View>
  );
}
