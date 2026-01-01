import React, { useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
  showUserBubble?: boolean; // ChatGPT-style bubble for user messages
}

export function MessageBubble({ role, content, timestamp, imageUrl, showUserBubble = false }: MessageBubbleProps) {
  const isUser = role === "user";
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(4); // Subtle 4px drift

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
                borderTopRightRadius: 6, // Slightly flattened corner for chat bubble feel
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
          <Text
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: "#EDEDED", // Soft off-white
              letterSpacing: 0.15,
            }}
          >
            {content}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
