import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  Platform,
  Text,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  Keyboard,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";
import { InputBar, InputMode } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { DysfunctionalCommunicationCard } from "../components/DysfunctionalCommunicationCard";
import { RedFlagsCard } from "../components/RedFlagsCard";
import { LoopHistoryPanel } from "../components/LoopHistoryPanel";
import { TypingIndicator } from "../components/TypingIndicator";
import { SuggestedReplyCard } from "../components/SuggestedReplyCard";
import { InlineContextInput } from "../components/InlineContextInput";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { SlideOverDrawer, DRAWER_WIDTH } from "../components/SlideOverDrawer";
import { RewriteReplyCard } from "../components/RewriteReplyCard";
import { ImageContinuationCard } from "../components/ImageContinuationCard";
import { PersonContextModal } from "../components/PersonContextModal";
import {
  DeepSearchResultBubble,
  DeepSearchLoading,
  DeepSearchNoResults,
} from "../components/DeepSearchResultBubble";
import { useLoopsStore, useActiveLoopPersonContextId } from "../state/loopsStore";
import { usePersonContextStore } from "../state/personContextStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  generateDysfunctionalCommunicationSummary,
  generateQuickSuggestedReply,
  generateModulatedReplies,
  modifyReplyLength,
  analyzeImageToxicity,
  generateEmotionalAnalysis,
  detectRedFlags,
  generateRewriteReply,
  analyzeImageContinuation,
  addEmojisToReply,
  generateDecodeResponse,
} from "../api/klarity-api";
import { transcribeAudio } from "../api/transcribe-audio";
import { executeDeepSearch } from "../api/deepSearchService";
import {
  ChatMessage,
  TypingMessage,
  SuggestedReplyCardMessage,
  InlineContextInputMessage,
  DysfunctionalCommunicationMessage,
  RedFlagsMessage,
  EmotionalAnalysis,
  RewriteReplyCardMessage,
  ImageContinuationMessage,
  DeepSearchLoadingMessage,
  DeepSearchResultMessage,
  MessageMode,
} from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "ChatScreen">;

