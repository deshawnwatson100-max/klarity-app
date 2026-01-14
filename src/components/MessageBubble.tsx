import React, { useEffect, useState, useRef } from "react";
import { View, Text, Dimensions, Pressable, Share, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import * as ContextMenu from "zeego/context-menu";
import { useFeedbackStore } from "../state/feedbackStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper function to render beautifully formatted text
const renderFormattedText = (text: string, baseStyle: any) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  // Parse inline formatting (bold, italic, code)
  const parseInlineFormatting = (str: string, lineIndex: number, partIndex: number = 0): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match bold (**text** or __text__), italic (*text* or _text_), and inline code (`text`)
    const formatRegex = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;
    let lastIndex = 0;
    let match;

    while ((match = formatRegex.exec(str)) !== null) {
      // Add text before the formatted part
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${lineIndex}-${partIndex}-${lastIndex}`} style={baseStyle}>
            {str.slice(lastIndex, match.index)}
          </Text>
        );
      }

      if (match[1] || match[2]) {
        // Bold text
        parts.push(
          <Text
            key={`bold-${lineIndex}-${partIndex}-${match.index}`}
            style={[baseStyle, { fontWeight: "700", color: "#FFFFFF" }]}
          >
            {match[1] || match[2]}
          </Text>
        );
      } else if (match[3]) {
        // Inline code
        parts.push(
          <Text
            key={`code-${lineIndex}-${partIndex}-${match.index}`}
            style={[
              baseStyle,
              {
                fontFamily: "Courier",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                fontSize: baseStyle.fontSize - 1,
                color: "#A5F3FC",
              },
            ]}
          >
            {match[3]}
          </Text>
        );
      } else if (match[4] || match[5]) {
        // Italic text
        parts.push(
          <Text
            key={`italic-${lineIndex}-${partIndex}-${match.index}`}
            style={[baseStyle, { fontStyle: "italic", color: "#D1D5DB" }]}
          >
            {match[4] || match[5]}
          </Text>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < str.length) {
      parts.push(
        <Text key={`text-${lineIndex}-${partIndex}-${lastIndex}-end`} style={baseStyle}>
          {str.slice(lastIndex)}
        </Text>
      );
    }

    return parts.length > 0 ? parts : [<Text key={`text-${lineIndex}-${partIndex}`} style={baseStyle}>{str}</Text>];
  };

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Handle code blocks
    if (trimmedLine.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <View
            key={`codeblock-${lineIndex}`}
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              marginBottom: 8,
              borderLeftWidth: 3,
              borderLeftColor: "#6366F1",
            }}
          >
            {codeBlockContent.map((codeLine, i) => (
              <Text
                key={`codeline-${i}`}
                style={{
                  fontFamily: "Courier",
                  fontSize: 14,
                  lineHeight: 20,
                  color: "#A5F3FC",
                }}
              >
                {codeLine}
              </Text>
            ))}
          </View>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Check for headers (# ## ###)
    const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const headerStyles = {
        1: { fontSize: 22, fontWeight: "700" as const, marginTop: 20, marginBottom: 12, color: "#FFFFFF" },
        2: { fontSize: 19, fontWeight: "600" as const, marginTop: 16, marginBottom: 10, color: "#F3F4F6" },
        3: { fontSize: 17, fontWeight: "600" as const, marginTop: 14, marginBottom: 8, color: "#E5E7EB" },
      };
      elements.push(
        <Text
          key={`header-${lineIndex}`}
          style={[baseStyle, headerStyles[level as 1 | 2 | 3], { lineHeight: headerStyles[level as 1 | 2 | 3].fontSize * 1.3 }]}
        >
          {headerText}
        </Text>
      );
      return;
    }

    // Check for bullet points (- or • or *)
    const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <View
          key={`bullet-${lineIndex}`}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: 10,
            paddingLeft: 4,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#818CF8",
              marginTop: 9,
              marginRight: 12,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={baseStyle}>{parseInlineFormatting(bulletMatch[1], lineIndex)}</Text>
          </View>
        </View>
      );
      return;
    }

    // Check for numbered lists (1. 2. etc)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <View
          key={`numbered-${lineIndex}`}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: 10,
            paddingLeft: 4,
          }}
        >
          <Text
            style={[
              baseStyle,
              {
                fontWeight: "600",
                color: "#818CF8",
                marginRight: 10,
                minWidth: 22,
              },
            ]}
          >
            {numberedMatch[1]}.
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={baseStyle}>{parseInlineFormatting(numberedMatch[2], lineIndex)}</Text>
          </View>
        </View>
      );
      return;
    }

    // Check for blockquote (> text)
    const quoteMatch = trimmedLine.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      elements.push(
        <View
          key={`quote-${lineIndex}`}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: "#6B7280",
            paddingLeft: 14,
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          <Text style={[baseStyle, { fontStyle: "italic", color: "#9CA3AF" }]}>
            {parseInlineFormatting(quoteMatch[1], lineIndex)}
          </Text>
        </View>
      );
      return;
    }

    // Regular paragraph text
    if (trimmedLine.length > 0) {
      const prevLine = lineIndex > 0 ? lines[lineIndex - 1].trim() : "";
      const isNewParagraph = lineIndex > 0 && prevLine.length === 0;
      const isAfterSpecial = prevLine.match(/^[-•*#>\d]/) !== null;

      elements.push(
        <Text
          key={`line-${lineIndex}`}
          style={[
            baseStyle,
            {
              marginTop: isNewParagraph ? 16 : isAfterSpecial ? 12 : lineIndex > 0 ? 4 : 0,
            },
          ]}
        >
          {parseInlineFormatting(line, lineIndex)}
        </Text>
      );
    } else if (lineIndex > 0 && lineIndex < lines.length - 1) {
      // Empty line - creates paragraph break (spacing handled by next element)
    }
  });

  return elements;
};

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
  showUserBubble?: boolean; // ChatGPT-style bubble for user messages
  showActions?: boolean; // Show action buttons for assistant messages (ChatGPT-style)
  onRegenerate?: () => void; // Callback for regenerate action
  onEdit?: (content: string, messageId: string) => void; // Callback for edit action (user messages)
  messageId?: string; // Message ID for edit tracking
}

export function MessageBubble({
  role,
  content,
  timestamp,
  imageUrl,
  showUserBubble = false,
  showActions = false,
  onRegenerate,
  onEdit,
  messageId,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current; // Subtle 4px drift

  // Action states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null); // null = no feedback, true = liked, false = disliked

  // Feedback store for tracking user preferences
  const addFeedback = useFeedbackStore((s) => s.addFeedback);

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

  useEffect(() => {
    if (imageUrl) {
      console.log("MessageBubble imageUrl:", imageUrl);
    }
  }, [imageUrl]);

  const hasText = content && content !== "[Image]";

  // Smaller image dimensions for chat screenshots
  const imageWidth = SCREEN_WIDTH * 0.55; // 55% of screen width
  const imageHeight = imageWidth * 1.8; // Tall aspect ratio for chat screenshots

  // Action handlers
  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsSpeaking(true);
      Speech.speak(content, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Only set to like if not already liked (no toggle on tap)
    if (liked !== true) {
      setLiked(true);
      addFeedback(content, "like");
    }
  };

  const handleDislike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Only set to dislike if not already disliked (no toggle on tap)
    if (liked !== false) {
      setLiked(false);
      addFeedback(content, "dislike");
    }
  };

  // Long press to reset feedback and show both buttons again
  const handleResetFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked(null);
  };

  const handleRegenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRegenerate?.();
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: content,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (messageId) {
      onEdit?.(content, messageId);
    }
  };

  // User messages - warmer white with faint shadow
  if (isUser) {
    return (
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
          marginBottom: 20,
        }}
      >
        {/* Image aligned to the right */}
        {imageUrl && (
          <View style={{ width: "100%", alignItems: "flex-end", marginBottom: hasText ? 12 : 0 }}>
            <View
              style={{
                width: imageWidth,
                height: imageHeight,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                contentFit="cover"
                placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
                transition={200}
              />
            </View>
          </View>
        )}

        {/* Text aligned to the right with context menu */}
        {hasText && (
          <View style={{ alignItems: "flex-end" }}>
            <ContextMenu.Root>
              <ContextMenu.Trigger>
                <View
                  style={showUserBubble ? {
                    maxWidth: SCREEN_WIDTH * 0.85,
                    backgroundColor: "#2F2F2F", // ChatGPT-style dark gray bubble
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 20,
                  } : {
                    maxWidth: SCREEN_WIDTH * 0.85,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      color: "#F5F5F4", // Warmer white
                      letterSpacing: 0.2,
                    }}
                  >
                    {content}
                  </Text>
                </View>
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Item key="copy" onSelect={handleCopy}>
                  <ContextMenu.ItemTitle>Copy</ContextMenu.ItemTitle>
                  <ContextMenu.ItemIcon ios={{ name: "doc.on.doc" }} />
                </ContextMenu.Item>
                {onEdit && (
                  <ContextMenu.Item key="edit" onSelect={handleEdit}>
                    <ContextMenu.ItemTitle>Edit Message</ContextMenu.ItemTitle>
                    <ContextMenu.ItemIcon ios={{ name: "pencil" }} />
                  </ContextMenu.Item>
                )}
              </ContextMenu.Content>
            </ContextMenu.Root>
          </View>
        )}
      </Animated.View>
    );
  }

  // Assistant messages - soft off-white on pitch black
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        marginBottom: 20,
      }}
    >
      {/* Image aligned to the right */}
      {imageUrl && (
        <View style={{ width: "100%", alignItems: "flex-end", marginBottom: hasText ? 12 : 0 }}>
          <View
            style={{
              width: imageWidth,
              height: imageHeight,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#1A1A1C",
            }}
          >
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: "100%",
                height: "100%",
              }}
              contentFit="contain"
              placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
              transition={200}
            />
          </View>
        </View>
      )}

      {/* Text aligned to the left */}
      {hasText && (
        <View style={{ maxWidth: "90%", paddingRight: 20 }}>
          {renderFormattedText(content, {
            fontSize: 17,
            lineHeight: 26,
            color: "#EDEDED",
            letterSpacing: 0.2,
            fontWeight: "400",
          })}
        </View>
      )}

      {/* Action buttons - ChatGPT style */}
      {showActions && hasText && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 12,
            gap: 4,
          }}
        >
          {/* Copy button */}
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 8,
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy"}
              size={20}
              color={copied ? "#10B981" : "#9CA3AF"}
            />
          </Pressable>

          {/* Read aloud button */}
          <Pressable
            onPress={handleSpeak}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 8,
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSpeaking ? "stop" : "volume-high"}
              size={20}
              color={isSpeaking ? "#3B82F6" : "#9CA3AF"}
            />
          </Pressable>

          {/* Like button - hidden when dislike is selected */}
          {liked !== false && (
            <Pressable
              onPress={handleLike}
              onLongPress={liked === true ? handleResetFeedback : undefined}
              delayLongPress={400}
              style={({ pressed }) => ({
                padding: 8,
                borderRadius: 8,
                backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
              })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={liked === true ? "thumbs-up" : "thumbs-up-outline"}
                size={20}
                color={liked === true ? "#10B981" : "#9CA3AF"}
              />
            </Pressable>
          )}

          {/* Dislike button - hidden when like is selected */}
          {liked !== true && (
            <Pressable
              onPress={handleDislike}
              onLongPress={liked === false ? handleResetFeedback : undefined}
              delayLongPress={400}
              style={({ pressed }) => ({
                padding: 8,
                borderRadius: 8,
                backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
              })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={liked === false ? "thumbs-down" : "thumbs-down-outline"}
                size={20}
                color={liked === false ? "#EF4444" : "#9CA3AF"}
              />
            </Pressable>
          )}

          {/* Share/Send button */}
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 8,
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="share"
              size={20}
              color="#9CA3AF"
            />
          </Pressable>

          {/* Regenerate button */}
          {onRegenerate && (
            <Pressable
              onPress={handleRegenerate}
              style={({ pressed }) => ({
                padding: 8,
                borderRadius: 8,
                backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
              })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="refresh"
                size={20}
                color="#9CA3AF"
              />
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
}
