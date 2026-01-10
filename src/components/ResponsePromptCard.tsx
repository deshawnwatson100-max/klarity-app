import React, { useRef, useEffect } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface ResponsePromptCardProps {
  promptText: string;
}

export function ResponsePromptCard({ promptText }: ResponsePromptCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;

  useEffect(() => {
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

  return (
    <Animated.View
      style={{
        alignSelf: "flex-start",
        width: "100%",
        marginBottom: 20,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View
        style={{
          backgroundColor: "#000000",
          borderRadius: 16,
          padding: 16,
        }}
      >
        {/* Section header with teal accent */}
        <View className="flex-row items-center mb-3">
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color="#5BA89A"
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: "#5BA89A",
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            Your Response
          </Text>
        </View>

        {/* Prompt text with teal glow */}
        <View
          style={{
            paddingLeft: 12,
            position: "relative",
          }}
        >
          {/* Soft teal gradient left edge accent */}
          <LinearGradient
            colors={["rgba(125, 211, 192, 0.2)", "rgba(125, 211, 192, 0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              borderRadius: 2,
            }}
          />
          <Text
            style={{
              fontSize: 15,
              lineHeight: 24,
              color: "#EDEDED",
            }}
          >
            {promptText}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
