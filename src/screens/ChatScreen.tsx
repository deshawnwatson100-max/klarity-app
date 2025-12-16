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
import { BoundaryDetectionCard } from "../components/BoundaryDetectionCard";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { useLoopsStore } from "../state/loopsStore";
import { useCalendarStore } from "../state/calendarStore";
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
  generateChatResponse,
  detectBoundaryConcerns,
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
  BoundaryDetectionMessage,
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
  const insertMessageAfter = useLoopsStore((s) => s.insertMessageAfter);
  const removeMessageFromActiveLoop = useLoopsStore((s) => s.removeMessageFromActiveLoop);
  const updateMessageInActiveLoop = useLoopsStore((s) => s.updateMessageInActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  // Calendar store
  const addCalendarEntry = useCalendarStore((s) => s.addEntry);

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

  // Helper function to create calendar entry from chat loop data
  const createCalendarEntry = (
    userText: string,
    analysis: EmotionalAnalysis,
    intention: "improve" | "distance" | "maintain" | "clarity",
    guidance: string,
    suggestedReplies: Array<{ id: string; text: string }>
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Map intention to calendar intention type
    const intentionMap: Record<string, "improve" | "distance" | "maintain" | "gain-clarity"> = {
      improve: "improve",
      distance: "distance",
      maintain: "maintain",
      clarity: "gain-clarity",
    };

    const calendarEntry = {
      id: Date.now().toString() + "_calendar",
      date: dateStr,
      timestamp: now.getTime(),
      eventType: "active-loop" as const,
      status: "in-progress" as const,
      title: analysis.coreIssue || "Emotional conversation",
      tags: ["relationship", "communication"],
      situationText: userText,
      quickSummary: analysis.summary || "Chat conversation",
      analysis: {
        tone: analysis.tone || "Neutral",
        pattern: analysis.pattern || "Communication",
        emotionalImpact: analysis.emotionalImpact || "Moderate",
        coreIssue: analysis.coreIssue || "Relationship discussion",
        fullAnalysis: analysis.fullAnalysis || analysis.summary || "Emotional conversation",
      },
      intention: intentionMap[intention] || "gain-clarity",
      suggestedReplies: suggestedReplies.map((r) => r.text),
      emotionalAdvice: guidance,
      loopId: activeLoopId || undefined,
    };

    addCalendarEntry(calendarEntry);
    console.log("[ChatScreen] Created calendar entry for date:", dateStr);
  };

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

        // Analyze the image for dysfunctional communication
        const imageAnalysis = await analyzeImageToxicity(userMessage.imageBase64);

        // Also check for boundary concerns based on the image analysis summary
        const boundaryResult = await detectBoundaryConcerns(imageAnalysis.summary + " " + imageAnalysis.emotionalImpact);

        // Remove typing indicator
        removeMessageFromActiveLoop(typingMsg.id);

        // CARD REPLACEMENT RULE: Show either Boundary Detection OR Dysfunctional Communication, not both
        if (boundaryResult.detected && boundaryResult.analysis) {
          // Boundary violations detected - show Boundary Detection Card instead
          const boundaryMsg: BoundaryDetectionMessage = {
            id: Date.now().toString() + "_boundary_image",
            role: "boundary-detection",
            content: "",
            timestamp: Date.now(),
            boundaryAnalysis: boundaryResult.analysis,
          };
          addMessageToActiveLoop(boundaryMsg);
        } else {
          // No boundary violations - show Dysfunctional Communication Card as normal
          const analysisMessage: ImageAnalysisMessage = {
            id: Date.now().toString() + "_image_analysis",
            role: "image-analysis",
            content: "",
            timestamp: Date.now(),
            analysis: imageAnalysis,
          };
          addMessageToActiveLoop(analysisMessage);
        }

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

        // After analysis, show add context button
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

    // Step 6: Check for boundary concerns (runs in parallel with UI)
    const boundaryResult = await detectBoundaryConcerns(userMessageContent);

    // Only show boundary card if detected with reasonable confidence
    if (boundaryResult.detected && boundaryResult.analysis) {
      const boundaryMsg: BoundaryDetectionMessage = {
        id: Date.now().toString() + "_boundary",
        role: "boundary-detection",
        content: "",
        timestamp: Date.now(),
        boundaryAnalysis: boundaryResult.analysis,
      };
      addMessageToActiveLoop(boundaryMsg);

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

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
      // Generate suggested replies directly (skip guidance message)
      const replies = await generateIntentionBasedReplies(
        currentUserMessage,
        currentIntention,
        currentAnalysis
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

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

      // Create calendar entry now that we have all the information
      createCalendarEntry(
        currentUserMessage,
        currentAnalysis,
        currentIntention,
        "", // No guidance message
        replies
      );

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

    try {
      // Modify the reply length
      const modifiedText = await modifyReplyLength(
        reply.text,
        action,
        currentIntention
      );

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
    }
  };

  const handleToneModulation = async (
    tone: "direct" | "gentle" | "neutral"
  ) => {
    if (!currentAnalysis || !currentIntention) return;

    // Find the tone modulation card message
    const toneModCard = messages.find((m) => m.role === "tone-modulation-card");
    if (!toneModCard) return;

    // Show typing indicator directly after tone modulation card
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_modulation",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    insertMessageAfter(toneModCard.id, typingMsg);

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

      // Add modulated replies card directly after tone modulation card
      const modulatedMsg: ModulatedRepliesCardMessage = {
        id: Date.now().toString() + "_modulated",
        role: "modulated-replies-card",
        content: "",
        timestamp: Date.now(),
        replies: modulatedReplies,
        tone,
      };
      insertMessageAfter(toneModCard.id, modulatedMsg);
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

  const handleInstantReply = async () => {
    console.log("handleInstantReply called");

    // Remove the choice message
    const choiceMsg = messages.find(
      (m) => m.role === "context-or-direction-choice"
    );
    if (choiceMsg) {
      removeMessageFromActiveLoop(choiceMsg.id);
    }

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_instant",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    // Generate instant reply without needing direction
    try {
      const conversationHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const response = await generateChatResponse(
        "Based on the conversation, provide a single thoughtful, balanced reply suggestion that the user could send. Keep it natural, empathetic, and appropriate for the situation discussed. Just provide the reply text, nothing else.",
        conversationHistory
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add the reply suggestion as a suggested reply card
      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_instant_reply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        intention: "maintain", // Use neutral intention for instant replies
        replies: [
          {
            id: "instant_1",
            text: response.trim(),
            guidanceNote: "A balanced response based on your conversation context",
          },
        ],
      };
      addMessageToActiveLoop(replyMsg);
    } catch (error) {
      console.error("Error generating instant reply:", error);
      removeMessageFromActiveLoop(typingMsg.id);

      const errorMsg: ChatMessage = {
        id: Date.now().toString() + "_error",
        role: "assistant",
        content: "I apologize, but I encountered an error generating a reply suggestion. Please try again.",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(errorMsg);
    }
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

  const handleGenerateDifferentReply = async (currentMessageId: string) => {
    // Find the current reply card message
    const currentReplyCard = messages.find(
      (m) => m.id === currentMessageId
    ) as SuggestedReplyCardMessage | undefined;

    // Check if this is an instant reply (maintain intention) without full analysis
    const isInstantReply = currentReplyCard?.intention === "maintain" && !currentIntention;

    if (isInstantReply) {
      // Handle instant reply regeneration
      console.log("[handleGenerateDifferentReply] Regenerating instant reply");

      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing_different",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      insertMessageAfter(currentMessageId, typingMsg);

      try {
        const conversationHistory = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        const response = await generateChatResponse(
          "Based on the conversation, provide a single thoughtful, balanced reply suggestion that the user could send. Keep it natural, empathetic, and appropriate for the situation discussed. Provide a DIFFERENT response than before, using alternative wording or approach. Just provide the reply text, nothing else.",
          conversationHistory
        );

        // Remove typing indicator
        removeMessageFromActiveLoop(typingMsg.id);

        // Add the new reply as a separate message below the current one
        const newReplyMsg: SuggestedReplyCardMessage = {
          id: Date.now().toString() + "_newreply",
          role: "suggested-reply-card",
          content: "",
          timestamp: Date.now(),
          intention: "maintain",
          replies: [
            {
              id: "instant_" + Date.now(),
              text: response.trim(),
              guidanceNote: "An alternative balanced response based on your conversation context",
            },
          ],
        };
        insertMessageAfter(currentMessageId, newReplyMsg);
      } catch (error) {
        console.error("[handleGenerateDifferentReply] Error generating instant reply:", error);
        removeMessageFromActiveLoop(typingMsg.id);
      }
      return;
    }

    // Original flow for intention-based replies
    if (!currentIntention || !currentAnalysis || !currentUserMessage) {
      console.log("[handleGenerateDifferentReply] Missing required data for intention-based reply");
      return;
    }

    console.log("[handleGenerateDifferentReply] Generating new intention-based reply");

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_different",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    insertMessageAfter(currentMessageId, typingMsg);

    try {
      // Generate a new reply
      const newReplies = await generateIntentionBasedReplies(
        currentUserMessage,
        currentIntention,
        currentAnalysis
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add the new reply as a separate message below the current one
      const newReplyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_newreply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: newReplies,
        intention: currentIntention,
      };
      insertMessageAfter(currentMessageId, newReplyMsg);
    } catch (error) {
      console.error("[handleGenerateDifferentReply] Error:", error);
      removeMessageFromActiveLoop(typingMsg.id);
    }
  };

  const handleGenerateDifferentModulatedReply = async (currentMessageId: string, tone: "direct" | "gentle" | "neutral") => {
    if (!currentIntention || !currentAnalysis || !currentUserMessage) {
      console.log("[handleGenerateDifferentModulatedReply] Missing required data");
      return;
    }

    console.log("[handleGenerateDifferentModulatedReply] Generating new modulated reply with tone:", tone);

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_modulated_different",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    insertMessageAfter(currentMessageId, typingMsg);

    try {
      // Generate a new modulated reply with the same tone
      const newModulatedReplies = await generateModulatedReplies(
        currentUserMessage,
        currentIntention,
        currentAnalysis,
        tone
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add the new modulated reply as a separate message below the current one
      const newModulatedMsg: ModulatedRepliesCardMessage = {
        id: Date.now().toString() + "_newmodulated",
        role: "modulated-replies-card",
        content: "",
        timestamp: Date.now(),
        replies: newModulatedReplies,
        tone,
      };
      insertMessageAfter(currentMessageId, newModulatedMsg);
    } catch (error) {
      console.error("[handleGenerateDifferentModulatedReply] Error:", error);
      removeMessageFromActiveLoop(typingMsg.id);
    }
  };

  const handleEmotionFollowUp = async (action: string) => {
    // Handle micro-flow actions from emotion scan
    switch (action) {
      case "explore":
        // A) Explore this feeling - Skip to direction selector
        handleSkipToDirection();
        break;

      case "connect":
        // B) Connect it to your situation - Skip to add context
        handleAddContext();
        break;

      case "log":
        // C) Log this for insight later - Save to calendar silently
        // Get emotion scan result from messages
        const emotionScanMsg = messages
          .slice()
          .reverse()
          .find((m) => m.role === "emotion-scan-result") as
          | EmotionScanResultMessage
          | undefined;

        if (emotionScanMsg) {
          const emotion = emotionScanMsg.emotionAnalysis.primaryEmotion || "Mixed emotions";
          const intensity = emotionScanMsg.emotionAnalysis.emotionalIntensity || 50;
          // Log to calendar store silently (no message shown)
          console.log(`[handleEmotionFollowUp] Logged emotion: ${emotion} (${intensity}%)`);
        }
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
        // User wants reply suggestions - skip to direction first
        handleSkipToDirection();
        break;

      case "check-outcomes":
        // User wants to check possible outcomes - skip to direction first
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
          onGenerateDifferent={() => handleGenerateDifferentReply(message.id)}
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
          onGenerateDifferent={() => handleGenerateDifferentModulatedReply(message.id, msg.tone)}
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
          onSelectInstantReply={handleInstantReply}
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

    if (message.role === "boundary-detection") {
      const boundaryMsg = message as BoundaryDetectionMessage;
      return (
        <BoundaryDetectionCard
          key={message.id}
          analysis={boundaryMsg.boundaryAnalysis}
          onExploreResponse={handleSkipToDirection}
          onAddMoreContext={handleAddContext}
          onUnderstandBoundaries={handleSkipToDirection}
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
