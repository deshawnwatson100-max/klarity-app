import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { TypewriterText } from "./TypewriterText";
import { useFeedbackStore } from "../state/feedbackStore";

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
  onAddEmoji?: (replyId: string) => void;
}

// Icon button with tap feedback
function IconButton({
  icon,
  activeIcon,
  onPress,
  onLongPress,
  isLoading,
  showSuccess,
  color = "#6B7280",
  activeColor = "#7DD3C0",
  size = 18,
  hidden = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  onLongPress?: () => void;
  isLoading?: boolean;
  showSuccess?: boolean;
  color?: string;
  activeColor?: string;
  size?: number;
  hidden?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [isActive, setIsActive] = useState(false);

  // Don't render if hidden
  if (hidden) {
    return null;
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.1, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setIsActive(true);
    onPress();

    // Reset active state after animation (unless showSuccess keeps it)
    if (!showSuccess) {
      setTimeout(() => setIsActive(false), 300);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const displayIcon = showSuccess && activeIcon ? activeIcon : icon;
  const displayColor = isActive || showSuccess ? activeColor : color;

  if (isLoading) {
    return (
      <View style={{ width: size + 16, height: size + 16, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      <Animated.View
        style={{
          width: size + 16,
          height: size + 16,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: (size + 16) / 2,
          transform: [{ scale }],
        }}
      >
        <Ionicons name={displayIcon} size={size} color={displayColor} />
      </Animated.View>
    </Pressable>
  );
}

// Individual reply item component with its own animation state
function ReplyItem({
  reply,
  isMinimized,
  onToggleMinimize,
  loadingAction,
  onModifyLength,
  onSelectReply,
  onGenerateDifferent,
  onAddEmoji,
  isAddingEmoji,
}: {
  reply: SuggestedReply;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  loadingAction: { replyId: string; action: "shorten" | "lengthen" } | null;
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => Promise<void>;
  onSelectReply: (reply: string) => void;
  onGenerateDifferent?: () => void;
  onAddEmoji?: (replyId: string) => void;
  isAddingEmoji?: boolean;
}) {
  const contentHeight = useRef(new Animated.Value(isMinimized ? 0 : 1)).current;
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<"like" | "dislike" | null>(null);
  const [hasAnimatedText, setHasAnimatedText] = useState(false);
  const [hasAnimatedGuidance, setHasAnimatedGuidance] = useState(false);

  useEffect(() => {
    Animated.timing(contentHeight, {
      toValue: isMinimized ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isMinimized]);

  const contentMaxHeight = contentHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
    extrapolate: "clamp",
  });

  // Get feedback store action
  const addFeedback = useFeedbackStore((s) => s.addFeedback);

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectReply(reply.text);
    setCopied(true);
    // Reset after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    Haptics.selectionAsync();
    // Only set to like if not already liked (no toggle on tap)
    if (liked !== "like") {
      setLiked("like");
      addFeedback(reply.text, "like");
    }
  };

  const handleDislike = () => {
    Haptics.selectionAsync();
    // Only set to dislike if not already disliked (no toggle on tap)
    if (liked !== "dislike") {
      setLiked("dislike");
      addFeedback(reply.text, "dislike");
    }
  };

  // Long press to reset feedback and show both buttons again
  const handleResetFeedback = () => {
    setLiked(null);
  };

  const handleAddEmoji = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddEmoji?.(reply.id);
  };

  // Truncate text for minimized preview
  const truncatedText = reply.text.length > 60
    ? reply.text.substring(0, 60) + "..."
    : reply.text;

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Minimized state - tappable to expand */}
      {isMinimized ? (
        <Pressable onPress={() => {
          Haptics.selectionAsync();
          onToggleMinimize();
        }}>
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
          <Pressable onPress={() => {
            Haptics.selectionAsync();
            onToggleMinimize();
          }}>
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
              {!hasAnimatedText ? (
                <TypewriterText
                  text={reply.text}
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: "#EDEDED",
                  }}
                  speed={85}
                  onComplete={() => setHasAnimatedText(true)}
                />
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: "#EDEDED",
                  }}
                >
                  {reply.text}
                </Text>
              )}
            </View>
          </Pressable>

          <Animated.View
            style={{
              maxHeight: contentMaxHeight,
              opacity: contentHeight,
              overflow: "hidden",
            }}
          >
            {/* Guidance Note - subtle */}
            <View className="flex-row items-start mt-2 pl-3">
              <Ionicons
                name="bulb-outline"
                size={12}
                color="#4B5563"
                style={{ marginTop: 2, marginRight: 6 }}
              />
              {hasAnimatedText && !hasAnimatedGuidance ? (
                <View style={{ flex: 1 }}>
                  <TypewriterText
                    key={`guidance-${reply.id}`}
                    text={reply.guidanceNote}
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: "#6B7280",
                    }}
                    speed={70}
                    onComplete={() => setHasAnimatedGuidance(true)}
                  />
                </View>
              ) : hasAnimatedGuidance ? (
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
              ) : null}
            </View>

            {/* Action buttons row */}
            <View className="flex-row items-center justify-between mt-3">
              {/* Primary action buttons */}
              <View className="flex-row items-center gap-2">
                {/* Use this reply button with checkmark transition */}
                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: copied ? "#1a2f2a" : "#1F1F22",
                    borderWidth: 1,
                    borderColor: copied ? "#5BA89A" : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={14}
                    color={copied ? "#7DD3C0" : "#E5E7EB"}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: copied ? "#7DD3C0" : "#E5E7EB",
                    }}
                  >
                    {copied ? "Copied" : "Use this reply"}
                  </Text>
                </Pressable>

                {/* Use a different reply button */}
                {onGenerateDifferent && (
                  <Pressable
                    onPress={onGenerateDifferent}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      backgroundColor: "transparent",
                      borderWidth: 1,
                      borderColor: "#374151",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#E5E7EB" />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: "#E5E7EB",
                      }}
                    >
                      Different reply
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Icon buttons row */}
              <View className="flex-row items-center">
                {/* Emoji button - adds emojis using AI */}
                <IconButton
                  icon="happy-outline"
                  onPress={handleAddEmoji}
                  isLoading={isAddingEmoji}
                  color="#E5E7EB"
                  activeColor="#7DD3C0"
                  size={16}
                />

                {/* Shorter button */}
                {onModifyLength && (
                  <IconButton
                    icon="remove-outline"
                    onPress={() => onModifyLength(reply.id, "shorten")}
                    isLoading={loadingAction?.replyId === reply.id && loadingAction?.action === "shorten"}
                    color="#E5E7EB"
                    activeColor="#7DD3C0"
                    size={16}
                  />
                )}

                {/* Longer button */}
                {onModifyLength && (
                  <IconButton
                    icon="add-outline"
                    onPress={() => onModifyLength(reply.id, "lengthen")}
                    isLoading={loadingAction?.replyId === reply.id && loadingAction?.action === "lengthen"}
                    color="#E5E7EB"
                    activeColor="#7DD3C0"
                    size={16}
                  />
                )}

                {/* Divider - hide when feedback is given */}
                {liked === null && (
                  <View style={{ width: 1, height: 16, backgroundColor: "#374151", marginHorizontal: 4 }} />
                )}

                {/* Like button - hidden when dislike is selected */}
                <IconButton
                  icon={liked === "like" ? "thumbs-up" : "thumbs-up-outline"}
                  onPress={handleLike}
                  onLongPress={liked === "like" ? handleResetFeedback : undefined}
                  showSuccess={liked === "like"}
                  color="#E5E7EB"
                  activeColor="#7DD3C0"
                  size={16}
                  hidden={liked === "dislike"}
                />

                {/* Dislike button - hidden when like is selected */}
                <IconButton
                  icon={liked === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                  onPress={handleDislike}
                  onLongPress={liked === "dislike" ? handleResetFeedback : undefined}
                  showSuccess={liked === "dislike"}
                  color="#E5E7EB"
                  activeColor="#7DD3C0"
                  size={16}
                  hidden={liked === "like"}
                />
              </View>
            </View>
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
  onAddEmoji,
}: SuggestedReplyCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current; // Subtle 4px drift
  const [loadingAction, setLoadingAction] = useState<{ replyId: string; action: "shorten" | "lengthen" } | null>(null);
  const [addingEmojiReplyId, setAddingEmojiReplyId] = useState<string | null>(null);
  const [minimizedReplies, setMinimizedReplies] = useState<Set<string>>(new Set());
  const prevRepliesLengthRef = useRef(replies.length);

  useEffect(() => {
    // Gentle fade and drift - no bouncing, no elastic motion
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
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

  const handleAddEmoji = async (replyId: string) => {
    if (!onAddEmoji) return;
    setAddingEmojiReplyId(replyId);
    try {
      await onAddEmoji(replyId);
    } finally {
      setAddingEmojiReplyId(null);
    }
  };

  return (
    <Animated.View
      style={{
        alignSelf: "flex-start",
        width: "100%",
        marginBottom: 20, // Generous vertical spacing
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Pitch black card background */}
      <View
        style={{
          backgroundColor: "#000000",
          borderRadius: 16,
          padding: 16,
        }}
      >
        {replies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            isMinimized={minimizedReplies.has(reply.id)}
            onToggleMinimize={() => toggleReplyMinimize(reply.id)}
            loadingAction={loadingAction}
            onModifyLength={onModifyLength ? handleModifyLength : undefined}
            onSelectReply={onSelectReply}
            onGenerateDifferent={onGenerateDifferent}
            onAddEmoji={onAddEmoji ? handleAddEmoji : undefined}
            isAddingEmoji={addingEmojiReplyId === reply.id}
          />
        ))}
      </View>
    </Animated.View>
  );
}
