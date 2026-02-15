import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  TextInput,
  Keyboard,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { TypewriterText } from "./TypewriterText";
import { useFeedbackStore } from "../state/feedbackStore";
import { useTheme } from "../theme";
import { analyzeEditedReply } from "../api/klarity-api";

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

// Individual reply item component with inline editing support
function ReplyItem({
  reply,
  loadingAction,
  onModifyLength,
  onSelectReply,
  onGenerateDifferent,
  onAddEmoji,
  isAddingEmoji,
  isDark,
  intention,
  onReplyTextChange,
}: {
  reply: SuggestedReply;
  loadingAction: { replyId: string; action: "shorten" | "lengthen" } | null;
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => Promise<void>;
  onSelectReply: (reply: string) => void;
  onGenerateDifferent?: () => void;
  onAddEmoji?: (replyId: string) => void;
  isAddingEmoji?: boolean;
  isDark: boolean;
  intention: IntentionType;
  onReplyTextChange?: (replyId: string, newText: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<"like" | "dislike" | null>(null);
  const [hasAnimatedText, setHasAnimatedText] = useState(false);
  const [hasAnimatedGuidance, setHasAnimatedGuidance] = useState(false);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(reply.text);
  const [currentGuidanceNote, setCurrentGuidanceNote] = useState(reply.guidanceNote);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const originalTextRef = useRef(reply.text);

  // Guidance note fade animation
  const guidanceOpacity = useRef(new Animated.Value(1)).current;

  // Theme-aware colors
  const accentColor = isDark ? "#7DD3C0" : "#34C759";
  const accentColorLight = isDark ? "rgba(125, 211, 192, 0.2)" : "rgba(52, 199, 89, 0.2)";
  const textColor = isDark ? "#EDEDED" : "#1C1C1E";
  const textSecondary = isDark ? "#9CA3AF" : "#636366";
  const textTertiary = isDark ? "#6B7280" : "#8E8E93";
  const buttonBg = isDark ? "#1F1F22" : "#F5F5F7";
  const buttonBgActive = isDark ? "#1a2f2a" : "rgba(52, 199, 89, 0.15)";
  const buttonBorderActive = isDark ? "#5BA89A" : "#34C759";
  const buttonBorder = isDark ? "#374151" : "rgba(0, 0, 0, 0.1)";
  const buttonTextColor = isDark ? "#E5E7EB" : "#1C1C1E";
  const dividerColor = isDark ? "#374151" : "rgba(0, 0, 0, 0.1)";
  const iconColor = isDark ? "#E5E7EB" : "#636366";
  const inputBorderColor = isDark ? "rgba(125, 211, 192, 0.3)" : "rgba(52, 199, 89, 0.3)";

  // Sync editedText with reply.text when reply changes (from length/emoji modifications)
  useEffect(() => {
    if (reply.text !== originalTextRef.current) {
      setEditedText(reply.text);
      originalTextRef.current = reply.text;
    }
  }, [reply.text]);

  // Sync guidance note when reply changes
  useEffect(() => {
    setCurrentGuidanceNote(reply.guidanceNote);
  }, [reply.guidanceNote]);

  // Get feedback store action
  const addFeedback = useFeedbackStore((s) => s.addFeedback);

  // Handle tap on reply text to start editing
  const handleTapToEdit = () => {
    Haptics.selectionAsync();
    setIsEditing(true);
    setHasAnimatedText(true); // Stop typewriter animation
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Handle text change with debounced analysis
  const handleTextChange = useCallback(
    (newText: string) => {
      setEditedText(newText);
      onReplyTextChange?.(reply.id, newText);

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the analysis by 400ms
      debounceRef.current = setTimeout(async () => {
        // Only analyze if text actually changed meaningfully
        if (newText.trim() === originalTextRef.current.trim()) {
          return;
        }

        setIsAnalyzing(true);

        try {
          const result = await analyzeEditedReply(newText, originalTextRef.current, {
            intention,
            originalGuidanceNote: reply.guidanceNote,
          });

          if (result.hasSignificantChange) {
            // Subtle fade transition for guidance note update
            Animated.sequence([
              Animated.timing(guidanceOpacity, {
                toValue: 0.3,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(guidanceOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();

            setCurrentGuidanceNote(result.guidanceNote);
          }
        } catch (error) {
          console.error("Error analyzing edited reply:", error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 400);
    },
    [intention, reply.guidanceNote, reply.id, onReplyTextChange, guidanceOpacity]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const textToUse = isEditing ? editedText : reply.text;
    await Clipboard.setStringAsync(textToUse);
    onSelectReply(textToUse);
    setCopied(true);
    Keyboard.dismiss();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    Haptics.selectionAsync();
    if (liked !== "like") {
      setLiked("like");
      addFeedback(editedText || reply.text, "like");
    }
  };

  const handleDislike = () => {
    Haptics.selectionAsync();
    if (liked !== "dislike") {
      setLiked("dislike");
      addFeedback(editedText || reply.text, "dislike");
    }
  };

  const handleResetFeedback = () => {
    setLiked(null);
  };

  const handleAddEmoji = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddEmoji?.(reply.id);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Reply text with edit button */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Edit button - left side */}
        {!isEditing && (
          <Pressable
            onPress={handleTapToEdit}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: buttonBg,
              opacity: pressed ? 0.7 : 1,
              marginRight: 8,
            })}
          >
            <Ionicons name="pencil-outline" size={12} color={iconColor} />
            <Text style={{ fontSize: 11, color: textSecondary }}>Edit</Text>
          </Pressable>
        )}

        <View
          style={{
            flex: 1,
            paddingLeft: isEditing ? 12 : 0,
            position: "relative",
          }}
        >
          {/* Soft accent gradient left edge - shows when editing */}
          {isEditing && (
            <LinearGradient
              colors={[accentColorLight, "transparent"]}
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
          )}

          {isEditing ? (
            <TextInput
              ref={inputRef}
              value={editedText}
              onChangeText={handleTextChange}
              multiline
              style={{
                fontSize: 15,
                lineHeight: 24,
                color: textColor,
                padding: 0,
                margin: 0,
                textAlignVertical: "top",
                borderWidth: 0,
                backgroundColor: "transparent",
              }}
              placeholderTextColor={textSecondary}
              autoCorrect={true}
              autoCapitalize="sentences"
            />
          ) : !hasAnimatedText ? (
            <TypewriterText
              text={reply.text}
              style={{
                fontSize: 15,
                lineHeight: 24,
                color: textColor,
              }}
              speed={85}
              onComplete={() => setHasAnimatedText(true)}
            />
          ) : (
            <Text
              style={{
                fontSize: 15,
                lineHeight: 24,
                color: textColor,
              }}
            >
              {reply.text}
            </Text>
          )}
        </View>
      </View>

      {/* Guidance Note (Lightbulb) - dynamic updates */}
      <Animated.View
        className="flex-row items-start mt-2 pl-3"
        style={{ opacity: guidanceOpacity }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, marginRight: 6 }}>
          <Ionicons
            name="bulb-outline"
            size={12}
            color={textTertiary}
          />
          {isAnalyzing && (
            <ActivityIndicator
              size="small"
              color={textTertiary}
              style={{ marginLeft: 4, transform: [{ scale: 0.5 }] }}
            />
          )}
        </View>
        {hasAnimatedText && !hasAnimatedGuidance ? (
          <View style={{ flex: 1 }}>
            <TypewriterText
              key={`guidance-${reply.id}-${currentGuidanceNote}`}
              text={currentGuidanceNote}
              style={{
                fontSize: 13,
                lineHeight: 18,
                color: textTertiary,
              }}
              speed={70}
              onComplete={() => setHasAnimatedGuidance(true)}
            />
          </View>
        ) : (
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              color: textTertiary,
              flex: 1,
            }}
          >
            {currentGuidanceNote}
          </Text>
        )}
      </Animated.View>

      {/* Action buttons row */}
      <View className="flex-row items-center justify-between mt-3">
        {/* Primary action buttons */}
        <View className="flex-row items-center gap-2">
          {/* Use this reply / Paste reply button */}
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: copied ? buttonBgActive : buttonBg,
              borderWidth: 1,
              borderColor: copied ? buttonBorderActive : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={14}
              color={copied ? accentColor : buttonTextColor}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: copied ? accentColor : buttonTextColor,
              }}
            >
              {copied ? "Copied" : isEditing ? "Paste reply" : "Use this reply"}
            </Text>
          </Pressable>

          {/* Different reply button */}
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
                borderColor: buttonBorder,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="refresh-outline" size={14} color={buttonTextColor} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: buttonTextColor,
                }}
              >
                Different reply
              </Text>
            </Pressable>
          )}
        </View>

        {/* Icon buttons row */}
        <View className="flex-row items-center">
          {/* Emoji button */}
          <IconButton
            icon="happy-outline"
            onPress={handleAddEmoji}
            isLoading={isAddingEmoji}
            color={iconColor}
            activeColor={accentColor}
            size={16}
          />

          {/* Shorter button */}
          {onModifyLength && (
            <IconButton
              icon="remove-outline"
              onPress={() => onModifyLength(reply.id, "shorten")}
              isLoading={loadingAction?.replyId === reply.id && loadingAction?.action === "shorten"}
              color={iconColor}
              activeColor={accentColor}
              size={16}
            />
          )}

          {/* Longer button */}
          {onModifyLength && (
            <IconButton
              icon="add-outline"
              onPress={() => onModifyLength(reply.id, "lengthen")}
              isLoading={loadingAction?.replyId === reply.id && loadingAction?.action === "lengthen"}
              color={iconColor}
              activeColor={accentColor}
              size={16}
            />
          )}

          {/* Divider */}
          {liked === null && (
            <View style={{ width: 1, height: 16, backgroundColor: dividerColor, marginHorizontal: 4 }} />
          )}

          {/* Like button */}
          <IconButton
            icon={liked === "like" ? "thumbs-up" : "thumbs-up-outline"}
            onPress={handleLike}
            onLongPress={liked === "like" ? handleResetFeedback : undefined}
            showSuccess={liked === "like"}
            color={iconColor}
            activeColor={accentColor}
            size={16}
            hidden={liked === "dislike"}
          />

          {/* Dislike button */}
          <IconButton
            icon={liked === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
            onPress={handleDislike}
            onLongPress={liked === "dislike" ? handleResetFeedback : undefined}
            showSuccess={liked === "dislike"}
            color={iconColor}
            activeColor={accentColor}
            size={16}
            hidden={liked === "like"}
          />
        </View>
      </View>
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
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;
  const [loadingAction, setLoadingAction] = useState<{ replyId: string; action: "shorten" | "lengthen" } | null>(null);
  const [addingEmojiReplyId, setAddingEmojiReplyId] = useState<string | null>(null);

  // Theme-aware colors
  const cardBg = isDark ? "#000000" : "#FFFFFF";
  const cardBorderColor = isDark ? "transparent" : "rgba(0, 0, 0, 0.08)";

  useEffect(() => {
    // Gentle fade and drift
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
        marginBottom: 20,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Card background */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          padding: 16,
          borderWidth: isDark ? 0 : 1,
          borderColor: cardBorderColor,
          shadowColor: isDark ? "transparent" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 8,
        }}
      >
        {replies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            loadingAction={loadingAction}
            onModifyLength={onModifyLength ? handleModifyLength : undefined}
            onSelectReply={onSelectReply}
            onGenerateDifferent={onGenerateDifferent}
            onAddEmoji={onAddEmoji ? handleAddEmoji : undefined}
            isAddingEmoji={addingEmojiReplyId === reply.id}
            isDark={isDark}
            intention={intention}
          />
        ))}
      </View>
    </Animated.View>
  );
}
