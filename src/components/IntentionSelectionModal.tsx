import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IntentionType, INTENTIONS } from "../types/calendar";

interface IntentionSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIntention: (intention: IntentionType, reflectionNotes?: string) => void;
}

export function IntentionSelectionModal({
  visible,
  onClose,
  onSelectIntention,
}: IntentionSelectionModalProps) {
  const [selectedIntention, setSelectedIntention] = useState<IntentionType | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionNotes, setReflectionNotes] = useState("");

  const handleIntentionPress = (intention: IntentionType) => {
    setSelectedIntention(intention);
    setShowReflection(true);
  };

  const handleContinue = () => {
    if (selectedIntention) {
      onSelectIntention(selectedIntention, reflectionNotes || undefined);
      // Reset state
      setSelectedIntention(null);
      setShowReflection(false);
      setReflectionNotes("");
      onClose();
    }
  };

  const handleSkipReflection = () => {
    if (selectedIntention) {
      onSelectIntention(selectedIntention, undefined);
      // Reset state
      setSelectedIntention(null);
      setShowReflection(false);
      setReflectionNotes("");
      onClose();
    }
  };

  const handleBack = () => {
    setShowReflection(false);
    setReflectionNotes("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/90 justify-end">
        <View className="bg-[#0A0A0A] rounded-t-3xl border-t border-neutral-800" style={{ maxHeight: "80%" }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-5 border-b border-neutral-900">
            <Text className="text-white text-xl font-bold">
              {showReflection ? "Add Reflection (Optional)" : "Your Relationship Intention"}
            </Text>
            <Pressable onPress={onClose} className="active:opacity-60">
              <Ionicons name="close" size={28} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-6 py-6"
            showsVerticalScrollIndicator={false}
          >
            {!showReflection ? (
              <>
                {/* Subtitle */}
                <Text className="text-neutral-400 text-base mb-6">
                  This helps us track your emotional journey and provide better
                  guidance.
                </Text>

                {/* Intention Options */}
                <View className="gap-4">
                  {(Object.entries(INTENTIONS) as [IntentionType, typeof INTENTIONS[IntentionType]][]).map(
                    ([key, config]) => (
                      <Pressable
                        key={key}
                        onPress={() => handleIntentionPress(key)}
                        className="active:opacity-80"
                      >
                        <View
                          style={{
                            borderColor: config.color,
                            shadowColor: config.color,
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                            elevation: 5,
                          }}
                          className="bg-neutral-950 border-2 rounded-2xl p-5"
                        >
                          <View className="flex-row items-center mb-2">
                            <View
                              style={{
                                backgroundColor: config.color,
                                shadowColor: config.color,
                                shadowOpacity: 0.6,
                                shadowRadius: 8,
                              }}
                              className="w-12 h-12 rounded-full items-center justify-center mr-4"
                            >
                              <Ionicons
                                name={
                                  key === "improve"
                                    ? "arrow-up"
                                    : key === "distance"
                                    ? "remove"
                                    : key === "maintain"
                                    ? "pause"
                                    : "eye"
                                }
                                size={24}
                                color="#000"
                              />
                            </View>
                            <Text
                              style={{ color: config.color }}
                              className="text-xl font-bold"
                            >
                              {config.label}
                            </Text>
                          </View>
                          <Text className="text-neutral-300 text-base leading-6">
                            {config.description}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  )}
                </View>
              </>
            ) : (
              <>
                {/* Reflection Input */}
                <Text className="text-neutral-400 text-base mb-4">
                  How are you feeling about this situation? (Optional)
                </Text>

                <TextInput
                  value={reflectionNotes}
                  onChangeText={setReflectionNotes}
                  placeholder="I felt calmer after this conversation..."
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={6}
                  className="bg-neutral-950 border border-neutral-800 text-white rounded-2xl p-4 text-base mb-6"
                  style={{ minHeight: 150, textAlignVertical: "top" }}
                />

                {/* Action Buttons */}
                <View className="gap-3">
                  <Pressable
                    onPress={handleContinue}
                    className="bg-[#B4FF39] rounded-xl py-4 items-center active:opacity-80"
                  >
                    <Text className="text-black text-base font-bold">
                      Save to Calendar
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSkipReflection}
                    className="bg-neutral-900 rounded-xl py-4 items-center active:opacity-80"
                  >
                    <Text className="text-white text-base font-semibold">
                      Skip Reflection
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleBack}
                    className="py-3 items-center active:opacity-60"
                  >
                    <Text className="text-neutral-500 text-sm font-medium">
                      Back
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
