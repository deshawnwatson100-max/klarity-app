import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme";

interface SelectedImage {
  uri: string;
  base64: string;
}

interface DeepDecodeModalProps {
  visible: boolean;
  onClose: () => void;
  onAnalyze: (images: SelectedImage[], context?: string) => void;
  isAnalyzing?: boolean;
}

export function DeepDecodeModal({
  visible,
  onClose,
  onAnalyze,
  isAnalyzing = false,
}: DeepDecodeModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isContextFocused, setIsContextFocused] = useState(false);
  const contextInputRef = useRef<TextInput>(null);

  // Handle keyboard hide to reset context focus
  useEffect(() => {
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsContextFocused(false);
      }
    );

    return () => {
      hideSub.remove();
    };
  }, []);

  const handlePickImages = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets) {
      const newImages: SelectedImage[] = result.assets
        .filter((asset) => asset.base64)
        .map((asset) => ({
          uri: asset.uri,
          base64: asset.base64!,
        }));

      setSelectedImages((prev) => {
        const combined = [...prev, ...newImages];
        return combined.slice(0, 5); // Max 5 images
      });
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = useCallback(() => {
    if (selectedImages.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAnalyze(selectedImages, additionalContext.trim() || undefined);
  }, [selectedImages, additionalContext, onAnalyze]);

  const handleClose = useCallback(() => {
    if (isAnalyzing) return;
    Keyboard.dismiss();
    setSelectedImages([]);
    setAdditionalContext("");
    setIsContextFocused(false);
    onClose();
  }, [isAnalyzing, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            }}
          >
            <Pressable
              onPress={handleClose}
              disabled={isAnalyzing}
              style={{ opacity: isAnalyzing ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                Cancel
              </Text>
            </Pressable>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 17,
                fontWeight: "600",
              }}
            >
              Deep Decode
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Instructions */}
            <View
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons
                  name="scan-outline"
                  size={24}
                  color={isDark ? "#7DD3C0" : "#059669"}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Analyze a Conversation
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                Upload screenshots of a conversation you want to understand better.
                Klarity will analyze the communication patterns, tone, and dynamics
                to help you see what might really be going on.
              </Text>
            </View>

            {/* Image Selection Area */}
            {selectedImages.length === 0 ? (
              <Pressable
                onPress={handlePickImages}
                disabled={isAnalyzing}
                style={({ pressed }) => ({
                  borderWidth: 2,
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                  borderStyle: "dashed",
                  borderRadius: 16,
                  padding: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.02)"
                    : "transparent",
                  opacity: isAnalyzing ? 0.5 : 1,
                })}
              >
                <Ionicons
                  name="images-outline"
                  size={48}
                  color={colors.textTertiary}
                  style={{ marginBottom: 12 }}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 4,
                  }}
                >
                  Tap to select images
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 13,
                  }}
                >
                  Up to 5 screenshots
                </Text>
              </Pressable>
            ) : (
              <View>
                {/* Selected Images Grid */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {selectedImages.map((image, index) => (
                    <View
                      key={index}
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={{ uri: image.uri }}
                        style={{
                          width: 100,
                          height: 150,
                          borderRadius: 12,
                        }}
                        resizeMode="cover"
                      />
                      {!isAnalyzing && (
                        <Pressable
                          onPress={() => handleRemoveImage(index)}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            borderRadius: 12,
                            padding: 4,
                          }}
                        >
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </Pressable>
                      )}
                      <View
                        style={{
                          position: "absolute",
                          bottom: 4,
                          left: 4,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 11 }}>
                          {index + 1}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* Add More Button */}
                  {selectedImages.length < 5 && !isAnalyzing && (
                    <Pressable
                      onPress={handlePickImages}
                      style={({ pressed }) => ({
                        width: 100,
                        height: 150,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                        borderStyle: "dashed",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.02)"
                          : "transparent",
                      })}
                    >
                      <Ionicons
                        name="add"
                        size={32}
                        color={colors.textTertiary}
                      />
                    </Pressable>
                  )}
                </View>

                {/* Image count */}
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  {selectedImages.length} of 5 images selected
                </Text>
              </View>
            )}

            {/* Tips - only show when not focused on input */}
            {!isContextFocused && (
              <View style={{ marginTop: 24 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontWeight: "500",
                    marginBottom: 12,
                  }}
                >
                  Tips for best results
                </Text>
                <View style={{ gap: 8 }}>
                  {[
                    "Include full conversation context when possible",
                    "Make sure text is readable in screenshots",
                    "Order images chronologically for better analysis",
                  ].map((tip, index) => (
                    <View
                      key={index}
                      style={{ flexDirection: "row", alignItems: "flex-start" }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={isDark ? "#7DD3C0" : "#059669"}
                        style={{ marginRight: 8, marginTop: 1 }}
                      />
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 13,
                          flex: 1,
                        }}
                      >
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Section - Analyze Button only (Input is in InputAccessoryView when keyboard is open) */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 8,
              paddingTop: 12,
              paddingHorizontal: 16,
            }}
          >
            {/* Analyze Conversation Button */}
            <View
              style={{
                alignItems: "flex-end",
                marginBottom: 12,
              }}
            >
              <Pressable
                onPress={handleAnalyze}
                disabled={selectedImages.length === 0 || isAnalyzing}
                style={({ pressed }) => ({
                  backgroundColor: isDark
                    ? "rgba(125, 211, 192, 0.15)"
                    : "rgba(5, 150, 105, 0.1)",
                  borderRadius: 20,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: selectedImages.length === 0 || isAnalyzing ? 0.5 : pressed ? 0.7 : 1,
                })}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator
                      color={isDark ? "#7DD3C0" : "#059669"}
                      size="small"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: isDark ? "#7DD3C0" : "#059669",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Analyzing...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="scan"
                      size={16}
                      color={isDark ? "#7DD3C0" : "#059669"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        color: isDark ? "#7DD3C0" : "#059669",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Analyze Conversation
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Context Input Bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={colors.textTertiary}
                style={{ marginRight: 10 }}
              />
              <TextInput
                ref={contextInputRef}
                value={additionalContext}
                onChangeText={setAdditionalContext}
                onFocus={() => setIsContextFocused(true)}
                onBlur={() => setIsContextFocused(false)}
                placeholder="Add context... (optional)"
                placeholderTextColor={colors.textTertiary}
                multiline
                editable={!isAnalyzing}
                style={{
                  flex: 1,
                  color: colors.textPrimary,
                  fontSize: 15,
                  lineHeight: 20,
                  maxHeight: 80,
                  textAlignVertical: "top",
                }}
              />
              {additionalContext.length > 0 && !isAnalyzing && (
                <Pressable
                  onPress={() => setAdditionalContext("")}
                  style={{ padding: 4, marginLeft: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export type { SelectedImage };
