import React from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";

interface QuestionOptionsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
  selectedOption?: string | null;
}

export function QuestionOptions({
  options,
  onSelect,
  disabled = false,
  selectedOption = null,
}: QuestionOptionsProps) {
  const { colors, isDark } = useTheme();

  const handleSelect = (option: string) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(option);
  };

  return (
    <View style={{ gap: 8, marginTop: 12, marginBottom: 8 }}>
      {options.map((option, index) => {
        const isSelected = selectedOption === option;

        return (
          <Pressable
            key={index}
            onPress={() => handleSelect(option)}
            disabled={disabled}
            style={({ pressed }) => ({
              opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                backgroundColor: isSelected
                  ? isDark
                    ? "#3A3A3C"
                    : "#007AFF"
                  : isDark
                  ? "#1C1C1E"
                  : "#F2F2F7",
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: isSelected
                  ? isDark
                    ? "#48484A"
                    : "#007AFF"
                  : isDark
                  ? "#2C2C2E"
                  : "#E5E5EA",
              }}
            >
              <Text
                style={{
                  color: isSelected
                    ? "#FFFFFF"
                    : colors.textPrimary,
                  fontSize: 15,
                  lineHeight: 20,
                }}
              >
                {option}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
