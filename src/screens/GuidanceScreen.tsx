import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RootStackParamList } from "../navigation/RootNavigator";
import { IntentionType, INTENTIONS } from "../types/calendar";
import Clipboard from "@react-native-clipboard/clipboard";

type Props = StackScreenProps<RootStackParamList, "GuidanceScreen">;

interface GuidanceContent {
  mindsetGuidance: string[];
  suggestedReplies: string[];
  whyThisWorks: string;
  optionalTools: string[];
}

// Generate guidance based on intention
function getGuidanceForIntention(intention: IntentionType): GuidanceContent {
  switch (intention) {
    case "improve":
      return {
        mindsetGuidance: [
          "Lead with curiosity, not judgment.",
          "Use I-statements to express your feelings.",
          "Seek to understand before being understood.",
        ],
        suggestedReplies: [
          "I hear what you are saying, and I want to understand your perspective better. Can we talk more about this?",
          "I appreciate you sharing that with me. I feel [emotion] when [situation]. How can we work through this together?",
          "I value our relationship and want us to communicate better. Can we try a different approach?",
        ],
        whyThisWorks:
          "These responses show vulnerability, openness, and a genuine desire to connect. They invite collaboration rather than creating defensiveness.",
        optionalTools: [
          "Active listening: Reflect back what you heard",
          "Emotional validation: Acknowledge their feelings",
          "Repair attempts: Use gentle humor or affection",
        ],
      };

    case "distance":
      return {
        mindsetGuidance: [
          "Keep responses short and neutral.",
          "Do not over-explain or justify yourself.",
          "Protect your peace, not your pride.",
        ],
        suggestedReplies: [
          "I understand. I need some time to think about this.",
          "I hear you. I am going to take a step back for now.",
          "Thank you for sharing. I will reach out when I am ready.",
        ],
        whyThisWorks:
          "These responses are calm, clear, and non-reactive. They create space without escalating conflict or inviting more emotional entanglement.",
        optionalTools: [
          "Gray rock method: Be boring and unengaging",
          "Boundary statements: I will not engage in this conversation",
          "Time limits: I can talk for 10 minutes, then I need to go",
        ],
      };

    case "maintain":
      return {
        mindsetGuidance: [
          "Stay observant and emotionally neutral.",
          "Do not commit to change yet.",
          "Watch patterns, not promises.",
        ],
        suggestedReplies: [
          "I hear you. Let me think about that.",
          "I appreciate you telling me. I am going to observe how things go.",
          "Thank you for sharing. I am still figuring out how I feel about all this.",
        ],
        whyThisWorks:
          "These responses acknowledge the other person without making commitments. They buy you time to see if actions match words and patterns shift.",
        optionalTools: [
          "Pattern tracking: Notice if behavior is consistent",
          "Emotional check-ins: How do I feel after interactions?",
          "Neutral acknowledgment: I see, Okay, Got it",
        ],
      };

    case "gain-clarity":
      return {
        mindsetGuidance: [
          "You do not have to decide right now.",
          "Confusion is information, not failure.",
          "It is okay to ask for time to process.",
        ],
        suggestedReplies: [
          "I am not sure how I feel about this yet. Can we revisit this later?",
          "I need more time to process what you shared. Can we talk about this in a few days?",
          "I hear you, but I am still unclear on what I want. I will let you know when I have more clarity.",
        ],
        whyThisWorks:
          "These responses honor your need for clarity without rushing to a decision. They give you space to reflect and understand your own feelings first.",
        optionalTools: [
          "Journaling: Write out your thoughts and feelings",
          "Trusted friend: Talk through the situation with someone neutral",
          "Gut check: Does this feel right in my body?",
        ],
      };
  }
}

export function GuidanceScreen({ route, navigation }: Props) {
  const { intention } = route.params;
  const insets = useSafeAreaInsets();
  const intentionConfig = INTENTIONS[intention];
  const guidance = getGuidanceForIntention(intention);

  const opacity = useSharedValue(0);
  const translateX = useSharedValue(30);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateX.value = withSpring(0, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const handleCopyReply = (reply: string) => {
    Clipboard.setString(reply);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#262626",
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleGoBack}
            className="active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={intentionConfig.color} />
          </Pressable>
          <View className="flex-1 items-center">
            <Text
              style={{ color: intentionConfig.color }}
              className="text-lg font-bold"
            >
              {intentionConfig.label}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View className="mb-6">
            <Text className="text-white text-2xl font-bold mb-2">
              Your Guidance for This Path
            </Text>
            <Text className="text-neutral-400 text-sm">
              Here is the best way to respond with your chosen intention.
            </Text>
          </View>

          {/* Mindset Guidance */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <View
                style={{
                  width: 3,
                  height: 16,
                  backgroundColor: intentionConfig.color,
                  borderRadius: 2,
                }}
              />
              <Text className="text-white text-lg font-bold">Mindset Guidance</Text>
            </View>
            <View className="gap-3">
              {guidance.mindsetGuidance.map((guidanceItem, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: "#0A0A0A",
                    borderLeftWidth: 3,
                    borderLeftColor: intentionConfig.color,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <Text className="text-neutral-200 text-base font-medium">
                    {guidanceItem}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Suggested Replies */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <View
                style={{
                  width: 3,
                  height: 16,
                  backgroundColor: intentionConfig.color,
                  borderRadius: 2,
                }}
              />
              <Text className="text-white text-lg font-bold">Suggested Replies</Text>
            </View>
            <View className="gap-3">
              {guidance.suggestedReplies.map((reply, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: "#0A0A0A",
                    borderWidth: 1,
                    borderColor: intentionConfig.color + "40",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <Text className="text-neutral-200 text-base leading-6 mb-3">
                    {reply}
                  </Text>
                  <Pressable
                    onPress={() => handleCopyReply(reply)}
                    className="active:opacity-70"
                  >
                    <View
                      style={{
                        backgroundColor: intentionConfig.color + "20",
                        borderRadius: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={16}
                        color={intentionConfig.color}
                      />
                      <Text
                        style={{ color: intentionConfig.color }}
                        className="text-sm font-semibold"
                      >
                        Copy Reply
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Why This Works */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <View
                style={{
                  width: 3,
                  height: 16,
                  backgroundColor: intentionConfig.color,
                  borderRadius: 2,
                }}
              />
              <Text className="text-white text-lg font-bold">Why This Works</Text>
            </View>
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text className="text-neutral-300 text-base leading-6">
                {guidance.whyThisWorks}
              </Text>
            </View>
          </View>

          {/* Optional Tools */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <View
                style={{
                  width: 3,
                  height: 16,
                  backgroundColor: intentionConfig.color,
                  borderRadius: 2,
                }}
              />
              <Text className="text-white text-lg font-bold">Optional Tools</Text>
            </View>
            <View className="gap-2">
              {guidance.optionalTools.map((tool, index) => (
                <View
                  key={index}
                  className="flex-row items-start gap-3"
                  style={{ paddingLeft: 8 }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: intentionConfig.color,
                      marginTop: 7,
                    }}
                  />
                  <Text className="text-neutral-400 text-sm leading-6 flex-1">
                    {tool}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
