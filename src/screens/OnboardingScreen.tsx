import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useOnboardingStore } from "../state/onboardingStore";

type OnboardingStep =
  | "welcome"
  | "name"
  | "use_case"
  | "goal"
  | "complete";

interface Message {
  id: string;
  type: "bot" | "user" | "options";
  content: string;
  options?: { id: string; label: string; icon?: string }[];
}

const USE_CASE_OPTIONS = [
  { id: "relationships", label: "Relationships", icon: "heart-outline" },
  { id: "work", label: "Work & Professional", icon: "briefcase-outline" },
  { id: "family", label: "Family", icon: "people-outline" },
  { id: "friends", label: "Friends", icon: "chatbubbles-outline" },
];

const GOAL_OPTIONS = [
  { id: "understand", label: "Understand others better", icon: "eye-outline" },
  { id: "express", label: "Express myself clearly", icon: "megaphone-outline" },
  { id: "resolve", label: "Resolve conflicts", icon: "shield-checkmark-outline" },
  { id: "connect", label: "Build deeper connections", icon: "link-outline" },
];

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      false
    );
    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedDot1 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));
  const animatedDot2 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));
  const animatedDot3 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View className="flex-row items-center px-4 py-3 rounded-2xl bg-white/5 self-start">
      <Animated.View
        style={animatedDot1}
        className="w-2 h-2 rounded-full bg-white/40 mr-1"
      />
      <Animated.View
        style={animatedDot2}
        className="w-2 h-2 rounded-full bg-white/40 mr-1"
      />
      <Animated.View style={animatedDot3} className="w-2 h-2 rounded-full bg-white/40" />
    </View>
  );
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isTyping, setIsTyping] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const setUserName = useOnboardingStore((s) => s.setUserName);
  const setPrimaryUseCase = useOnboardingStore((s) => s.setPrimaryUseCase);
  const setCommunicationGoal = useOnboardingStore((s) => s.setCommunicationGoal);
  const setHasCompletedOnboarding = useOnboardingStore(
    (s) => s.setHasCompletedOnboarding
  );
  const userName = useOnboardingStore((s) => s.userProfile.name);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const addBotMessage = useCallback(
    (content: string, options?: Message["options"]) => {
      setIsTyping(true);
      scrollToBottom();

      setTimeout(() => {
        setIsTyping(false);
        const newMessage: Message = {
          id: Date.now().toString(),
          type: options ? "options" : "bot",
          content,
          options,
        };
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }, 1200);
    },
    [scrollToBottom]
  );

  const addUserMessage = useCallback(
    (content: string) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content,
      };
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  // Initial welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
      addBotMessage("Hey there! Welcome to Klarity.");
      setTimeout(() => {
        addBotMessage("I help you communicate with more clarity and understanding.");
        setTimeout(() => {
          addBotMessage("Before we dive in, I would love to learn a bit about you. What should I call you?");
          setCurrentStep("name");
          setShowInput(true);
          setTimeout(() => inputRef.current?.focus(), 500);
        }, 1500);
      }, 1500);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleNameSubmit = () => {
    if (!nameInput.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setShowInput(false);

    const name = nameInput.trim();
    setUserName(name);
    addUserMessage(name);

    setTimeout(() => {
      addBotMessage(
        `Nice to meet you, ${name}! What brings you to Klarity today?`,
        USE_CASE_OPTIONS
      );
      setCurrentStep("use_case");
    }, 500);
  };

  const handleOptionSelect = (optionId: string, optionLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addUserMessage(optionLabel);

    if (currentStep === "use_case") {
      setPrimaryUseCase(optionId);
      setTimeout(() => {
        addBotMessage(
          "Great choice. And what would you like to improve most about your communication?",
          GOAL_OPTIONS
        );
        setCurrentStep("goal");
      }, 500);
    } else if (currentStep === "goal") {
      setCommunicationGoal(optionId);
      setTimeout(() => {
        addBotMessage(
          `Perfect, ${userName}! I am all set up and ready to help you communicate better.`
        );
        setTimeout(() => {
          addBotMessage(
            "Just paste any message you receive, and I will help you understand it and craft the perfect response."
          );
          setCurrentStep("complete");
        }, 1500);
      }, 500);
    }
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setHasCompletedOnboarding(true);
    onComplete();
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={["#050608", "#0A0A0C", "#050608"]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top + 12 }}
          className="px-6 pb-4 border-b border-white/5"
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3">
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-white font-semibold text-base">Klarity</Text>
              <Text className="text-white/50 text-xs">Your communication guide</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => (
            <Animated.View
              key={message.id}
              entering={FadeInDown.duration(400).delay(50)}
              className={`mb-3 ${message.type === "user" ? "items-end" : "items-start"}`}
            >
              {message.type === "user" ? (
                <View className="px-4 py-3 rounded-2xl rounded-br-sm bg-white/15 max-w-[80%]">
                  <Text className="text-white text-base">{message.content}</Text>
                </View>
              ) : message.type === "options" ? (
                <View className="w-full">
                  <View className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5 mb-3 max-w-[85%]">
                    <Text className="text-white/90 text-base">{message.content}</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {message.options?.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() => handleOptionSelect(option.id, option.label)}
                        className="flex-row items-center px-4 py-3 rounded-xl bg-white/10 active:bg-white/20"
                      >
                        {option.icon && (
                          <Ionicons
                            name={option.icon as any}
                            size={18}
                            color="#FFFFFF"
                            style={{ marginRight: 8 }}
                          />
                        )}
                        <Text className="text-white text-sm font-medium">
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5 max-w-[85%]">
                  <Text className="text-white/90 text-base">{message.content}</Text>
                </View>
              )}
            </Animated.View>
          ))}

          {isTyping && (
            <Animated.View entering={FadeIn.duration(300)} className="mb-3">
              <TypingIndicator />
            </Animated.View>
          )}

          {currentStep === "complete" && !isTyping && (
            <Animated.View
              entering={FadeInUp.duration(500).delay(300)}
              className="mt-6 items-center"
            >
              <Pressable
                onPress={handleGetStarted}
                className="w-full py-4 rounded-2xl bg-white items-center active:opacity-80"
              >
                <Text className="text-black font-semibold text-base">
                  Get Started
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Area */}
        {showInput && (
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={{ paddingBottom: insets.bottom + 8 }}
            className="px-4 pt-3 border-t border-white/5"
          >
            <View className="flex-row items-center bg-white/5 rounded-2xl px-4">
              <TextInput
                ref={inputRef}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your name..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="flex-1 py-4 text-white text-base"
                returnKeyType="send"
                onSubmitEditing={handleNameSubmit}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Pressable
                onPress={handleNameSubmit}
                disabled={!nameInput.trim()}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  nameInput.trim() ? "bg-white" : "bg-white/10"
                }`}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={nameInput.trim() ? "#000000" : "rgba(255,255,255,0.3)"}
                />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
