import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useOnboardingStore } from "../state/onboardingStore";
import { useTheme } from "../theme";
import { InputBar, InputBarRef } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { TypingIndicator } from "../components/TypingIndicator";

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

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<InputBarRef>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isTyping, setIsTyping] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);

  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlideAnim = useRef(new Animated.Value(20)).current;

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

  // Animate get started button
  useEffect(() => {
    if (showGetStarted) {
      Animated.parallel([
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 500,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlideAnim, {
          toValue: 0,
          duration: 500,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showGetStarted]);

  // Focus input when shown
  useEffect(() => {
    if (showInput) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [showInput]);

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
    setNameInput("");

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
          setTimeout(() => setShowGetStarted(true), 1500);
        }, 1500);
      }, 500);
    }
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setHasCompletedOnboarding(true);
    onComplete();
  };

  const renderMessage = (message: Message) => {
    if (message.type === "user") {
      return (
        <MessageBubble
          key={message.id}
          role="user"
          content={message.content}
          timestamp={Date.now()}
          showUserBubble={true}
        />
      );
    }

    if (message.type === "options") {
      return (
        <View key={message.id} className="mb-5">
          <MessageBubble
            role="assistant"
            content={message.content}
            timestamp={Date.now()}
          />
          <View className="flex-row flex-wrap gap-2 mt-3 px-1">
            {message.options?.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleOptionSelect(option.id, option.label)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: pressed
                    ? isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.08)"
                    : isDark
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(0, 0, 0, 0.04)",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.08)",
                })}
              >
                {option.icon && (
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    // Bot message
    return (
      <MessageBubble
        key={message.id}
        role="assistant"
        content={message.content}
        timestamp={Date.now()}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header - matching ChatScreen style */}
        <View
          style={{
            paddingTop: insets.top,
            backgroundColor: colors.headerBackground,
          }}
        >
          <View className="flex-row items-center justify-between px-4 h-14">
            <View className="flex-row items-center">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="sparkles" size={18} color={colors.headerIcon} />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.headerText,
                  letterSpacing: 0.5,
                }}
              >
                Klarity
              </Text>
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
          {messages.map(renderMessage)}

          {isTyping && <TypingIndicator />}

          {showGetStarted && (
            <Animated.View
              style={{
                opacity: buttonFadeAnim,
                transform: [{ translateY: buttonSlideAnim }],
                marginTop: 24,
              }}
            >
              <Pressable
                onPress={handleGetStarted}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: isDark ? "#FFFFFF" : "#1C1C1E",
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: isDark ? "#1C1C1E" : "#FFFFFF",
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Get Started
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Area - using InputBar component */}
        {showInput && (
          <InputBar
            ref={inputRef}
            value={nameInput}
            onChangeText={setNameInput}
            onSend={handleNameSubmit}
            placeholder="Enter your name..."
            autoFocus={true}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
