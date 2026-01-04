import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  usePersonContextStore,
  useActivePersonContext,
} from "../state/personContextStore";
import { RelationshipContextType } from "../types/personContext";

/**
 * Modal step state machine
 */
type ModalStep = "basics" | "context_chips" | "view_saved";

/**
 * Goal options for step 1
 */
const GOAL_OPTIONS = [
  { id: "feel_steady", label: "Feel steady" },
  { id: "make_decision", label: "Make a decision" },
  { id: "handle_conflict", label: "Handle conflict" },
  { id: "set_boundary", label: "Set a boundary" },
  { id: "improve_things", label: "Improve things" },
  { id: "other", label: "Other" },
] as const;

type GoalOption = (typeof GOAL_OPTIONS)[number]["id"];

/**
 * Relationship type options
 */
const RELATIONSHIP_OPTIONS: {
  value: RelationshipContextType;
  label: string;
  subLabel?: string;
}[] = [
  { value: "dating", label: "Dating" },
  { value: "romantic", label: "Romantic partner" },
  { value: "work", label: "Work", subLabel: "manager / peer / client" },
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

/**
 * Context chips for step 2
 */
const CONTEXT_CHIPS = [
  { id: "power_imbalance", label: "Power imbalance" },
  { id: "boundary_concerns", label: "Boundary concerns" },
  { id: "communication_unclear", label: "Communication feels unclear" },
  { id: "reputation_concerns", label: "Reputation concerns" },
  { id: "past_issues", label: "Past issues (legal/professional)" },
  { id: "mostly_positive", label: "Mostly positive" },
  { id: "not_sure", label: "I'm not sure yet" },
] as const;

type ContextChipId = (typeof CONTEXT_CHIPS)[number]["id"];

interface PersonContextModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PersonContextModal({
  visible,
  onClose,
}: PersonContextModalProps) {
  // Store hooks
  const activePersonContext = useActivePersonContext();
  const createPersonContext = usePersonContextStore(
    (s) => s.createPersonContext
  );
  const addNote = usePersonContextStore((s) => s.addNote);
  const setActivePersonContext = usePersonContextStore(
    (s) => s.setActivePersonContext
  );
  const clearActivePersonContext = usePersonContextStore(
    (s) => s.clearActivePersonContext
  );
  const getNonArchivedContexts = usePersonContextStore(
    (s) => s.getNonArchivedContexts
  );

  // Local state
  const [step, setStep] = useState<ModalStep>("basics");
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] =
    useState<RelationshipContextType | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null);
  const [selectedChips, setSelectedChips] = useState<Set<ContextChipId>>(
    new Set()
  );
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Determine initial step based on active context
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
    setSelectedGoal(null);
    setSelectedChips(new Set());
    setAdditionalNotes("");
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Step 1 validation
  const isStep1Valid = name.trim().length > 0 && relationshipContext !== null;

  // Handle next from step 1
  const handleNextToChips = () => {
    if (!isStep1Valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("context_chips");
  };

  // Handle create context
  const handleCreateContext = () => {
    if (!isStep1Valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build user intent from goal
    const goalLabel = selectedGoal
      ? GOAL_OPTIONS.find((g) => g.id === selectedGoal)?.label
      : undefined;

    // Create the person context
    const newId = createPersonContext(
      name.trim(),
      relationshipContext!,
      goalLabel
    );

    // Add notes from chips and additional text
    const chipLabels = Array.from(selectedChips)
      .map((chipId) => CONTEXT_CHIPS.find((c) => c.id === chipId)?.label)
      .filter(Boolean);

    if (chipLabels.length > 0) {
      addNote(newId, `Keep in mind: ${chipLabels.join(", ")}`);
    }

    if (additionalNotes.trim()) {
      addNote(newId, additionalNotes.trim());
    }

    // Set as active
    setActivePersonContext(newId);

    // Reset and close
    resetForm();
    handleClose();
  };

  // Handle chip toggle
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

  // Handle switch person
  const handleSwitchPerson = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearActivePersonContext();
    setStep("basics");
    resetForm();
  };

  // Handle edit (for now, just switch - full edit can be added later)
  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("basics");
  };

  // Handle clear/remove
  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearActivePersonContext();
    setStep("basics");
    resetForm();
  };

  // Render Step 1: Basics
  const renderBasicsStep = () => (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#F9FAFB" }}>
            Add someone
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            This helps Klarity respond with more clarity.
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Name Input */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8,
            }}
          >
            Name or nickname
          </Text>
          <TextInput
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: "#E5E7EB",
              borderWidth: 1,
              borderColor: name.trim()
                ? "rgba(99, 102, 241, 0.4)"
                : "rgba(255, 255, 255, 0.08)",
            }}
            placeholder="e.g. Alex, Mom, Manager..."
            placeholderTextColor="#4B5563"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* Relationship Context */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 10,
            }}
          >
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
                    borderRadius: 10,
                    backgroundColor: isSelected
                      ? "rgba(99, 102, 241, 0.15)"
                      : "rgba(255, 255, 255, 0.04)",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "rgba(99, 102, 241, 0.5)"
                      : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? "600" : "400",
                      color: isSelected ? "#818CF8" : "#9CA3AF",
                    }}
                  >
                    {option.label}
                  </Text>
                  {option.subLabel && (
                    <Text
                      style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}
                    >
                      {option.subLabel}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Goal (Optional) */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 4,
            }}
          >
            What are you hoping for?
          </Text>
          <Text style={{ fontSize: 12, color: "#4B5563", marginBottom: 10 }}>
            Optional - helps guide responses
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = selectedGoal === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedGoal(isSelected ? null : goal.id);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: isSelected
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(255, 255, 255, 0.03)",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "rgba(16, 185, 129, 0.4)"
                      : "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? "500" : "400",
                      color: isSelected ? "#34D399" : "#6B7280",
                    }}
                  >
                    {goal.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Next Button */}
        <Pressable
          onPress={handleNextToChips}
          disabled={!isStep1Valid}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isStep1Valid
              ? "rgba(99, 102, 241, 0.2)"
              : "rgba(255, 255, 255, 0.05)",
            paddingVertical: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isStep1Valid
              ? "rgba(99, 102, 241, 0.4)"
              : "rgba(255, 255, 255, 0.06)",
            marginTop: 28,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: isStep1Valid ? "#818CF8" : "#4B5563",
            }}
          >
            Continue
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isStep1Valid ? "#818CF8" : "#4B5563"}
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      </ScrollView>
    </Animated.View>
  );

  // Render Step 2: Context Chips
  const renderContextChipsStep = () => (
    <Animated.View
      entering={SlideInRight.duration(250)}
      exiting={SlideOutLeft.duration(200)}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep("basics");
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 12 })}
          >
            <Ionicons name="chevron-back" size={24} color="#6B7280" />
          </Pressable>
          <View>
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: "#F9FAFB" }}
            >
              Anything to keep in mind?
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              Select any that apply
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Context Chips */}
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 }}
        >
          {CONTEXT_CHIPS.map((chip) => {
            const isSelected = selectedChips.has(chip.id);
            return (
              <Pressable
                key={chip.id}
                onPress={() => toggleChip(chip.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? "rgba(99, 102, 241, 0.12)"
                    : "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: isSelected
                    ? "rgba(99, 102, 241, 0.4)"
                    : "rgba(255, 255, 255, 0.08)",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#818CF8"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected ? "500" : "400",
                    color: isSelected ? "#818CF8" : "#9CA3AF",
                  }}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Additional Notes */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8,
            }}
          >
            Anything else?
          </Text>
          <TextInput
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 15,
              color: "#E5E7EB",
              borderWidth: 1,
              borderColor: additionalNotes.trim()
                ? "rgba(99, 102, 241, 0.3)"
                : "rgba(255, 255, 255, 0.06)",
              minHeight: 80,
              textAlignVertical: "top",
            }}
            placeholder="Add any context that might help..."
            placeholderTextColor="#4B5563"
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Create Button */}
        <Pressable
          onPress={handleCreateContext}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            paddingVertical: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(99, 102, 241, 0.4)",
            marginTop: 28,
          }}
        >
          <Ionicons
            name="person-add-outline"
            size={18}
            color="#818CF8"
            style={{ marginRight: 8 }}
          />
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#818CF8" }}>
            Create context card
          </Text>
        </Pressable>

        {/* Skip option */}
        <Pressable
          onPress={handleCreateContext}
          style={{ alignItems: "center", marginTop: 14 }}
        >
          <Text style={{ fontSize: 14, color: "#6B7280" }}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );

  // Render View Saved Person
  const renderViewSavedStep = () => {
    if (!activePersonContext) return null;

    const relationshipLabel =
      RELATIONSHIP_OPTIONS.find(
        (r) => r.value === activePersonContext.relationshipContext
      )?.label || activePersonContext.relationshipContext;

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#F9FAFB" }}>
            Active context
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        {/* Person Card */}
        <View
          style={{
            backgroundColor: "rgba(99, 102, 241, 0.08)",
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: "rgba(99, 102, 241, 0.2)",
          }}
        >
          {/* Name & Relationship */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(99, 102, 241, 0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="person-circle" size={26} color="#818CF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: "#F9FAFB" }}
              >
                {activePersonContext.name}
              </Text>
              <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 2 }}>
                {relationshipLabel}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#34D399" />
          </View>

          {/* User Intent */}
          {activePersonContext.userIntent && (
            <View
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: "#34D399" }}>
                Goal: {activePersonContext.userIntent}
              </Text>
            </View>
          )}

          {/* Notes Preview */}
          {activePersonContext.notes.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text
                style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}
              >
                Notes
              </Text>
              {activePersonContext.notes.slice(0, 2).map((note) => (
                <Text
                  key={note.id}
                  style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}
                  numberOfLines={2}
                >
                  • {note.content}
                </Text>
              ))}
              {activePersonContext.notes.length > 2 && (
                <Text
                  style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}
                >
                  +{activePersonContext.notes.length - 2} more
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Helper text */}
        <Text
          style={{
            fontSize: 13,
            color: "#6B7280",
            textAlign: "center",
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Klarity will keep this context in mind during your conversation.
        </Text>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          {/* Switch Person */}
          <Pressable
            onPress={handleSwitchPerson}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Ionicons
              name="swap-horizontal"
              size={16}
              color="#9CA3AF"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: "#9CA3AF" }}
            >
              Switch
            </Text>
          </Pressable>

          {/* Edit */}
          <Pressable
            onPress={handleEdit}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Ionicons
              name="pencil"
              size={16}
              color="#9CA3AF"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: "#9CA3AF" }}
            >
              Edit
            </Text>
          </Pressable>

          {/* Clear */}
          <Pressable
            onPress={handleClear}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.2)",
            }}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color="#F87171"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: "#F87171" }}
            >
              Clear
            </Text>
          </Pressable>
        </View>

        {/* Existing Saved People (if any) */}
        {getNonArchivedContexts().length > 1 && (
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#9CA3AF",
                marginBottom: 10,
              }}
            >
              Other saved people
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getNonArchivedContexts()
                .filter((pc) => pc.id !== activePersonContext.id)
                .map((pc) => (
                  <Pressable
                    key={pc.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActivePersonContext(pc.id);
                    }}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                      {pc.name}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render current step
  const renderStep = () => {
    switch (step) {
      case "basics":
        return renderBasicsStep();
      case "context_chips":
        return renderContextChipsStep();
      case "view_saved":
        return renderViewSavedStep();
      default:
        return renderBasicsStep();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end" }}
          onPress={handleClose}
        >
          {/* Backdrop */}
          {visible && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              }}
            />
          )}

          {/* Modal Content */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={SlideInDown.duration(300).springify().damping(20)}
              exiting={SlideOutDown.duration(200)}
              style={{
                backgroundColor: "#0D0E10",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: Platform.OS === "ios" ? 34 : 24,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.06)",
                maxHeight: "85%",
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  }}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, flexGrow: 1 }}
              >
                {renderStep()}
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
