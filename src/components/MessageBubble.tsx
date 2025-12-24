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

  // User messages get a subtle rounded bubble
  if (isUser) {
    return (
      <Animated.View
        style={animatedStyle}
        className="mb-4 items-end"
      >
        <View
          className={`${imageUrl ? "max-w-[85%]" : "max-w-[80%]"} rounded-2xl ${
            imageUrl ? "p-2" : "px-4 py-3"
          }`}
          style={{
            backgroundColor: "#1A1A1C",
            borderWidth: 1,
            borderColor: "#374151",
          }}
        >
          {imageUrl && (
            <Image
              source={imageUrl}
              style={{
                width: "100%",
                aspectRatio: 1320 / 2868,
                borderRadius: 12,
                marginBottom: content && content !== "[Image]" ? 8 : 0,
              }}
              contentFit="contain"
              placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
              transition={200}
            />
          )}

          {content && content !== "[Image]" && (
            <View className={imageUrl ? "px-2 pb-1" : ""}>
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

  // Assistant messages are clean floating text (no bubble)
  return (
    <Animated.View
      style={animatedStyle}
      className="mb-4 items-start"
    >
      <View style={{ maxWidth: "90%", paddingRight: 20 }}>
        {imageUrl && (
          <Image
            source={imageUrl}
            style={{
              width: "100%",
              aspectRatio: 1320 / 2868,
              borderRadius: 12,
              marginBottom: content && content !== "[Image]" ? 8 : 0,
            }}
            contentFit="contain"
            placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
            transition={200}
          />
        )}

        {content && content !== "[Image]" && (
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
