import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";
import { InputBar } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { DysfunctionalCommunicationCard } from "../components/DysfunctionalCommunicationCard";
import { LoopHistoryPanel } from "../components/LoopHistoryPanel";
import { TypingIndicator } from "../components/TypingIndicator";
import { SuggestedReplyCard } from "../components/SuggestedReplyCard";
import { InlineContextInput } from "../components/InlineContextInput";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { SlideOverDrawer } from "../components/SlideOverDrawer";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  generateDysfunctionalCommunicationSummary,
  generateQuickSuggestedReply,
  generateModulatedReplies,
  modifyReplyLength,
  analyzeImageToxicity,
  generateEmotionalAnalysis,
} from "../api/klarity-api";
import { transcribeAudio } from "../api/transcribe-audio";
import {
  ChatMessage,
  TypingMessage,
  SuggestedReplyCardMessage,
  InlineContextInputMessage,
  DysfunctionalCommunicationMessage,
  EmotionalAnalysis,
} from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "ChatScreen">;

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | undefined>();
  const [currentAnalysis, setCurrentAnalysis] = useState<EmotionalAnalysis | null>(null);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>("");
  const [isAwaitingContext, setIsAwaitingContext] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Content area animation values
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const bottomOpacity = useSharedValue(0);
  const bottomTranslateY = useSharedValue(20);

  const CONTENT_TRANSITION_DURATION = 250;
  const CONTENT_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  // Use loops store
  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);
  const insertMessageAfter = useLoopsStore((s) => s.insertMessageAfter);
  const removeMessageFromActiveLoop = useLoopsStore((s) => s.removeMessageFromActiveLoop);
  const updateMessageInActiveLoop = useLoopsStore((s) => s.updateMessageInActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  const messages = useLoopsStore((s) => {
    const activeLoop = s.loops.find((loop) => loop.id === s.activeLoopId);
    return activeLoop?.messages || [];
  });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const bottomAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
    transform: [{ translateY: bottomTranslateY.value }],
  }));

  const navigateToInputScreen = () => {
    navigation.navigate("InputScreen");
  };

  const animateContentOutAndNavigate = (destination: "InputScreen") => {
    contentOpacity.value = withTiming(0, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
    contentTranslateY.value = withTiming(-20, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    }, (finished) => {
      if (finished) {
        runOnJS(navigateToInputScreen)();
      }
    });

    bottomOpacity.value = withTiming(0, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
    bottomTranslateY.value = withTiming(15, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      contentOpacity.value = 0;
      contentTranslateY.value = 30;

      contentOpacity.value = withTiming(1, {
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
      });
      contentTranslateY.value = withTiming(0, {
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
      });

      bottomOpacity.value = 0;
      bottomTranslateY.value = 20;

      bottomOpacity.value = withTiming(1, {
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
      });
      bottomTranslateY.value = withTiming(0, {
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
      });

      const activeLoop = getActiveLoop();
      if (activeLoop && activeLoop.messages.length === 1 && activeLoop.messages[0].role === "user") {
        const firstMessage = activeLoop.messages[0];
        if (!processedMessageIds.current.has(firstMessage.id)) {
          processedMessageIds.current.add(firstMessage.id);
          processUserMessage(firstMessage);
        }
      }

      return () => {};
    }, [])
  );

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  /**
   * SIMPLIFIED FLOW:
   * 1. Dysfunctional Communication Card (brief, neutral framing)
   * 2. Suggested Reply Message Bubble (with shorten/lengthen/tone options)
   * 3. "Need a Different Approach?" Card (appears only after suggested reply)
   */
  const processUserMessage = async (userMessage: ChatMessage) => {
    setIsProcessing(true);
    setIsLoading(true);
    setCurrentUserMessage(userMessage.content);

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg);

      let dysfunctionalSummary: { summary: string; patterns?: string[] };
      let analysis: EmotionalAnalysis | null = null;

      if (userMessage.imageBase64) {
        // Image flow: analyze image first
        const imageAnalysis = await analyzeImageToxicity(userMessage.imageBase64);
        dysfunctionalSummary = await generateDysfunctionalCommunicationSummary(
          userMessage.content,
          imageAnalysis
        );
        // Create mock analysis for reply generation
        analysis = {
          emotionalClarity: 70,
          detectedState: "Concerned",
          relationshipRisk: "medium",
          summary: imageAnalysis.summary,
          tone: "Defensive",
          pattern: "Dysfunctional Communication",
          emotionalImpact: imageAnalysis.emotionalImpact,
          coreIssue: "Communication Pattern",
          fullAnalysis: imageAnalysis.summary,
        };
      } else {
        // Text flow: analyze text
        analysis = await generateEmotionalAnalysis(userMessage.content);
        dysfunctionalSummary = await generateDysfunctionalCommunicationSummary(
          userMessage.content
        );
      }

      setCurrentAnalysis(analysis);

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // STEP 1: Show Dysfunctional Communication Card
      const dysfunctionalMsg: DysfunctionalCommunicationMessage = {
        id: Date.now().toString() + "_dysfunctional",
        role: "dysfunctional-communication",
        content: "",
        timestamp: Date.now(),
        summary: dysfunctionalSummary.summary,
        patterns: dysfunctionalSummary.patterns,
      };
      addMessageToActiveLoop(dysfunctionalMsg);

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Show typing for reply generation
      const typingMsg2: TypingMessage = {
        id: Date.now().toString() + "_typing2",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg2);

      // STEP 2: Generate and show Suggested Reply
      const suggestedReply = await generateQuickSuggestedReply(
        userMessage.content,
        analysis || undefined
      );

      removeMessageFromActiveLoop(typingMsg2.id);

      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_reply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [suggestedReply],
        intention: "maintain", // Default neutral intention
      };
      addMessageToActiveLoop(replyMsg);

    } catch (error) {
      console.error("Error processing message:", error);
      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content: "I encountered an error processing your message. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleSelectReply = (replyText: string) => {
    setCurrentInput(replyText);
  };

  const handleModifyReplyLength = async (
    replyId: string,
    action: "shorten" | "lengthen"
  ) => {
    const replyCardMsg = messages.find(
      (m) => m.role === "suggested-reply-card" &&
        (m as SuggestedReplyCardMessage).replies.some((r) => r.id === replyId)
    ) as SuggestedReplyCardMessage | undefined;

    if (!replyCardMsg) return;

    const reply = replyCardMsg.replies.find((r) => r.id === replyId);
    if (!reply) return;

    try {
      const modifiedText = await modifyReplyLength(
        reply.text,
        action,
        "maintain"
      );

      const updatedReplies = replyCardMsg.replies.map((r) =>
        r.id === replyId ? { ...r, text: modifiedText } : r
      );

      const updatedMsg = {
        ...replyCardMsg,
        replies: updatedReplies,
      };

      updateMessageInActiveLoop(replyCardMsg.id, updatedMsg);
    } catch (error) {
      console.error("Error modifying reply length:", error);
    }
  };

  const handleGenerateDifferentReply = async (currentMessageId: string) => {
    if (!currentAnalysis || !currentUserMessage) return;

    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_different",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    insertMessageAfter(currentMessageId, typingMsg);

    try {
      const newReply = await generateQuickSuggestedReply(
        currentUserMessage,
        currentAnalysis
      );

      removeMessageFromActiveLoop(typingMsg.id);

      const newReplyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_newreply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [newReply],
        intention: "maintain",
      };
      insertMessageAfter(currentMessageId, newReplyMsg);
    } catch (error) {
      console.error("Error generating different reply:", error);
      removeMessageFromActiveLoop(typingMsg.id);
    }
  };

  const handleContextSubmit = async (contextInput: string, isVoice: boolean) => {
    // Remove the inline input
    const inlineInputMsg = messages.find((m) => m.role === "inline-context-input");
    if (inlineInputMsg) {
      removeMessageFromActiveLoop(inlineInputMsg.id);
    }

    let contextText = contextInput;

    if (isVoice) {
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing_transcribe",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg);

      try {
        const transcription = await transcribeAudio(contextInput);
        removeMessageFromActiveLoop(typingMsg.id);

        if (!transcription) {
          addMessageToActiveLoop({
            id: Date.now().toString(),
            role: "assistant",
            content: "Could not transcribe that audio. Please try again with text.",
            timestamp: Date.now(),
          });
          setIsAwaitingContext(false);
          return;
        }

        contextText = transcription;
      } catch (error) {
        removeMessageFromActiveLoop(typingMsg.id);
        setIsAwaitingContext(false);
        return;
      }
    }

    // Add user context as message
    addMessageToActiveLoop({
      id: Date.now().toString(),
      role: "user",
      content: contextText,
      timestamp: Date.now(),
    });

    setIsAwaitingContext(false);

    // Re-analyze with context
    const enrichedMessage = `${currentUserMessage}\n\nAdditional Context: ${contextText}`;

    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_reanalyze",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    try {
      const newAnalysis = await generateEmotionalAnalysis(enrichedMessage);
      setCurrentAnalysis(newAnalysis);

      const dysfunctionalSummary = await generateDysfunctionalCommunicationSummary(enrichedMessage);

      removeMessageFromActiveLoop(typingMsg.id);

      // Show updated dysfunctional communication card
      const dysfunctionalMsg: DysfunctionalCommunicationMessage = {
        id: Date.now().toString() + "_dysfunctional_updated",
        role: "dysfunctional-communication",
        content: "",
        timestamp: Date.now(),
        summary: dysfunctionalSummary.summary,
        patterns: dysfunctionalSummary.patterns,
      };
      addMessageToActiveLoop(dysfunctionalMsg);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate new suggested reply
      const typingMsg2: TypingMessage = {
        id: Date.now().toString() + "_typing_reply",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg2);

      const newReply = await generateQuickSuggestedReply(enrichedMessage, newAnalysis);

      removeMessageFromActiveLoop(typingMsg2.id);

      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_reply_updated",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [newReply],
        intention: "maintain",
      };
      addMessageToActiveLoop(replyMsg);
    } catch (error) {
      console.error("Error re-analyzing:", error);
      removeMessageFromActiveLoop(typingMsg.id);
    }
  };

  const handleContextCancel = () => {
    const inlineInputMsg = messages.find((m) => m.role === "inline-context-input");
    if (inlineInputMsg) {
      removeMessageFromActiveLoop(inlineInputMsg.id);
    }
    setIsAwaitingContext(false);
  };

  const handleSend = async () => {
    if ((!currentInput.trim() && !selectedImageUri) || isLoading) return;

    if (isAwaitingContext) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput,
        timestamp: Date.now(),
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setIsAwaitingContext(false);

      await handleContextSubmit(currentInput, false);
      return;
    }

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

    if (message.role === "dysfunctional-communication") {
      const msg = message as DysfunctionalCommunicationMessage;
      return (
        <DysfunctionalCommunicationCard
          key={message.id}
          summary={msg.summary}
          patterns={msg.patterns}
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
          onModifyLength={handleModifyReplyLength}
          onGenerateDifferent={() => handleGenerateDifferentReply(message.id)}
        />
      );
    }

    if (message.role === "inline-context-input") {
      return (
        <InlineContextInput
          key={message.id}
          onSubmit={handleContextSubmit}
          onCancel={handleContextCancel}
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

  const handleNavigateBack = () => {
    animateContentOutAndNavigate("InputScreen");
  };

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(50)
        .failOffsetX(-50)
        .onEnd((event) => {
          if (event.velocityX > 500 && event.translationX > 80) {
            runOnJS(handleNavigateBack)();
          }
        }),
    []
  );

  const animatedContainerStyle = useAnimatedStyle(() => ({
    flex: 1,
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        <LinearGradient
          colors={["#050608", "#0A0A0C", "#050608"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <SoftFlares />
        <FloatingParticles count={20} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          <Header
            showBackButton
            onBackPress={handleNavigateBack}
            isAnalyzing={isLoading}
            onMenuPress={() => setIsDrawerOpen(true)}
          />

          <Animated.View style={[{ flex: 1 }, contentAnimatedStyle]}>
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              contentContainerClassName="px-4 pt-4"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.map(renderMessage)}
              <View style={{ height: 20 }} />
            </ScrollView>
          </Animated.View>

          <Animated.View style={bottomAnimatedStyle}>
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
          </Animated.View>

          <LoopHistoryPanel
            visible={isHistoryPanelOpen}
            onClose={() => setHistoryPanelOpen(false)}
          />
        </KeyboardAvoidingView>

        <SlideOverDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </Animated.View>
    </GestureDetector>
  );
}
