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
import { ToneSelectionBubble } from "../components/ToneSelectionBubble";
import { TailoredGuidanceBubble } from "../components/TailoredGuidanceBubble";
import { SuggestedReplyCard } from "../components/SuggestedReplyCard";
import { EmotionalFaceScanBubble } from "../components/EmotionalFaceScanBubble";
import { EmotionalClaritySummaryBubble } from "../components/EmotionalClaritySummaryBubble";
import { ToneModulationCard } from "../components/ToneModulationCard";
import { ModulatedRepliesCard } from "../components/ModulatedRepliesCard";
import { AddContextButton } from "../components/AddContextButton";
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
  analyzeImageToxicity,
} from "../api/klarity-api";
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
  FaceScanCardMessage,
  EmotionScanResultMessage,
  ToneModulationCardMessage,
  ModulatedRepliesCardMessage,
  AddContextButtonMessage,
  EmotionalAnalysis,
} from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "ChatScreen">;
type IntentionType = "improve" | "distance" | "maintain" | "clarity";
type ToneType = "calm" | "direct" | "empathetic" | "assertive";

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
  const [currentIntention, setCurrentIntention] = useState<IntentionType | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isAwaitingContext, setIsAwaitingContext] = useState(false);
  const [additionalContext, setAdditionalContext] = useState<string>("");

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

        // After image analysis, show direction selector
        await new Promise((resolve) => setTimeout(resolve, 600));

        const directionMsg: DirectionSelectorMessage = {
          id: Date.now().toString() + "_direction",
          role: "direction-selector",
          content: "",
          timestamp: Date.now(),
        };
        addMessageToActiveLoop(directionMsg);
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

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Show add context button
      const addContextMsg: AddContextButtonMessage = {
        id: Date.now().toString() + "_addcontext",
        role: "add-context-button",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(addContextMsg);

      await new Promise((resolve) => setTimeout(resolve, 600));

      // Show face scan card
      const faceScanMsg: FaceScanCardMessage = {
        id: Date.now().toString() + "_facescan",
        role: "face-scan-card",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(faceScanMsg);
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
    // Set flag that we're awaiting context
    setIsAwaitingContext(true);

    // Show typing indicator
    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_context",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    await new Promise((resolve) => setTimeout(resolve, 800));
    removeMessageFromActiveLoop(typingMsg.id);

    // Show context gathering prompt
    addMessageToActiveLoop({
      id: Date.now().toString(),
      role: "assistant",
      content:
        "Thank you — the more I understand, the better I can support you.\n\nTo sharpen the clarity, can you tell me one or more of the following?",
      timestamp: Date.now(),
    });

    await new Promise((resolve) => setTimeout(resolve, 400));

    addMessageToActiveLoop({
      id: Date.now().toString(),
      role: "assistant",
      content:
        "• What led up to this situation?\n• How did their message make you feel?\n• What outcome would feel healthiest for you?\n• Is there anything you want to avoid in your reply?\n\nShare what feels relevant — no pressure to answer all of them. I'm here to help you navigate this with clarity.",
      timestamp: Date.now(),
    });
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
    if (!currentAnalysis || !currentIntention) return;

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

      // Show acknowledgment
      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Thank you for sharing that context — it helps me understand the situation more deeply. Let me re-assess based on what you've told me.",
        timestamp: Date.now(),
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      // Show updated deep analysis
      const deepAnalysisMsg: DeepAnalysisMessage = {
        id: Date.now().toString() + "_deep_reanalysis",
        role: "deep-analysis",
        content: reanalysis.fullAnalysis || reanalysis.summary,
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(deepAnalysisMsg);

      await new Promise((resolve) => setTimeout(resolve, 600));

      // Re-generate tailored guidance
      const guidance = await generateTailoredGuidance(
        enrichedMessage,
        currentIntention,
        reanalysis
      );

      const guidanceMsg: TailoredGuidanceMessage = {
        id: Date.now().toString() + "_guidance_reanalysis",
        role: "tailored-guidance",
        content: guidance,
        timestamp: Date.now(),
        intention: currentIntention,
      };
      addMessageToActiveLoop(guidanceMsg);

      // Re-generate improved replies
      const replies = await generateIntentionBasedReplies(
        enrichedMessage,
        currentIntention,
        reanalysis
      );

      const repliesMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_replies_reanalysis",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies,
        intention: currentIntention,
      };
      addMessageToActiveLoop(repliesMsg);

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Show tone modulation again
      const toneModMsg: ToneModulationCardMessage = {
        id: Date.now().toString() + "_tonemod_reanalysis",
        role: "tone-modulation-card",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(toneModMsg);
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

    if (message.role === "image-analysis") {
      const imageAnalysisMsg = message as ImageAnalysisMessage;
      return (
        <ImageAnalysisCard
          key={message.id}
          analysis={imageAnalysisMsg.analysis}
        />
      );
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
