import React, { useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
}

export function MessageBubble({ role, content, timestamp, imageUrl }: MessageBubbleProps) {
  const isUser = role === "user";
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  // Debug: Log image URL when component renders
  useEffect(() => {
    if (imageUrl) {
      console.log("MessageBubble imageUrl:", imageUrl);
    }
  }, [imageUrl]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`mb-4 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`${imageUrl ? "max-w-[85%]" : "max-w-[80%]"} rounded-2xl ${
          isUser
            ? "border border-[#C7B5FF]"
            : "border border-neutral-800"
        } ${imageUrl ? "p-2" : "px-4 py-3"}`}
        style={{
          backgroundColor: isUser ? "#D8CCFF" : "#0E0E0F",
        }}
      >
        {/* Image Preview */}
        {imageUrl && (
          <Image
            source={imageUrl}
            style={{
              width: "100%",
              aspectRatio: 1320 / 2868, // iPhone 16 Pro Max aspect ratio
              borderRadius: 12,
              marginBottom: content && content !== "[Image]" ? 8 : 0,
            }}
            contentFit="contain"
            placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
            transition={200}
          />
        )}

        {/* Text Content */}
        {content && content !== "[Image]" && (
          <View className={imageUrl ? "px-2 pb-1" : ""}>
            <Text
              className="text-base leading-6"
              style={{ color: isUser ? "#000000" : "#C7B5FF" }}
            >
              {content}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
