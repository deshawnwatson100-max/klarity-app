import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useStylesStore } from "../state/stylesStore";
import {
  DirectnessLevel,
  FormalityLevel,
  EmotionalOpennessLevel,
  EmojiUsageLevel,
} from "../types/communicationStyle";

type Props = StackScreenProps<RootStackParamList, "StyleDetailScreen">;

const DIRECTNESS_OPTIONS: DirectnessLevel[] = ["soft", "balanced", "direct", "very-direct"];
const FORMALITY_OPTIONS: FormalityLevel[] = ["casual", "neutral", "polished", "professional"];
const EMOTIONAL_OPTIONS: EmotionalOpennessLevel[] = ["low", "medium", "open", "very-open"];
const EMOJI_OPTIONS: EmojiUsageLevel[] = ["none", "light", "moderate", "frequent"];

export function StyleDetailScreen({ route, navigation }: Props) {
  const { profileId } = route.params;
  const insets = useSafeAreaInsets();

  const profile = useStylesStore((s) => s.getProfileById(profileId));
  const updateDirectness = useStylesStore((s) => s.updateDirectness);
  const updateFormality = useStylesStore((s) => s.updateFormality);
  const updateEmotionalOpenness = useStylesStore((s) => s.updateEmotionalOpenness);
  const updateEmojiUsage = useStylesStore((s) => s.updateEmojiUsage);
  const updateLanguageStyle = useStylesStore((s) => s.updateLanguageStyle);
  const addLearningEvent = useStylesStore((s) => s.addLearningEvent);

  const [showLearningHistory, setShowLearningHistory] = useState(false);
  const [languageStyleText, setLanguageStyleText] = useState(profile?.languageStyle || "");

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#050505",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text className="text-neutral-400">Profile not found</Text>
      </View>
    );
  }

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = () => {
    // Save language style if changed
    if (languageStyleText !== profile.languageStyle) {
      updateLanguageStyle(profileId, languageStyleText);
      addLearningEvent(profileId, {
        eventType: "explicit-setting",
        description: "User updated language style preferences",
      });
    }
    navigation.goBack();
  };

  const getDirectnessLabel = (level: DirectnessLevel): string => {
    switch (level) {
      case "soft":
        return "Soft";
      case "balanced":
        return "Balanced";
      case "direct":
        return "Direct";
      case "very-direct":
        return "Very Direct";
    }
  };

  const getFormalityLabel = (level: FormalityLevel): string => {
    switch (level) {
      case "casual":
        return "Casual";
      case "neutral":
        return "Neutral";
      case "polished":
        return "Polished";
      case "professional":
        return "Professional";
    }
  };

  const getEmotionalLabel = (level: EmotionalOpennessLevel): string => {
    switch (level) {
      case "low":
        return "Low";
      case "medium":
        return "Medium";
      case "open":
        return "Open";
      case "very-open":
        return "Very Open";
    }
  };

  const getEmojiLabel = (level: EmojiUsageLevel): string => {
    switch (level) {
      case "none":
        return "None";
      case "light":
        return "Light";
      case "moderate":
        return "Moderate";
      case "frequent":
        return "Frequent";
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#262626",
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={handleBack}
            className="active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-xl font-bold">Style for {profile.contactName}</Text>
          <View style={{ width: 28 }} />
        </View>
        <Text className="text-neutral-400 text-sm text-center">
          I will use this tone when helping you reply to them.
        </Text>
      </View>

      {/* Content */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Directness Slider */}
          <View className="mb-8">
            <Text className="text-white text-lg font-bold mb-1">Directness</Text>
            <Text className="text-neutral-400 text-sm mb-4">
              How straightforward you prefer to be with them.
            </Text>
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <View className="flex-row justify-between mb-3">
                {DIRECTNESS_OPTIONS.map((option) => (
                  <Text
                    key={option}
                    style={{
                      color: profile.directness === option ? "#4C9CFF" : "#6B7280",
                    }}
                    className="text-xs font-semibold"
                  >
                    {getDirectnessLabel(option)}
                  </Text>
                ))}
              </View>
              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={0}
                maximumValue={3}
                step={1}
                value={DIRECTNESS_OPTIONS.indexOf(profile.directness)}
                onValueChange={(value) => {
                  updateDirectness(profileId, DIRECTNESS_OPTIONS[value]);
                }}
                minimumTrackTintColor="#4C9CFF"
                maximumTrackTintColor="#262626"
                thumbTintColor="#4C9CFF"
              />
            </View>
          </View>

          {/* Formality Slider */}
          <View className="mb-8">
            <Text className="text-white text-lg font-bold mb-1">Formality</Text>
            <Text className="text-neutral-400 text-sm mb-4">
              Do you speak casually or formally with them?
            </Text>
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <View className="flex-row justify-between mb-3">
                {FORMALITY_OPTIONS.map((option) => (
                  <Text
                    key={option}
                    style={{
                      color: profile.formality === option ? "#FF884D" : "#6B7280",
                    }}
                    className="text-xs font-semibold"
                  >
                    {getFormalityLabel(option)}
                  </Text>
                ))}
              </View>
              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={0}
                maximumValue={3}
                step={1}
                value={FORMALITY_OPTIONS.indexOf(profile.formality)}
                onValueChange={(value) => {
                  updateFormality(profileId, FORMALITY_OPTIONS[value]);
                }}
                minimumTrackTintColor="#FF884D"
                maximumTrackTintColor="#262626"
                thumbTintColor="#FF884D"
              />
            </View>
          </View>

          {/* Emotional Openness Slider */}
          <View className="mb-8">
            <Text className="text-white text-lg font-bold mb-1">Emotional Openness</Text>
            <Text className="text-neutral-400 text-sm mb-4">
              How much emotion you show when you message them.
            </Text>
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <View className="flex-row justify-between mb-3">
                {EMOTIONAL_OPTIONS.map((option) => (
                  <Text
                    key={option}
                    style={{
                      color: profile.emotionalOpenness === option ? "#B47CFF" : "#6B7280",
                    }}
                    className="text-xs font-semibold"
                  >
                    {getEmotionalLabel(option)}
                  </Text>
                ))}
              </View>
              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={0}
                maximumValue={3}
                step={1}
                value={EMOTIONAL_OPTIONS.indexOf(profile.emotionalOpenness)}
                onValueChange={(value) => {
                  updateEmotionalOpenness(profileId, EMOTIONAL_OPTIONS[value]);
                }}
                minimumTrackTintColor="#B47CFF"
                maximumTrackTintColor="#262626"
                thumbTintColor="#B47CFF"
              />
            </View>
          </View>

          {/* Emoji Usage */}
          <View className="mb-8">
            <Text className="text-white text-lg font-bold mb-1">Emoji Style</Text>
            <Text className="text-neutral-400 text-sm mb-4">
              How often you use emojis with them.
            </Text>
            <View className="flex-row gap-2">
              {EMOJI_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => updateEmojiUsage(profileId, option)}
                  className="flex-1 active:opacity-70"
                >
                  <View
                    style={{
                      backgroundColor:
                        profile.emojiUsage === option ? "#FFD75520" : "#0A0A0A",
                      borderWidth: 2,
                      borderColor: profile.emojiUsage === option ? "#FFD755" : "#262626",
                      borderRadius: 12,
                      padding: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: profile.emojiUsage === option ? "#FFD755" : "#9CA3AF",
                      }}
                      className="text-sm font-semibold"
                    >
                      {getEmojiLabel(option)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Language Style Input */}
          <View className="mb-8">
            <Text className="text-white text-lg font-bold mb-1">Language Style</Text>
            <Text className="text-neutral-400 text-sm mb-4">
              Any phrases, slang, or dialect you use with them?
            </Text>
            <View
              style={{
                backgroundColor: "#0A0A0A",
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: "#262626",
              }}
            >
              <TextInput
                value={languageStyleText}
                onChangeText={setLanguageStyleText}
                placeholder="bae, fam, fr, bet, mahal, oye, lol..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />
            </View>
          </View>

          {/* AI Learning History (Collapsible) */}
          <View className="mb-8">
            <Pressable
              onPress={() => setShowLearningHistory(!showLearningHistory)}
              className="active:opacity-70"
            >
              <View
                style={{
                  backgroundColor: "#0A0A0A",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#262626",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text className="text-white text-lg font-bold">How Klarity Learned This</Text>
                <Ionicons
                  name={showLearningHistory ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#9CA3AF"
                />
              </View>
            </Pressable>

            {showLearningHistory && profile.learningHistory.length > 0 && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: "#0A0A0A",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#262626",
                }}
              >
                {profile.learningHistory.slice(-5).reverse().map((event) => (
                  <View key={event.id} className="mb-3 last:mb-0">
                    <View className="flex-row items-start gap-2">
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#4C9CFF",
                          marginTop: 6,
                        }}
                      />
                      <Text className="text-neutral-300 text-sm flex-1">
                        {event.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {showLearningHistory && profile.learningHistory.length === 0 && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: "#0A0A0A",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#262626",
                }}
              >
                <Text className="text-neutral-500 text-sm text-center">
                  No learning history yet. Klarity will learn as you interact.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            paddingTop: 20,
            backgroundColor: "#050505",
          }}
        >
          <LinearGradient
            colors={["#B47CFF", "#4C9CFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              shadowColor: "#B47CFF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
            }}
          >
            <Pressable onPress={handleSave} className="py-4 items-center active:opacity-70">
              <Text className="text-white text-lg font-bold">Save Style</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}
