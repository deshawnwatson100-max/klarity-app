import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useOnboardingStore } from "../state/onboardingStore";
import { useTheme } from "../theme";
import { InputBar, InputBarRef } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { VoiceRecordingVisualizer } from "../components/VoiceRecordingVisualizer";
import { VoiceProcessingIndicator } from "../components/VoiceProcessingIndicator";
import { getOpenAITextResponse } from "../api/chat-service";
import { transcribeAudio } from "../api/transcribe-audio";
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

const SYSTEM_PROMPT = `You are Klarity's friendly setup assistant. Klarity is an app with TWO powerful features:

1. DECODE MODE - Helps users understand messages:
   - Reading between the lines of texts they receive
   - Understanding tone, intent, and hidden meanings
   - Deciphering what someone REALLY means when they say something
   - Picking up on social cues and subtext in conversations
   - Understanding if someone is upset, interested, being passive-aggressive, etc.

2. REPLY MODE - Helps users craft responses:
   - Finding the right words to express themselves
   - Writing messages that convey the right tone
   - Navigating tricky or sensitive conversations
   - Responding thoughtfully to difficult messages

Your role is to set up Klarity for the user in a warm, conversational way. Frame this as "getting Klarity ready for them."

SETUP FLOW:
1. Welcome them warmly and ask what they would like to be called
2. After getting their name, briefly explain the TWO ways Klarity can help:
   - "Decode mode helps you understand what messages really mean - the tone, intent, and what someone might be thinking"
   - "Reply mode helps you find the right words when you need to respond"
3. Ask which they find themselves needing more - understanding messages or crafting replies (or both!)
4. Based on their answer, ask what types of conversations they want help with most (work, dating, family, friendships, etc.)
5. Give a brief, encouraging summary of how Klarity will help them with BOTH decoding AND replying
6. Explain how to use it: "Just paste or type any message. Use Decode to understand it, or Reply to craft your response."
7. End with encouragement and the [ONBOARDING_COMPLETE] tag

TONE GUIDELINES:
- Frame questions as "setting up" or "customizing" their experience
- Be warm and friendly, like a helpful guide
- Keep responses short (2-3 sentences max)
- Use their name naturally but not excessively
- Sound excited to help them

IMPORTANT: Make sure to explain BOTH features clearly. Many users need help understanding messages just as much as writing them.

When ready to conclude, end your message with [ONBOARDING_COMPLETE] tag (this will be hidden from the user).

Do NOT:
- Ask deeply personal or probing questions
- Sound like a therapist or counselor
- Make the user feel like they need to explain themselves
- Use clinical language
- Rush or drag out the conversation`;

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
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("understand");
  const [inputPlaceholder, setInputPlaceholder] = useState("Type your message...");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

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

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 800);
  }, []);

  // Initial welcome message
  useEffect(() => {
    const startOnboarding = async () => {
      setIsTyping(true);
      scrollToBottom();

      try {
        const initialPrompt =
          "Start the setup by warmly welcoming the user to Klarity and asking what they would like to be called. Keep it brief, friendly, and frame it as getting things set up for them.";
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
      } catch (error) {
        console.error("Initial message error:", error);
        setIsTyping(false);
        addBotMessage(
          "Hey! Welcome to Klarity. Let me get things set up for you. What would you like me to call you?"
        );
        setCurrentStep("name");
        setInputPlaceholder("Enter your name...");
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
      setInputPlaceholder("Type your answer...");

      // Get AI response that acknowledges name and asks about conversation types they want help with
      const contextMessage = `The user said their name is "${input}". Greet them by name, mention you want to customize their experience, and ask what types of conversations they would most like help with (work, personal relationships, family, dating, friendships, etc.). Frame it as setting things up for them, not as a personal question.`;
      await getAIResponse(contextMessage);
    } else if (currentStep === "situation" || currentStep === "followup") {
      setCurrentStep("followup");
      setInputPlaceholder("Type your response...");
      await getAIResponse(input);
    }
  };

  const handleVoicePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Microphone permission denied");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording", error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsProcessingVoice(true);

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        setIsProcessingVoice(false);
        return;
      }

      try {
        const transcription = await transcribeAudio(uri);

        if (!transcription) {
          setIsProcessingVoice(false);
          return;
        }

        setIsProcessingVoice(false);

        // Process the transcribed text like a normal text input
        addUserMessage(transcription);
        setUserInput("");

        if (currentStep === "name") {
          setUserName(transcription);
          setCurrentStep("situation");
          setInputPlaceholder("Type your answer...");

          const contextMessage = `The user said their name is "${transcription}". Greet them by name, mention you want to customize their experience, and ask what types of conversations they would most like help with (work, personal relationships, family, dating, friendships, etc.). Frame it as setting things up for them, not as a personal question.`;
          await getAIResponse(contextMessage);
        } else if (currentStep === "situation" || currentStep === "followup") {
          setCurrentStep("followup");
          setInputPlaceholder("Type your response...");
          await getAIResponse(transcription);
        }
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        setIsProcessingVoice(false);
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      setIsProcessingVoice(false);
      setRecording(null);
    }
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setHasCompletedOnboarding(true);
    onComplete();
  };

  const cancelRecording = async () => {
    if (!recording) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error("Error canceling recording:", error);
    }

    setRecording(null);
    setIsRecording(false);
  };

  const restartRecording = async () => {
    if (!recording) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      setRecording(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
    } catch (error) {
      console.error("Error restarting recording:", error);
      setIsRecording(false);
      setRecording(null);
    }
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
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="active:opacity-60"
              >
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

            {/* Right - Deep Decode + Mode Toggle + New Loop Button */}
            <View className="flex-row items-center">
              {/* Deep Decode Button (magnifying glass) */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
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
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="active:opacity-60"
              >
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

          {/* Voice Recording UI */}
          {isRecording && (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  marginBottom: 16,
                  color: colors.textSecondary,
                }}
              >
                Listening...
              </Text>
              <VoiceRecordingVisualizer isRecording={isRecording} barCount={25} />
            </View>
          )}
        </ScrollView>

        {/* Input Area - using InputBar component */}
        {!isRecording && !showGetStarted && (
          <InputBar
            ref={inputRef}
            value={userInput}
            onChangeText={setUserInput}
            onSend={handleSubmit}
            onVoicePress={handleVoicePress}
            placeholder={inputPlaceholder}
            autoFocus={true}
            isRecording={isRecording}
          />
        )}

        {/* Voice Recording Input - show stop, cancel, restart buttons */}
        {isRecording && (
          <View
            className="px-4 py-3"
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: colors.headerBackground,
            }}
          >
            <View className="flex-row items-center justify-center" style={{ gap: 32 }}>
              {/* Cancel Button */}
              <Pressable
                onPress={cancelRecording}
                style={({ pressed }) => ({
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    backgroundColor: isDark ? "#2A2A2C" : "#E5E5EA",
                    borderRadius: 24,
                    padding: 12,
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </View>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              {/* Stop Button */}
              <Pressable
                onPress={handleVoicePress}
                style={({ pressed }) => ({
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    backgroundColor: "#EF4444",
                    borderRadius: 32,
                    padding: 16,
                  }}
                >
                  <Ionicons name="stop" size={28} color="white" />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 6,
                    fontWeight: "500",
                  }}
                >
                  Done
                </Text>
              </Pressable>

              {/* Restart Button */}
              <Pressable
                onPress={restartRecording}
                style={({ pressed }) => ({
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    backgroundColor: isDark ? "#2A2A2C" : "#E5E5EA",
                    borderRadius: 24,
                    padding: 12,
                  }}
                >
                  <Ionicons name="refresh" size={24} color={colors.textSecondary} />
                </View>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Restart
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Voice Processing Indicator */}
        {isProcessingVoice && <VoiceProcessingIndicator />}
      </KeyboardAvoidingView>

      {/* Get Started Button - shown at bottom when onboarding is complete */}
      {showGetStarted && !isRecording && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            zIndex: 999,
            backgroundColor: colors.headerBackground,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => ({
              width: "100%",
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: "#2D2D2D",
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            })}
          >
            <Text
              style={{
                color: "#2D2D2D",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Get Started
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
