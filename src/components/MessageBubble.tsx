import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
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

  // User messages - warmer white with faint shadow
  if (isUser) {
    return (
      <Animated.View
        style={animatedStyle}
        className="mb-5 items-end" // Generous vertical spacing
      >
        <View style={{ maxWidth: "85%" }}>
          {/* Image floats freely - no container */}
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: 250,
                height: 350,
                borderRadius: 16,
                marginBottom: hasText ? 10 : 0,
              }}
              contentFit="cover"
              placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
              transition={200}
            />
          )}

          {/* Soft text block with faint shadow */}
          {hasText && (
            <View
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 24,
                  color: "#F5F5F4", // Warmer white
                  letterSpacing: 0.2,
                }}
              >
                {content}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  // Assistant messages - soft off-white on pitch black
  return (
    <Animated.View
      style={animatedStyle}
      className="mb-5 items-start" // Generous vertical spacing
    >
      <View style={{ maxWidth: "90%", paddingRight: 20 }}>
        {/* Image floats freely */}
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: 250,
              height: 350,
              borderRadius: 16,
              marginBottom: hasText ? 10 : 0,
            }}
            contentFit="cover"
            placeholder={{ blurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I" }}
            transition={200}
          />
        )}

        {/* Floating text - clean on pitch black */}
        {hasText && (
          <Text
            style={{
              fontSize: 15,
              lineHeight: 24,
              color: "#EDEDED", // Soft off-white
              letterSpacing: 0.15,
            }}
          >
            {content}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
