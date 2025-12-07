import React, { useState, useRef } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Audio } from "expo-av";

interface InlineContextInputProps {
  onSubmit: (context: string, isVoice: boolean) => void;
  onCancel?: () => void;
  selectedIntention?: "improve" | "distance" | "maintain" | "clarity";
}

export function InlineContextInput({
  onSubmit,
  onCancel,
  selectedIntention,
}: InlineContextInputProps) {
  const [inputMode, setInputMode] = useState<"text" | "voice" | null>(null);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const textInputRef = useRef<TextInput>(null);

  // Get color based on relationship direction
  const getIntentionColor = () => {
    const colors = {
      improve: "#B4FF39", // Lime green
      distance: "#F97316", // Orange
      maintain: "#6366F1", // Indigo
      clarity: "#5EEAD4", // Teal (default)
    };
    return colors[selectedIntention || "clarity"];
  };

  const intentionColor = getIntentionColor();

  const handleModeSelect = (mode: "text" | "voice") => {
    setInputMode(mode);
    if (mode === "text") {
      // Focus text input after a short delay
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onSubmit(textInput, false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording", error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // Will be transcribed by parent component
        onSubmit(uri, true);
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecording(null);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      className="mb-4 mx-4"
    >
      <View
        className="rounded-3xl overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 20, 24, 0.8)",
          borderWidth: 1,
          borderColor: `${intentionColor}20`,
        }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text
            className="text-sm font-light"
            style={{
              color: "#E5E7EB",
              letterSpacing: 0.3,
            }}
          >
            Share additional context to help me understand better
          </Text>
        </View>

        {/* Mode Selection or Input */}
        {!inputMode ? (
          <Animated.View entering={FadeIn.duration(300)} className="px-3 pb-3">
            {/* Text Input Option */}
            <Pressable
              onPress={() => handleModeSelect("text")}
              className="active:opacity-70 mb-2"
            >
              {({ pressed }) => (
                <View
                  className="flex-row items-center px-4 py-3.5 rounded-2xl"
                  style={{
                    backgroundColor: pressed
                      ? `${intentionColor}12`
                      : `${intentionColor}08`,
                    borderWidth: 1,
                    borderColor: `${intentionColor}20`,
                  }}
                >
                  <View
                    className="items-center justify-center mr-3"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${intentionColor}15`,
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={intentionColor}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: "#F9FAFB", letterSpacing: 0.2 }}
                    >
                      Text Input
                    </Text>
                    <Text
                      className="text-xs font-light mt-0.5"
                      style={{ color: "#9CA3AF", letterSpacing: 0.1 }}
                    >
                      Type additional details
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
                </View>
              )}
            </Pressable>

            {/* Voice Input Option */}
            <Pressable
              onPress={() => handleModeSelect("voice")}
              className="active:opacity-70"
            >
              {({ pressed }) => (
                <View
                  className="flex-row items-center px-4 py-3.5 rounded-2xl"
                  style={{
                    backgroundColor: pressed
                      ? `${intentionColor}12`
                      : `${intentionColor}08`,
                    borderWidth: 1,
                    borderColor: `${intentionColor}20`,
                  }}
                >
                  <View
                    className="items-center justify-center mr-3"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${intentionColor}15`,
                    }}
                  >
                    <Ionicons name="mic-outline" size={20} color={intentionColor} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: "#F9FAFB", letterSpacing: 0.2 }}
                    >
                      Voice Input
                    </Text>
                    <Text
                      className="text-xs font-light mt-0.5"
                      style={{ color: "#9CA3AF", letterSpacing: 0.1 }}
                    >
                      Record your thoughts
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
                </View>
              )}
            </Pressable>
          </Animated.View>
        ) : inputMode === "text" ? (
          // Text Input Mode
          <Animated.View entering={FadeIn.duration(300)} className="px-3 pb-3">
            <View
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: `${intentionColor}06`,
                borderWidth: 1,
                borderColor: `${intentionColor}15`,
              }}
            >
              <TextInput
                ref={textInputRef}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Share what feels relevant..."
                placeholderTextColor="#6B7280"
                multiline
                maxLength={500}
                style={{
                  color: "#F9FAFB",
                  fontSize: 15,
                  lineHeight: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  minHeight: 100,
                  maxHeight: 200,
                }}
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row items-center justify-end gap-2 mt-3">
              <Pressable
                onPress={() => {
                  setInputMode(null);
                  setTextInput("");
                  onCancel?.();
                }}
                className="active:opacity-70"
              >
                <View
                  className="px-4 py-2 rounded-xl"
                  style={{
                    backgroundColor: "rgba(156, 163, 175, 0.1)",
                  }}
                >
                  <Text
                    className="text-sm font-light"
                    style={{ color: "#9CA3AF", letterSpacing: 0.2 }}
                  >
                    Cancel
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleTextSubmit}
                disabled={!textInput.trim()}
                className="active:opacity-70"
              >
                <View
                  className="px-4 py-2 rounded-xl"
                  style={{
                    backgroundColor: textInput.trim()
                      ? intentionColor
                      : "rgba(156, 163, 175, 0.1)",
                    opacity: textInput.trim() ? 1 : 0.5,
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: textInput.trim() ? "#050608" : "#6B7280",
                      letterSpacing: 0.2,
                    }}
                  >
                    Submit
                  </Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          // Voice Recording Mode
          <Animated.View entering={FadeIn.duration(300)} className="px-3 pb-3">
            <View
              className="items-center py-8 rounded-2xl"
              style={{
                backgroundColor: `${intentionColor}06`,
                borderWidth: 1,
                borderColor: `${intentionColor}15`,
              }}
            >
              {isRecording ? (
                <>
                  <View
                    className="items-center justify-center mb-4"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: "#EF4444",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        backgroundColor: "#FFF",
                      }}
                    />
                  </View>
                  <Text
                    className="text-base font-medium mb-1"
                    style={{ color: "#F9FAFB" }}
                  >
                    Recording...
                  </Text>
                  <Text
                    className="text-xs font-light"
                    style={{ color: "#9CA3AF" }}
                  >
                    Tap to stop
                  </Text>
                </>
              ) : (
                <>
                  <View
                    className="items-center justify-center mb-4"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: `${intentionColor}20`,
                    }}
                  >
                    <Ionicons name="mic" size={28} color={intentionColor} />
                  </View>
                  <Text
                    className="text-base font-medium mb-1"
                    style={{ color: "#F9FAFB" }}
                  >
                    Ready to record
                  </Text>
                  <Text
                    className="text-xs font-light"
                    style={{ color: "#9CA3AF" }}
                  >
                    Tap to start recording
                  </Text>
                </>
              )}

              <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                className="mt-6 active:opacity-70"
              >
                <View
                  className="px-6 py-3 rounded-xl"
                  style={{
                    backgroundColor: isRecording ? "#EF4444" : intentionColor,
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: "#050608", letterSpacing: 0.2 }}
                  >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Cancel Button */}
            <View className="flex-row items-center justify-center mt-3">
              <Pressable
                onPress={() => {
                  setInputMode(null);
                  onCancel?.();
                }}
                className="active:opacity-70"
              >
                <Text
                  className="text-sm font-light"
                  style={{ color: "#9CA3AF", letterSpacing: 0.2 }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
