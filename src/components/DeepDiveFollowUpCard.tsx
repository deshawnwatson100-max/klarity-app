import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const COLORS = {
  text: "#EDEDED",
  textSecondary: "#A0A0A0",
  textMuted: "#6B7280",
  link: "#60A5FA",
  success: "#10B981",
  buttonBg: "rgba(255, 255, 255, 0.08)",
  buttonBgHover: "rgba(255, 255, 255, 0.12)",
  inputBg: "rgba(255, 255, 255, 0.06)",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputBorderFocus: "rgba(96, 165, 250, 0.4)",
};

// Predefined follow-up questions by data type
const FOLLOW_UP_QUESTIONS: Record<string, { question: string; placeholder: string; icon: string }> = {
  username: {
    question: "Do you know any usernames or handles they use?",
    placeholder: "e.g., @johndoe, john_doe123",
    icon: "at-outline",
  },
  location: {
    question: "Do you know where they live or are from?",
    placeholder: "e.g., Los Angeles, CA",
    icon: "location-outline",
  },
  workplace: {
    question: "Do you know where they work or what they do?",
    placeholder: "e.g., Google, software engineer",
    icon: "briefcase-outline",
  },
  school: {
    question: "Do you know what school they went to?",
    placeholder: "e.g., UCLA, Stanford",
    icon: "school-outline",
  },
  age: {
    question: "Do you have an idea of their age?",
    placeholder: "e.g., mid 20s, around 30",
    icon: "calendar-outline",
  },
  phone: {
    question: "Do you have a phone number for them?",
    placeholder: "e.g., 555-123-4567",
    icon: "call-outline",
  },
  email: {
    question: "Do you have an email address?",
    placeholder: "e.g., john@email.com",
    icon: "mail-outline",
  },
  relationship: {
    question: "How do you know this person?",
    placeholder: "e.g., dating app, work, mutual friend",
    icon: "people-outline",
  },
};

interface DeepDiveFollowUpCardProps {
  personName: string;
  dataType: string;
  customQuestion?: string;
  placeholder?: string;
  isOptional?: boolean;
  onSubmit: (value: string, dataType: string) => void;
  onSkip?: () => void;
}

/**
 * Card for collecting additional info from user to improve deep dive results
 * Part of the collaborative trust-building flow
 */
export function DeepDiveFollowUpCard({
  personName,
  dataType,
  customQuestion,
  placeholder: customPlaceholder,
  isOptional = true,
  onSubmit,
  onSkip,
}: DeepDiveFollowUpCardProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    scale.value = withSpring(1, { damping: 18, stiffness: 200 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  // Get question config from predefined or use custom
  const questionConfig = FOLLOW_UP_QUESTIONS[dataType] || {
    question: customQuestion || "Can you tell me more?",
    placeholder: customPlaceholder || "Type here...",
    icon: "help-circle-outline",
  };

  const question = customQuestion || questionConfig.question;
  const placeholderText = customPlaceholder || questionConfig.placeholder;

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    onSubmit(inputValue.trim(), dataType);
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    onSkip?.();
  };

  return (
    <Animated.View style={[{ marginBottom: 24 }, animatedStyle]}>
      <View
        style={{
          backgroundColor: "rgba(5, 6, 8, 0.95)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isFocused ? COLORS.inputBorderFocus : COLORS.inputBorder,
          overflow: "hidden",
        }}
      >
        {/* Header with icon and question */}
        <View style={{ padding: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(96, 165, 250, 0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name={questionConfig.icon as any} size={14} color={COLORS.link} />
            </View>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Additional Info
            </Text>
            {isOptional && (
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 6 }}>
                (optional)
              </Text>
            )}
          </View>

          <Text
            style={{
              fontSize: 16,
              lineHeight: 24,
              color: COLORS.text,
              fontWeight: "500",
            }}
          >
            {question}
          </Text>
        </View>

        {/* Input field */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <TextInput
            ref={inputRef}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholderText}
            placeholderTextColor={COLORS.textMuted}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: COLORS.inputBg,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: isFocused ? COLORS.inputBorderFocus : "transparent",
            }}
          />
        </View>

        {/* Action buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 16,
            gap: 10,
          }}
        >
          {/* Skip button */}
          {isOptional && onSkip && (
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: pressed ? COLORS.buttonBgHover : "transparent",
              })}
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
                Skip for now
              </Text>
            </Pressable>
          )}

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!inputValue.trim()}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: inputValue.trim()
                ? pressed
                  ? "rgba(96, 165, 250, 0.3)"
                  : "rgba(96, 165, 250, 0.2)"
                : COLORS.buttonBg,
              opacity: inputValue.trim() ? 1 : 0.5,
            })}
          >
            <Text
              style={{
                color: inputValue.trim() ? COLORS.link : COLORS.textMuted,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              Search again
            </Text>
            <Ionicons
              name="search-outline"
              size={14}
              color={inputValue.trim() ? COLORS.link : COLORS.textMuted}
              style={{ marginLeft: 6 }}
            />
          </Pressable>
        </View>
      </View>

      {/* Helpful context text below card */}
      <Text
        style={{
          fontSize: 13,
          color: COLORS.textMuted,
          marginTop: 10,
          textAlign: "center",
          lineHeight: 18,
        }}
      >
        Any detail helps narrow down the search
      </Text>
    </Animated.View>
  );
}
