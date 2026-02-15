import React from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";

interface DecodeClarificationCardProps {
  promptQuestion: string;
  toneContext: string;
  onTap: () => void;
}

export function DecodeClarificationCard({
  promptQuestion,
  toneContext,
  onTap,
}: DecodeClarificationCardProps) {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTap();
  };

  // Accent color - soft blue to match decode mode
  const accentColor = isDark ? "#60A5FA" : "#3B82F6";

  return (
    <View
      style={{
        marginBottom: 16,
        alignSelf: "flex-start",
        maxWidth: "88%",
      }}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          backgroundColor: isDark
            ? pressed
              ? "rgba(96, 165, 250, 0.15)"
              : "rgba(96, 165, 250, 0.08)"
            : pressed
            ? "rgba(59, 130, 246, 0.12)"
            : "rgba(59, 130, 246, 0.06)",
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(96, 165, 250, 0.2)"
            : "rgba(59, 130, 246, 0.15)",
        })}
      >
        {/* Question text */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "500",
          }}
        >
          {promptQuestion}
        </Text>

        {/* Tap hint */}
        <Text
          style={{
            color: accentColor,
            fontSize: 13,
            marginTop: 10,
            fontWeight: "500",
          }}
        >
          Tap to respond
        </Text>
      </Pressable>
    </View>
  );
}
