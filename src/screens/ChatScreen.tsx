import React, { useEffect, useRef, useState, useMemo } from "react";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { Header } from "../components/Header";
import { InputBar } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { AnalysisCard } from "../components/AnalysisCard";
import { SuggestionsCard } from "../components/SuggestionsCard";
import { ImageAnalysisCard } from "../components/ImageAnalysisCard";
import { LoopHistoryPanel } from "../components/LoopHistoryPanel";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  generateEmotionalAnalysis,
  generateSuggestedResponses,
  generateChatResponse,
  analyzeImageToxicity,
} from "../api/klarity-api";
import {
  ChatMessage,
  AnalysisMessage,
  SuggestionsMessage,
  SuggestedResponse,
  ImageAnalysisMessage,
} from "../types/chat";

type Props = NativeStackScreenProps<RootStackParamList, "ChatScreen">;

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | undefined>();

  // Shared values for swipe transition
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Use loops store instead of chat store
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  const activeLoop = getActiveLoop();
  const messages = activeLoop?.messages || [];

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
      // Check if this is an image message
      if (userMessage.imageBase64) {
        // For image messages, analyze for toxic communication
        const tempAnalyzing: ChatMessage = {
          id: Date.now().toString() + "_analyzing",
          role: "assistant",
          content: "Analyzing screenshot for toxic or dysfunctional communication...",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(tempAnalyzing);

        // Analyze the image
        const imageAnalysis = await analyzeImageToxicity(userMessage.imageBase64);

        // Remove the temp analyzing message and add the real analysis
        const analysisMessage: ImageAnalysisMessage = {
          id: Date.now().toString() + "_image_analysis",
          role: "image-analysis",
          content: "",
          timestamp: Date.now(),
          analysis: imageAnalysis,
        };
        addMessageToActiveLoop(analysisMessage);
      } else {
        // For text messages, do normal emotional analysis
        // Generate AI response
        const aiResponse = await generateChatResponse(userMessage.content, []);
        addMessageToActiveLoop({
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
        addMessageToActiveLoop(analysisMessage);

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
        addMessageToActiveLoop(suggestionsMessage);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      addMessageToActiveLoop({
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
    if ((!currentInput.trim() && !selectedImageUri) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput || "[Image]",
      timestamp: Date.now(),
      imageUrl: selectedImageUri,
      imageBase64: selectedImageBase64,
    };

    addMessageToActiveLoop(userMessage);
    setCurrentInput("");
    setSelectedImageUri(undefined);
    setSelectedImageBase64(undefined);

    // Process the message
    await processUserMessage(userMessage);
  };

  const handleImageSelected = (uri: string, base64: string) => {
    setSelectedImageUri(uri);
    setSelectedImageBase64(base64);
  };

  const handleClearImage = () => {
    setSelectedImageUri(undefined);
    setSelectedImageBase64(undefined);
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

    if (message.role === "image-analysis") {
      const imageAnalysisMsg = message as ImageAnalysisMessage;
      return (
        <ImageAnalysisCard
          key={message.id}
          analysis={imageAnalysisMsg.analysis}
        />
      );
    }

    return (
      <MessageBubble
        key={message.id}
        role={message.role as "user" | "assistant"}
        content={message.content}
        timestamp={message.timestamp}
        imageUrl={message.imageUrl}
      />
    );
  };

  // Handler for navigating back (must be wrapped with runOnJS)
  const handleNavigateBack = () => {
    navigation.navigate("InputScreen");
  };

  // Swipe gesture to go back to home screen with animation
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(50) // Only trigger when swiping right with at least 50px
        .failOffsetX(-50) // Fail if swiping left
        .onUpdate((event) => {
          // Only allow right swipes (positive translationX)
          if (event.translationX > 0) {
            translateX.value = event.translationX;
            // Scale down as user swipes (from 1 to 0.9)
            scale.value = interpolate(
              event.translationX,
              [0, 300],
              [1, 0.9],
              Extrapolate.CLAMP
            );
          }
        })
        .onEnd((event) => {
          // If user swiped right with sufficient distance and velocity
          if (event.velocityX > 500 && event.translationX > 100) {
            // Animate off screen
            translateX.value = withTiming(400, { duration: 200 });
            scale.value = withTiming(0.85, { duration: 200 });
            // Navigate after animation
            setTimeout(() => runOnJS(handleNavigateBack)(), 200);
          } else {
            // Spring back to original position
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            scale.value = withSpring(1, { damping: 20, stiffness: 300 });
          }
        }),
    [navigation]
  );

  // Animated style for the swipe transition
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black"
          keyboardVerticalOffset={0}
        >
          <Header showBackButton />

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
            onImageSelected={handleImageSelected}
            onClearImage={handleClearImage}
            selectedImageUri={selectedImageUri}
            placeholder="Type a message..."
            disabled={isLoading}
          />

          {/* History Panel */}
          <LoopHistoryPanel
            visible={isHistoryPanelOpen}
            onClose={() => setHistoryPanelOpen(false)}
          />
        </KeyboardAvoidingView>
      </Animated.View>
    </GestureDetector>
  );
}
