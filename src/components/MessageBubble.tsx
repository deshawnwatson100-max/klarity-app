import React, { useEffect, useState } from "react";
import { View, Text, Dimensions, Pressable, Share } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper function to render formatted text with bold and bullet points
const renderFormattedText = (text: string, baseStyle: any) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    const isBulletPoint = trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ");
    const bulletContent = isBulletPoint ? trimmedLine.slice(2) : line;

    // Parse bold text (text between ** or __)
    const parseBoldText = (str: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(str)) !== null) {
        // Add text before the bold part
        if (match.index > lastIndex) {
          parts.push(
            <Text key={`text-${lineIndex}-${lastIndex}`} style={baseStyle}>
              {str.slice(lastIndex, match.index)}
            </Text>
          );
        }
        // Add the bold text
        parts.push(
          <Text
            key={`bold-${lineIndex}-${match.index}`}
            style={[baseStyle, { fontWeight: "700" }]}
          >
            {match[1] || match[2]}
          </Text>
        );
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text after last bold match
      if (lastIndex < str.length) {
        parts.push(
          <Text key={`text-${lineIndex}-${lastIndex}-end`} style={baseStyle}>
            {str.slice(lastIndex)}
          </Text>
        );
      }

      return parts.length > 0 ? parts : [<Text key={`text-${lineIndex}`} style={baseStyle}>{str}</Text>];
    };

    if (isBulletPoint) {
      elements.push(
        <View
          key={`bullet-${lineIndex}`}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: lineIndex > 0 ? 8 : 0,
          }}
        >
          <Text style={[baseStyle, { marginRight: 8, fontWeight: "600" }]}>•</Text>
          <View style={{ flex: 1 }}>
            <Text style={baseStyle}>{parseBoldText(bulletContent)}</Text>
          </View>
        </View>
      );
    } else if (trimmedLine.length > 0) {
      elements.push(
        <Text
          key={`line-${lineIndex}`}
          style={[baseStyle, { marginTop: lineIndex > 0 && lines[lineIndex - 1].trim().length > 0 ? 0 : lineIndex > 0 ? 12 : 0 }]}
        >
          {parseBoldText(line)}
        </Text>
      );
    } else if (lineIndex > 0 && lineIndex < lines.length - 1) {
      // Empty line - add spacing
      elements.push(<View key={`space-${lineIndex}`} style={{ height: 8 }} />);
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
}

export function MessageBubble({
  role,
  content,
  timestamp,
  imageUrl,
  showUserBubble = false,
  showActions = false,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(4); // Subtle 4px drift

  // Action states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null); // null = no feedback, true = liked, false = disliked

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

  useEffect(() => {
    if (imageUrl) {
      console.log("MessageBubble imageUrl:", imageUrl);
    }
  }, [imageUrl]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

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
    setLiked(liked === true ? null : true);
  };

  const handleDislike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(liked === false ? null : false);
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

  // User messages - warmer white with faint shadow
  if (isUser) {
    return (
      <Animated.View
        style={animatedStyle}
        className="mb-5"
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

        {/* Text aligned to the right */}
        {hasText && (
          <View style={{ alignItems: "flex-end" }}>
            <View
              style={showUserBubble ? {
                maxWidth: "85%",
                backgroundColor: "#2F2F2F", // ChatGPT-style dark gray bubble
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 20,
              } : {
                maxWidth: "85%",
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
          </View>
        )}
      </Animated.View>
    );
  }

  // Assistant messages - soft off-white on pitch black
  return (
    <Animated.View
      style={animatedStyle}
      className="mb-5"
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
            fontSize: 15,
            lineHeight: 24,
            color: "#EDEDED",
            letterSpacing: 0.15,
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
              name={copied ? "checkmark" : "copy-outline"}
              size={18}
              color={copied ? "#10B981" : "#6B7280"}
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
              name={isSpeaking ? "stop" : "volume-high-outline"}
              size={18}
              color={isSpeaking ? "#3B82F6" : "#6B7280"}
            />
          </Pressable>

          {/* Like button */}
          <Pressable
            onPress={handleLike}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 8,
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={liked === true ? "thumbs-up" : "thumbs-up-outline"}
              size={18}
              color={liked === true ? "#10B981" : "#6B7280"}
            />
          </Pressable>

          {/* Dislike button */}
          <Pressable
            onPress={handleDislike}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 8,
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : "transparent",
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={liked === false ? "thumbs-down" : "thumbs-down-outline"}
              size={18}
              color={liked === false ? "#EF4444" : "#6B7280"}
            />
          </Pressable>

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
              name="share-outline"
              size={18}
              color="#6B7280"
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
                name="refresh-outline"
                size={18}
                color="#6B7280"
              />
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
}
