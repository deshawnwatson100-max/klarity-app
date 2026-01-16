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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useOnboardingStore } from "../state/onboardingStore";
import { useTheme } from "../theme";
import { InputBar, InputBarRef } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { getOpenAITextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";

type OnboardingStep =
  | "welcome"
  | "name"
  | "situation"
  | "followup"
  | "complete";

interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

type InputMode = "understand" | "rewrite";

const SYSTEM_PROMPT = `You are Klarity's friendly onboarding assistant. Klarity is an app that helps people communicate better by:
1. Decoding messages they receive - helping them understand the true meaning, tone, and intent behind texts
2. Crafting thoughtful replies - helping them express themselves clearly and empathetically

Your role during onboarding is to:
- Warmly greet users and learn their name
- Ask what brings them to Klarity (relationships, work, family, friends, etc.)
- Listen to their specific situation or challenge with empathy
- Ask 1-2 follow-up questions to understand their needs better
- Reassure them they are in the right place
- Explain how Klarity will help them in their specific journey

Guidelines:
- Be warm, empathetic, and conversational (not robotic)
- Keep responses concise (2-3 sentences max)
- Use their name naturally in conversation
- When they share their situation, validate their feelings
- End the conversation by explaining Klarity's two main features (Decode and Reply) in a way that relates to their specific needs
- When ready to conclude, end your message with [ONBOARDING_COMPLETE] tag

Do NOT:
- Be overly formal or clinical
- Give generic responses that don't acknowledge what they shared
- Rush through the conversation
- Use emojis excessively`;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<InputBarRef>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<AIMessage[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("understand");
  const [inputPlaceholder, setInputPlaceholder] = useState("Type your message...");

  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlideAnim = useRef(new Animated.Value(20)).current;

  const setUserName = useOnboardingStore((s) => s.setUserName);
  const setHasCompletedOnboarding = useOnboardingStore(
    (s) => s.setHasCompletedOnboarding
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const addBotMessage = useCallback(
    (content: string) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "bot",
        content,
      };
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
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

  const getAIResponse = useCallback(
    async (userMessage: string) => {
      const updatedHistory: AIMessage[] = [
        ...conversationHistory,
        { role: "user" as const, content: userMessage },
      ];

      setIsTyping(true);
      scrollToBottom();

      try {
        const response = await getOpenAITextResponse(updatedHistory, {
          temperature: 0.8,
          maxTokens: 300,
        });

        let aiContent = response.content;
        const isComplete = aiContent.includes("[ONBOARDING_COMPLETE]");
        aiContent = aiContent.replace("[ONBOARDING_COMPLETE]", "").trim();

        const newHistory: AIMessage[] = [
          ...updatedHistory,
          { role: "assistant" as const, content: aiContent },
        ];
        setConversationHistory(newHistory);

        setIsTyping(false);
        addBotMessage(aiContent);

        if (isComplete) {
          setCurrentStep("complete");
          setShowInput(false);
          setTimeout(() => setShowGetStarted(true), 1000);
        }

        return aiContent;
      } catch (error) {
        console.error("AI response error:", error);
        setIsTyping(false);
        addBotMessage(
          "I had a small hiccup there. Could you tell me a bit more about what brings you here?"
        );
        return null;
      }
    },
    [conversationHistory, addBotMessage, scrollToBottom]
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
  }, [showGetStarted, buttonFadeAnim, buttonSlideAnim]);

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
    const startOnboarding = async () => {
      setIsTyping(true);
      scrollToBottom();

      try {
        const initialPrompt =
          "Start the onboarding by warmly welcoming the user to Klarity and asking for their name. Keep it brief and friendly.";
        const response = await getOpenAITextResponse(
          [
            ...conversationHistory,
            { role: "user", content: initialPrompt },
          ],
          { temperature: 0.8, maxTokens: 150 }
        );

        const aiContent = response.content;
        setConversationHistory((prev) => [
          ...prev,
          { role: "user" as const, content: initialPrompt },
          { role: "assistant" as const, content: aiContent },
        ]);

        setIsTyping(false);
        addBotMessage(aiContent);
        setCurrentStep("name");
        setInputPlaceholder("Enter your name...");
        setShowInput(true);
      } catch (error) {
        console.error("Initial message error:", error);
        setIsTyping(false);
        addBotMessage(
          "Hey there! Welcome to Klarity. I help you communicate with more clarity and understanding. What should I call you?"
        );
        setCurrentStep("name");
        setInputPlaceholder("Enter your name...");
        setShowInput(true);
      }
    };

    const timer = setTimeout(startOnboarding, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!userInput.trim() || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const input = userInput.trim();
    addUserMessage(input);
    setUserInput("");

    if (currentStep === "name") {
      // Extract and save the name
      setUserName(input);
      setCurrentStep("situation");
      setInputPlaceholder("Share what brings you here...");

      // Get AI response that acknowledges name and asks about their situation
      const contextMessage = `The user's name is "${input}". Greet them by name warmly and ask what brings them to Klarity today - what communication challenges are they facing? Are they dealing with relationships, work, family, or friends?`;
      await getAIResponse(contextMessage);
    } else if (currentStep === "situation" || currentStep === "followup") {
      setCurrentStep("followup");
      setInputPlaceholder("Type your response...");
      await getAIResponse(input);
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
            {/* Left - Menu Button and Klarity text */}
            <View className="flex-row items-center">
              <Pressable className="active:opacity-60">
                <Ionicons name="menu" size={28} color={colors.headerIcon} />
              </Pressable>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.headerText,
                  marginLeft: 12,
                  letterSpacing: 0.5,
                }}
              >
                Klarity
              </Text>
            </View>

            {/* Right - Search Icon + Mode Toggle + New Loop Button */}
            <View className="flex-row items-center">
              {/* Search Icon */}
              <Pressable
                className="active:opacity-60"
                style={{ marginRight: 12 }}
              >
                <Ionicons
                  name="search-outline"
                  size={22}
                  color={colors.textTertiary}
                />
              </Pressable>

              {/* Mode Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "#1A1A1C" : "rgba(0, 0, 0, 0.06)",
                  borderRadius: 14,
                  padding: 2,
                  marginRight: 12,
                }}
              >
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setInputMode("understand");
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor:
                      inputMode === "understand"
                        ? isDark
                          ? "#2A2A2C"
                          : "#FFFFFF"
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        inputMode === "understand"
                          ? colors.textPrimary
                          : colors.textTertiary,
                      fontSize: 11,
                      fontWeight: inputMode === "understand" ? "600" : "400",
                    }}
                  >
                    Decode
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setInputMode("rewrite");
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor:
                      inputMode === "rewrite"
                        ? isDark
                          ? "#2A2A2C"
                          : "#FFFFFF"
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        inputMode === "rewrite"
                          ? colors.textPrimary
                          : colors.textTertiary,
                      fontSize: 11,
                      fontWeight: inputMode === "rewrite" ? "600" : "400",
                    }}
                  >
                    Reply
                  </Text>
                </Pressable>
              </View>

              {/* New Loop Button */}
              <Pressable className="active:opacity-60">
                <View style={{ position: "relative" }}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color={colors.headerIcon}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 0,
                      right: 0,
                      bottom: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="add" size={12} color={colors.headerIcon} />
                  </View>
                </View>
              </Pressable>
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
            value={userInput}
            onChangeText={setUserInput}
            onSend={handleSubmit}
            placeholder={inputPlaceholder}
            autoFocus={true}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
