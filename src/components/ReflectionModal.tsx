import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Modal } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

interface ReflectionModalProps {
  visible: boolean;
  entryTitle: string;
  onClose: () => void;
  onSave: (clarityScore: number, reflectionNotes: string) => void;
}

export function ReflectionModal({
  visible,
  entryTitle,
  onClose,
  onSave,
}: ReflectionModalProps) {
  const [clarityScore, setClarityScore] = useState(5);
  const [reflectionNotes, setReflectionNotes] = useState("");

  const handleSave = () => {
    onSave(clarityScore, reflectionNotes);
    // Reset form
    setClarityScore(5);
    setReflectionNotes("");
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/70 justify-center items-center px-6"
        onPress={onClose}
      >
        {/* Modal Card */}
        <Animated.View
          entering={FadeInUp.duration(300).springify()}
          className="w-full bg-neutral-900 rounded-3xl p-6 border border-neutral-800"
          style={{
            shadowColor: "#A855F7",
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            maxWidth: 400,
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <View className="w-10 h-10 bg-purple-500/20 rounded-full items-center justify-center">
                  <Ionicons name="bulb" size={20} color="#A855F7" />
                </View>
                <Text className="text-white text-xl font-semibold">
                  Add Reflection
                </Text>
              </View>
              <Pressable onPress={onClose} className="active:opacity-70">
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </Pressable>
            </View>

            {/* Event Title */}
            <View className="bg-neutral-800/50 rounded-xl p-3 mb-4">
              <Text className="text-neutral-400 text-xs mb-1">Event</Text>
              <Text className="text-white text-sm">{entryTitle}</Text>
            </View>

            {/* Clarity Score Slider */}
            <View className="mb-6">
              <Text className="text-neutral-300 text-sm font-medium mb-2">
                Clarity Score
              </Text>
              <Text className="text-neutral-500 text-xs mb-3">
                How clear do you feel about this situation now? (1-10)
              </Text>

              {/* Score Display */}
              <View className="flex-row items-center justify-center mb-2">
                <Text
                  className="text-5xl font-bold"
                  style={{
                    color:
                      clarityScore <= 3
                        ? "#F87171"
                        : clarityScore <= 6
                        ? "#FBBF24"
                        : "#34D399",
                  }}
                >
                  {clarityScore}
                </Text>
                <Text className="text-neutral-500 text-2xl ml-1">/10</Text>
              </View>

              {/* Slider */}
              <Slider
                value={clarityScore}
                onValueChange={setClarityScore}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor="#A855F7"
                maximumTrackTintColor="#374151"
                thumbTintColor="#A855F7"
                style={{ height: 40 }}
              />

              {/* Score Labels */}
              <View className="flex-row justify-between mt-1">
                <Text className="text-neutral-600 text-xs">Confused</Text>
                <Text className="text-neutral-600 text-xs">Very Clear</Text>
              </View>
            </View>

            {/* Reflection Notes */}
            <View className="mb-6">
              <Text className="text-neutral-300 text-sm font-medium mb-2">
                Outcome Summary
              </Text>
              <Text className="text-neutral-500 text-xs mb-3">
                What happened? How did it turn out?
              </Text>

              <TextInput
                value={reflectionNotes}
                onChangeText={setReflectionNotes}
                placeholder="e.g., We talked it through and agreed to check in weekly..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
                className="bg-neutral-950 border border-neutral-700 rounded-xl p-4 text-white text-sm"
                style={{
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={onClose}
                className="flex-1 bg-neutral-800 rounded-xl py-3 items-center active:opacity-70"
              >
                <Text className="text-neutral-400 text-base font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                className="flex-1 bg-purple-600 rounded-xl py-3 items-center active:opacity-70"
                style={{
                  shadowColor: "#A855F7",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <Text className="text-white text-base font-semibold">
                  Save Reflection
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
