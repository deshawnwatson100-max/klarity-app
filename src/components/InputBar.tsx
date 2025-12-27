import React, { useState } from "react";
import { View, TextInput, Pressable, Keyboard, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

export type InputMode = "understand" | "rewrite";

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onVoicePress?: () => void;
  onPlusPress?: () => void;
  onImageSelected?: (uri: string, base64: string) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedImageUri?: string;
  onClearImage?: () => void;
  isRecording?: boolean;
  inputMode?: InputMode;
  onModeChange?: (mode: InputMode) => void;
}

export function InputBar({
  value,
  onChangeText,
  onSend,
  onVoicePress,
  onPlusPress,
  onImageSelected,
  placeholder = "Type a message...",
  disabled = false,
  selectedImageUri,
  onClearImage,
  isRecording = false,
  inputMode = "understand",
  onModeChange,
}: InputBarProps) {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if ((value.trim() || selectedImageUri) && !disabled) {
      onSend();
      Keyboard.dismiss();
    }
  };

  const handlePickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      console.log("Permission to access media library was denied");
      return;
    }

    // Pick image with base64 encoding
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.uri && asset.base64) {
        onImageSelected?.(asset.uri, asset.base64);
      }
    }
  };

  const dynamicPlaceholder = inputMode === "rewrite"
    ? "Type how you want to reply..."
    : placeholder;

  return (
    <View
      className="px-4 py-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: "#111111",
      }}
    >
      {/* Mode Toggle */}
      {onModeChange && (
        <View className="flex-row items-center justify-center mb-3">
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#1A1A1C",
              borderRadius: 20,
              padding: 3,
            }}
          >
            <Pressable
              onPress={() => onModeChange("understand")}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 17,
                backgroundColor: inputMode === "understand" ? "#2A2A2C" : "transparent",
              }}
            >
              <Text
                style={{
                  color: inputMode === "understand" ? "#F9FAFB" : "#6B7280",
                  fontSize: 13,
                  fontWeight: inputMode === "understand" ? "600" : "400",
                }}
              >
                Understand
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onModeChange("rewrite")}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 17,
                backgroundColor: inputMode === "rewrite" ? "#2A2A2C" : "transparent",
              }}
            >
              <Text
                style={{
                  color: inputMode === "rewrite" ? "#F9FAFB" : "#6B7280",
                  fontSize: 13,
                  fontWeight: inputMode === "rewrite" ? "600" : "400",
                }}
              >
                Rewrite
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Image Preview */}
      {selectedImageUri && (
        <View className="mb-3">
          <View className="relative inline-flex">
            <Image
              source={{ uri: selectedImageUri }}
              className="w-24 h-24 rounded-lg"
              resizeMode="cover"
            />
            <Pressable
              onPress={onClearImage}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
            >
              <Ionicons name="close" size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}

      <View className="flex-row items-center gap-3">
        {/* Image Picker Button */}
        <Pressable
          onPress={handlePickImage}
          disabled={disabled}
          className="active:opacity-60"
        >
          <Ionicons name="image-outline" size={28} color="#9CA3AF" />
        </Pressable>

        {/* Input Field */}
        <View className="flex-1 relative">
          {/* Outer glow - only visible when focused */}
          {isFocused && (
            <View
              style={{
                position: "absolute",
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                borderRadius: 30,
                backgroundColor: "rgba(156, 163, 175, 0.12)",
                shadowColor: "#9CA3AF",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            />
          )}

          {/* Inner input with pitch black background */}
          <View
            style={{
              backgroundColor: "#000000",
              borderRadius: 28,
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 44,
              maxHeight: 100,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={dynamicPlaceholder}
              placeholderTextColor="#6B7280"
              editable={!disabled}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={1000}
              style={{
                color: "#F9FAFB",
                fontSize: 16,
                lineHeight: 20,
              }}
            />
          </View>
        </View>

        {/* Voice or Send Button */}
        {value.trim() || selectedImageUri ? (
          <Pressable
            onPress={handleSend}
            disabled={disabled}
            className="active:opacity-60"
          >
            <Ionicons name="send" size={24} color="#9CA3AF" />
          </Pressable>
        ) : (
          <Pressable
            onPress={onVoicePress}
            disabled={disabled}
            className="active:opacity-60"
          >
            {isRecording ? (
              <View className="bg-red-500 rounded-full p-2">
                <Ionicons name="stop" size={24} color="white" />
              </View>
            ) : (
              <Ionicons name="mic-outline" size={28} color="#9CA3AF" />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
