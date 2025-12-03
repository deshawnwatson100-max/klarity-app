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
  improve: "#C9F7D8",
  distance: "#FF8B8B",
  maintain: "#FFCE9E",
  clarity: "#C7B5FF",
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
            {/* Reply bubble */}
            <View
              className="rounded-3xl px-5 py-4 mb-2"
              style={{
                backgroundColor: "#0E0E0F",
                borderWidth: 1,
                borderColor: `${color}20`,
                maxWidth: "85%",
              }}
            >
              <Text
                className="text-base leading-6"
                style={{ fontFamily: "SF Pro Display", color: "#E6E6E6" }}
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
                shadowColor: "#F7B8D4",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
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
