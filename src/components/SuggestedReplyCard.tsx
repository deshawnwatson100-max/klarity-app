import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";

type IntentionType = "improve" | "distance" | "maintain" | "clarity";

interface SuggestedReply {
  id: string;
  text: string;
}

interface SuggestedReplyCardProps {
  replies: SuggestedReply[];
  intention: IntentionType;
  onSelectReply: (reply: string) => void;
}

const intentionColors: Record<IntentionType, string> = {
  improve: "#6BB6FF", // Cool Sky Blue
  distance: "#FF9B6B", // Warm Orange
  maintain: "#FFB84D", // Soft Amber/Gold
  clarity: "#B8A3E8", // Lavender/Soft Purple
};

export function SuggestedReplyCard({
  replies,
  intention,
  onSelectReply,
}: SuggestedReplyCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const color = intentionColors[intention];

  const handlePress = (replyText: string) => {
    onSelectReply(replyText);
  };

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          width: "100%",
          marginBottom: 16,
        },
        animatedStyle,
      ]}
    >
      <View className="gap-3">
        {replies.map((reply, index) => (
          <View key={reply.id}>
            {/* Reply bubble with glow */}
            <View
              className="rounded-3xl px-5 py-4 mb-2"
              style={{
                backgroundColor: "#050608",
                borderWidth: 1.5,
                borderColor: `${color}40`,
                maxWidth: "85%",
                shadowColor: color,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
              }}
            >
              <Text
                className="text-base leading-6"
                style={{ fontFamily: "SF Pro Display", color: "#E5E7EB" }}
              >
                {reply.text}
              </Text>
            </View>

            {/* Use button */}
            <Pressable
              onPress={() => handlePress(reply.text)}
              className="active:opacity-70"
              style={{
                backgroundColor: color,
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 10,
                alignSelf: "flex-start",
                marginLeft: 8,
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
              }}
            >
              <Text
                className="font-semibold text-sm"
                style={{
                  fontFamily: "SF Pro Display",
                  color: "#000000",
                }}
              >
                Use this reply
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
