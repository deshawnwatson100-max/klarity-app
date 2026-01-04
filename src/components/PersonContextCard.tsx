import React, { useState, memo } from "react";
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
import { RelationshipContextType, ContextAnchorType } from "../types/personContext";

// ChatGPT-style colors - minimal, borderless
const COLORS = {
  background: "#1A1A1A",
  surface: "#000000",
  surfaceHover: "#1A1A1A",
  border: "transparent",
  text: "#ECECEC",
  textSecondary: "#B4B4B4",
  textMuted: "#8E8E8E",
  accent: "#10A37F",
  accentBg: "rgba(16, 163, 127, 0.15)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.15)",
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.15)",
};

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

const CONTEXT_ANCHOR_OPTIONS: {
  type: ContextAnchorType;
  label: string;
  placeholder: string;
}[] = [
  { type: "workplace", label: "Workplace or industry", placeholder: "e.g. Tech startup, Hospital" },
  { type: "school", label: "School", placeholder: "e.g. UCLA, Local high school" },
  { type: "dating_app", label: "Dating app you met on", placeholder: "e.g. Hinge, Bumble" },
  { type: "username", label: "Known username or handle", placeholder: "e.g. @handle" },
];

// Extracted input component to prevent re-renders
interface ChatBubbleInputProps {
  label: string;
  helperText: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
}

const ChatBubbleInput = memo(function ChatBubbleInput({
  label,
  helperText,
  placeholder,
  value,
  onChangeText,
  required = false,
}: ChatBubbleInputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
        {label}{required && <Text style={{ color: COLORS.textMuted }}> *</Text>}
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
        {helperText}
      </Text>
      <TextInput
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          color: COLORS.text,
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
});

interface PersonContextCardProps {
  onPersonContextCreated?: (personContextId: string) => void;
  onDismiss?: () => void;
}

export const PersonContextCard = memo(function PersonContextCard({
  onPersonContextCreated,
  onDismiss,
}: PersonContextCardProps) {
  const createPersonContext = usePersonContextStore((s) => s.createPersonContext);
  const setActiveLoopPersonContext = useLoopsStore((s) => s.setActiveLoopPersonContext);

  // Form state
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [location, setLocation] = useState("");
  const [selectedAnchorType, setSelectedAnchorType] = useState<ContextAnchorType | null>(null);
  const [anchorValue, setAnchorValue] = useState("");
  const [showBoost, setShowBoost] = useState(false);
  const [knownUsername, setKnownUsername] = useState("");
  const [approximateAge, setApproximateAge] = useState("");

  // Completed state
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savedRelationship, setSavedRelationship] = useState<RelationshipContextType | null>(null);

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
    } = {};

    if (location.trim()) {
      deepSearchContext.location = location.trim();
    }
    if (selectedAnchorType && anchorValue.trim()) {
      deepSearchContext.contextAnchor = {
        type: selectedAnchorType,
        value: anchorValue.trim(),
      };
    }
    if (knownUsername.trim()) {
      deepSearchContext.knownUsername = knownUsername.trim();
    }
    if (approximateAge.trim()) {
      deepSearchContext.approximateAge = approximateAge.trim();
    }

    const newId = createPersonContext(
      name.trim(),
      relationshipContext!,
      undefined,
      Object.keys(deepSearchContext).length > 0 ? deepSearchContext : undefined
    );

    setActiveLoopPersonContext(newId);

    // Save info for completed state display
    setSavedName(name.trim());
    setSavedRelationship(relationshipContext);
    setIsCompleted(true);

    onPersonContextCreated?.(newId);
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
                {relationshipLabel} · Context saved
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

  // Form view
  return (
    <View
      style={{
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.accentBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="person-add" size={16} color={COLORS.accent} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
            Add context
          </Text>
        </View>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* 1. Name (required) */}
      <ChatBubbleInput
        label="Name"
        helperText="Use the name they go by publicly."
        placeholder="Their name"
        value={name}
        onChangeText={setName}
        required
      />

      {/* Relationship (required) */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
          Relationship<Text style={{ color: COLORS.textMuted }}> *</Text>
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          How do you know them?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
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
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                }}
              >
                <Text style={{ fontSize: 13, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Location (optional) */}
      <ChatBubbleInput
        label="Location"
        helperText="City or area they are usually in."
        placeholder="e.g. Los Angeles, NYC"
        value={location}
        onChangeText={setLocation}
      />

      {/* 3. Context anchor (optional - select ONE) */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
          One detail that might help
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          Just one thing that could help narrow results.
        </Text>
        <View style={{ gap: 6 }}>
          {CONTEXT_ANCHOR_OPTIONS.map((option) => {
            const isSelected = selectedAnchorType === option.type;
            return (
              <Pressable
                key={option.type}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (isSelected) {
                    setSelectedAnchorType(null);
                    setAnchorValue("");
                  } else {
                    setSelectedAnchorType(option.type);
                  }
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                }}
              >
                <Text style={{ fontSize: 13, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Show input for selected anchor */}
        {selectedAnchorType && (
          <View style={{ marginTop: 10 }}>
            <TextInput
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: COLORS.text,
              }}
              placeholder={CONTEXT_ANCHOR_OPTIONS.find(o => o.type === selectedAnchorType)?.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={anchorValue}
              onChangeText={setAnchorValue}
            />
          </View>
        )}
      </View>

      {/* 4. Optional boost (collapsed by default) */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setShowBoost(!showBoost);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          marginBottom: showBoost ? 10 : 0,
        }}
      >
        <Ionicons
          name={showBoost ? "chevron-down" : "chevron-forward"}
          size={16}
          color={COLORS.textMuted}
        />
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 4 }}>
          Additional details (optional)
        </Text>
      </Pressable>

      {showBoost && (
        <View style={{ marginBottom: 16 }}>
          <ChatBubbleInput
            label="Known username"
            helperText="A handle you know they use."
            placeholder="@username"
            value={knownUsername}
            onChangeText={setKnownUsername}
          />
          <ChatBubbleInput
            label="Approximate age"
            helperText="A rough age range."
            placeholder="e.g. Late 20s, Mid 30s"
            value={approximateAge}
            onChangeText={setApproximateAge}
          />
        </View>
      )}

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={!isFormValid}
        style={({ pressed }) => ({
          backgroundColor: isFormValid ? COLORS.accent : COLORS.surface,
          paddingVertical: 14,
          borderRadius: 10,
          marginTop: 8,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{
          fontSize: 15,
          fontWeight: "600",
          color: isFormValid ? "#fff" : COLORS.textMuted,
          textAlign: "center"
        }}>
          Save
        </Text>
      </Pressable>
    </View>
  );
});
