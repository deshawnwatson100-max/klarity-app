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
import { useFocusEffect } from "@react-navigation/native";
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
import { ToneSelectionBubble } from "../components/ToneSelectionBubble";
import { TailoredGuidanceBubble } from "../components/TailoredGuidanceBubble";
import { SuggestedReplyCard } from "../components/SuggestedReplyCard";
import { EmotionalFaceScanBubble } from "../components/EmotionalFaceScanBubble";
import { FaceScanPromptBubble } from "../components/FaceScanPromptBubble";
import { EmotionalClaritySummaryBubble } from "../components/EmotionalClaritySummaryBubble";
import { ToneModulationCard } from "../components/ToneModulationCard";
import { ModulatedRepliesCard } from "../components/ModulatedRepliesCard";
import { AddContextButton } from "../components/AddContextButton";
import { InlineContextInput } from "../components/InlineContextInput";
import { ReflectiveUnderstandingBubble } from "../components/ReflectiveUnderstandingBubble";
import { ContextOrDirectionChoice } from "../components/ContextOrDirectionChoice";
import { VoiceEmotionScanBubble } from "../components/VoiceEmotionScanBubble";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  generateEmotionalAnalysis,
  generateEmotionalValidation,
  generateTailoredGuidance,
  generateIntentionBasedReplies,
  generateModulatedReplies,
  generateReflectiveUnderstanding,
  modifyReplyLength,
  analyzeImageToxicity,
  analyzeVoiceEmotion,
} from "../api/klarity-api";
import { transcribeAudio } from "../api/transcribe-audio";
import {
  ChatMessage,
  TypingMessage,
  EmotionalValidationMessage,
  QuickSummaryMessage,
  DeepAnalysisMessage,
  DirectionSelectorMessage,
  ToneSelectorMessage,
  TailoredGuidanceMessage,
  SuggestedReplyCardMessage,
  ImageAnalysisMessage,
  FaceScanPromptMessage,
  FaceScanCardMessage,
  EmotionScanResultMessage,
  ToneModulationCardMessage,
  ModulatedRepliesCardMessage,
  AddContextButtonMessage,
  InlineContextInputMessage,
  ReflectiveUnderstandingMessage,
  ContextOrDirectionChoiceMessage,
  VoiceEmotionScanResultMessage,
  EmotionalAnalysis,
} from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "ChatScreen">;
type IntentionType = "improve" | "distance" | "maintain" | "clarity";
type ToneType = "calm" | "direct" | "empathetic" | "assertive";

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const hasProcessedInitialMessage = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | undefined>();
  const [currentAnalysis, setCurrentAnalysis] = useState<EmotionalAnalysis | null>(null);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>("");
  const [currentIntention, setCurrentIntention] = useState<IntentionType | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isAwaitingContext, setIsAwaitingContext] = useState(false);
  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [isVoiceMessage, setIsVoiceMessage] = useState(false);

  // Shared values for swipe transition
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Use loops store
  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);
  const removeMessageFromActiveLoop = useLoopsStore((s) => s.removeMessageFromActiveLoop);
  const updateMessageInActiveLoop = useLoopsStore((s) => s.updateMessageInActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  // Get active loop messages - subscribe to loops array to trigger re-renders
  const messages = useLoopsStore((s) => {
    const activeLoop = s.loops.find((loop) => loop.id === s.activeLoopId);
    return activeLoop?.messages || [];
  });

  // Reset animation values when screen is focused
  useEffect(() => {
    translateX.value = 0;
    scale.value = 1;
    opacity.value = 1;
  }, []);

  // Reset processing refs when navigating to this screen
  useFocusEffect(
    React.useCallback(() => {
      // When screen comes into focus, check if we need to process the initial message
      const activeLoop = getActiveLoop();
      if (activeLoop && activeLoop.messages.length === 1 && activeLoop.messages[0].role === "user") {
        const firstMessage = activeLoop.messages[0];
        if (!processedMessageIds.current.has(firstMessage.id)) {
          console.log("[ChatScreen] Processing initial message on focus:", firstMessage.id);
          processedMessageIds.current.add(firstMessage.id);
          processUserMessage(firstMessage);
        }
      }

      return () => {
        // Cleanup when screen loses focus
        console.log("[ChatScreen] Screen lost focus");
      };
    }, [])
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const processUserMessage = async (userMessage: ChatMessage) => {
    console.log("[ChatScreen] processUserMessage called for:", userMessage.id, "isVoice:", userMessage.isVoiceMessage);

    setIsProcessing(true);
    setIsLoading(true);
    setCurrentUserMessage(userMessage.content);

    try {
      // Check if this is a voice message - trigger voice emotion analysis
      if (userMessage.isVoiceMessage) {
        console.log("[ChatScreen] Processing voice message");
        // Show typing indicator while analyzing
        const typingMsg: TypingMessage = {
          id: Date.now().toString() + "_typing_voice",
          role: "typing",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(typingMsg);

        // Analyze voice emotion
        const voiceEmotionAnalysis = await analyzeVoiceEmotion(userMessage.content);
        console.log("[ChatScreen] Voice emotion analysis complete");

        // Remove typing indicator
        removeMessageFromActiveLoop(typingMsg.id);

        // Add voice emotion scan result
        const voiceEmotionMsg: VoiceEmotionScanResultMessage = {
          id: Date.now().toString() + "_voice_emotion",
          role: "voice-emotion-scan-result",
          content: "",
          timestamp: Date.now(),
          voiceEmotionAnalysis,
        };
        addMessageToActiveLoop(voiceEmotionMsg);

        // Create emotional analysis from voice analysis for later use
        const mockAnalysis: EmotionalAnalysis = {
          emotionalClarity: 75,
          detectedState: voiceEmotionAnalysis.primaryEmotions,
          relationshipRisk: "medium",
          summary: voiceEmotionAnalysis.contextUnderstanding,
          tone: "Emotional",
          pattern: "Voice Expression",
          emotionalImpact: voiceEmotionAnalysis.emotionalMeaningSummary,
          coreIssue: voiceEmotionAnalysis.primaryEmotions,
          fullAnalysis: voiceEmotionAnalysis.supportiveReflection,
        };
        setCurrentAnalysis(mockAnalysis);
      } else if (userMessage.imageBase64) {
        // For image messages, show typing indicator while analyzing
        const typingMsg: TypingMessage = {
          id: Date.now().toString() + "_typing_image",
          role: "typing",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(typingMsg);

        // Analyze the image
        const imageAnalysis = await analyzeImageToxicity(userMessage.imageBase64);

        // Remove typing indicator and add the real analysis
        removeMessageFromActiveLoop(typingMsg.id);

        const analysisMessage: ImageAnalysisMessage = {
          id: Date.now().toString() + "_image_analysis",
          role: "image-analysis",
          content: "",
          timestamp: Date.now(),
          analysis: imageAnalysis,
        };
        addMessageToActiveLoop(analysisMessage);

        // Create a mock emotional analysis for the guidance generation
        const mockAnalysis: EmotionalAnalysis = {
          emotionalClarity: 75,
          detectedState: "Concerned",
          relationshipRisk: "medium",
          summary: imageAnalysis.summary,
          tone: "Defensive",
          pattern: "Dysfunctional Communication",
          emotionalImpact: imageAnalysis.emotionalImpact,
          coreIssue: "Toxic Communication Patterns",
          fullAnalysis: imageAnalysis.summary,
        };
        setCurrentAnalysis(mockAnalysis);

        // After image analysis, show add context button
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Show choice: Add Context OR Choose Direction
        const choiceMsg: ContextOrDirectionChoiceMessage = {
          id: Date.now().toString() + "_choice_image",
          role: "context-or-direction-choice",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(choiceMsg);
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

    // Step 2: Remove typing indicator and show emotional validation
    removeMessageFromActiveLoop(typingMsg.id);

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

    // Step 4: Remove typing indicator and generate analysis
    removeMessageFromActiveLoop(typingMsg2.id);

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

    await new Promise((resolve) => setTimeout(resolve, 400));

    // Show choice: Add Context OR Choose Direction
    const choiceMsg: ContextOrDirectionChoiceMessage = {
      id: Date.now().toString() + "_choice_text",
      role: "context-or-direction-choice",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(choiceMsg);
  };

  const handleSelectIntention = async (intention: IntentionType) => {
    if (!currentAnalysis) return;

    // Store the selected intention
    setCurrentIntention(intention);

    // Update the direction selector message to show selection
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "direction-selector") {
      const updated: DirectionSelectorMessage = {
        ...lastMsg,
        selectedIntention: intention,
      } as DirectionSelectorMessage;
      updateMessageInActiveLoop(lastMsg.id, updated);
    }

    // Show tone selector immediately
    const toneSelectorMsg: ToneSelectorMessage = {
      id: Date.now().toString() + "_tone",
      role: "tone-selector",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(toneSelectorMsg);
  };

  const handleSelectTone = async (tone: ToneType) => {
    if (!currentAnalysis || !currentIntention || isGeneratingSuggestions) return;

    // Prevent duplicate calls
    setIsGeneratingSuggestions(true);

    // Update the tone selector message to show selection
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "tone-selector") {
      const updated: ToneSelectorMessage = {
        ...lastMsg,
        selectedTone: tone,
      } as ToneSelectorMessage;
      updateMessageInActiveLoop(lastMsg.id, updated);
    }

    // Show typing indicator while generating
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_tone",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    try {
      // Generate and show tailored guidance
      const guidance = await generateTailoredGuidance(
        currentUserMessage,
        currentIntention,
        currentAnalysis
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      const guidanceMsg: TailoredGuidanceMessage = {
        id: Date.now().toString() + "_guidance",
        role: "tailored-guidance",
        content: guidance,
        timestamp: Date.now(),
        intention: currentIntention,
      };
      addMessageToActiveLoop(guidanceMsg);

      // Generate and show suggested replies with tone
      const replies = await generateIntentionBasedReplies(
        currentUserMessage,
        currentIntention,
        currentAnalysis
      );
      const repliesMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_replies",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies,
        intention: currentIntention,
        tone,
      };
      addMessageToActiveLoop(repliesMsg);

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Show tone modulation card
      const toneModMsg: ToneModulationCardMessage = {
        id: Date.now().toString() + "_tonemod",
        role: "tone-modulation-card",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(toneModMsg);

      await new Promise((resolve) => setTimeout(resolve, 600));

      // Show face scan prompt (tappable bubble)
      const faceScanPromptMsg: FaceScanPromptMessage = {
        id: Date.now().toString() + "_facescanprompt",
        role: "face-scan-prompt",
        content: "",
        timestamp: Date.now(),
        isExpanded: false,
      };
      addMessageToActiveLoop(faceScanPromptMsg);
    } catch (error) {
      // Remove typing indicator on error
      removeMessageFromActiveLoop(typingMsg.id);
      throw error;
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSelectReply = (replyText: string) => {
    setCurrentInput(replyText);
  };

  const handleModifyReplyLength = async (
    replyId: string,
    action: "shorten" | "lengthen"
  ) => {
    if (!currentIntention) return;

    // Find the reply card message and the specific reply
    const replyCardMsg = messages.find(
      (m) =>
        (m.role === "suggested-reply-card" ||
          m.role === "modulated-replies-card") &&
        (m as SuggestedReplyCardMessage).replies.some((r) => r.id === replyId)
    ) as SuggestedReplyCardMessage | undefined;

    if (!replyCardMsg) return;

    const reply = replyCardMsg.replies.find((r) => r.id === replyId);
    if (!reply) return;

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_modify",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    try {
      // Modify the reply length
      const modifiedText = await modifyReplyLength(
        reply.text,
        action,
        currentIntention
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Update the reply in the message
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
      removeMessageFromActiveLoop(typingMsg.id);
    }
  };

  const handleToneModulation = async (
    tone: "direct" | "gentle" | "neutral"
  ) => {
    if (!currentAnalysis || !currentIntention) return;

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_modulation",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    try {
      // Generate modulated replies with guidance notes
      const modulatedReplies = await generateModulatedReplies(
        currentUserMessage,
        currentIntention,
        currentAnalysis,
        tone
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add modulated replies card
      const modulatedMsg: ModulatedRepliesCardMessage = {
        id: Date.now().toString() + "_modulated",
        role: "modulated-replies-card",
        content: "",
        timestamp: Date.now(),
        replies: modulatedReplies,
        tone,
      };
      addMessageToActiveLoop(modulatedMsg);
    } catch (error) {
      console.error("Error generating modulated replies:", error);
      removeMessageFromActiveLoop(typingMsg.id);
    }
  };

  const handleAddContext = async () => {
    // Remove the choice message
    const choiceMsg = messages.find(
      (m) => m.role === "context-or-direction-choice"
    );
    if (choiceMsg) {
      removeMessageFromActiveLoop(choiceMsg.id);
    }

    // Set flag that we're awaiting context
    setIsAwaitingContext(true);

    // Show inline context input
    const inlineInputMsg: InlineContextInputMessage = {
      id: Date.now().toString() + "_inline_context",
      role: "inline-context-input",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(inlineInputMsg);
  };

  const handleSkipToDirection = async () => {
    console.log("handleSkipToDirection called");

    // Remove the choice message
    const choiceMsg = messages.find(
      (m) => m.role === "context-or-direction-choice"
    );
    console.log("Found choice message:", choiceMsg?.id);

    if (choiceMsg) {
      removeMessageFromActiveLoop(choiceMsg.id);
    }

    // Show direction selector immediately
    const directionMsg: DirectionSelectorMessage = {
      id: Date.now().toString() + "_direction",
      role: "direction-selector",
      content: "",
      timestamp: Date.now(),
    };
    console.log("Adding direction message:", directionMsg.id);
    addMessageToActiveLoop(directionMsg);
  };

  const handleContextSubmit = async (contextInput: string, isVoice: boolean) => {
    // Remove the inline input
    const inlineInputMsg = messages.find(
      (m) => m.role === "inline-context-input"
    );
    if (inlineInputMsg) {
      removeMessageFromActiveLoop(inlineInputMsg.id);
    }

    let contextText = contextInput;

    // If voice, transcribe first
    if (isVoice) {
      // Show typing indicator for transcription
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
            content:
              "I'm sorry, I couldn't transcribe that audio. Please try again with text input.",
            timestamp: Date.now(),
          });
          setIsAwaitingContext(false);
          return;
        }

        contextText = transcription;
      } catch (error) {
        console.error("Transcription error:", error);
        removeMessageFromActiveLoop(typingMsg.id);
        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I'm sorry, I couldn't transcribe that audio. Please try again.",
          timestamp: Date.now(),
        });
        setIsAwaitingContext(false);
        return;
      }
    }

    // Add user's context as a message
    addMessageToActiveLoop({
      id: Date.now().toString(),
      role: "user",
      content: contextText,
      timestamp: Date.now(),
    });

    setAdditionalContext(contextText);
    setIsAwaitingContext(false);

    // Re-analyze with additional context
    await handleReanalyzeWithContext(contextText);
  };

  const handleContextCancel = () => {
    // Remove the inline input
    const inlineInputMsg = messages.find(
      (m) => m.role === "inline-context-input"
    );
    if (inlineInputMsg) {
      removeMessageFromActiveLoop(inlineInputMsg.id);
    }
    setIsAwaitingContext(false);
  };

  const handleSend = async () => {
    if ((!currentInput.trim() && !selectedImageUri) || isLoading) return;

    // Check if we're awaiting context for re-analysis
    if (isAwaitingContext) {
      // Store additional context
      setAdditionalContext(currentInput);

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput,
        timestamp: Date.now(),
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setIsAwaitingContext(false);

      // Re-analyze with additional context
      await handleReanalyzeWithContext(currentInput);
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

    // Process the message
    await processUserMessage(userMessage);
  };

  const handleReanalyzeWithContext = async (contextInfo: string) => {
    console.log("handleReanalyzeWithContext called with context:", contextInfo);
    console.log("currentAnalysis:", currentAnalysis);
    console.log("currentIntention:", currentIntention);
    console.log("currentUserMessage:", currentUserMessage);

    if (!currentAnalysis) {
      console.warn("Missing currentAnalysis - cannot reanalyze");
      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content:
          "I apologize, but I need the initial analysis first before adding more context. Please complete the analysis flow.",
        timestamp: Date.now(),
      });
      return;
    }

    setIsLoading(true);

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_reanalyze",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    try {
      // Combine original message with additional context
      const enrichedMessage = `${currentUserMessage}\n\nAdditional Context: ${contextInfo}`;

      // Re-generate emotional analysis with context
      const reanalysis = await generateEmotionalAnalysis(enrichedMessage);
      setCurrentAnalysis(reanalysis);

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      console.log("Generating reflective understanding...");
      // Generate reflective understanding (two-part response)
      const reflectiveResponse = await generateReflectiveUnderstanding(
        currentUserMessage,
        contextInfo,
        reanalysis
      );
      console.log("Reflective response:", reflectiveResponse);

      // Show reflective understanding bubble
      const reflectiveMsg: ReflectiveUnderstandingMessage = {
        id: Date.now().toString() + "_reflective",
        role: "reflective-understanding",
        content: "",
        timestamp: Date.now(),
        reflectiveUnderstanding: reflectiveResponse.reflectiveUnderstanding,
        situationClarity: reflectiveResponse.situationClarity,
      };
      addMessageToActiveLoop(reflectiveMsg);

      await new Promise((resolve) => setTimeout(resolve, 600));

      // Show direction selector after reflective understanding
      const directionMsg: DirectionSelectorMessage = {
        id: Date.now().toString() + "_direction_after_context",
        role: "direction-selector",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(directionMsg);
    } catch (error) {
      console.error("Error re-analyzing with context:", error);
      removeMessageFromActiveLoop(typingMsg.id);

      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content:
          "I apologize, but I encountered an error re-analyzing. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
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

  const handleBeginFaceScan = () => {
    // Navigate to EmotionScanScreen for face scanning
    navigation.navigate("EmotionScanScreen");
  };

  const handleExpandFaceScan = (messageId: string) => {
    // Update the message to mark it as expanded
    const activeLoop = getActiveLoop();
    if (activeLoop) {
      const message = activeLoop.messages.find((msg) => msg.id === messageId);
      if (message && message.role === "face-scan-prompt") {
        updateMessageInActiveLoop(messageId, { ...message, isExpanded: true });
      }
    }
  };

  const handleMinimizeFaceScan = (messageId: string) => {
    // Update the message to mark it as collapsed
    const activeLoop = getActiveLoop();
    if (activeLoop) {
      const message = activeLoop.messages.find((msg) => msg.id === messageId);
      if (message && message.role === "face-scan-prompt") {
        updateMessageInActiveLoop(messageId, { ...message, isExpanded: false });
      }
    }
  };

  const handleEmotionFollowUp = async (action: string) => {
    // Handle micro-flow actions from emotion scan
    switch (action) {
      case "explore":
        // A) Explore this feeling - Ask reflective question
        const exploreMsg: TypingMessage = {
          id: Date.now().toString() + "_typing_explore",
          role: "typing",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(exploreMsg);

        await new Promise((resolve) => setTimeout(resolve, 1200));
        removeMessageFromActiveLoop(exploreMsg.id);

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Let me ask you this: What situation or interaction do you think might have triggered this feeling? Sometimes understanding the trigger helps us see the emotion more clearly.",
          timestamp: Date.now(),
        });

        await new Promise((resolve) => setTimeout(resolve, 800));

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Would you like clarity on how to process this, a calm reply to send, or deeper insight into this emotion?",
          timestamp: Date.now(),
        });
        break;

      case "connect":
        // B) Connect it to your situation - Link emotion to context
        const connectMsg: TypingMessage = {
          id: Date.now().toString() + "_typing_connect",
          role: "typing",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(connectMsg);

        await new Promise((resolve) => setTimeout(resolve, 1200));
        removeMessageFromActiveLoop(connectMsg.id);

        // Get the user's last message for context
        const lastUserMsg = messages
          .slice()
          .reverse()
          .find((m) => m.role === "user");
        const contextContent = lastUserMsg?.content || "your situation";

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content: `Looking at ${contextContent}, this emotional state might be influencing how you perceive the situation. When we feel this way, it can shape our tone, decision-making, and reactions — sometimes making things feel more intense than they need to be.`,
          timestamp: Date.now(),
        });

        await new Promise((resolve) => setTimeout(resolve, 800));

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Would you like a suggested response to send, or deeper clarity on how this emotion is affecting your perspective?",
          timestamp: Date.now(),
        });
        break;

      case "log":
        // C) Log this for insight later - Save to calendar
        const logMsg: TypingMessage = {
          id: Date.now().toString() + "_typing_log",
          role: "typing",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(logMsg);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        removeMessageFromActiveLoop(logMsg.id);

        // Get emotion scan result from messages
        const emotionScanMsg = messages
          .slice()
          .reverse()
          .find((m) => m.role === "emotion-scan-result") as
          | EmotionScanResultMessage
          | undefined;

        const emotion = emotionScanMsg?.emotionAnalysis.primaryEmotion || "Mixed emotions";
        const intensity = emotionScanMsg?.emotionAnalysis.emotionalIntensity || 50;
        const timestamp = new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content: `Logged to your calendar: "${emotion}" (Intensity: ${intensity}%) at ${timestamp} today. This emotional snapshot has been saved for pattern tracking.`,
          timestamp: Date.now(),
        });

        await new Promise((resolve) => setTimeout(resolve, 600));

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "You can view this scan in your calendar and compare it with past patterns. Would you like to see your emotional trends now?",
          timestamp: Date.now(),
        });
        break;

      default:
        break;
    }
  };

  const handleVoiceEmotionFollowUp = async (action: string) => {
    // Handle follow-up actions from voice emotion analysis
    switch (action) {
      case "add-context":
        // User wants to add more context
        handleAddContext();
        break;

      case "choose-direction":
        // User wants to choose relationship direction
        handleSkipToDirection();
        break;

      case "generate-replies":
        // User wants reply suggestions - need to pick direction first
        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "To generate the best reply suggestions for you, I first need to understand your relationship intention. Let me ask you to choose your direction.",
          timestamp: Date.now(),
        });

        await new Promise((resolve) => setTimeout(resolve, 600));

        handleSkipToDirection();
        break;

      case "check-outcomes":
        // User wants to check possible outcomes
        const typingMsg: TypingMessage = {
          id: Date.now().toString() + "_typing_outcomes",
          role: "typing",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(typingMsg);

        await new Promise((resolve) => setTimeout(resolve, 1500));
        removeMessageFromActiveLoop(typingMsg.id);

        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "assistant",
          content:
            "To give you the most accurate outcome analysis, I need to know: what direction do you want to take with this relationship? This will help me show you how different approaches might play out.",
          timestamp: Date.now(),
        });

        await new Promise((resolve) => setTimeout(resolve, 600));

        handleSkipToDirection();
        break;

      default:
        break;
    }
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

    if (message.role === "tone-selector") {
      const msg = message as ToneSelectorMessage;
      return (
        <ToneSelectionBubble
          key={message.id}
          onSelectTone={handleSelectTone}
          selectedTone={msg.selectedTone}
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
          onModifyLength={handleModifyReplyLength}
        />
      );
    }

    if (message.role === "tone-modulation-card") {
      return (
        <ToneModulationCard
          key={message.id}
          onToneSelect={handleToneModulation}
          selectedIntention={currentIntention || undefined}
        />
      );
    }

    if (message.role === "modulated-replies-card") {
      const msg = message as ModulatedRepliesCardMessage;
      return (
        <ModulatedRepliesCard
          key={message.id}
          replies={msg.replies}
          tone={msg.tone}
          onSelectReply={handleSelectReply}
          selectedIntention={currentIntention || undefined}
          onModifyLength={handleModifyReplyLength}
        />
      );
    }

    if (message.role === "add-context-button") {
      return (
        <AddContextButton
          key={message.id}
          onPress={handleAddContext}
          selectedIntention={currentIntention || undefined}
        />
      );
    }

    if (message.role === "inline-context-input") {
      return (
        <InlineContextInput
          key={message.id}
          onSubmit={handleContextSubmit}
          onCancel={handleContextCancel}
          selectedIntention={currentIntention || undefined}
        />
      );
    }

    if (message.role === "reflective-understanding") {
      const reflectiveMsg = message as ReflectiveUnderstandingMessage;
      return (
        <ReflectiveUnderstandingBubble
          key={message.id}
          reflectiveUnderstanding={reflectiveMsg.reflectiveUnderstanding}
          situationClarity={reflectiveMsg.situationClarity}
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

    if (message.role === "face-scan-prompt") {
      const promptMsg = message as FaceScanPromptMessage;
      console.log("[ChatScreen] Rendering face-scan-prompt, isExpanded:", promptMsg.isExpanded);

      if (promptMsg.isExpanded) {
        // Show the full face scan card when expanded
        console.log("[ChatScreen] Rendering expanded face scan card");
        return (
          <EmotionalFaceScanBubble
            key={message.id}
            onBeginScan={handleBeginFaceScan}
            onMinimize={() => handleMinimizeFaceScan(message.id)}
          />
        );
      } else {
        // Show the tappable prompt bubble when collapsed
        console.log("[ChatScreen] Rendering collapsed face scan prompt");
        return (
          <FaceScanPromptBubble
            key={message.id}
            onTap={() => handleExpandFaceScan(message.id)}
          />
        );
      }
    }

    if (message.role === "face-scan-card") {
      return (
        <EmotionalFaceScanBubble
          key={message.id}
          onBeginScan={handleBeginFaceScan}
        />
      );
    }

    if (message.role === "emotion-scan-result") {
      const emotionScanMsg = message as EmotionScanResultMessage;
      return (
        <EmotionalClaritySummaryBubble
          key={message.id}
          emotionAnalysis={emotionScanMsg.emotionAnalysis}
          onFollowUpAction={handleEmotionFollowUp}
          selectedIntention={currentIntention || undefined}
        />
      );
    }

    if (message.role === "context-or-direction-choice") {
      return (
        <ContextOrDirectionChoice
          key={message.id}
          onSelectAddContext={handleAddContext}
          onSelectDirection={handleSkipToDirection}
        />
      );
    }

    if (message.role === "voice-emotion-scan-result") {
      const voiceEmotionMsg = message as VoiceEmotionScanResultMessage;
      return (
        <VoiceEmotionScanBubble
          key={message.id}
          voiceEmotionAnalysis={voiceEmotionMsg.voiceEmotionAnalysis}
          onFollowUpAction={handleVoiceEmotionFollowUp}
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
        {/* Deep charcoal background - minimal and calming */}
        <LinearGradient
          colors={["#050608", "#0A0A0C", "#050608"]}
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
