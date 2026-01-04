import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Keyboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  usePersonContextStore,
} from "../state/personContextStore";
import {
  useLoopsStore,
  useActiveLoopPersonContextId,
  useActiveLoopPersonContextPaused,
} from "../state/loopsStore";
import { RelationshipContextType, ContextAnchorType } from "../types/personContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

type ModalStep = "input" | "view_saved";

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

interface PersonContextModalProps {
  visible: boolean;
  onClose: () => void;
  onPersonContextCreated?: (personContextId: string) => void;
}

export function PersonContextModal({
  visible,
  onClose,
  onPersonContextCreated,
}: PersonContextModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const createPersonContext = usePersonContextStore((s) => s.createPersonContext);
  const deletePersonContext = usePersonContextStore((s) => s.deletePersonContext);
  const getNonArchivedContexts = usePersonContextStore((s) => s.getNonArchivedContexts);
  const getPersonContextById = usePersonContextStore((s) => s.getPersonContextById);

  const activeLoopPersonContextId = useActiveLoopPersonContextId();
  const isContextPaused = useActiveLoopPersonContextPaused();
  const setActiveLoopPersonContext = useLoopsStore((s) => s.setActiveLoopPersonContext);
  const toggleActiveLoopPersonContextPause = useLoopsStore((s) => s.toggleActiveLoopPersonContextPause);
  const clearActiveLoopPersonContext = useLoopsStore((s) => s.clearActiveLoopPersonContext);

  const activePersonContext = activeLoopPersonContextId
    ? getPersonContextById(activeLoopPersonContextId)
    : null;

  const [step, setStep] = useState<ModalStep>("input");

  // Form state
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [location, setLocation] = useState("");
  const [selectedAnchorType, setSelectedAnchorType] = useState<ContextAnchorType | null>(null);
  const [anchorValue, setAnchorValue] = useState("");
  const [showBoost, setShowBoost] = useState(false);
  const [knownUsername, setKnownUsername] = useState("");
  const [approximateAge, setApproximateAge] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (activePersonContext) {
        setStep("view_saved");
      } else {
        setStep("input");
        resetForm();
      }
    }
  }, [visible, activePersonContext?.id]);

  const resetForm = () => {
    setName("");
    setRelationshipContext(null);
    setLocation("");
    setSelectedAnchorType(null);
    setAnchorValue("");
    setShowBoost(false);
    setKnownUsername("");
    setApproximateAge("");
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const isFormValid = name.trim().length > 0 && relationshipContext !== null;

  const handleSave = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
    resetForm();
    handleClose();
    onPersonContextCreated?.(newId);
  };

  const handleSwitchPerson = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearActiveLoopPersonContext();
    setStep("input");
    resetForm();
  };

  const handleClear = () => {
    if (!activePersonContext) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!activePersonContext) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deletePersonContext(activePersonContext.id);
    setShowDeleteConfirm(false);
    setStep("input");
    resetForm();
  };

  // Chat bubble style input component
  const ChatBubbleInput = ({
    label,
    helperText,
    placeholder,
    value,
    onChangeText,
    autoFocus = false,
    required = false,
  }: {
    label: string;
    helperText: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    autoFocus?: boolean;
    required?: boolean;
  }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
        {label}{required && <Text style={{ color: COLORS.textMuted }}> *</Text>}
      </Text>
      <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 10 }}>
        {helperText}
      </Text>
      <TextInput
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: COLORS.text,
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
    </View>
  );

  // Input step - collect Deep Search context
  const renderInputStep = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>
          Add context
        </Text>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* 1. Name (required) */}
        <ChatBubbleInput
          label="Name"
          helperText="Use the name they go by publicly."
          placeholder="Their name"
          value={name}
          onChangeText={setName}
          autoFocus
          required
        />

        {/* Relationship (required) */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
            Relationship<Text style={{ color: COLORS.textMuted }}> *</Text>
          </Text>
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

        {/* 2. Location (optional) */}
        <ChatBubbleInput
          label="Location"
          helperText="City or area they are usually in."
          placeholder="e.g. Los Angeles, NYC"
          value={location}
          onChangeText={setLocation}
        />

        {/* 3. Context anchor (optional - select ONE) */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
            One detail that might help
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 10 }}>
            Just one thing that could help narrow results.
          </Text>
          <View style={{ gap: 8 }}>
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
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                  }}
                >
                  <Text style={{ fontSize: 14, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Show input for selected anchor */}
          {selectedAnchorType && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: COLORS.text,
                }}
                placeholder={CONTEXT_ANCHOR_OPTIONS.find(o => o.type === selectedAnchorType)?.placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={anchorValue}
                onChangeText={setAnchorValue}
                autoFocus
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
            paddingVertical: 12,
            marginBottom: showBoost ? 12 : 0,
          }}
        >
          <Ionicons
            name={showBoost ? "chevron-down" : "chevron-forward"}
            size={18}
            color={COLORS.textMuted}
          />
          <Text style={{ fontSize: 14, color: COLORS.textMuted, marginLeft: 6 }}>
            Additional details (optional)
          </Text>
        </Pressable>

        {showBoost && (
          <View style={{ marginBottom: 20 }}>
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
            paddingVertical: 16,
            borderRadius: 12,
            marginTop: 12,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: "600",
            color: isFormValid ? "#fff" : COLORS.textMuted,
            textAlign: "center"
          }}>
            Save
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  // View saved
  const renderViewSavedStep = () => {
    if (!activePersonContext) return null;

    const relationshipLabel = RELATIONSHIP_OPTIONS.find(
      (r) => r.value === activePersonContext.relationshipContext
    )?.label || activePersonContext.relationshipContext;

    const anchorLabel = activePersonContext.contextAnchor
      ? CONTEXT_ANCHOR_OPTIONS.find(o => o.type === activePersonContext.contextAnchor?.type)?.label
      : null;

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>
            Active context
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Pause toggle */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: isContextPaused ? COLORS.warningBg : COLORS.surface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 14, color: isContextPaused ? COLORS.warning : COLORS.textSecondary }}>
              {isContextPaused ? "Paused" : "Active"}
            </Text>
            <Switch
              value={!isContextPaused}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleActiveLoopPersonContextPause();
              }}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor="#fff"
            />
          </View>

          {/* Person card */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 18,
            opacity: isContextPaused ? 0.6 : 1,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: COLORS.accentBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}>
                <Ionicons name="person" size={22} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: COLORS.text }}>
                  {activePersonContext.name}
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 2 }}>
                  {relationshipLabel}
                </Text>
              </View>
            </View>

            {/* Context details */}
            {(activePersonContext.location || activePersonContext.contextAnchor || activePersonContext.knownUsername || activePersonContext.approximateAge) && (
              <View style={{ marginTop: 8 }}>
                {activePersonContext.location && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 }}>
                      {activePersonContext.location}
                    </Text>
                  </View>
                )}
                {activePersonContext.contextAnchor && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 }}>
                      {anchorLabel}: {activePersonContext.contextAnchor.value}
                    </Text>
                  </View>
                )}
                {activePersonContext.knownUsername && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="at-outline" size={14} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 }}>
                      {activePersonContext.knownUsername}
                    </Text>
                  </View>
                )}
                {activePersonContext.approximateAge && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 }}>
                      {activePersonContext.approximateAge}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={handleSwitchPerson}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: pressed ? COLORS.surfaceHover : COLORS.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, color: COLORS.textSecondary }}>Switch</Text>
            </Pressable>
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: pressed ? COLORS.errorBg : COLORS.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, color: COLORS.error }}>Remove</Text>
            </Pressable>
          </View>

          {/* Other saved */}
          {getNonArchivedContexts().length > 1 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>
                Other saved
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {getNonArchivedContexts()
                  .filter((pc) => pc.id !== activePersonContext.id)
                  .map((pc) => (
                    <Pressable
                      key={pc.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setActiveLoopPersonContext(pc.id);
                      }}
                      style={{
                        backgroundColor: COLORS.surface,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{pc.name}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case "input": return renderInputStep();
      case "view_saved": return renderViewSavedStep();
      default: return renderInputStep();
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, justifyContent: "flex-end" }} onPress={handleClose}>
            <Animated.View
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                opacity: fadeAnim,
              }}
            />
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={{
                  backgroundColor: COLORS.background,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingTop: 8,
                  paddingHorizontal: 20,
                  paddingBottom: Platform.OS === "ios" ? 34 : 24,
                  minHeight: 400,
                  maxHeight: "90%",
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {/* Handle */}
                <View style={{ alignItems: "center", paddingVertical: 10 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted }} />
                </View>
                <View style={{ flex: 1 }}>
                  {renderStep()}
                </View>
              </Animated.View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: COLORS.background, borderRadius: 16, width: "100%", maxWidth: 320, padding: 24 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: COLORS.text, textAlign: "center", marginBottom: 8 }}>
              Remove {activePersonContext?.name}?
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: 24 }}>
              This will delete all saved context.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, color: COLORS.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.errorBg, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.error }}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
