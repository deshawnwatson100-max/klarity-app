import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { InputBar } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { AnalysisCard } from "../components/AnalysisCard";
import { SuggestionsCard } from "../components/SuggestionsCard";
import { useChatStore } from "../state/chatStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  generateEmotionalAnalysis,
  generateSuggestedResponses,
  generateChatResponse,
} from "../api/klarity-api";
import {
  ChatMessage,
  AnalysisMessage,
  SuggestionsMessage,
  SuggestedResponse,
} from "../types/chat";

type Props = NativeStackScreenProps<RootStackParamList, "ChatScreen">;

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const messages = useChatStore((s) => s.messages);
  const currentInput = useChatStore((s) => s.currentInput);
  const setCurrentInput = useChatStore((s) => s.setCurrentInput);
  const addMessage = useChatStore((s) => s.addMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const setIsLoading = useChatStore((s) => s.setIsLoading);

  // Process the first message when screen loads
  useEffect(() => {
    if (messages.length === 1 && !isProcessing) {
      processUserMessage(messages[0]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const processUserMessage = async (userMessage: ChatMessage) => {
    setIsProcessing(true);
    setIsLoading(true);

    try {
      // Generate AI response
      const aiResponse = await generateChatResponse(userMessage.content, []);
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: Date.now(),
      });

      // Generate emotional analysis
      const analysis = await generateEmotionalAnalysis(userMessage.content);
      const analysisMessage: AnalysisMessage = {
        id: Date.now().toString() + "_analysis",
        role: "analysis",
        content: "",
        timestamp: Date.now(),
        analysis,
      };
      addMessage(analysisMessage);

      // Generate suggested responses
      const suggestions = await generateSuggestedResponses(
        userMessage.content,
        []
      );
      const suggestionsMessage: SuggestionsMessage = {
        id: Date.now().toString() + "_suggestions",
        role: "suggestions",
        content: "",
        timestamp: Date.now(),
        suggestions,
      };
      addMessage(suggestionsMessage);
    } catch (error) {
      console.error("Error processing message:", error);
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content:
          "I apologize, but I encountered an error processing your message. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setCurrentInput("");

    // Process the message
    await processUserMessage(userMessage);
  };

  const handleSelectResponse = (response: SuggestedResponse) => {
    setCurrentInput(response.text);
  };

  const handleVoicePress = () => {
    // TODO: Implement voice input
    console.log("Voice input pressed");
  };

  const handlePlusPress = () => {
    // TODO: Implement image upload or other options
    console.log("Plus button pressed");
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.role === "analysis") {
      const analysisMsg = message as AnalysisMessage;
      return (
        <AnalysisCard key={message.id} analysis={analysisMsg.analysis} />
      );
    }

    if (message.role === "suggestions") {
      const suggestionsMsg = message as SuggestionsMessage;
      return (
        <SuggestionsCard
          key={message.id}
          suggestions={suggestionsMsg.suggestions}
          onSelectResponse={handleSelectResponse}
        />
      );
    }

    return (
      <MessageBubble
        key={message.id}
        role={message.role as "user" | "assistant"}
        content={message.content}
        timestamp={message.timestamp}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
      keyboardVerticalOffset={0}
    >
      <Header />

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="px-4 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}

        {isLoading && (
          <View className="flex-row items-center gap-3 mb-4">
            <ActivityIndicator size="small" color="#B4FF39" />
            <Text className="text-neutral-400 text-sm">
              Analyzing your message...
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Input Bar */}
      <InputBar
        value={currentInput}
        onChangeText={setCurrentInput}
        onSend={handleSend}
        onVoicePress={handleVoicePress}
        onPlusPress={handlePlusPress}
        placeholder="Type a message..."
        disabled={isLoading}
      />
    </KeyboardAvoidingView>
  );
}
