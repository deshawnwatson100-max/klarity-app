import React, { useState } from "react";
import { View, TextInput, Pressable, Keyboard, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  isRecording?: boolean;
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
      className="px-4 py-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: "transparent",
      }}
    >
      {/* Subtle top shadow for depth */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
        }}
      />

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
          <Ionicons name="image-outline" size={28} color="white" />
        </Pressable>

        {/* Input Field with Minimal Gradient Border */}
        <View className="flex-1 relative">
          {/* Very thin gradient border at 10% opacity */}
          <View
            style={{
              borderRadius: 28,
              padding: 0.5,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={[
                "rgba(79, 255, 215, 0.1)",
                "rgba(166, 107, 255, 0.1)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 28,
                padding: 0.5,
              }}
            >
              {/* Inner input with matte charcoal background */}
              <View
                style={{
                  backgroundColor: "#111111",
                  borderRadius: 27.5,
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
                  placeholder={placeholder}
                  placeholderTextColor="#A0A0A0"
                  editable={!disabled}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  multiline
                  maxLength={1000}
                  style={{
                    color: "white",
                    fontSize: 16,
                    lineHeight: 20,
                  }}
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Voice or Send Button */}
        {value.trim() || selectedImageUri ? (
          <Pressable
            onPress={handleSend}
            disabled={disabled}
            className="active:opacity-60"
          >
            <Ionicons name="send" size={24} color="#70A0C0" />
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
              <Ionicons name="mic-outline" size={28} color="white" />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
