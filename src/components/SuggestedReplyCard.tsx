import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
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

// Individual reply item component with its own animation state
function ReplyItem({
  reply,
  isMinimized,
  onToggleMinimize,
  loadingAction,
  onModifyLength,
  onSelectReply,
}: {
  reply: SuggestedReply;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  loadingAction: { replyId: string; action: "shorten" | "lengthen" } | null;
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => Promise<void>;
  onSelectReply: (reply: string) => void;
}) {
  const contentHeight = useSharedValue(isMinimized ? 0 : 1);

  useEffect(() => {
    contentHeight.value = withTiming(isMinimized ? 0 : 1, { duration: 300 });
  }, [isMinimized]);

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

  const handleModifyLength = async (replyId: string, action: "shorten" | "lengthen") => {
    if (!onModifyLength) return;
    await onModifyLength(replyId, action);
  };

  // Truncate text for minimized preview
  const truncatedText = reply.text.length > 60
    ? reply.text.substring(0, 60) + "..."
    : reply.text;

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Minimized state - tappable to expand */}
      {isMinimized ? (
        <Pressable onPress={onToggleMinimize}>
          <View
            style={{
              paddingLeft: 12,
              position: "relative",
            }}
          >
            {/* Subtle teal left edge glow */}
            <LinearGradient
              colors={["rgba(125, 211, 192, 0.15)", "rgba(125, 211, 192, 0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                borderRadius: 2,
              }}
            />
            <Text
              style={{
                fontSize: 14,
                color: "#9CA3AF",
                fontStyle: "italic",
              }}
            >
              {truncatedText}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#6B7280",
                marginTop: 4,
              }}
            >
              Tap to expand
            </Text>
          </View>
        </Pressable>
      ) : (
        <>
          {/* Reply text as clean floating paragraph with teal glow */}
          <Pressable onPress={onToggleMinimize}>
            <View
              style={{
                paddingLeft: 12,
                position: "relative",
              }}
            >
              {/* Soft teal gradient left edge accent */}
              <LinearGradient
                colors={["rgba(125, 211, 192, 0.2)", "rgba(125, 211, 192, 0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  borderRadius: 2,
                }}
              />
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 24,
                  color: "#EDEDED", // Soft off-white
                  letterSpacing: 0.15,
                }}
              >
                {reply.text}
              </Text>
            </View>
          </Pressable>

          <Animated.View style={contentAnimatedStyle}>
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

            {/* Action buttons - minimal style */}
            <View className="flex-row items-center gap-3 mt-3">
              <Pressable
                onPress={() => onSelectReply(reply.text)}
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
            </View>

            {/* Inline modifiers - Shorter / Longer */}
            {onModifyLength && (
              <View className="flex-row items-center gap-4 mt-3 pl-1">
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
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

export function SuggestedReplyCard({
  replies,
  intention,
  onSelectReply,
  onModifyLength,
  onGenerateDifferent,
}: SuggestedReplyCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(4); // Subtle 4px drift
  const [loadingAction, setLoadingAction] = useState<{ replyId: string; action: "shorten" | "lengthen" } | null>(null);
  const [minimizedReplies, setMinimizedReplies] = useState<Set<string>>(new Set());
  const prevRepliesLengthRef = useRef(replies.length);

  useEffect(() => {
    // Gentle fade and drift - no bouncing, no elastic motion
    opacity.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  // Auto-minimize older replies when new ones are added
  useEffect(() => {
    if (replies.length > prevRepliesLengthRef.current) {
      // New reply was added - minimize all but the latest
      const newMinimized = new Set<string>();
      replies.slice(0, -1).forEach((reply) => {
        newMinimized.add(reply.id);
      });
      setMinimizedReplies(newMinimized);
    }
    prevRepliesLengthRef.current = replies.length;
  }, [replies.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const toggleReplyMinimize = (replyId: string) => {
    setMinimizedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
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
          marginBottom: 20, // Generous vertical spacing
          position: "relative",
        },
        animatedStyle,
      ]}
    >
      {/* Soft teal color wash background (5-8% opacity) */}
      <LinearGradient
        colors={["rgba(125, 211, 192, 0.05)", "rgba(125, 211, 192, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          left: -12,
          top: -8,
          right: -12,
          bottom: -8,
          borderRadius: 12,
        }}
      />

      {/* Section header with teal accent */}
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={14}
          color="#5BA89A"
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: "#5BA89A",
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          Suggested Reply
        </Text>
      </View>

      {replies.map((reply, index) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          isMinimized={minimizedReplies.has(reply.id)}
          onToggleMinimize={() => toggleReplyMinimize(reply.id)}
          loadingAction={loadingAction}
          onModifyLength={onModifyLength ? handleModifyLength : undefined}
          onSelectReply={onSelectReply}
        />
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
