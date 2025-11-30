import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

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
        className={`max-w-[80%] rounded-2xl ${
          isUser
            ? "bg-neutral-900 border border-[#B4FF39]"
            : "bg-neutral-900 border border-neutral-800"
        } ${imageUrl ? "p-2" : "px-4 py-3"}`}
      >
        {/* Image Preview */}
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 12,
              marginBottom: content && content !== "[Image]" ? 8 : 0,
            }}
            contentFit="cover"
          />
        )}

        {/* Text Content */}
        {content && content !== "[Image]" && (
          <View className={imageUrl ? "px-2 pb-1" : ""}>
            <Text className="text-white text-base leading-6">{content}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
