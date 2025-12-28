import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { View, TextInput, Pressable, Keyboard, Image, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

export type InputMode = "understand" | "rewrite";

export interface InputBarRef {
  focus: () => void;
}

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
  autoFocus?: boolean;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const InputBar = forwardRef<InputBarRef, InputBarProps>(function InputBar({
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
  inputMode = "rewrite",
  autoFocus = false,
}, ref) {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const screenWidth = Dimensions.get("window").width;
  const isFirstRender = useRef(true);
  const prevMode = useRef(inputMode);

  // Initialize animation values based on initial mode (no animation on mount)
  const replyPlaceholderX = useSharedValue(
    inputMode === "rewrite" ? 0 : -screenWidth
  );
  const decodePlaceholderX = useSharedValue(
    inputMode === "rewrite" ? screenWidth : 0
  );

  // Animate placeholders only when mode actually changes (not on mount)
  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if mode hasn't actually changed
    if (prevMode.current === inputMode) {
      return;
    }
    prevMode.current = inputMode;

    const SLIDE_DURATION = 300;
    const SLIDE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

    if (inputMode === "rewrite") {
      replyPlaceholderX.value = withTiming(0, { duration: SLIDE_DURATION, easing: SLIDE_EASING });
      decodePlaceholderX.value = withTiming(screenWidth, { duration: SLIDE_DURATION, easing: SLIDE_EASING });
    } else {
      replyPlaceholderX.value = withTiming(-screenWidth, { duration: SLIDE_DURATION, easing: SLIDE_EASING });
      decodePlaceholderX.value = withTiming(0, { duration: SLIDE_DURATION, easing: SLIDE_EASING });
    }
  }, [inputMode, screenWidth]);

  // Animated styles for placeholders
  const replyPlaceholderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: replyPlaceholderX.value }],
  }));

  const decodePlaceholderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: decodePlaceholderX.value }],
  }));

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  const handleSend = () => {
    if ((value.trim() || selectedImageUri) && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSend();
      Keyboard.dismiss();
    }
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  // Show sliding placeholders only when input is empty
  const showSlidingPlaceholders = !value;

  return (
    <View
      className="px-4 py-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: "#111111",
      }}
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClearImage?.();
              }}
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
              overflow: "hidden",
            }}
          >
            {/* Sliding Placeholder Container */}
            {showSlidingPlaceholders && !isFocused && (
              <View
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                pointerEvents="none"
              >
                {/* Reply Placeholder */}
                <Animated.Text
                  style={[
                    {
                      position: "absolute",
                      color: "#6B7280",
                      fontSize: 16,
                    },
                    replyPlaceholderStyle,
                  ]}
                >
                  Type how you want to reply...
                </Animated.Text>

                {/* Decode Placeholder */}
                <Animated.Text
                  style={[
                    {
                      position: "absolute",
                      color: "#6B7280",
                      fontSize: 16,
                    },
                    decodePlaceholderStyle,
                  ]}
                >
                  Paste the message to decode...
                </Animated.Text>
              </View>
            )}

            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? (inputMode === "rewrite" ? "Type how you want to reply..." : "Paste the message to decode...") : ""}
              placeholderTextColor="#6B7280"
              editable={!disabled}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={1000}
              autoFocus={autoFocus}
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onVoicePress?.();
            }}
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
});
