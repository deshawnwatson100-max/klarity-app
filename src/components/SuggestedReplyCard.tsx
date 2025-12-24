import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

type IntentionType = "improve" | "distance" | "maintain" | "clarity";

interface SuggestedReply {
  id: string;
  text: string;
  guidanceNote: string;
}

interface SuggestedReplyCardProps {
  replies: SuggestedReply[];
  intention: IntentionType;
  onSelectReply: (reply: string) => void;
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => Promise<void>;
  onGenerateDifferent?: () => void;
}

export function SuggestedReplyCard({
  replies,
  intention,
  onSelectReply,
  onModifyLength,
  onGenerateDifferent,
}: SuggestedReplyCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<{ replyId: string; action: "shorten" | "lengthen" } | null>(null);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handlePress = (replyText: string) => {
    onSelectReply(replyText);
  };

  const handleReplyPress = (replyId: string) => {
    setExpandedReplyId(expandedReplyId === replyId ? null : replyId);
  };

  const handleModifyLength = async (replyId: string, action: "shorten" | "lengthen") => {
    if (!onModifyLength) return;
    setLoadingAction({ replyId, action });
    try {
      await onModifyLength(replyId, action);
    } finally {
      setLoadingAction(null);
    }
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
      {/* Section header */}
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="chatbubble-ellipses-outline"
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
          Suggested Reply
        </Text>
      </View>

      {replies.map((reply) => (
        <View key={reply.id} style={{ marginBottom: 12 }}>
          {/* Reply text as clean floating paragraph */}
          <Pressable onPress={() => handleReplyPress(reply.id)}>
            <View
              style={{
                paddingLeft: 12,
                borderLeftWidth: 2,
                borderLeftColor: "#374151",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 23,
                  color: "#E5E7EB",
                  letterSpacing: 0.1,
                }}
              >
                {reply.text}
              </Text>
            </View>
          </Pressable>

          {/* Guidance Note - subtle */}
          <View className="flex-row items-start mt-2 pl-3">
            <Ionicons
              name="bulb-outline"
              size={12}
              color="#4B5563"
              style={{ marginTop: 2, marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                color: "#6B7280",
                flex: 1,
              }}
            >
              {reply.guidanceNote}
            </Text>
          </View>

          {/* Expanded controls */}
          {onModifyLength && expandedReplyId === reply.id && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#1F1F22",
              }}
            >
              <View className="flex-row items-center gap-4">
                <Pressable
                  onPress={() => handleModifyLength(reply.id, "shorten")}
                  disabled={loadingAction?.replyId === reply.id}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  {loadingAction?.replyId === reply.id && loadingAction?.action === "shorten" ? (
                    <ActivityIndicator size="small" color="#6B7280" />
                  ) : (
                    <>
                      <Ionicons name="remove-outline" size={14} color="#6B7280" />
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>Shorter</Text>
                    </>
                  )}
                </Pressable>

                <View style={{ width: 1, height: 12, backgroundColor: "#374151" }} />

                <Pressable
                  onPress={() => handleModifyLength(reply.id, "lengthen")}
                  disabled={loadingAction?.replyId === reply.id}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  {loadingAction?.replyId === reply.id && loadingAction?.action === "lengthen" ? (
                    <ActivityIndicator size="small" color="#6B7280" />
                  ) : (
                    <>
                      <Ionicons name="add-outline" size={14} color="#6B7280" />
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>Longer</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Action buttons - minimal style */}
          <View className="flex-row items-center gap-3 mt-3">
            <Pressable
              onPress={() => handlePress(reply.text)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: "#1F1F22",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="copy-outline" size={14} color="#E5E7EB" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: "#E5E7EB",
                }}
              >
                Use this reply
              </Text>
            </Pressable>

            {onGenerateDifferent && (
              <Pressable
                onPress={onGenerateDifferent}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#374151",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="refresh-outline" size={14} color="#9CA3AF" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#9CA3AF",
                  }}
                >
                  Different reply
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {/* Subtle bottom divider */}
      <View
        style={{
          height: 1,
          backgroundColor: "#1F1F22",
          marginTop: 8,
        }}
      />
    </Animated.View>
  );
}
