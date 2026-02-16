import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { View, TextInput, Pressable, Keyboard, Image, Text, Animated, Dimensions, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";

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
  onInputFocus?: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

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
  inputMode = "understand",
  autoFocus = false,
  onInputFocus,
  isEditing = false,
  onCancelEdit,
}, ref) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const screenWidth = Dimensions.get("window").width;

  // Animation values for sliding placeholders
  const replyPlaceholderX = useRef(new Animated.Value(0)).current;
  const decodePlaceholderX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;
  const decodeOpacity = useRef(new Animated.Value(0)).current;

  // Track if this is the first render to skip animation
  const isFirstRender = useRef(true);
  const currentMode = useRef(inputMode);

  // Set initial positions based on inputMode (no animation on first render)
  useEffect(() => {
    if (isFirstRender.current) {
      // First render - set positions immediately without animation
      if (inputMode === "understand") {
        replyPlaceholderX.setValue(-screenWidth);
        replyOpacity.setValue(0);
        decodePlaceholderX.setValue(0);
        decodeOpacity.setValue(1);
      } else {
        replyPlaceholderX.setValue(0);
        replyOpacity.setValue(1);
        decodePlaceholderX.setValue(screenWidth);
        decodeOpacity.setValue(0);
      }
      currentMode.current = inputMode;
      isFirstRender.current = false;
      return;
    }

    // Skip if mode hasn't changed
    if (currentMode.current === inputMode) {
      return;
    }
    currentMode.current = inputMode;

    // Animate the transition
    const SLIDE_DURATION = 300;
    const SLIDE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

    if (inputMode === "rewrite") {
      // Slide reply in, decode out
      Animated.parallel([
        Animated.timing(replyPlaceholderX, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(replyOpacity, {
          toValue: 1,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodePlaceholderX, {
          toValue: screenWidth,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodeOpacity, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide decode in, reply out
      Animated.parallel([
        Animated.timing(replyPlaceholderX, {
          toValue: -screenWidth,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(replyOpacity, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodePlaceholderX, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodeOpacity, {
          toValue: 1,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [inputMode, screenWidth]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  // Debounce state to prevent double-sends
  const lastSendTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  const handleSend = () => {
    const now = Date.now();
    // Prevent rapid double-taps within 500ms
    if (now - lastSendTimeRef.current < DEBOUNCE_MS) {
      console.log("[InputBar] Send debounced - too fast");
      return;
    }

    if ((value.trim() || selectedImageUri) && !disabled) {
      lastSendTimeRef.current = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSend();
      // Don't dismiss keyboard here - let the parent screen decide when to dismiss
    }
  };

  const handleCancelEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancelEdit?.();
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      console.log("Permission to access media library was denied");
      return;
    }

    // Pick image without base64 first - we'll compress and convert after
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1, // Get full quality, we'll resize it ourselves
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.uri) {
        try {
          // Resize the image to max 1024px on longest side for faster uploads
          // This significantly reduces payload size for GPT-4o vision
          const MAX_DIMENSION = 1024;
          const width = asset.width || 1024;
          const height = asset.height || 1024;

          let resizeConfig: { width?: number; height?: number } = {};
          if (width > height && width > MAX_DIMENSION) {
            resizeConfig = { width: MAX_DIMENSION };
          } else if (height > MAX_DIMENSION) {
            resizeConfig = { height: MAX_DIMENSION };
          }

          // Use ImageManipulator to resize and compress
          const manipResult = await ImageManipulator.manipulateAsync(
            asset.uri,
            resizeConfig.width || resizeConfig.height ? [{ resize: resizeConfig }] : [],
            {
              compress: 0.7,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true
            }
          );

          if (manipResult.base64) {
            console.log("[InputBar] Image compressed:", {
              originalSize: asset.fileSize ? `${Math.round(asset.fileSize / 1024)}KB` : "unknown",
              compressedSize: `${Math.round(manipResult.base64.length * 0.75 / 1024)}KB`,
              dimensions: `${manipResult.width}x${manipResult.height}`,
            });
            onImageSelected?.(manipResult.uri, manipResult.base64);
          }
        } catch (error) {
          console.error("[InputBar] Error compressing image:", error);
          // Fallback: try to use original with lower quality
          const fallbackResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.3,
            base64: true,
          });
          if (!fallbackResult.canceled && fallbackResult.assets[0]?.base64) {
            onImageSelected?.(fallbackResult.assets[0].uri, fallbackResult.assets[0].base64);
          }
        }
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
        backgroundColor: colors.headerBackground,
      }}
    >
      {/* Edit Mode Indicator */}
      {isEditing && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: isDark ? "#1F1F1F" : "#F0F0F0",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Editing message</Text>
          </View>
          <Pressable
            onPress={handleCancelEdit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              padding: 4,
            })}
          >
            <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
          </Pressable>
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
          <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
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
                backgroundColor: isDark ? "rgba(156, 163, 175, 0.15)" : "rgba(0, 122, 255, 0.08)",
                shadowColor: isDark ? "#9CA3AF" : "#007AFF",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDark ? 0.3 : 0.15,
                shadowRadius: 10,
              }}
            />
          )}

          {/* Inner input with themed background */}
          <View
            style={{
              backgroundColor: isDark ? "#1A1A1C" : "#FFFFFF",
              borderRadius: 28,
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 44,
              maxHeight: 100,
              justifyContent: "center",
              overflow: "hidden",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.12)",
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
                  style={{
                    position: "absolute",
                    color: colors.inputPlaceholder,
                    fontSize: 16,
                    opacity: replyOpacity,
                    transform: [{ translateX: replyPlaceholderX }],
                  }}
                >
                  Type how you want to reply...
                </Animated.Text>

                {/* Decode Placeholder */}
                <Animated.Text
                  style={{
                    position: "absolute",
                    color: colors.inputPlaceholder,
                    fontSize: 16,
                    opacity: decodeOpacity,
                    transform: [{ translateX: decodePlaceholderX }],
                  }}
                >
                  Ask Klarity social nuances…
                </Animated.Text>
              </View>
            )}

            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              onFocus={() => {
                setIsFocused(true);
                onInputFocus?.();
              }}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? (inputMode === "rewrite" ? "Type how you want to reply..." : placeholder) : ""}
              placeholderTextColor={colors.inputPlaceholder}
              editable={!disabled}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={1000}
              autoFocus={autoFocus}
              blurOnSubmit={false}
              keyboardType="default"
              style={{
                color: colors.textPrimary,
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
            <Ionicons name="send" size={24} color={colors.textSecondary} />
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
              <Ionicons name="mic-outline" size={28} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
});
