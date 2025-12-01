import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RootStackParamList } from "../navigation/RootNavigator";
import { EmotionalAnalysis } from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "AnalysisScreen">;

interface QuickSummaryItem {
  label: string;
  value: string;
  color: string;
}

export function AnalysisScreen({ route, navigation }: Props) {
  const { analysis, userMessage } = route.params;
  const insets = useSafeAreaInsets();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleContinue = () => {
    navigation.navigate("RelationshipDirectionScreen");
  };

  // Build quick summary bullets
  const quickSummary: QuickSummaryItem[] = [];

  if (analysis.tone) {
    quickSummary.push({
      label: "Tone",
      value: analysis.tone,
      color: "#4C9CFF", // Blue
    });
  }

  if (analysis.pattern) {
    quickSummary.push({
      label: "Pattern",
      value: analysis.pattern,
      color: "#B47CFF", // Purple
    });
  }

  if (analysis.emotionalImpact) {
    quickSummary.push({
      label: "Emotional Impact",
      value: analysis.emotionalImpact,
      color: "#FF884D", // Orange
    });
  }

  if (analysis.coreIssue) {
    quickSummary.push({
      label: "Core Issue",
      value: analysis.coreIssue,
      color: "#FFD755", // Yellow
    });
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        paddingTop: insets.top,
      }}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 40,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-white text-3xl font-bold mb-2 text-center">
              Your Clarity Analysis
            </Text>
            <Text className="text-neutral-400 text-base text-center">
              Here is what is really happening.
            </Text>
          </View>

          {/* Quick Summary Bullets */}
          {quickSummary.length > 0 && (
            <View className="mb-6">
              <View className="gap-3">
                {quickSummary.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#0A0A0A",
                      borderLeftWidth: 4,
                      borderLeftColor: item.color,
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <Text
                      style={{ color: item.color }}
                      className="text-xs font-bold uppercase tracking-wider mb-2"
                    >
                      {item.label}
                    </Text>
                    <Text className="text-white text-base font-medium">
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Emotional Clarity Bar */}
          <View className="mb-6">
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-neutral-400 text-sm font-semibold uppercase tracking-wider">
                  Emotional Clarity
                </Text>
                <Text className="text-white text-2xl font-bold">
                  {analysis.emotionalClarity}%
                </Text>
              </View>

              {/* Progress Bar */}
              <View
                style={{
                  height: 8,
                  backgroundColor: "#262626",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <LinearGradient
                  colors={["#4C9CFF", "#B47CFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: `${analysis.emotionalClarity}%`,
                    height: "100%",
                  }}
                />
              </View>
            </View>
          </View>

          {/* Full Analysis Section */}
          <View className="mb-6">
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-4">
                Full Analysis
              </Text>
              <Text className="text-neutral-200 text-base leading-7">
                {analysis.fullAnalysis || analysis.summary}
              </Text>
            </View>
          </View>

          {/* Relationship Risk */}
          <View className="mb-6">
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-neutral-400 text-sm font-semibold uppercase tracking-wider">
                  Relationship Risk
                </Text>
                <View
                  style={{
                    backgroundColor:
                      analysis.relationshipRisk === "high"
                        ? "#EF444420"
                        : analysis.relationshipRisk === "medium"
                        ? "#F59E0B20"
                        : "#10B98120",
                    borderWidth: 1,
                    borderColor:
                      analysis.relationshipRisk === "high"
                        ? "#EF4444"
                        : analysis.relationshipRisk === "medium"
                        ? "#F59E0B"
                        : "#10B981",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        analysis.relationshipRisk === "high"
                          ? "#EF4444"
                          : analysis.relationshipRisk === "medium"
                          ? "#F59E0B"
                          : "#10B981",
                    }}
                    className="text-sm font-bold uppercase"
                  >
                    {analysis.relationshipRisk}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transition Prompt */}
          <View className="mb-6">
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 24,
                borderWidth: 1,
                borderColor: "#4C9CFF40",
              }}
            >
              <Text className="text-white text-lg font-semibold text-center mb-2">
                Before I help you respond...
              </Text>
              <Text className="text-neutral-400 text-base text-center">
                What direction do you want to take this relationship?
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            paddingTop: 20,
            backgroundColor: "#050505",
          }}
        >
          <LinearGradient
            colors={["#4C9CFF", "#B47CFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
            }}
          >
            <Pressable
              onPress={handleContinue}
              className="py-4 items-center active:opacity-70"
            >
              <Text className="text-white text-lg font-bold">Continue</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}
