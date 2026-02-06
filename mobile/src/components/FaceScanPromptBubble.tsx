import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface FaceScanPromptBubbleProps {
  onTap: () => void;
}

export function FaceScanPromptBubble({ onTap }: FaceScanPromptBubbleProps) {
  const scale = useSharedValue(1);

  console.log("[FaceScanPromptBubble] Rendering");

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          marginBottom: 16,
          paddingHorizontal: 4,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={() => {
          console.log("[FaceScanPromptBubble] Tapped");
          onTap();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: "100%" }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(125, 211, 192, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(125, 211, 192, 0.2)",
            borderRadius: 24,
            paddingHorizontal: 20,
            paddingVertical: 16,
            shadowColor: "#7DD3C0",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(125, 211, 192, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="scan-outline" size={20} color="#7DD3C0" />
          </View>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
              fontWeight: "500",
              fontSize: 14,
              lineHeight: 20,
              flexShrink: 1,
            }}
          >
            Scan your face for deeper emotional insight?
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
