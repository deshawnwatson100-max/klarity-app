import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { IntentionType } from "../types/calendar";

interface IntentionOption {
  type: IntentionType;
  title: string;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
  description: string;
}

const INTENTION_OPTIONS: IntentionOption[] = [
  {
    type: "improve",
    title: "Improve the Relationship",
    color: "#4C9CFF",
    iconName: "heart",
    description: "For better communication, healing, and understanding.",
  },
  {
    type: "distance",
    title: "Create Healthy Distance",
    color: "#FF884D",
    iconName: "shield",
    description: "For emotional protection, space, and calmer interactions.",
  },
  {
    type: "maintain",
    title: "Maintain & Observe",
    color: "#FFD755",
    iconName: "eye",
    description: "Stay neutral and watch patterns before deciding next steps.",
  },
  {
    type: "gain-clarity",
    title: "Gain Clarity First",
    color: "#B47CFF",
    iconName: "bulb",
    description: "If you are unsure, I will help you reflect and understand the situation.",
  },
];

interface RelationshipDirectionSelectorProps {
  onContinue: (intention: IntentionType) => void;
}

export function RelationshipDirectionSelector({
  onContinue,
}: RelationshipDirectionSelectorProps) {
  const insets = useSafeAreaInsets();
  const [selectedIntention, setSelectedIntention] = useState<IntentionType | null>(null);
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

  const handleSelectIntention = (type: IntentionType) => {
    setSelectedIntention(type);
  };

  const handleContinue = () => {
    if (selectedIntention) {
      onContinue(selectedIntention);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050505", paddingTop: insets.top }}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 40,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View className="mb-6">
            <Text className="text-white text-3xl font-bold mb-3 text-center">
              Choose Your Intention
            </Text>
            <Text className="text-neutral-400 text-base text-center leading-6">
              Tell Klarity the direction you want to go. I will tailor your response for that
              path.
            </Text>
          </View>

          {/* Intention Cards */}
          <View className="gap-4 mt-6">
            {INTENTION_OPTIONS.map((option) => (
              <IntentionCard
                key={option.type}
                option={option}
                isSelected={selectedIntention === option.type}
                onSelect={handleSelectIntention}
              />
            ))}
          </View>
        </ScrollView>

        {/* Continue Button */}
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
            colors={
              selectedIntention
                ? [
                    INTENTION_OPTIONS.find((o) => o.type === selectedIntention)?.color ||
                      "#4C9CFF",
                    INTENTION_OPTIONS.find((o) => o.type === selectedIntention)?.color ||
                      "#4C9CFF",
                  ]
                : ["#262626", "#262626"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              opacity: selectedIntention ? 1 : 0.5,
            }}
          >
            <Pressable
              onPress={handleContinue}
              disabled={!selectedIntention}
              className="py-4 items-center active:opacity-70"
            >
              <Text className="text-white text-lg font-bold">Continue</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}

interface IntentionCardProps {
  option: IntentionOption;
  isSelected: boolean;
  onSelect: (type: IntentionType) => void;
}

function IntentionCard({ option, isSelected, onSelect }: IntentionCardProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.02, { damping: 10 });
      glowOpacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(1, { damping: 10 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Pressable onPress={() => onSelect(option.type)} className="active:opacity-90">
      <Animated.View style={animatedCardStyle}>
        {/* Glow Effect */}
        {isSelected && (
          <Animated.View
            style={[
              animatedGlowStyle,
              {
                position: "absolute",
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                borderRadius: 20,
                backgroundColor: option.color,
                opacity: 0.3,
                shadowColor: option.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 12,
              },
            ]}
          />
        )}

        {/* Card Content */}
        <View
          style={{
            backgroundColor: "#0A0A0A",
            borderRadius: 18,
            padding: 20,
            borderWidth: 2,
            borderColor: isSelected ? option.color : "#262626",
          }}
        >
          {/* Icon and Title Row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  backgroundColor: option.color + "20",
                  padding: 10,
                  borderRadius: 12,
                }}
              >
                <Ionicons name={option.iconName} size={24} color={option.color} />
              </View>
              <Text
                style={{ color: option.color }}
                className="text-lg font-bold flex-shrink"
              >
                {option.title}
              </Text>
            </View>

            {/* Checkmark */}
            {isSelected && (
              <View
                style={{
                  backgroundColor: option.color,
                  borderRadius: 12,
                  padding: 4,
                }}
              >
                <Ionicons name="checkmark" size={18} color="#000000" />
              </View>
            )}
          </View>

          {/* Description */}
          <Text className="text-neutral-400 text-sm leading-5 ml-1">
            {option.description}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
