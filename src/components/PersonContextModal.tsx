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
import { RelationshipContextType } from "../types/personContext";

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

type ModalStep = "basics" | "context_chips" | "view_saved";

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

const CONTEXT_CHIPS = [
  { id: "power_imbalance", label: "Power imbalance" },
  { id: "boundary_concerns", label: "Boundary concerns" },
  { id: "communication_unclear", label: "Unclear communication" },
  { id: "mostly_positive", label: "Mostly positive" },
  { id: "not_sure", label: "Not sure yet" },
] as const;

type ContextChipId = (typeof CONTEXT_CHIPS)[number]["id"];

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
  const addNote = usePersonContextStore((s) => s.addNote);
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

  const [step, setStep] = useState<ModalStep>("basics");
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [selectedChips, setSelectedChips] = useState<Set<ContextChipId>>(new Set());
  const [additionalNotes, setAdditionalNotes] = useState("");
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
        setStep("basics");
        resetForm();
      }
    }
  }, [visible, activePersonContext?.id]);

  const resetForm = () => {
    setName("");
    setRelationshipContext(null);
    setSelectedChips(new Set());
    setAdditionalNotes("");
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const isStep1Valid = name.trim().length > 0 && relationshipContext !== null;

  const handleNextToChips = () => {
    if (!isStep1Valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("context_chips");
  };

  const handleCreateContext = () => {
    if (!isStep1Valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newId = createPersonContext(name.trim(), relationshipContext!, undefined);

    const chipLabels = Array.from(selectedChips)
      .map((chipId) => CONTEXT_CHIPS.find((c) => c.id === chipId)?.label)
      .filter(Boolean);

    if (chipLabels.length > 0) {
      addNote(newId, `Context: ${chipLabels.join(", ")}`);
    }

    if (additionalNotes.trim()) {
      addNote(newId, additionalNotes.trim());
    }

    setActiveLoopPersonContext(newId);
    resetForm();
    handleClose();
    onPersonContextCreated?.(newId);
  };

  const toggleChip = (chipId: ContextChipId) => {
    Haptics.selectionAsync();
    setSelectedChips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chipId)) {
        newSet.delete(chipId);
      } else {
        newSet.add(chipId);
      }
      return newSet;
    });
  };

  const handleSwitchPerson = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearActiveLoopPersonContext();
    setStep("basics");
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
    setStep("basics");
    resetForm();
  };

  // Step 1: Basics
  const renderBasicsStep = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>
          Add someone
        </Text>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Name */}
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>
          Name
        </Text>
        <TextInput
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: COLORS.text,
          }}
          placeholder="Their name or nickname"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Relationship */}
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 20, marginBottom: 10 }}>
          Relationship
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
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
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

        {/* Continue */}
        <Pressable
          onPress={handleNextToChips}
          disabled={!isStep1Valid}
          style={({ pressed }) => ({
            backgroundColor: isStep1Valid ? COLORS.accent : COLORS.surface,
            paddingVertical: 14,
            borderRadius: 8,
            marginTop: 28,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: "500", color: isStep1Valid ? "#fff" : COLORS.textMuted, textAlign: "center" }}>
            Continue
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  // Step 2: Context chips
  const renderContextChipsStep = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
        <Pressable onPress={() => setStep("basics")} hitSlop={12} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textMuted} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text, flex: 1 }}>
          Anything to note?
        </Text>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>
          Optional - helps with context
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CONTEXT_CHIPS.map((chip) => {
            const isSelected = selectedChips.has(chip.id);
            return (
              <Pressable
                key={chip.id}
                onPress={() => toggleChip(chip.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                }}
              >
                <Text style={{ fontSize: 14, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Additional notes */}
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 20, marginBottom: 8 }}>
          Anything else?
        </Text>
        <TextInput
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: COLORS.text,
            minHeight: 80,
            textAlignVertical: "top",
          }}
          placeholder="Add any details..."
          placeholderTextColor={COLORS.textMuted}
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
          multiline
        />

        {/* Create */}
        <Pressable
          onPress={handleCreateContext}
          style={({ pressed }) => ({
            backgroundColor: COLORS.accent,
            paddingVertical: 14,
            borderRadius: 8,
            marginTop: 24,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: "500", color: "#fff", textAlign: "center" }}>
            Done
          </Text>
        </Pressable>

        <Pressable onPress={handleCreateContext} style={{ paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: COLORS.textMuted }}>Skip</Text>
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
            borderRadius: 8,
            padding: 12,
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
            borderRadius: 12,
            padding: 16,
            opacity: isContextPaused ? 0.6 : 1,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.accentBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}>
                <Ionicons name="person" size={20} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "500", color: COLORS.text }}>
                  {activePersonContext.name}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                  {relationshipLabel}
                </Text>
              </View>
            </View>

            {activePersonContext.notes.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12 }}>
                {activePersonContext.notes.slice(0, 2).map((note) => (
                  <Text key={note.id} style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }} numberOfLines={1}>
                    {note.content}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={handleSwitchPerson}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: pressed ? COLORS.surfaceHover : COLORS.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Switch</Text>
            </Pressable>
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: pressed ? COLORS.errorBg : COLORS.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 14, color: COLORS.error }}>Remove</Text>
            </Pressable>
          </View>

          {/* Other saved */}
          {getNonArchivedContexts().length > 1 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 10 }}>
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
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 8,
                        marginRight: 8,
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
      case "basics": return renderBasicsStep();
      case "context_chips": return renderContextChipsStep();
      case "view_saved": return renderViewSavedStep();
      default: return renderBasicsStep();
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
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingTop: 8,
                  paddingHorizontal: 20,
                  paddingBottom: Platform.OS === "ios" ? 34 : 24,
                  minHeight: 400,
                  maxHeight: "85%",
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {/* Handle */}
                <View style={{ alignItems: "center", paddingVertical: 8 }}>
                  <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted }} />
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
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: COLORS.background, borderRadius: 12, width: "100%", maxWidth: 320, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, textAlign: "center", marginBottom: 8 }}>
              Remove {activePersonContext?.name}?
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: 20 }}>
              This will delete all associated notes.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.errorBg, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.error }}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
