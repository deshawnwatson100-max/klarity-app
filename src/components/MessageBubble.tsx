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

  // User messages
  if (isUser) {
    return (
      <Animated.View
        style={animatedStyle}
        className="mb-4 items-end"
      >
        <View style={{ maxWidth: "85%" }}>
          {/* Image floats freely - no container */}
          {imageUrl && (
            <Image
              source={imageUrl}
              style={{
                width: "100%",
                aspectRatio: 1320 / 2868,
                borderRadius: 16,
                marginBottom: hasText ? 8 : 0,
              }}
              contentFit="contain"
              placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
              transition={200}
            />
          )}

          {/* Text gets a subtle bubble */}
          {hasText && (
            <View
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "#1A1A1C",
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Text
                className="text-base leading-6"
                style={{ color: "#F9FAFB" }}
              >
                {content}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  // Assistant messages - clean floating text (no bubble)
  return (
    <Animated.View
      style={animatedStyle}
      className="mb-4 items-start"
    >
      <View style={{ maxWidth: "90%", paddingRight: 20 }}>
        {/* Image floats freely */}
        {imageUrl && (
          <Image
            source={imageUrl}
            style={{
              width: "100%",
              aspectRatio: 1320 / 2868,
              borderRadius: 16,
              marginBottom: hasText ? 8 : 0,
            }}
            contentFit="contain"
            placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
            transition={200}
          />
        )}

        {/* Text floats freely */}
        {hasText && (
          <Text
            style={{
              fontSize: 15,
              lineHeight: 23,
              color: "#E5E7EB",
              letterSpacing: 0.1,
            }}
          >
            {content}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
