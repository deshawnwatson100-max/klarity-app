import React, { useState } from "react";
import { View, TextInput, Pressable, Keyboard, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

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

  return (
    <View
      className="bg-black border-t border-neutral-900 px-4 py-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
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
        {/* Plus Button - now triggers image picker */}
        <Pressable
          onPress={handlePickImage}
          disabled={disabled}
          className="active:opacity-60"
        >
          <Ionicons name="image-outline" size={28} color="#9CA3AF" />
        </Pressable>

        {/* Input Field */}
        <View className="flex-1">
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            placeholderTextColor="#6B7280"
            editable={!disabled}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={1000}
            className="bg-neutral-950 text-white px-4 py-3 rounded-full min-h-[44px] max-h-[100px]"
            style={{
              borderWidth: 1,
              borderColor: isFocused ? "#B4FF39" : "#262626",
            }}
          />
        </View>

        {/* Voice or Send Button */}
        {value.trim() || selectedImageUri ? (
          <Pressable
            onPress={handleSend}
            disabled={disabled}
            className="active:opacity-60"
          >
            <Ionicons name="send" size={24} color="#B4FF39" />
          </Pressable>
        ) : (
          <Pressable
            onPress={onVoicePress}
            disabled={disabled}
            className="active:opacity-60"
          >
            <Ionicons name="mic-outline" size={28} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
