import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
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

  const getScoreColor = () => {
    if (score < 30) return "#4ADE80";
    if (score < 60) return "#FBBF24";
    return "#F87171";
  };

  return (
    <View className="mb-4 mt-2">
      <View className="flex-row items-center justify-between mb-2">
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#6B7280",
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

      <View
        style={{
          height: 4,
          backgroundColor: "#1F1F22",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            progressStyle,
            {
              height: "100%",
              backgroundColor: getScoreColor(),
              borderRadius: 2,
            },
          ]}
        />
      </View>

      <View className="flex-row justify-between mt-1">
        <Text style={{ fontSize: 10, color: "#4B5563" }}>0 — No harm</Text>
        <Text style={{ fontSize: 10, color: "#4B5563" }}>
          100 — Highly harmful
        </Text>
      </View>

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
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [impactAnalysis, setImpactAnalysis] =
    useState<PersonalImpactAnalysis | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const expandedHeight = useSharedValue(0);
  const expandedOpacity = useSharedValue(0);
  const contentHeight = useSharedValue(0); // Start minimized

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const handleMinimize = () => {
    if (isMinimized) {
      contentHeight.value = withTiming(1, { duration: 300 });
      setIsMinimized(false);
    } else {
      contentHeight.value = withTiming(0, { duration: 300 });
      if (isExpanded) {
        expandedOpacity.value = withTiming(0, { duration: 200 });
        expandedHeight.value = withTiming(0, { duration: 300 });
        setIsExpanded(false);
      }
      setIsMinimized(true);
    }
  };

  const handleExpand = async () => {
    if (isMinimized) return;

    if (isExpanded) {
      expandedOpacity.value = withTiming(0, { duration: 200 });
      expandedHeight.value = withTiming(0, { duration: 300 });
      setIsExpanded(false);
      return;
    }

    setIsExpanded(true);
    setIsLoading(true);
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      contentHeight.value,
      [0, 1],
      [0, 500],
      Extrapolation.CLAMP
    ),
    opacity: contentHeight.value,
    overflow: "hidden" as const,
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

  const firstPattern = patterns && patterns.length > 0 ? patterns[0] : null;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          alignSelf: "flex-start",
          width: "100%",
          marginBottom: 16,
          paddingRight: 40,
        },
      ]}
    >
      {/* Floating text style - no card container */}
      <Pressable onPress={handleMinimize}>
        <View>
          {/* Header row */}
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="chatbubbles-outline"
              size={14}
              color="#6B7280"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: "#6B7280",
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              Communication Pattern
            </Text>
          </View>

          {/* Minimized state */}
          {isMinimized && firstPattern && (
            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                fontStyle: "italic",
              }}
            >
              {firstPattern} detected — tap to expand
            </Text>
          )}

          {/* Full content */}
          <Animated.View style={contentAnimatedStyle}>
            {/* Summary text - floating paragraph style */}
            <Text
              style={{
                fontSize: 15,
                lineHeight: 23,
                color: "#E5E7EB",
                letterSpacing: 0.1,
              }}
            >
              {summary}
            </Text>

            {/* Pattern labels */}
            {patterns && patterns.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {patterns.map((pattern, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "transparent",
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "#374151",
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

            {/* "How this affects me" link */}
            <Pressable
              onPress={handleExpand}
              style={({ pressed }) => ({
                marginTop: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View className="flex-row items-center">
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#6B7280",
                    letterSpacing: 0.1,
                  }}
                >
                  {isExpanded ? "Show less" : "How this affects me"}
                </Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6B7280"
                  style={{ marginLeft: 4 }}
                />
              </View>
            </Pressable>

            {/* Expanded Content */}
            <Animated.View
              style={[expandedContainerStyle, { overflow: "hidden" }]}
            >
              {isLoading ? (
                <View className="items-center justify-center py-6">
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
                    {/* Subtle divider */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#1F1F22",
                        marginBottom: 16,
                      }}
                    />

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

                    <HarmScoreBar
                      score={impactAnalysis.harmScore}
                      explanation={impactAnalysis.scoreExplanation}
                    />

                    {/* Reassurance */}
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: "#9CA3AF",
                        marginTop: 8,
                        paddingLeft: 12,
                        borderLeftWidth: 2,
                        borderLeftColor: "#374151",
                      }}
                    >
                      {impactAnalysis.reassuranceLine}
                    </Text>

                    <Text
                      style={{
                        fontSize: 12,
                        lineHeight: 17,
                        color: "#4B5563",
                        marginTop: 12,
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
          </Animated.View>

          {/* Subtle bottom divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "#1F1F22",
              marginTop: 16,
            }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