export function ChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
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
  const [inputMode, setInputMode] = useState<InputMode>(route.params?.inputMode || "understand");
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isPersonContextModalOpen, setIsPersonContextModalOpen] = useState(false);

  // Track conversation context for mid-loop image continuation
  const [conversationContext, setConversationContext] = useState<{
    originalMessage: string;
    previousSummary: string;
    previousPatterns?: string[];
    previousReply?: string;
  } | null>(null);

  // Content area animation values - using React Native Animated
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(20)).current;

  // Keyboard animation value for smooth slide up
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // Drawer animation progress - shared with SlideOverDrawer
  const drawerProgress = useRef(new Animated.Value(0)).current;

  const CONTENT_TRANSITION_DURATION = 250;
  const CONTENT_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  // Use loops store
  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const addMessageToActiveLoopRaw = useLoopsStore((s) => s.addMessageToActiveLoop);
  const insertMessageAfter = useLoopsStore((s) => s.insertMessageAfter);
  const removeMessageFromActiveLoop = useLoopsStore((s) => s.removeMessageFromActiveLoop);
  const updateMessageInActiveLoop = useLoopsStore((s) => s.updateMessageInActiveLoop);
  const setActiveLoopMessages = useLoopsStore((s) => s.setActiveLoopMessages);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);
  const setActiveLoopDeepSearchCompleted = useLoopsStore((s) => s.setActiveLoopDeepSearchCompleted);

  // Person context for Deep Search
  const activeLoopPersonContextId = useActiveLoopPersonContextId();
  const getPersonContextById = usePersonContextStore((s) => s.getPersonContextById);
  const activePersonContext = activeLoopPersonContextId
    ? getPersonContextById(activeLoopPersonContextId)
    : null;

  // Track if Deep Search has been triggered this session
  const deepSearchTriggered = useRef(false);

  // Track current mode in a ref for use in callbacks
  const inputModeRef = useRef<InputMode>(inputMode);
  inputModeRef.current = inputMode;

  // Helper to add message with current mode
  const addMessageToActiveLoop = (message: ChatMessage) => {
    addMessageToActiveLoopRaw({
      ...message,
      mode: inputModeRef.current as MessageMode,
    });
  };

  const allMessages = useLoopsStore((s) => {
    const activeLoop = s.loops.find((loop) => loop.id === s.activeLoopId);
    return activeLoop?.messages || [];
  });

  // Get screen width for slide animations
  const screenWidth = Dimensions.get("window").width;

  // Slide animation values for mode switching - using React Native Animated
  const replySlideX = useRef(new Animated.Value(0)).current;
  const decodeSlideX = useRef(new Animated.Value(screenWidth)).current;

  // Filter messages by mode - separate lists for each chat loop
  const replyMessages = useMemo(() => {
    return allMessages.filter((msg) => {
      // Messages explicitly marked as rewrite mode
      if (msg.mode === "rewrite") return true;
      return false;
    });
  }, [allMessages]);

  const decodeMessages = useMemo(() => {
    return allMessages.filter((msg) => {
      // Messages explicitly marked as understand/decode mode
      if (msg.mode === "understand") return true;
      return false;
    });
  }, [allMessages]);

  // For backwards compatibility - messages shown in current mode
  const messages = useMemo(() => {
    return allMessages.filter((msg) => {
      if (!msg.mode) return true;
      return msg.mode === inputMode;
    });
  }, [allMessages, inputMode]);

  // Refs for both ScrollViews
  const replyScrollViewRef = useRef<ScrollView>(null);
  const decodeScrollViewRef = useRef<ScrollView>(null);

  // Handle mode change with slide animation
  const handleModeChangeWithAnimation = useCallback((newMode: InputMode) => {
    const SLIDE_DURATION = 300;
    const SLIDE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

    if (newMode === "rewrite") {
      // Slide Reply in from left, Decode out to right
      Animated.parallel([
        Animated.timing(replySlideX, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodeSlideX, {
          toValue: screenWidth,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide Decode in from right, Reply out to left
      Animated.parallel([
        Animated.timing(replySlideX, {
          toValue: -screenWidth,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodeSlideX, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setInputMode(newMode);
  }, [screenWidth]);

  // Initialize slide positions based on initial mode
  useEffect(() => {
    if (inputMode === "understand") {
      replySlideX.setValue(-screenWidth);
      decodeSlideX.setValue(0);
    } else {
      replySlideX.setValue(0);
      decodeSlideX.setValue(screenWidth);
    }
  }, []);

  const navigateToInputScreen = () => {
    navigation.navigate("InputScreen");
  };

  const animateContentOutAndNavigate = (destination: "InputScreen") => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: -20,
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(bottomOpacity, {
        toValue: 0,
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(bottomTranslateY, {
        toValue: 15,
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigateToInputScreen();
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      contentOpacity.setValue(0);
      contentTranslateY.setValue(30);
      bottomOpacity.setValue(0);
      bottomTranslateY.setValue(20);

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(bottomOpacity, {
          toValue: 1,
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslateY, {
          toValue: 0,
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
          useNativeDriver: true,
        }),
      ]).start();

      const activeLoop = getActiveLoop();
      if (activeLoop && activeLoop.messages.length === 1 && activeLoop.messages[0].role === "user") {
        const firstMessage = activeLoop.messages[0];
        if (!processedMessageIds.current.has(firstMessage.id)) {
          processedMessageIds.current.add(firstMessage.id);
          // Check message mode to determine which processing flow to use
          const messageMode = firstMessage.mode || inputModeRef.current;
          console.log("[ChatScreen] Processing first message with mode:", messageMode);
          if (messageMode === "understand") {
            processDecodeMessage(firstMessage);
          } else {
            processUserMessage(firstMessage);
          }
        }
      }

      return () => {};
    }, [])
  );

  // Handle Deep Search trigger when navigating from PersonContextModal
  useEffect(() => {
    const triggerDeepSearch = route.params?.triggerDeepSearch;

    if (triggerDeepSearch && activePersonContext && !deepSearchTriggered.current) {
      deepSearchTriggered.current = true;

      // Run Deep Search asynchronously
      const runDeepSearch = async () => {
        // Add loading message
        const loadingMsgId = `deep-search-loading-${Date.now()}`;
        const loadingMessage: DeepSearchLoadingMessage = {
          id: loadingMsgId,
          role: "deep-search-loading",
          content: "",
          timestamp: Date.now(),
          personName: activePersonContext.name,
          mode: "understand",
        };
        addMessageToActiveLoopRaw(loadingMessage);

        try {
          // Execute Deep Search
          const result = await executeDeepSearch({
            personContext: activePersonContext,
            onProgress: (status) => {
              console.log("[DeepSearch] Progress:", status);
            },
          });

          // Remove loading message
          removeMessageFromActiveLoop(loadingMsgId);

          if (result.success && result.result) {
            // Add result message
            const resultMessage: DeepSearchResultMessage = {
              id: `deep-search-result-${Date.now()}`,
              role: "deep-search-result",
              content: "",
              timestamp: Date.now(),
              searchResult: result.result,
              showSafetyResources: false,
              mode: "understand",
            };
            addMessageToActiveLoopRaw(resultMessage);
            setActiveLoopDeepSearchCompleted(true);
          } else if (result.safetyBlock) {
            // Safety block - show resources if needed
            const safetyMessage: ChatMessage = {
              id: `deep-search-safety-${Date.now()}`,
              role: "assistant",
              content: result.safetyBlock.reason === "safety_concern"
                ? "I noticed some safety concerns. Your well-being comes first. If you feel unsafe, please reach out to someone who can help."
                : "I am not able to search in this case. The request seems to be about monitoring or surveillance.",
              timestamp: Date.now(),
              mode: "understand",
            };
            addMessageToActiveLoopRaw(safetyMessage);
          } else if (result.error) {
            // Error message
            const errorMessage: ChatMessage = {
              id: `deep-search-error-${Date.now()}`,
              role: "assistant",
              content: "I was not able to complete the search right now. You can ask me to try again later.",
              timestamp: Date.now(),
              mode: "understand",
            };
            addMessageToActiveLoopRaw(errorMessage);
          }
        } catch (error) {
          console.error("[DeepSearch] Error:", error);
          removeMessageFromActiveLoop(loadingMsgId);

          // Show error message
          const errorMessage: ChatMessage = {
            id: `deep-search-error-${Date.now()}`,
            role: "assistant",
            content: "Something went wrong while searching. You can ask me to try again.",
            timestamp: Date.now(),
            mode: "understand",
          };
          addMessageToActiveLoopRaw(errorMessage);
        }
      };

      // Small delay to ensure UI is ready
      setTimeout(runDeepSearch, 500);
    }
  }, [route.params?.triggerDeepSearch, activePersonContext]);

  useEffect(() => {
    setTimeout(() => {
      // Scroll the active mode's ScrollView to end
      if (inputMode === "rewrite") {
        replyScrollViewRef.current?.scrollToEnd({ animated: true });
      } else {
        decodeScrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [messages.length, inputMode]);

  // Scroll to bottom when keyboard shows
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const kbHeight = event.endCoordinates.height;
        Animated.timing(keyboardHeight, {
          toValue: kbHeight,
          duration: Platform.OS === "ios" ? event.duration || 250 : 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          // Scroll to end after animation completes
          setTimeout(() => {
            if (inputMode === "rewrite") {
              replyScrollViewRef.current?.scrollToEnd({ animated: true });
            } else {
              decodeScrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }, 50);
        });
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (event) => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === "ios" ? event.duration || 250 : 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [inputMode]);

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

      await new Promise((resolve) => setTimeout(resolve, 300));

      // STEP 1.5: Detect and show Red Flags (if any)
      const redFlagsResult = await detectRedFlags(
        userMessage.content,
        dysfunctionalSummary.patterns
      );

      if (redFlagsResult.detected && redFlagsResult.flags.length > 0) {
        const redFlagsMsg: RedFlagsMessage = {
          id: Date.now().toString() + "_redflags",
          role: "red-flags",
          content: "",
          timestamp: Date.now(),
          introText: redFlagsResult.introText,
          flags: redFlagsResult.flags,
        };
        addMessageToActiveLoop(redFlagsMsg);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

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

      // Save conversation context for potential mid-loop image continuation
      setConversationContext({
        originalMessage: userMessage.content,
        previousSummary: dysfunctionalSummary.summary,
        previousPatterns: dysfunctionalSummary.patterns,
        previousReply: suggestedReply.text,
      });

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

  const handleAddEmojiToReply = async (replyId: string) => {
    const replyCardMsg = messages.find(
      (m) => m.role === "suggested-reply-card" &&
        (m as SuggestedReplyCardMessage).replies.some((r) => r.id === replyId)
    ) as SuggestedReplyCardMessage | undefined;

    if (!replyCardMsg) return;

    const reply = replyCardMsg.replies.find((r) => r.id === replyId);
    if (!reply) return;

    try {
      // Use AI to intelligently add emojis to the reply
      const textWithEmojis = await addEmojisToReply(reply.text);

      // Update the reply with emojis
      const updatedReplies = replyCardMsg.replies.map((r) =>
        r.id === replyId ? { ...r, text: textWithEmojis } : r
      );

      const updatedMsg = {
        ...replyCardMsg,
        replies: updatedReplies,
      };

      updateMessageInActiveLoop(replyCardMsg.id, updatedMsg);
    } catch (error) {
      console.error("Error adding emojis to reply:", error);
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

    // Handle editing an existing message
    if (isEditingMessage && editingMessageId) {
      // Find the index of the message being edited
      const messageIndex = allMessages.findIndex((m) => m.id === editingMessageId);

      if (messageIndex !== -1) {
        // Get all messages up to (but not including) the edited message
        const messagesBeforeEdit = allMessages.slice(0, messageIndex);

        // Create the updated user message with the same ID
        const updatedUserMessage: ChatMessage = {
          id: editingMessageId,
          role: "user",
          content: currentInput,
          timestamp: Date.now(),
          imageUrl: selectedImageUri,
          imageBase64: selectedImageBase64,
          mode: allMessages[messageIndex].mode,
        };

        // Set messages to only include messages before the edit + the updated message
        setActiveLoopMessages([...messagesBeforeEdit, updatedUserMessage]);

        // Reset editing state
        setIsEditingMessage(false);
        setEditingMessageId(null);
        setCurrentInput("");
        setSelectedImageUri(undefined);
        setSelectedImageBase64(undefined);

        // Reprocess the edited message based on mode
        const messageMode = updatedUserMessage.mode || inputMode;
        if (messageMode === "understand") {
          await processDecodeMessage(updatedUserMessage);
        } else {
          await processUserMessage(updatedUserMessage);
        }
        return;
      }
    }

    // Reset editing state when sending normally
    setIsEditingMessage(false);
    setEditingMessageId(null);

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

    // Handle Reply (rewrite) mode - shows communication summary + suggested reply
    if (inputMode === "rewrite") {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput || (selectedImageUri ? "[Screenshot shared]" : ""),
        timestamp: Date.now(),
        imageUrl: selectedImageUri,
        imageBase64: selectedImageBase64,
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setSelectedImageUri(undefined);
      setSelectedImageBase64(undefined);

      await processUserMessage(userMessage);
      return;
    }

    // Handle Decode (understand) mode - conversational exploration
    if (inputMode === "understand") {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput || (selectedImageUri ? "[Screenshot shared]" : ""),
        timestamp: Date.now(),
        imageUrl: selectedImageUri,
        imageBase64: selectedImageBase64,
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setSelectedImageUri(undefined);
      setSelectedImageBase64(undefined);

      await processDecodeMessage(userMessage);
      return;
    }

    // Check if this is a mid-loop image (user adding a new image to existing conversation)
    const isMidLoopImage = selectedImageBase64 && conversationContext !== null && messages.length > 1;

    if (isMidLoopImage) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput || "[New Screenshot]",
        timestamp: Date.now(),
        imageUrl: selectedImageUri,
        imageBase64: selectedImageBase64,
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setSelectedImageUri(undefined);
      setSelectedImageBase64(undefined);

      await processImageContinuation(userMessage);
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

  // Process message in Rewrite mode - skip analysis, just polish the reply
  const processRewriteMessage = async (userMessage: ChatMessage) => {
    setIsProcessing(true);
    setIsLoading(true);

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg);

      // Generate polished rewrite
      const result = await generateRewriteReply(userMessage.content);

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add rewrite reply card
      const rewriteMsg: RewriteReplyCardMessage = {
        id: Date.now().toString() + "_rewrite",
        role: "rewrite-reply-card",
        content: "",
        timestamp: Date.now(),
        rewrittenReply: result.rewrittenReply,
        originalIntent: result.originalIntent,
      };
      addMessageToActiveLoop(rewriteMsg);
    } catch (error) {
      console.error("Error processing rewrite:", error);
      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content: "I encountered an error polishing your reply. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  // Process message in Decode mode - conversational exploration for clarity
  const processDecodeMessage = async (userMessage: ChatMessage) => {
    setIsProcessing(true);
    setIsLoading(true);

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg);

      // Build conversation history from decode messages for context
      const conversationHistory = decodeMessages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Generate decode response
      const result = await generateDecodeResponse(
        userMessage.content,
        conversationHistory
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add assistant response as a regular message bubble
      const assistantMsg: ChatMessage = {
        id: Date.now().toString() + "_decode_response",
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(assistantMsg);
    } catch (error) {
      console.error("Error processing decode message:", error);
      // Remove typing indicator if it exists
      const typingMsgId = Date.now().toString() + "_typing";
      removeMessageFromActiveLoop(typingMsgId);

      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content: "I want to make sure I understand. What part of this situation feels most unclear to you?",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  // Process additional image mid-loop as a continuation
  const processImageContinuation = async (userMessage: ChatMessage) => {
    if (!conversationContext || !userMessage.imageBase64) return;

    setIsProcessing(true);
    setIsLoading(true);

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg);

      // Analyze image as continuation
      const result = await analyzeImageContinuation(
        userMessage.imageBase64,
        conversationContext
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add continuation card showing what changed
      const continuationMsg: ImageContinuationMessage = {
        id: Date.now().toString() + "_continuation",
        role: "image-continuation",
        content: "",
        timestamp: Date.now(),
        continuationSummary: result.continuationSummary,
        whatChanged: result.whatChanged,
        approachShift: result.approachShift,
      };
      addMessageToActiveLoop(continuationMsg);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Add updated suggested reply
      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_reply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [result.updatedReply],
        intention: "maintain",
      };
      addMessageToActiveLoop(replyMsg);

      // Update conversation context with new info
      setConversationContext({
        ...conversationContext,
        previousSummary: result.continuationSummary,
        previousReply: result.updatedReply.text,
      });

    } catch (error) {
      console.error("Error processing image continuation:", error);
      addMessageToActiveLoop({
        id: Date.now().toString(),
        role: "assistant",
        content: "I encountered an error analyzing this new message. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleUseRewrittenReply = (reply: string) => {
    setCurrentInput(reply);
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

  const handleInputFocus = () => {
    // Scroll to bottom when input is focused
    setTimeout(() => {
      if (inputMode === "rewrite") {
        replyScrollViewRef.current?.scrollToEnd({ animated: true });
      } else {
        decodeScrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 150);
  };

  const handleEditMessage = (content: string, messageId: string) => {
    // Set the message content in the input bar for editing
    setCurrentInput(content);
    setIsEditingMessage(true);
    setEditingMessageId(messageId);
  };

  const handleCancelEdit = () => {
    setCurrentInput("");
    setIsEditingMessage(false);
    setEditingMessageId(null);
  };

  // Render function for Decode mode - only typing indicators and message bubbles (ChatGPT-style)
  const renderDecodeMessage = (message: ChatMessage) => {
    if (message.role === "typing") {
      return <TypingIndicator key={message.id} />;
    }

    // Deep Search loading state
    if (message.role === "deep-search-loading") {
      return <DeepSearchLoading key={message.id} />;
    }

    // Deep Search results
    if (message.role === "deep-search-result") {
      const msg = message as DeepSearchResultMessage;
      return (
        <DeepSearchResultBubble
          key={message.id}
          result={msg.searchResult}
          showSafetyResources={msg.showSafetyResources}
        />
      );
    }

    // Only render user and assistant messages in Decode mode - no cards
    if (message.role === "user" || message.role === "assistant") {
      return (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          timestamp={message.timestamp}
          imageUrl={message.imageUrl}
          showUserBubble={message.role === "user"} // ChatGPT-style bubble for user messages
          showActions={message.role === "assistant"} // Show action buttons for assistant messages
          onEdit={message.role === "user" ? handleEditMessage : undefined}
          messageId={message.id}
        />
      );
    }

    // Skip all card types in Decode mode
    return null;
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

    if (message.role === "red-flags") {
      const msg = message as RedFlagsMessage;
      return (
        <RedFlagsCard
          key={message.id}
          introText={msg.introText}
          flags={msg.flags}
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
          onAddEmoji={handleAddEmojiToReply}
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

    if (message.role === "rewrite-reply-card") {
      const msg = message as RewriteReplyCardMessage;
      return (
        <RewriteReplyCard
          key={message.id}
          rewrittenReply={msg.rewrittenReply}
          originalIntent={msg.originalIntent}
          onUseReply={handleUseRewrittenReply}
        />
      );
    }

    if (message.role === "image-continuation") {
      const msg = message as ImageContinuationMessage;
      return (
        <ImageContinuationCard
          key={message.id}
          continuationSummary={msg.continuationSummary}
          whatChanged={msg.whatChanged}
          approachShift={msg.approachShift}
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
        onEdit={message.role === "user" ? handleEditMessage : undefined}
        messageId={message.id}
      />
    );
  };

  const handleNavigateBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateContentOutAndNavigate("InputScreen");
  };

  // Open drawer handler for swipe gesture
  const handleOpenDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDrawerOpen(true);
  };

  // Swipe right opens drawer using PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 50 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.vx > 0.5 && gestureState.dx > 80) {
          handleOpenDrawer();
        }
      },
    })
  ).current;

  // Main content slides right when drawer opens
  const mainContentTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_WIDTH],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#050608" }}>
      {/* Main content - slides with drawer */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "#050608",
          transform: [{ translateX: mainContentTranslateX }],
        }}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={["#050608", "#0A0A0C", "#050608"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <SoftFlares />
        <FloatingParticles count={20} />

        <Animated.View
          style={{
            flex: 1,
            paddingBottom: keyboardHeight,
          }}
        >
          <Header
            isAnalyzing={isLoading}
            onMenuPress={() => setIsDrawerOpen(true)}
            inputMode={inputMode}
            onModeChange={handleModeChangeWithAnimation}
            onPersonContextPress={() => setIsPersonContextModalOpen(true)}
            showPersonContext={true}
          />

          <Animated.View
            style={{
              flex: 1,
              overflow: "hidden",
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }}
          >
            {/* Container for both chat loops */}
            <View style={{ flex: 1, position: "relative" }}>
              {/* Reply Mode Chat Loop */}
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: screenWidth,
                  transform: [{ translateX: replySlideX }],
                }}
              >
                <ScrollView
                  ref={replyScrollViewRef}
                  className="flex-1"
                  contentContainerClassName="px-4 pt-4 pb-4"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {replyMessages.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                      <Text className="text-gray-500 text-center text-base">
                        Reply mode - craft your response
                      </Text>
                    </View>
                  ) : (
                    replyMessages.map(renderMessage)
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </Animated.View>

              {/* Decode Mode Chat Loop */}
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: screenWidth,
                  transform: [{ translateX: decodeSlideX }],
                }}
              >
                <ScrollView
                  ref={decodeScrollViewRef}
                  className="flex-1"
                  contentContainerClassName="px-4 pt-4 pb-4"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {decodeMessages.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                      <Text className="text-gray-500 text-center text-base">
                        Decode mode - understand the message
                      </Text>
                    </View>
                  ) : (
                    decodeMessages.map(renderDecodeMessage)
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: bottomOpacity,
              transform: [{ translateY: bottomTranslateY }],
            }}
          >
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
              inputMode={inputMode}
              onInputFocus={handleInputFocus}
              isEditing={isEditingMessage}
              onCancelEdit={handleCancelEdit}
            />
          </Animated.View>

          <LoopHistoryPanel
            visible={isHistoryPanelOpen}
            onClose={() => setHistoryPanelOpen(false)}
          />
        </Animated.View>
      </Animated.View>

      {/* Drawer - slides over the screen from the left */}
      <SlideOverDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        drawerProgress={drawerProgress}
      />

      {/* Person Context Modal */}
      <PersonContextModal
        visible={isPersonContextModalOpen}
        onClose={() => setIsPersonContextModalOpen(false)}
      />
    </View>
  );
}
