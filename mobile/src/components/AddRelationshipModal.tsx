import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useLoopsStore } from "../state/loopsStore";
import { RelationshipType } from "../types/loop";

interface AddRelationshipModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (relationshipId: string) => void;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; icon: string }[] = [
  { value: "family", label: "Family", icon: "people" },
  { value: "romantic", label: "Romantic", icon: "heart" },
  { value: "friend", label: "Friend", icon: "cafe" },
  { value: "work", label: "Work", icon: "briefcase" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

export function AddRelationshipModal({
  visible,
  onClose,
  onCreated,
}: AddRelationshipModalProps) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<RelationshipType | undefined>(undefined);
  const [note, setNote] = useState("");

  const createRelationship = useLoopsStore((s) => s.createRelationship);
  const trackedRelationships = useLoopsStore((s) => s.trackedRelationships);

  const handleSave = () => {
    if (!name.trim()) return;

    Keyboard.dismiss();

    // Check for duplicate name
    const existingRelationship = trackedRelationships.find(
      (rel) => rel.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingRelationship) {
      // Could show an error, but for now just close
      onClose();
      return;
    }

    const relationshipId = createRelationship(
      name.trim(),
      selectedType,
      note.trim() || undefined
    );

    // Reset form
    setName("");
    setSelectedType(undefined);
    setNote("");

    onCreated?.(relationshipId);
    onClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setName("");
    setSelectedType(undefined);
    setNote("");
    onClose();
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable
          className="flex-1 justify-end"
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
                shadowColor: "#A78BFA",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 20,
              }}
            >
              {/* Handle */}
              <View className="items-center pt-3 pb-2">
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
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text
                    className="text-xl font-semibold"
                    style={{ color: "#F9FAFB" }}
                  >
                    Add Relationship
                  </Text>
                  <Pressable
                    onPress={handleClose}
                    className="active:opacity-60"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>

                {/* Name Input */}
                <View className="mb-5">
                  <Text
                    className="text-sm font-medium mb-2"
                    style={{ color: "#9CA3AF" }}
                  >
                    Name or Label
                  </Text>
                  <TextInput
                    className="text-base px-4 py-3.5 rounded-xl"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#E5E7EB",
                      borderWidth: 1,
                      borderColor: name.trim()
                        ? "rgba(167, 139, 250, 0.3)"
                        : "rgba(255, 255, 255, 0.08)",
                    }}
                    placeholder="Mom, Manager, Alex..."
                    placeholderTextColor="#4B5563"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    returnKeyType="next"
                  />
                </View>

                {/* Relationship Type Selector */}
                <View className="mb-5">
                  <Text
                    className="text-sm font-medium mb-3"
                    style={{ color: "#9CA3AF" }}
                  >
                    Relationship Type
                    <Text style={{ color: "#6B7280" }}> (optional)</Text>
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {RELATIONSHIP_TYPES.map((type) => {
                      const isSelected = selectedType === type.value;
                      return (
                        <Pressable
                          key={type.value}
                          onPress={() =>
                            setSelectedType(isSelected ? undefined : type.value)
                          }
                          className="active:opacity-70"
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: isSelected
                              ? "rgba(167, 139, 250, 0.15)"
                              : "rgba(255, 255, 255, 0.04)",
                            borderWidth: 1,
                            borderColor: isSelected
                              ? "rgba(167, 139, 250, 0.4)"
                              : "rgba(255, 255, 255, 0.06)",
                          }}
                        >
                          <Ionicons
                            name={type.icon as any}
                            size={16}
                            color={isSelected ? "#A78BFA" : "#6B7280"}
                          />
                          <Text
                            className="ml-2 text-sm font-medium"
                            style={{ color: isSelected ? "#A78BFA" : "#9CA3AF" }}
                          >
                            {type.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Note Input */}
                <View className="mb-6">
                  <Text
                    className="text-sm font-medium mb-2"
                    style={{ color: "#9CA3AF" }}
                  >
                    Short Note
                    <Text style={{ color: "#6B7280" }}> (optional)</Text>
                  </Text>
                  <TextInput
                    className="text-base px-4 py-3.5 rounded-xl"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#E5E7EB",
                      borderWidth: 1,
                      borderColor: note.trim()
                        ? "rgba(167, 139, 250, 0.2)"
                        : "rgba(255, 255, 255, 0.08)",
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                    placeholder="What usually causes tension here?"
                    placeholderTextColor="#4B5563"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                </View>

                {/* Save Button */}
                <Pressable
                  onPress={handleSave}
                  disabled={!isValid}
                  className="active:opacity-80"
                  style={{
                    backgroundColor: isValid
                      ? "rgba(167, 139, 250, 0.2)"
                      : "rgba(255, 255, 255, 0.05)",
                    paddingVertical: 16,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isValid
                      ? "rgba(167, 139, 250, 0.3)"
                      : "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <Text
                    className="text-center text-base font-semibold"
                    style={{ color: isValid ? "#A78BFA" : "#4B5563" }}
                  >
                    Save Relationship
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
