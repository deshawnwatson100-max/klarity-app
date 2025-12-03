import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
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
import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";
import { InputBar } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { ImageAnalysisCard } from "../components/ImageAnalysisCard";
import { LoopHistoryPanel } from "../components/LoopHistoryPanel";
import { TypingIndicator } from "../components/TypingIndicator";
import { EmotionalValidationBubble } from "../components/EmotionalValidationBubble";
import { QuickSummaryBubble } from "../components/QuickSummaryBubble";
import { DeepAnalysisBubble } from "../components/DeepAnalysisBubble";
import { DirectionSelectorBubble } from "../components/DirectionSelectorBubble";
import { TailoredGuidanceBubble } from "../components/TailoredGuidanceBubble";
import { SuggestedReplyCard } from "../components/SuggestedReplyCard";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  generateEmotionalAnalysis,
  generateEmotionalValidation,
  generateTailoredGuidance,
  generateIntentionBasedReplies,
  analyzeImageToxicity,
} from "../api/klarity-api";
import {
  ChatMessage,
  TypingMessage,
  EmotionalValidationMessage,
  QuickSummaryMessage,
  DeepAnalysisMessage,
  DirectionSelectorMessage,
  TailoredGuidanceMessage,
  SuggestedReplyCardMessage,
  ImageAnalysisMessage,
  EmotionalAnalysis,
} from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "ChatScreen">;
type IntentionType = "improve" | "distance" | "maintain" | "clarity";

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | undefined>();
  const [currentAnalysis, setCurrentAnalysis] = useState<EmotionalAnalysis | null>(null);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>("");

  // Shared values for swipe transition
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Use loops store
  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);
  const updateMessageInActiveLoop = useLoopsStore((s) => s.updateMessageInActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  // Get active loop
  const activeLoop = getActiveLoop();
  const messages = activeLoop?.messages || [];

  // Reset animation values when screen is focused
  useEffect(() => {
    translateX.value = 0;
    scale.value = 1;
    opacity.value = 1;
  }, []);

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
    setCurrentUserMessage(userMessage.content);

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
        // For text messages, do inline emotional analysis flow
        await startInlineAnalysisFlow(userMessage.content);
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

  const startInlineAnalysisFlow = async (userMessageContent: string) => {
    // Step 1: Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    // Wait briefly for animation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Step 2: Generate and show emotional validation
    const validation = await generateEmotionalValidation(userMessageContent);
    const validationMsg: EmotionalValidationMessage = {
      id: Date.now().toString() + "_validation",
      role: "emotional-validation",
      content: validation,
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(validationMsg);

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Step 3: Show typing again
    const typingMsg2: TypingMessage = {
      id: Date.now().toString() + "_typing2",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg2);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Step 4: Generate and show analysis
    const analysis = await generateEmotionalAnalysis(userMessageContent);
    setCurrentAnalysis(analysis);

    // Show quick summary
    const summaryMsg: QuickSummaryMessage = {
      id: Date.now().toString() + "_summary",
      role: "quick-summary",
      content: "",
      timestamp: Date.now(),
      tone: analysis.tone || "Mixed",
      pattern: analysis.pattern || "Complex interaction",
      emotionalImpact: analysis.emotionalImpact || "Moderate confusion",
      coreIssue: analysis.coreIssue || "Communication mismatch",
    };
    addMessageToActiveLoop(summaryMsg);

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Step 5: Show deep analysis
    const deepAnalysisMsg: DeepAnalysisMessage = {
      id: Date.now().toString() + "_deep",
      role: "deep-analysis",
      content: analysis.fullAnalysis || analysis.summary,
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(deepAnalysisMsg);

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Step 6: Show direction selector
    const directionMsg: DirectionSelectorMessage = {
      id: Date.now().toString() + "_direction",
      role: "direction-selector",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(directionMsg);
  };

  const handleSelectIntention = async (intention: IntentionType) => {
    if (!currentAnalysis) return;

    // Update the direction selector message to show selection
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "direction-selector") {
      const updated: DirectionSelectorMessage = {
        ...lastMsg,
        selectedIntention: intention,
      } as DirectionSelectorMessage;
      updateMessageInActiveLoop(lastMsg.id, updated);
    }

    await new Promise((resolve) => setTimeout(resolve, 400));

    // Show typing
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing3",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Generate and show tailored guidance
    const guidance = await generateTailoredGuidance(
      currentUserMessage,
      intention,
      currentAnalysis
    );
    const guidanceMsg: TailoredGuidanceMessage = {
      id: Date.now().toString() + "_guidance",
      role: "tailored-guidance",
      content: guidance,
      timestamp: Date.now(),
      intention,
    };
    addMessageToActiveLoop(guidanceMsg);

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Generate and show suggested replies
    const replies = await generateIntentionBasedReplies(
      currentUserMessage,
      intention,
      currentAnalysis
    );
    const repliesMsg: SuggestedReplyCardMessage = {
      id: Date.now().toString() + "_replies",
      role: "suggested-reply-card",
      content: "",
      timestamp: Date.now(),
      replies,
      intention,
    };
    addMessageToActiveLoop(repliesMsg);
  };

  const handleSelectReply = (replyText: string) => {
    setCurrentInput(replyText);
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

  const handleVoicePress = () => {
    console.log("Voice input pressed");
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.role === "typing") {
      return <TypingIndicator key={message.id} />;
    }

    if (message.role === "emotional-validation") {
      const msg = message as EmotionalValidationMessage;
      return <EmotionalValidationBubble key={message.id} content={msg.content} />;
    }

    if (message.role === "quick-summary") {
      const msg = message as QuickSummaryMessage;
      return (
        <QuickSummaryBubble
          key={message.id}
          tone={msg.tone}
          pattern={msg.pattern}
          emotionalImpact={msg.emotionalImpact}
          coreIssue={msg.coreIssue}
        />
      );
    }

    if (message.role === "deep-analysis") {
      const msg = message as DeepAnalysisMessage;
      return <DeepAnalysisBubble key={message.id} content={msg.content} />;
    }

    if (message.role === "direction-selector") {
      const msg = message as DirectionSelectorMessage;
      return (
        <DirectionSelectorBubble
          key={message.id}
          onSelectIntention={handleSelectIntention}
          selectedIntention={msg.selectedIntention}
        />
      );
    }

    if (message.role === "tailored-guidance") {
      const msg = message as TailoredGuidanceMessage;
      return (
        <TailoredGuidanceBubble
          key={message.id}
          content={msg.content}
          intention={msg.intention}
        />
      );
    }

    if (message.role === "suggested-reply-card") {
      const msg = message as SuggestedReplyCardMessage;
      return (
        <SuggestedReplyCard
          key={message.id}
          replies={msg.replies}
          intention={msg.intention}
          onSelectReply={handleSelectReply}
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

  // Handler for navigating back
  const handleNavigateBack = () => {
    navigation.navigate("InputScreen");
  };

  // Swipe gesture to go back
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(50)
        .failOffsetX(-50)
        .onUpdate((event) => {
          if (event.translationX > 0) {
            translateX.value = event.translationX;
            scale.value = interpolate(
              event.translationX,
              [0, 150],
              [1, 0.92],
              Extrapolate.CLAMP
            );
            opacity.value = interpolate(
              event.translationX,
              [0, 100],
              [1, 0.7],
              Extrapolate.CLAMP
            );
          }
        })
        .onEnd((event) => {
          if (event.velocityX > 500 && event.translationX > 100) {
            translateX.value = withTiming(400, { duration: 120 }, (finished) => {
              if (finished) {
                runOnJS(handleNavigateBack)();
              }
            });
            scale.value = withTiming(0.85, { duration: 120 });
            opacity.value = withTiming(0, { duration: 120 });
          } else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            scale.value = withSpring(1, { damping: 20, stiffness: 300 });
            opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
          }
        }),
    [navigation]
  );

  // Animated style for swipe transition
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      shadowOpacity: interpolate(
        translateX.value,
        [0, 400],
        [0, 0.3],
        Extrapolate.CLAMP
      ),
      shadowRadius: 20,
      shadowColor: "#000000",
    };
  });

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        {/* Deep charcoal gradient background with Klarity brand colors */}
        <LinearGradient
          colors={["#0E0E0F", "#171717", "#0E0E0F"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        {/* Ambient background effects */}
        <SoftFlares />
        <FloatingParticles count={20} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
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
                <ActivityIndicator size="small" color="#B47CFF" />
                <Text className="text-neutral-400 text-sm">
                  Processing...
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
