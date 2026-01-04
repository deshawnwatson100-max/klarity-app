import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PerceptionFeeling } from "../types/personContext";
import { usePersonContextStore, useActivePersonContext } from "../state/personContextStore";

/**
 * Perception Calibration Component
 *
 * A quick 2-second check-in that appears after:
 * 1. A context card is shown
 * 2. The assistant surfaces a heavy/important piece of context
 *
 * Asks: "How does this sit with you?"
 * Options: "Feels fine" | "I am unsure" | "This feels like a lot"
 *
 * Stores the selection as UserPerceptionState attached to the active person.
 */

interface PerceptionCalibrationProps {
  /** Called after user makes a selection */
  onSelection?: (feeling: PerceptionFeeling) => void;
  /** Whether to show the component */
  visible?: boolean;
  /** Custom question text */
  questionText?: string;
}

const PERCEPTION_OPTIONS: {
  feeling: PerceptionFeeling;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    feeling: "feels_fine",
    label: "Feels fine",
    icon: "checkmark-circle-outline",
    color: "#34D399",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  {
    feeling: "unsure",
    label: "I am unsure",
    icon: "help-circle-outline",
    color: "#FBBF24",
    bgColor: "rgba(251, 191, 36, 0.1)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  {
    feeling: "feels_like_a_lot",
    label: "This feels like a lot",
    icon: "ellipsis-horizontal-circle-outline",
    color: "#F87171",
    bgColor: "rgba(248, 113, 113, 0.1)",
    borderColor: "rgba(248, 113, 113, 0.3)",
  },
];

export function PerceptionCalibration({
  onSelection,
  visible = true,
  questionText = "How does this sit with you?",
}: PerceptionCalibrationProps) {
  const activePersonContext = useActivePersonContext();
  const recordPerception = usePersonContextStore((s) => s.recordPerception);

  const handleSelection = (feeling: PerceptionFeeling) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Record to store if we have an active person context
    if (activePersonContext) {
      recordPerception(activePersonContext.id, feeling);
    }

    // Notify parent
    onSelection?.(feeling);
  };

  if (!visible) return null;

  return (
    <View style={{ marginVertical: 16 }}>
      {/* Question */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "500",
          color: "#9CA3AF",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        {questionText}
      </Text>

      {/* Options */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
        {PERCEPTION_OPTIONS.map((option) => (
          <Pressable
            key={option.feeling}
            onPress={() => handleSelection(option.feeling)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: option.bgColor,
              borderWidth: 1,
              borderColor: option.borderColor,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={option.color}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: option.color,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Compact inline version for chat bubbles
 */
interface PerceptionCalibrationInlineProps {
  onSelection?: (feeling: PerceptionFeeling) => void;
  selectedFeeling?: PerceptionFeeling | null;
}

export function PerceptionCalibrationInline({
  onSelection,
  selectedFeeling,
}: PerceptionCalibrationInlineProps) {
  const activePersonContext = useActivePersonContext();
  const recordPerception = usePersonContextStore((s) => s.recordPerception);

  const handleSelection = (feeling: PerceptionFeeling) => {
    if (selectedFeeling) return; // Already selected

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Record to store if we have an active person context
    if (activePersonContext) {
      recordPerception(activePersonContext.id, feeling);
    }

    // Notify parent
    onSelection?.(feeling);
  };

  return (
    <View style={{ marginTop: 16 }}>
      {/* Question - subtle */}
      <Text
        style={{
          fontSize: 13,
          color: "#6B7280",
          marginBottom: 10,
        }}
      >
        How does this sit with you?
      </Text>

      {/* Chips row */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PERCEPTION_OPTIONS.map((option) => {
          const isSelected = selectedFeeling === option.feeling;
          const isDisabled = selectedFeeling !== null && !isSelected;

          return (
            <Pressable
              key={option.feeling}
              onPress={() => handleSelection(option.feeling)}
              disabled={isDisabled}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: isSelected
                  ? option.bgColor
                  : "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: isSelected
                  ? option.borderColor
                  : "rgba(255, 255, 255, 0.08)",
                opacity: isDisabled ? 0.4 : pressed ? 0.7 : 1,
              })}
            >
              <Ionicons
                name={isSelected ? "checkmark" : option.icon}
                size={14}
                color={isSelected ? option.color : "#6B7280"}
                style={{ marginRight: 5 }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? "600" : "400",
                  color: isSelected ? option.color : "#9CA3AF",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Get the perception feeling label for display
 */
export function getPerceptionLabel(feeling: PerceptionFeeling): string {
  const option = PERCEPTION_OPTIONS.find((o) => o.feeling === feeling);
  return option?.label || feeling;
}

/**
 * Get color for perception feeling
 */
export function getPerceptionColor(feeling: PerceptionFeeling): string {
  const option = PERCEPTION_OPTIONS.find((o) => o.feeling === feeling);
  return option?.color || "#9CA3AF";
}
