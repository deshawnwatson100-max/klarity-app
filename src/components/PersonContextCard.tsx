import React, { useState, memo, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  usePersonContextStore,
} from "../state/personContextStore";
import {
  useLoopsStore,
} from "../state/loopsStore";
import { RelationshipContextType, ContextAnchorType, DeepSearchExtendedContext } from "../types/personContext";
import { useTheme } from "../theme/ThemeContext";

// Theme-aware color getter
function getColors(isDark: boolean) {
  if (isDark) {
    return {
      background: "#1A1A1A",
      surface: "#0A0A0A",
      surfaceHover: "#1A1A1A",
      border: "transparent",
      text: "#ECECEC",
      textSecondary: "#B4B4B4",
      textMuted: "#8E8E8E",
      accent: "#10A37F",
      accentBg: "rgba(16, 163, 127, 0.15)",
      accentMuted: "rgba(16, 163, 127, 0.6)",
      buttonDisabled: "rgba(255, 255, 255, 0.06)",
      error: "#EF4444",
      errorBg: "rgba(239, 68, 68, 0.15)",
      warning: "#F59E0B",
      warningBg: "rgba(245, 158, 11, 0.15)",
    };
  }
  // Light mode colors
  return {
    background: "rgba(0, 0, 0, 0.03)",
    surface: "rgba(0, 0, 0, 0.04)",
    surfaceHover: "rgba(0, 0, 0, 0.06)",
    border: "rgba(0, 0, 0, 0.08)",
    text: "#1C1C1E",
    textSecondary: "#636366",
    textMuted: "#8E8E93",
    accent: "#0D8A6A",
    accentBg: "rgba(13, 138, 106, 0.1)",
    accentMuted: "rgba(13, 138, 106, 0.5)",
    buttonDisabled: "rgba(0, 0, 0, 0.04)",
    error: "#DC2626",
    errorBg: "rgba(220, 38, 38, 0.08)",
    warning: "#D97706",
    warningBg: "rgba(217, 119, 6, 0.08)",
  };
}

const RELATIONSHIP_OPTIONS: {
  value: RelationshipContextType;
  label: string;
}[] = [
  { value: "dating", label: "Dating" },
  { value: "romantic", label: "Partner" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

interface PersonContextCardProps {
  onPersonContextCreated?: (personContextId: string, linkedToChat: boolean) => void;
  onDismiss?: () => void;
  /** If true, shows toggle for user to choose whether to link context to chat. Default: false (auto-links) */
  showLinkOption?: boolean;
}

export const PersonContextCard = memo(function PersonContextCard({
  onPersonContextCreated,
  onDismiss,
  showLinkOption = false,
}: PersonContextCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => getColors(isDark), [isDark]);

  const createPersonContext = usePersonContextStore((s) => s.createPersonContext);
  const setActiveLoopPersonContext = useLoopsStore((s) => s.setActiveLoopPersonContext);

  // Form state - simplified to just essentials
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [location, setLocation] = useState("");

  // Link to chat toggle state - default to true (linked)
  const [linkToChat, setLinkToChat] = useState(true);

  // Completed state
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savedRelationship, setSavedRelationship] = useState<RelationshipContextType | null>(null);
  const [savedLinkedToChat, setSavedLinkedToChat] = useState(true);

  const isFormValid = name.trim().length > 0 && relationshipContext !== null;

  const handleSave = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    const deepSearchContext: {
      location?: string;
      contextAnchor?: { type: ContextAnchorType; value: string };
      knownUsername?: string;
      approximateAge?: string;
      extendedContext?: DeepSearchExtendedContext;
      profileImageUri?: string;
    } = {};

    if (location.trim()) {
      deepSearchContext.location = location.trim();
    }

    const newId = createPersonContext(
      name.trim(),
      relationshipContext!,
      undefined,
      Object.keys(deepSearchContext).length > 0 ? deepSearchContext : undefined
    );

    // Only link to chat loop if showLinkOption is false (auto-link) or user chose to link
    const shouldLink = !showLinkOption || linkToChat;
    if (shouldLink) {
      setActiveLoopPersonContext(newId);
    }

    // Save info for completed state display
    setSavedName(name.trim());
    setSavedRelationship(relationshipContext);
    setSavedLinkedToChat(shouldLink);
    setIsCompleted(true);

    onPersonContextCreated?.(newId, shouldLink);
  };

  // Completed state view
  if (isCompleted) {
    const relationshipLabel = RELATIONSHIP_OPTIONS.find(
      (r) => r.value === savedRelationship
    )?.label || savedRelationship;

    return (
      <View
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          marginVertical: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.accentBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
                {savedName}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                {relationshipLabel} · Context saved{savedLinkedToChat ? " · Linked to chat" : ""}
              </Text>
            </View>
          </View>
          {onDismiss && (
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Simplified form view
  return (
    <View
      style={{
        marginVertical: 8,
        paddingHorizontal: 4,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="search" size={18} color={COLORS.accentMuted} style={{ marginRight: 8 }} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>
              Soft Search
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              AI Person Internet Search
            </Text>
          </View>
        </View>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Name input */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: COLORS.text,
            borderWidth: isDark ? 0 : 1,
            borderColor: COLORS.border,
          }}
          placeholder="Name"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />
      </View>

      {/* Location input */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: COLORS.text,
            borderWidth: isDark ? 0 : 1,
            borderColor: COLORS.border,
          }}
          placeholder="Location (optional)"
          placeholderTextColor={COLORS.textMuted}
          value={location}
          onChangeText={setLocation}
        />
      </View>

      {/* Relationship pills */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 10 }}>
          How do you know them?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {RELATIONSHIP_OPTIONS.map((option) => {
            const isSelected = relationshipContext === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRelationshipContext(option.value);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? COLORS.accent : (isDark ? "transparent" : COLORS.border),
                }}
              >
                <Text style={{ fontSize: 14, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Link to chat toggle - only show if showLinkOption is true */}
      {showLinkOption && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setLinkToChat(!linkToChat);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            paddingHorizontal: 14,
            backgroundColor: COLORS.surface,
            borderRadius: 10,
            marginBottom: 16,
            borderWidth: isDark ? 0 : 1,
            borderColor: COLORS.border,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 2 }}>
              Link to chat
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              Use this context to inform AI responses in chat
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: linkToChat ? COLORS.accent : COLORS.surfaceHover,
              justifyContent: "center",
              paddingHorizontal: 2,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#fff",
                alignSelf: linkToChat ? "flex-end" : "flex-start",
              }}
            />
          </View>
        </Pressable>
      )}

      {/* Search button */}
      <Pressable
        onPress={handleSave}
        disabled={!isFormValid}
        style={({ pressed }) => ({
          backgroundColor: isFormValid ? COLORS.accent : COLORS.buttonDisabled,
          paddingVertical: 16,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons
          name="search"
          size={18}
          color={isFormValid ? "#fff" : COLORS.textMuted}
        />
        <Text style={{
          fontSize: 16,
          fontWeight: "600",
          color: isFormValid ? "#fff" : COLORS.textMuted,
        }}>
          Search
        </Text>
      </Pressable>
    </View>
  );
});
