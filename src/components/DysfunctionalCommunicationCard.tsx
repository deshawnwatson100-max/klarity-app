import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  generatePersonalImpactAnalysis,
  PersonalImpactAnalysis,
} from "../api/klarity-api";

interface DysfunctionalCommunicationCardProps {
  summary: string;
  patterns?: string[];
}

interface ImpactSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  content: string;
}

function ImpactSection({ icon, label, content }: ImpactSectionProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-1.5">
        <Ionicons name={icon} size={14} color="#6B7280" />
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: "#6B7280",
            marginLeft: 6,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          color: "#D1D5DB",
          letterSpacing: 0.1,
        }}
      >
        {content}
      </Text>
    </View>
  );
}

interface HarmScoreBarProps {
  score: number;
  explanation: string;
}

function HarmScoreBar({ score, explanation }: HarmScoreBarProps) {
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(score, { duration: 800 });
  }, [score]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Color based on score
  const getScoreColor = () => {
    if (score < 30) return "#4ADE80"; // Green - low harm
    if (score < 60) return "#FBBF24"; // Yellow - medium harm
    return "#F87171"; // Red - high harm
  };

  return (
    <View className="mb-4 mt-2">
      <View className="flex-row items-center justify-between mb-2">
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#9CA3AF",
            letterSpacing: 0.3,
          }}
        >
          Estimated Emotional Impact
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: getScoreColor(),
          }}
        >
          {score}
        </Text>
      </View>

      {/* Progress bar background */}
      <View
        style={{
          height: 6,
          backgroundColor: "#1F1F22",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* Progress bar fill */}
        <Animated.View
          style={[
            progressStyle,
            {
              height: "100%",
              backgroundColor: getScoreColor(),
              borderRadius: 3,
            },
          ]}
        />
      </View>

      {/* Scale labels */}
      <View className="flex-row justify-between mt-1">
        <Text style={{ fontSize: 10, color: "#6B7280" }}>0 — No harm</Text>
        <Text style={{ fontSize: 10, color: "#6B7280" }}>
          100 — Highly harmful
        </Text>
      </View>

      {/* Explanation */}
      <Text
        style={{
          fontSize: 12,
          lineHeight: 17,
          color: "#6B7280",
          marginTop: 8,
          fontStyle: "italic",
        }}
      >
        {explanation}
      </Text>
    </View>
  );
}

export function DysfunctionalCommunicationCard({
  summary,
  patterns,
}: DysfunctionalCommunicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [impactAnalysis, setImpactAnalysis] =
    useState<PersonalImpactAnalysis | null>(null);

  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.96);
  const expandedHeight = useSharedValue(0);
  const expandedOpacity = useSharedValue(0);
  const buttonGlow = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 350 });
    cardScale.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, []);

  // Subtle glow animation for the button
  useEffect(() => {
    const animate = () => {
      buttonGlow.value = withTiming(1, { duration: 1500 }, () => {
        buttonGlow.value = withTiming(0, { duration: 1500 }, () => {
          runOnJS(animate)();
        });
      });
    };
    animate();
  }, []);

  const handleExpand = async () => {
    if (isExpanded) {
      // Collapse
      expandedOpacity.value = withTiming(0, { duration: 200 });
      expandedHeight.value = withTiming(0, { duration: 300 });
      setIsExpanded(false);
      return;
    }

    // Expand
    setIsExpanded(true);
    setIsLoading(true);

    // Start animation while loading
    expandedHeight.value = withTiming(1, { duration: 300 });

    try {
      const analysis = await generatePersonalImpactAnalysis(summary, patterns);
      setImpactAnalysis(analysis);
    } catch (error) {
      console.error("Error loading impact analysis:", error);
    } finally {
      setIsLoading(false);
      expandedOpacity.value = withTiming(1, { duration: 250 });
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const expandedContainerStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      expandedHeight.value,
      [0, 1],
      [0, 600],
      Extrapolation.CLAMP
    ),
    opacity: expandedOpacity.value,
    marginTop: interpolate(expandedHeight.value, [0, 1], [0, 16]),
  }));

  const buttonGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(buttonGlow.value, [0, 1], [0, 0.3]),
    shadowRadius: interpolate(buttonGlow.value, [0, 1], [0, 8]),
  }));

  return (
    <Animated.View style={cardAnimatedStyle} className="mb-4">
      <View
        className="rounded-2xl px-5 py-4 overflow-hidden"
        style={{
          backgroundColor: "#111113",
          borderWidth: 1,
          borderColor: "#262628",
        }}
      >
        {/* Header row with icon */}
        <View className="flex-row items-center mb-3">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#1F1F22",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={14} color="#9CA3AF" />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#9CA3AF",
              letterSpacing: 0.3,
            }}
          >
            Communication Pattern
          </Text>
        </View>

        {/* Summary - emotionally intelligent framing without advice */}
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: "#E5E7EB",
            letterSpacing: 0.2,
          }}
        >
          {summary}
        </Text>

        {/* Pattern labels if provided */}
        {patterns && patterns.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {patterns.map((pattern, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#1A1A1C",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 0.5,
                  borderColor: "#333336",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#9CA3AF",
                    fontWeight: "500",
                  }}
                >
                  {pattern}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* "How this affects me" Button */}
        <Animated.View
          style={[
            buttonGlowStyle,
            {
              marginTop: 16,
              shadowColor: "#6B7280",
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          <Pressable
            onPress={handleExpand}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View
              className="flex-row items-center justify-center py-3 px-4 rounded-xl"
              style={{
                backgroundColor: "#1A1A1C",
                borderWidth: 0.5,
                borderColor: "#333336",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#9CA3AF",
                  letterSpacing: 0.2,
                }}
              >
                {isExpanded ? "Show less" : "How this affects me"}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#9CA3AF"
                style={{ marginLeft: 6 }}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Expanded Content */}
        <Animated.View
          style={[expandedContainerStyle, { overflow: "hidden" }]}
        >
          {isLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 8,
                }}
              >
                Analyzing impact...
              </Text>
            </View>
          ) : (
            impactAnalysis && (
              <View>
                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#262628",
                    marginBottom: 16,
                  }}
                />

                {/* Personal Impact Breakdown */}
                <ImpactSection
                  icon="heart-outline"
                  label="Emotionally"
                  content={impactAnalysis.emotionalImpact}
                />

                <ImpactSection
                  icon="bulb-outline"
                  label="Mentally"
                  content={impactAnalysis.mentalImpact}
                />

                <ImpactSection
                  icon="people-outline"
                  label="Relationally"
                  content={impactAnalysis.relationalImpact}
                />

                <ImpactSection
                  icon="body-outline"
                  label="Behaviorally"
                  content={impactAnalysis.behavioralImpact}
                />

                {/* Harm Score */}
                <HarmScoreBar
                  score={impactAnalysis.harmScore}
                  explanation={impactAnalysis.scoreExplanation}
                />

                {/* Reassurance Line */}
                <View
                  style={{
                    backgroundColor: "#1A1A1C",
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: "#4ADE80",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: "#D1D5DB",
                      fontWeight: "500",
                    }}
                  >
                    {impactAnalysis.reassuranceLine}
                  </Text>
                </View>

                {/* Agency reminder */}
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 17,
                    color: "#6B7280",
                    marginTop: 12,
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  This just gives you clarity — what you do with it is
                  completely up to you.
                </Text>
              </View>
            )
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}
