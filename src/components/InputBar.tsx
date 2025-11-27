import React, { useState } from "react";
import { View, TextInput, Pressable, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onVoicePress?: () => void;
  onPlusPress?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InputBar({
  value,
  onChangeText,
  onSend,
  onVoicePress,
  onPlusPress,
  placeholder = "Type a message...",
  disabled = false,
}: InputBarProps) {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend();
      Keyboard.dismiss();
    }
  };

  return (
    <View
      className="bg-black border-t border-neutral-900 px-4 py-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-row items-center gap-3">
        {/* Plus Button */}
        <Pressable
          onPress={onPlusPress}
          disabled={disabled}
          className="active:opacity-60"
        >
          <Ionicons name="add-circle-outline" size={28} color="#9CA3AF" />
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
        {value.trim() ? (
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
