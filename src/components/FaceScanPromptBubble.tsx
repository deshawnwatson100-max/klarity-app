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
        onPress={onTap}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="active:opacity-90"
      >
        <View
          className="rounded-3xl px-5 py-4 flex-row items-center gap-3"
          style={{
            backgroundColor: "rgba(125, 211, 192, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(125, 211, 192, 0.2)",
            shadowColor: "#7DD3C0",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            maxWidth: "90%",
          }}
        >
          <View
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{
              backgroundColor: "rgba(125, 211, 192, 0.15)",
            }}
          >
            <Ionicons name="scan-outline" size={20} color="#7DD3C0" />
          </View>
          <View className="flex-1">
            <Text
              style={{
                fontFamily: "SF Pro Display",
                color: "#E5E7EB",
                fontWeight: "500",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Scan your face for deeper emotional insight?
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
