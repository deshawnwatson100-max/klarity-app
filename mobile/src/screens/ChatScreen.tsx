import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  View,
  FlatList,
  Platform,
  Text,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
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
import { PersonContextCard } from "../components/PersonContextCard";
import { DeepSearchSuggestionCard } from "../components/DeepSearchSuggestionCard";
import { ChatLoadingBubble } from "../components/ChatLoadingBubble";
import { DeepDecodeModal, SelectedImage } from "../components/DeepDecodeModal";
import { DeepDecodeResultView } from "../components/DeepDecodeResultView";
import { DeepDecodeResultBubble } from "../components/DeepDecodeResultBubble";
import {
  DeepSearchResultBubble,
  DeepSearchLoading,
  DeepSearchNoResults,
} from "../components/DeepSearchResultBubble";
import {
  DeepSearchIntroMessage as DeepSearchIntroBubble,
  DeepSearchProfileMessage,
  DeepSearchSummaryMessage,
  DeepSearchNoResultsMessage,
} from "../components/DeepSearchChatBubble";
import { DeepDiveEvaluationBubble } from "../components/DeepDiveEvaluationBubble";
import { DeepDiveFollowUpCard } from "../components/DeepDiveFollowUpCard";
import { StructuredAnalysisCard } from "../components/StructuredAnalysisCard";
import { PatternMirrorCard } from "../components/PatternMirrorCard";
import { useLoopsStore, useActiveLoopPersonContextId } from "../state/loopsStore";
import { usePatternMirrorStore } from "../state/patternMirrorStore";
import { detectBehavioralSignals } from "../utils/patternDetection";
import { usePersonContextStore } from "../state/personContextStore";
import { useFeedbackStore } from "../state/feedbackStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
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
  generateDecodeResponseStreaming,
  analyzeLightDecodeImage,
  analyzeDeepDecode,
  DeepDecodeResult,
  generateStructuredAnalysisFromImage,
  generateDecodeClarificationResponse,
  DecodeClarificationContext,
  generatePostDecodeClarity,
  generateContextAwareDecodeResponse,
} from "../api/klarity-api";
import { transcribeAudio } from "../api/transcribe-audio";
import {
  executeDeepSearch,
  executeDeepDiveSearch,
  evaluateDeepDiveResults,
  getBestFollowUpQuestion,
  executeDeepDiveWithAdditionalInfo,
} from "../api/deepSearchService";
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
  DeepSearchVerificationMessage,
  PersonContextCardMessage,
  DeepSearchSuggestionMessage,
  DeepSearchSuggestionState,
  DeepSearchIntroMessage,
  DeepSearchProfileChatMessage,
  DeepSearchSummaryChatMessage,
  DeepSearchNoResultsChatMessage,
  DeepDiveEvaluationMessage,
  DeepDiveFollowUpMessage,
  ChatLoadingMessage,
  MessageMode,
  DeepDecodeResultMessage,
  StructuredAnalysisMessage,
  StructuredAnalysisResult,
  PatternMirrorMessage,
} from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "ChatScreen">;

export function ChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null); // Track which message is streaming

  // Deep Decode state
  const [showDeepDecodeModal, setShowDeepDecodeModal] = useState(false);
  const [isDeepDecodeAnalyzing, setIsDeepDecodeAnalyzing] = useState(false);
  const [deepDecodeResult, setDeepDecodeResult] = useState<DeepDecodeResult | null>(null);
  const [showDeepDecodeResults, setShowDeepDecodeResults] = useState(false);

  // Decode clarification conversation state
  const [activeClarificationId, setActiveClarificationId] = useState<string | null>(null);
  const [clarificationContext, setClarificationContext] = useState<DecodeClarificationContext | null>(null);

  // Input bar collapse/expand state
  const [isInputBarCollapsed, setIsInputBarCollapsed] = useState(false);
  // Keep type bar visible (no scroll-to-collapse) until user sends a message
  const [inputBarPermanentUntilSend, setInputBarPermanentUntilSend] = useState(false);
  const inputBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);

  // Track conversation context for mid-loop image continuation
  const [conversationContext, setConversationContext] = useState<{
    originalMessage: string;
    previousSummary: string;
    previousPatterns?: string[];
    previousReply?: string;
    lastMessageFromOther?: string; // The last message from the other person (for context)
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
  const updatePersonContext = usePersonContextStore((s) => s.updatePersonContext);
  const activePersonContext = activeLoopPersonContextId
    ? getPersonContextById(activeLoopPersonContextId)
    : null;

  // User feedback preferences for reply generation
  const getPreferenceSummary = useFeedbackStore((s) => s.getPreferenceSummary);

  // Track if Deep Search has been triggered this session
  const deepSearchTriggered = useRef(false);

  // Reset deep search trigger when active loop changes
  useEffect(() => {
    deepSearchTriggered.current = false;
  }, [activeLoopId]);

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

  // Helper to add message with a specific mode (used when mode must be preserved across async operations)
  const addMessageWithMode = (message: ChatMessage, mode: MessageMode) => {
    addMessageToActiveLoopRaw({
      ...message,
      mode,
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

  // Refs for both FlatLists (named as ScrollView refs for backward compatibility)
  const replyScrollViewRef = useRef<FlatList<ChatMessage>>(null);
  const decodeScrollViewRef = useRef<FlatList<ChatMessage>>(null);

  // Handle mode change with slide animation
  const handleModeChangeWithAnimation = useCallback((newMode: InputMode) => {
    const SLIDE_DURATION = 300;
    const SLIDE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

    if (newMode === "rewrite") {
      // Slide Reply in from right, Decode out to left
      Animated.parallel([
        Animated.timing(replySlideX, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(decodeSlideX, {
          toValue: -screenWidth,
          duration: SLIDE_DURATION,
          easing: SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide Decode in from left, Reply out to right
      Animated.parallel([
        Animated.timing(replySlideX, {
          toValue: screenWidth,
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

  // Handle Deep Decode analysis
  const handleDeepDecodeAnalyze = useCallback(async (images: SelectedImage[], context?: string) => {
    if (images.length === 0) return;

    setIsDeepDecodeAnalyzing(true);

    try {
      const imagesBase64 = images.map((img) => img.base64);
      const result = await analyzeDeepDecode(imagesBase64, context);

      setDeepDecodeResult(result);
      setShowDeepDecodeModal(false);
      setShowDeepDecodeResults(true);

      // Add the result to the decode chat loop as floating text
      const activeLoop = getActiveLoop();
      console.log("[DeepDecode] Active loop exists:", !!activeLoop, "id:", activeLoop?.id);

      if (activeLoop) {
        // Remove any existing deep decode results first (keep only one)
        const existingDecodeResults = activeLoop.messages.filter(
          (msg) => msg.role === "deep-decode-result"
        );
        existingDecodeResults.forEach((msg) => {
          removeMessageFromActiveLoop(msg.id);
        });

        const deepDecodeMsg: DeepDecodeResultMessage = {
          id: `deep-decode-result-${Date.now()}`,
          role: "deep-decode-result",
          content: "",
          timestamp: Date.now(),
          mode: "understand",
          decodeResult: result,
        };
        console.log("[DeepDecode] Adding result to chat loop:", deepDecodeMsg.id);
        addMessageToActiveLoopRaw(deepDecodeMsg);

        // Scroll to bottom to show the result
        setTimeout(() => {
          decodeScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.log("[DeepDecode] No active loop, cannot add message to chat");
      }
    } catch (error) {
      console.error("[DeepDecode] Analysis failed:", error);
    } finally {
      setIsDeepDecodeAnalyzing(false);
    }
  }, [addMessageToActiveLoopRaw, getActiveLoop, removeMessageFromActiveLoop]);

  const handleDeepDecodeClose = useCallback(() => {
    setShowDeepDecodeResults(false);
    setDeepDecodeResult(null);
  }, []);

  const handleDeepDecodeNewAnalysis = useCallback(() => {
    setShowDeepDecodeResults(false);
    setDeepDecodeResult(null);
    setShowDeepDecodeModal(true);
  }, []);

  // Initialize slide positions based on initial mode
  useEffect(() => {
    if (inputMode === "understand") {
      // Decode mode: Decode at center, Reply off to the right
      replySlideX.setValue(screenWidth);
      decodeSlideX.setValue(0);
    } else {
      // Reply mode: Reply at center, Decode off to the left
      replySlideX.setValue(0);
      decodeSlideX.setValue(-screenWidth);
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

  // Handle showing person context card when navigating from InputScreen
  useEffect(() => {
    const showPersonContextCard = route.params?.showPersonContextCard;

    if (showPersonContextCard) {
      // Add person context card to the chat loop
      const personContextCardMsg: PersonContextCardMessage = {
        id: `person-context-card-${Date.now()}`,
        role: "person-context-card",
        content: "",
        timestamp: Date.now(),
        mode: "understand",
      };
      addMessageToActiveLoopRaw(personContextCardMsg);
      // Scroll to bottom to show the card
      setTimeout(() => {
        decodeScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [route.params?.showPersonContextCard]);

  // Handle Deep Search trigger when navigating from PersonContextModal
  useEffect(() => {
    const triggerDeepSearch = route.params?.triggerDeepSearch;

    console.log("[ChatScreen] Deep Search trigger check:", {
      triggerDeepSearch,
      activePersonContext: activePersonContext?.name,
      alreadyTriggered: deepSearchTriggered.current,
    });

    // Only run if we have both the trigger flag and an active person context
    if (!triggerDeepSearch || !activePersonContext || deepSearchTriggered.current) {
      return;
    }

    // Mark as triggered immediately to prevent duplicates
    deepSearchTriggered.current = true;

    // Run Deep Search
    const runDeepSearch = async () => {
      console.log("[DeepSearch] Starting search for:", activePersonContext.name);

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
        // Execute Deep Search - searches all 9 categories thoroughly
        const result = await executeDeepSearch({
          personContext: activePersonContext,
          onProgress: (status) => {
            console.log("[DeepSearch] Progress:", status);
          },
        });

        console.log("[DeepSearch] Result:", result.success, result.error);

        // Remove loading message
        removeMessageFromActiveLoop(loadingMsgId);

        if (result.success && result.result) {
          const sources = result.result.sources;

          if (sources.length === 0) {
            // No results found - show no results message in chat loop
            const noResultsMsg: DeepSearchNoResultsChatMessage = {
              id: `deep-search-no-results-${Date.now()}`,
              role: "deep-search-no-results",
              content: "",
              timestamp: Date.now(),
              personName: activePersonContext.name,
              mode: "understand",
            };
            addMessageToActiveLoopRaw(noResultsMsg);
          } else {
            // Add intro message to chat loop
            const introMsg: DeepSearchIntroMessage = {
              id: `deep-search-intro-${Date.now()}`,
              role: "deep-search-intro",
              content: "",
              timestamp: Date.now(),
              personName: activePersonContext.name,
              totalResults: sources.length,
              mode: "understand",
            };
            addMessageToActiveLoopRaw(introMsg);

            // Add individual profile messages with inline verification
            for (let i = 0; i < sources.length; i++) {
              const profileMsg: DeepSearchProfileChatMessage = {
                id: `deep-search-profile-${Date.now()}-${i}`,
                role: "deep-search-profile",
                content: "",
                timestamp: Date.now() + i,
                source: sources[i],
                index: i,
                total: sources.length,
                personContextId: activePersonContext.id,
                verificationStatus: "pending",
                mode: "understand",
              };
              addMessageToActiveLoopRaw(profileMsg);
            }
          }

          setActiveLoopDeepSearchCompleted(true);

          // Scroll to bottom to show results
          setTimeout(() => {
            decodeScrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
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

    // Small delay to ensure state is settled and UI is ready
    setTimeout(runDeepSearch, 300);
  }, [route.params?.triggerDeepSearch, activePersonContext, activeLoopPersonContextId]);

  // Reusable function to run deep search for a person context
  const runDeepSearchForPerson = async (personContextId: string) => {
    const personContext = getPersonContextById(personContextId);
    if (!personContext) {
      console.log("[DeepSearch] No person context found for ID:", personContextId);
      return;
    }

    console.log("[DeepSearch] Starting search for:", personContext.name);

    // Add loading message with ChatLoadingBubble
    const loadingMsgId = `deep-search-loading-${Date.now()}`;
    const loadingMessage: ChatLoadingMessage = {
      id: loadingMsgId,
      role: "chat-loading",
      content: "",
      timestamp: Date.now(),
      loadingType: "deep-search",
      loadingState: "loading",
      customAction: `Searching for ${personContext.name}`,
      mode: "understand",
    };
    addMessageToActiveLoopRaw(loadingMessage);

    // Scroll to show loading
    setTimeout(() => {
      decodeScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Execute Deep Search - searches all 9 categories thoroughly
      const result = await executeDeepSearch({
        personContext: personContext,
        onProgress: (status) => {
          console.log("[DeepSearch] Progress:", status);
        },
      });

      console.log("[DeepSearch] Result:", result.success, result.error);

      // Remove loading message
      removeMessageFromActiveLoop(loadingMsgId);

      if (result.success && result.result) {
        const sources = result.result.sources;

        if (sources.length === 0) {
          // No results found - show no results message in chat loop
          const noResultsMsg: DeepSearchNoResultsChatMessage = {
            id: `deep-search-no-results-${Date.now()}`,
            role: "deep-search-no-results",
            content: "",
            timestamp: Date.now(),
            personName: personContext.name,
            mode: "understand",
          };
          addMessageToActiveLoopRaw(noResultsMsg);
        } else {
          // Add intro message to chat loop
          const introMsg: DeepSearchIntroMessage = {
            id: `deep-search-intro-${Date.now()}`,
            role: "deep-search-intro",
            content: "",
            timestamp: Date.now(),
            personName: personContext.name,
            totalResults: sources.length,
            mode: "understand",
          };
          addMessageToActiveLoopRaw(introMsg);

          // Add individual profile messages with inline verification
          for (let i = 0; i < sources.length; i++) {
            const profileMsg: DeepSearchProfileChatMessage = {
              id: `deep-search-profile-${Date.now()}-${i}`,
              role: "deep-search-profile",
              content: "",
              timestamp: Date.now() + i,
              source: sources[i],
              index: i,
              total: sources.length,
              personContextId: personContextId,
              verificationStatus: "pending",
              mode: "understand",
            };
            addMessageToActiveLoopRaw(profileMsg);
          }
        }

        setActiveLoopDeepSearchCompleted(true);

        // Scroll to bottom to show results
        setTimeout(() => {
          decodeScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else if (result.safetyBlock) {
        // Safety block - show error with appropriate message
        const errorMessage: ChatLoadingMessage = {
          id: `deep-search-safety-${Date.now()}`,
          role: "chat-loading",
          content: "",
          timestamp: Date.now(),
          loadingType: "deep-search",
          loadingState: "error",
          errorMessage: result.safetyBlock.reason === "safety_concern"
            ? "I noticed some safety concerns. Your well-being comes first."
            : "This search cannot be completed.",
          mode: "understand",
        };
        addMessageToActiveLoopRaw(errorMessage);
      } else if (result.error) {
        // Error message
        const errorMessage: ChatLoadingMessage = {
          id: `deep-search-error-${Date.now()}`,
          role: "chat-loading",
          content: "",
          timestamp: Date.now(),
          loadingType: "deep-search",
          loadingState: "error",
          errorMessage: "Could not complete the search right now. Please try again.",
          mode: "understand",
        };
        addMessageToActiveLoopRaw(errorMessage);
      }
    } catch (error) {
      console.error("[DeepSearch] Error:", error);
      removeMessageFromActiveLoop(loadingMsgId);

      // Show error message
      const errorMessage: ChatLoadingMessage = {
        id: `deep-search-error-${Date.now()}`,
        role: "chat-loading",
        content: "",
        timestamp: Date.now(),
        loadingType: "deep-search",
        loadingState: "error",
        errorMessage: "Something went wrong while searching. Please try again.",
        mode: "understand",
      };
      addMessageToActiveLoopRaw(errorMessage);
    }
  };

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
    console.log("[processUserMessage] Called with:", {
      messageContent: userMessage.content?.substring(0, 50),
      hasImage: !!userMessage.imageBase64,
      currentMode: inputModeRef.current,
    });
    setIsProcessing(true);
    setIsLoading(true);
    setCurrentUserMessage(userMessage.content);

    // Capture the mode at submission time - this ensures all responses go to the correct loop
    // even if user switches modes while waiting for the response
    const capturedMode = inputModeRef.current as MessageMode;

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageWithMode(typingMsg, capturedMode);

      let dysfunctionalSummary: { summary: string; patterns?: string[]; responseGuidance?: string; communicationMistake?: { mistake: string; whyAvoid: string } };
      let analysis: EmotionalAnalysis | null = null;
      let imageAnalysisResult: any = null;

      if (userMessage.imageBase64) {
        // Image flow: analyze image first
        imageAnalysisResult = await analyzeImageToxicity(userMessage.imageBase64);

        // Check for invalid input early - skip all analysis cards and just ask for clarification
        if (imageAnalysisResult?.isInvalidInput === true) {
          // Remove typing indicator
          removeMessageFromActiveLoop(typingMsg.id);

          // Use the specific clarification message for invalid input
          const clarificationMessage = "It looks like that image might have been sent by accident. Can you let me know what you meant or what you'd like help with?";

          // Show as assistant message (floating text)
          const assistantMsg: ChatMessage = {
            id: Date.now().toString() + "_clarification_assistant",
            role: "assistant",
            content: clarificationMessage,
            timestamp: Date.now(),
          };
          addMessageWithMode(assistantMsg, capturedMode);

          // Save minimal context - awaiting user clarification
          setConversationContext({
            originalMessage: userMessage.content,
            previousSummary: "",
            previousPatterns: undefined,
            previousReply: undefined,
            lastMessageFromOther: undefined,
          });

          // Reset loading states and exit early - wait for user to clarify
          setIsLoading(false);
          setIsProcessing(false);
          return;
        }

        // For images, use the image analysis summary directly - skip extra API call
        dysfunctionalSummary = {
          summary: imageAnalysisResult.summary || "Analyzing the conversation shared.",
          patterns: imageAnalysisResult.labels?.map((l: any) => l.tag) || [],
          responseGuidance: imageAnalysisResult.responseGuidance,
          communicationMistake: imageAnalysisResult.communicationMistake,
        };

        // Create analysis from image - use actual tone from analysis
        analysis = {
          emotionalClarity: 70,
          detectedState: "Processing",
          relationshipRisk: "medium",
          summary: imageAnalysisResult.summary,
          tone: imageAnalysisResult.conversationTone || "neutral",
          pattern: "Conversation",
          emotionalImpact: imageAnalysisResult.emotionalImpact,
          coreIssue: "Communication",
          fullAnalysis: imageAnalysisResult.summary,
        };
      } else {
        // Text flow: analyze text - run emotional analysis and dysfunctional summary in PARALLEL
        const [analysisResult, dysfunctionalResult] = await Promise.all([
          generateEmotionalAnalysis(userMessage.content),
          generateDysfunctionalCommunicationSummary(userMessage.content),
        ]);
        analysis = analysisResult;
        dysfunctionalSummary = dysfunctionalResult;
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
        responseGuidance: dysfunctionalSummary.responseGuidance,
        communicationMistake: dysfunctionalSummary.communicationMistake,
      };
      addMessageWithMode(dysfunctionalMsg, capturedMode);

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
        addMessageWithMode(redFlagsMsg, capturedMode);
      }

      // Show typing for reply generation
      const typingMsg2: TypingMessage = {
        id: Date.now().toString() + "_typing2",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageWithMode(typingMsg2, capturedMode);

      // STEP 2: Generate and show Suggested Reply
      const preferenceSummary = getPreferenceSummary();

      let suggestedReply;

      if (imageAnalysisResult?.suggestedResponse) {
        // Use the reply from image analysis directly
        suggestedReply = {
          id: Date.now().toString(),
          text: imageAnalysisResult.suggestedResponse,
          guidanceNote: imageAnalysisResult.guidanceNote || "This will help keep the conversation flowing.",
        };
      } else {
        // Generate reply for text-only input with user preferences
        suggestedReply = await generateQuickSuggestedReply(
          userMessage.content,
          analysis || undefined,
          preferenceSummary || undefined
        );
      }

      removeMessageFromActiveLoop(typingMsg2.id);

      // STEP 3: Show Suggested Reply
      // For image input, show acknowledgment + question as floating text
      if (imageAnalysisResult) {
        const acknowledgment = imageAnalysisResult.acknowledgment || "I see this conversation.";
        const responseContext = imageAnalysisResult.responseContext || "this message";
        const promptMessage = `${acknowledgment}\n\nHow do you want to respond to ${responseContext}?`;

        const assistantMsg: ChatMessage = {
          id: Date.now().toString() + "_prompt_assistant",
          role: "assistant",
          content: promptMessage,
          timestamp: Date.now(),
        };
        addMessageWithMode(assistantMsg, capturedMode);
      }

      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_reply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [suggestedReply],
        intention: "maintain", // Default neutral intention
      };
      addMessageWithMode(replyMsg, capturedMode);

      // Save conversation context for potential mid-loop image continuation
      setConversationContext({
        originalMessage: userMessage.content,
        previousSummary: dysfunctionalSummary.summary,
        previousPatterns: dysfunctionalSummary.patterns,
        previousReply: suggestedReply.text,
        lastMessageFromOther: imageAnalysisResult?.lastMessage,
      });

    } catch (error: any) {
      console.error("Error processing message:", error?.message || error);
      // Remove any lingering typing indicators
      const allCurrentMessages = getActiveLoop()?.messages || [];
      const typingMsgs = allCurrentMessages.filter((m) => m.role === "typing");
      for (const tm of typingMsgs) {
        removeMessageFromActiveLoop(tm.id);
      }
      addMessageWithMode({
        id: Date.now().toString(),
        role: "assistant",
        content: "I encountered an error processing your message. Please try again.",
        timestamp: Date.now(),
      }, capturedMode);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  /**
   * Process a follow-up instruction in Reply mode (e.g., "Let's give a kind reply")
   * This regenerates the suggested reply based on the user's instruction
   * without re-analyzing the original conversation
   */
  const processReplyFollowUp = async (userMessage: ChatMessage) => {
    setIsProcessing(true);
    setIsLoading(true);

    const capturedMode = inputModeRef.current as MessageMode;

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageWithMode(typingMsg, capturedMode);

      // Get context from conversationContext or extract from existing messages
      let originalContext = conversationContext;

      // If no stored context, try to extract from existing messages
      if (!originalContext) {
        const dysfunctionalMsg = messages.find(m => m.role === "dysfunctional-communication") as DysfunctionalCommunicationMessage | undefined;
        const suggestedReplyMsg = messages.find(m => m.role === "suggested-reply-card") as SuggestedReplyCardMessage | undefined;

        if (dysfunctionalMsg || suggestedReplyMsg) {
          originalContext = {
            originalMessage: dysfunctionalMsg?.content || "",
            previousSummary: dysfunctionalMsg?.summary || "",
            previousPatterns: dysfunctionalMsg?.patterns,
            previousReply: suggestedReplyMsg?.replies?.[0]?.text,
            lastMessageFromOther: dysfunctionalMsg?.summary,
          };
        }
      }

      if (!originalContext) {
        throw new Error("No conversation context found");
      }

      // Build context for generating a new reply
      const contextForReply = `Original conversation context: ${originalContext.previousSummary || originalContext.originalMessage}

Last message from the other person: ${originalContext.lastMessageFromOther || "Not specified"}

Previous suggested reply: ${originalContext.previousReply || "None"}

User's instruction for the new reply: ${userMessage.content}

Generate a new reply that follows the user's instruction while still responding appropriately to the conversation context.`;

      // Generate new reply based on user's instruction
      const preferenceSummary = getPreferenceSummary();
      const newReply = await generateQuickSuggestedReply(
        contextForReply,
        currentAnalysis || undefined,
        preferenceSummary || undefined
      );

      // Remove typing indicator
      removeMessageFromActiveLoop(typingMsg.id);

      // Add new suggested reply card
      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_reply_followup",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [newReply],
        intention: "maintain",
      };
      addMessageWithMode(replyMsg, capturedMode);

      // Update conversation context with the new reply
      setConversationContext({
        ...originalContext,
        previousReply: newReply.text,
      });

    } catch (error) {
      console.error("Error processing reply follow-up:", error);
      addMessageWithMode({
        id: Date.now().toString(),
        role: "assistant",
        content: "I had trouble generating a new reply. Please try again.",
        timestamp: Date.now(),
      }, capturedMode);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleSelectReply = (replyText: string) => {
    // Reply is already copied to clipboard by the SuggestedReplyCard component
    // No need to set it in the input bar
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
    // Get fresh messages from the store
    const activeLoop = getActiveLoop();
    const currentMessages = activeLoop?.messages || [];

    // Find the most recent user message before this reply card
    const currentMsgIndex = currentMessages.findIndex((m) => m.id === currentMessageId);
    let userMessageContent = currentUserMessage;

    // If currentUserMessage is empty, try to find the user message from history
    if (!userMessageContent) {
      for (let i = currentMsgIndex - 1; i >= 0; i--) {
        if (currentMessages[i].role === "user" && currentMessages[i].content) {
          userMessageContent = currentMessages[i].content;
          break;
        }
      }
    }

    // Still no user message found, return early
    if (!userMessageContent) return;

    // Get the current reply card to use its reply as context for variation
    const currentReplyCard = currentMessages.find(
      (m) => m.id === currentMessageId
    ) as SuggestedReplyCardMessage | undefined;
    const existingReply = currentReplyCard?.replies?.[0]?.text;

    const typingMsg: TypingMessage = {
      id: Date.now().toString() + "_typing_different",
      role: "typing",
      content: "",
      timestamp: Date.now(),
    };
    addMessageToActiveLoop(typingMsg);

    try {
      // If we have the last message from the conversation, include it for better context
      let contextForReply = conversationContext?.lastMessageFromOther
        ? `The other person said: "${conversationContext.lastMessageFromOther}"\n\nContext: ${userMessageContent}`
        : userMessageContent;

      // If there's an existing reply, add instruction to generate something different
      if (existingReply) {
        contextForReply += `\n\n[IMPORTANT: Generate a DIFFERENT reply than this one: "${existingReply}"]`;
      }

      // Use existing analysis or create a minimal one
      const analysisToUse = currentAnalysis || {
        emotionalClarity: 70,
        detectedState: "Processing",
        relationshipRisk: "medium" as const,
        summary: "Analyzing conversation",
        tone: "neutral" as const,
        pattern: "Conversation",
        emotionalImpact: "moderate",
        coreIssue: "Communication",
        fullAnalysis: userMessageContent,
      };

      // Get user preferences for reply generation
      const preferenceSummary = getPreferenceSummary();

      const newReply = await generateQuickSuggestedReply(
        contextForReply,
        analysisToUse,
        preferenceSummary || undefined
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
      addMessageToActiveLoop(newReplyMsg);
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

      // Generate new suggested reply with user preferences
      const typingMsg2: TypingMessage = {
        id: Date.now().toString() + "_typing_reply",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageToActiveLoop(typingMsg2);

      const preferenceSummary = getPreferenceSummary();
      const newReply = await generateQuickSuggestedReply(enrichedMessage, newAnalysis, preferenceSummary || undefined);

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
    console.log("[ChatScreen] handleSend called:", {
      currentInput: currentInput.trim(),
      hasImage: !!selectedImageUri,
      isLoading,
      inputMode
    });
    if ((!currentInput.trim() && !selectedImageUri) || isLoading) return;

    // User did an input: type bar can collapse on scroll again
    setInputBarPermanentUntilSend(false);

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
        content: currentInput || "",
        timestamp: Date.now(),
        imageUrl: selectedImageUri,
        imageBase64: selectedImageBase64,
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setSelectedImageUri(undefined);
      setSelectedImageBase64(undefined);

      // Check if this is a follow-up instruction (no image, has existing conversation context)
      // If so, treat it as a request to regenerate/modify the reply
      // Also check if there are existing messages in the loop (suggests ongoing conversation)
      const hasExistingContext = conversationContext !== null && conversationContext.originalMessage;
      const hasExistingMessages = messages.length > 0 && messages.some(m =>
        m.role === "suggested-reply-card" || m.role === "dysfunctional-communication"
      );
      const isFollowUpInstruction = !userMessage.imageBase64 && (hasExistingContext || hasExistingMessages);

      console.log("[ChatScreen] Reply mode follow-up check:", {
        hasExistingContext,
        hasExistingMessages,
        isFollowUpInstruction,
        conversationContext: conversationContext ? "exists" : "null",
        messagesCount: messages.length,
        messageRoles: messages.map(m => m.role),
      });

      if (isFollowUpInstruction) {
        await processReplyFollowUp(userMessage);
      } else {
        await processUserMessage(userMessage);
      }
      return;
    }

    // Handle Decode (understand) mode - conversational exploration
    if (inputMode === "understand") {
      console.log("[ChatScreen] Processing decode message");
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput || "",
        timestamp: Date.now(),
        imageUrl: selectedImageUri,
        imageBase64: selectedImageBase64,
      };

      addMessageToActiveLoop(userMessage);
      setCurrentInput("");
      setSelectedImageUri(undefined);
      setSelectedImageBase64(undefined);

      // Check if we're in an active clarification conversation
      if (activeClarificationId && clarificationContext) {
        await processClarificationResponse(userMessage);
        return;
      }

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

  // Helper function to detect deep search intent in user message
  const isDeepSearchRequest = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    const deepSearchPhrases = [
      "deep search",
      "deepsearch",
      "search for",
      "look up",
      "look into",
      "find out about",
      "find information",
      "research",
      "investigate",
      "dig into",
      "background check",
      "who is",
      "learn more about",
      "what can you find",
      "search someone",
      "search this person",
      "search them",
    ];

    return deepSearchPhrases.some((phrase) => lowerMessage.includes(phrase));
  };

  // Helper function to detect if user wants more from a completed search
  const isWantingMoreFromSearch = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    const wantMorePhrases = [
      "anything else",
      "is there more",
      "what else",
      "find more",
      "search more",
      "dig deeper",
      "keep searching",
      "more info",
      "more information",
      "anything more",
      "something else",
      "other things",
      "other info",
      "missed anything",
      "missing anything",
      "that all",
      "is that it",
      "that everything",
      "all you found",
      "all you could find",
      "can you find more",
      "try again",
      "search again",
    ];

    return wantMorePhrases.some((phrase) => lowerMessage.includes(phrase));
  };

  // Helper function to detect if Deep Search should be SUGGESTED (not explicitly requested)
  // This triggers the suggestion card, not the immediate deep search flow
  const shouldSuggestDeepSearch = (message: string, conversationHistory: { role: string; content: string }[]): boolean => {
    const lowerMessage = message.toLowerCase();

    // Skip if user explicitly requested deep search (handled separately)
    if (isDeepSearchRequest(message)) {
      return false;
    }

    // Patterns that suggest the user is talking about a specific person
    const personReferencePatterns = [
      // Names - mentions "him", "her", "them" implying a specific person
      /\b(him|her|them|he|she|they)\b/i,
      // Dating/relationship context
      /\b(dating|met|matched|talking to|seeing|went out|going out|date|texting|messaged|met someone|new guy|new girl|this guy|this girl|this person)\b/i,
      // Meeting someone new
      /\b(just met|recently met|started talking|matched with|connected with|met on|met through)\b/i,
      // Uncertainty about a person
      /\b(who is|should i trust|is this real|is he|is she|are they|can i trust|what do you think of|seem like|seems like a|red flag|concerned about|suspicious|worried about|not sure about|unsure about)\b/i,
      // Verification context
      /\b(legit|legitimate|catfish|scam|real person|fake|verify|verification|check out|look into)\b/i,
    ];

    const hasPersonReference = personReferencePatterns.some((pattern) => pattern.test(message));

    // Also check if conversation history mentions a specific person by name
    // This helps when user says "what about him?" after mentioning a name earlier
    const conversationHasNameMention = conversationHistory.some((msg) => {
      // Simple heuristic: check for capitalized words that might be names
      const possibleNames = msg.content.match(/\b[A-Z][a-z]+\b/g);
      return possibleNames && possibleNames.length > 0;
    });

    // Check for explicit questions about someone
    const questionPatterns = [
      /what.*think.*about/i,
      /should.*trust/i,
      /is.*real/i,
      /who.*is/i,
      /can.*find.*about/i,
      /know.*anything.*about/i,
    ];

    const hasExplicitQuestion = questionPatterns.some((pattern) => pattern.test(message));

    // Trigger suggestion if:
    // 1. User mentions person pronouns/references AND has explicit question
    // 2. OR user is in dating/meeting context with uncertainty language
    // 3. OR conversation has name mention and user asks about "them"
    return (
      (hasPersonReference && hasExplicitQuestion) ||
      (lowerMessage.includes("dating") && /\b(trust|real|suspicious|worried|red flag|concerned)\b/i.test(lowerMessage)) ||
      (conversationHasNameMention && /\b(him|her|them|this person|this guy|this girl)\b/i.test(lowerMessage) && hasExplicitQuestion)
    );
  };

  // Process message in Decode mode - conversational exploration for clarity
  const processDecodeMessage = async (userMessage: ChatMessage) => {
    console.log("[processDecodeMessage] Called with:", {
      messageContent: userMessage.content?.substring(0, 50),
      hasImage: !!userMessage.imageBase64,
    });
    setIsProcessing(true);
    setIsLoading(true);

    // Capture the mode at submission time - this ensures all responses go to the correct loop
    const capturedMode: MessageMode = "understand";

    // Generate a unique ID for the loading bubble
    const loadingMsgId = `chat-loading-${Date.now()}`;

    try {
      // Check if user is requesting a deep search
      if (isDeepSearchRequest(userMessage.content)) {
        // Add assistant message explaining deep search
        const assistantMsg: ChatMessage = {
          id: Date.now().toString() + "_deep_search_intro",
          role: "assistant",
          content: "I can help you learn more about someone. Fill out the details below and I will search across the web to find publicly available information.",
          timestamp: Date.now(),
        };
        addMessageWithMode(assistantMsg, capturedMode);

        // Add the PersonContextCard for user to fill out
        const personContextCardMsg: PersonContextCardMessage = {
          id: `person-context-card-${Date.now()}`,
          role: "person-context-card",
          content: "",
          timestamp: Date.now(),
          mode: "understand",
        };
        addMessageToActiveLoopRaw(personContextCardMsg);

        // Scroll to bottom to show the card
        setTimeout(() => {
          decodeScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        setIsLoading(false);
        setIsProcessing(false);
        return;
      }

      // Show chat loading bubble
      const loadingMsg: ChatLoadingMessage = {
        id: loadingMsgId,
        role: "chat-loading",
        content: "",
        timestamp: Date.now(),
        loadingType: "chat",
        loadingState: "loading",
        mode: "understand",
      };
      addMessageToActiveLoopRaw(loadingMsg);

      // Scroll to show loading bubble
      setTimeout(() => {
        decodeScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Build conversation history from decode messages for context
      // Include search results context so the chatbot knows what was found
      // IMPORTANT: Exclude the current message (by ID) since it will be passed separately
      const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];

      for (const msg of decodeMessages) {
        // Skip the current user message - it will be passed separately to avoid duplication
        if (msg.id === userMessage.id) continue;

        if (msg.role === "user" || msg.role === "assistant") {
          conversationHistory.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        } else if (msg.role === "deep-search-summary") {
          // Add search results as context so the chatbot knows what was found
          const summaryMsg = msg as DeepSearchSummaryChatMessage;
          if (summaryMsg.verifiedSources && summaryMsg.verifiedSources.length > 0) {
            const sourceSummaries = summaryMsg.verifiedSources.map((source) => {
              const parts = [source.platform];
              if (source.summary) parts.push(source.summary);
              if (source.relevantDetails?.length) parts.push(...source.relevantDetails.slice(0, 3));
              return parts.join(" - ");
            }).join("\n");

            conversationHistory.push({
              role: "assistant",
              content: `[Search Results for ${summaryMsg.personName}]\nI found and the user verified ${summaryMsg.verifiedCount} profile(s):\n${sourceSummaries}\n\nYou can reference this information when answering follow-up questions about ${summaryMsg.personName}.`,
            });
          }
        }
      }

      // Check if user sent an image - use structured analysis
      if (userMessage.imageBase64) {
        // Generate structured analysis from the image
        const structuredResult = await generateStructuredAnalysisFromImage(
          [userMessage.imageBase64],
          undefined // No additional context for now
        );

        // Remove loading bubble
        removeMessageFromActiveLoop(loadingMsgId);

        // Add structured analysis card
        const analysisMsg: StructuredAnalysisMessage = {
          id: Date.now().toString() + "_structured_analysis",
          role: "structured-analysis",
          content: "",
          timestamp: Date.now(),
          mode: capturedMode,
          analysis: structuredResult,
        };
        addMessageWithMode(analysisMsg, capturedMode);

        // Generate and add post-decode clarity message (psychological relief, no engagement prompts)
        const clarityMessage = await generatePostDecodeClarity(structuredResult);
        const clarityAssistantMsg: ChatMessage = {
          id: Date.now().toString() + "_post_decode_clarity",
          role: "assistant",
          content: clarityMessage,
          timestamp: Date.now(),
          mode: capturedMode,
        };
        addMessageWithMode(clarityAssistantMsg, capturedMode);

        // Scroll to show response
        setTimeout(() => {
          decodeScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        setIsLoading(false);
        setIsProcessing(false);
        return;
      }

      // Log conversation history for debugging
      console.log("[processDecodeMessage] Conversation history:", {
        historyLength: conversationHistory.length,
        currentMessage: userMessage.content.substring(0, 50),
        messages: conversationHistory.map(m => ({ role: m.role, content: m.content.substring(0, 30) }))
      });

      // Pattern Mirror: Detect and record behavioral signals
      const behavioralSignals = detectBehavioralSignals(userMessage.content, conversationHistory);
      const { recordSignal, getInsightIfReady, markInsightShown } = usePatternMirrorStore.getState();

      // Get contact context for dual-layer pattern tracking
      const contactId = activeLoopPersonContextId || undefined;
      const contactName = activePersonContext?.name || undefined;

      // Record detected signals with contact context
      for (const signal of behavioralSignals) {
        recordSignal(signal.type, signal.context, signal.severity, contactId, contactName);
      }

      // Check if we should surface a pattern insight (prioritizes contact-specific)
      const patternInsight = getInsightIfReady(contactId, contactName);
      if (patternInsight) {
        // Add pattern mirror card before the response
        const patternMsg: PatternMirrorMessage = {
          id: `pattern-mirror-${Date.now()}`,
          role: "pattern-mirror",
          content: "",
          timestamp: Date.now(),
          mode: capturedMode,
          insight: patternInsight,
        };

        // Remove loading briefly to insert pattern card
        removeMessageFromActiveLoop(loadingMsgId);
        addMessageWithMode(patternMsg, capturedMode);

        // Mark insight as shown so we don't repeat it (pass contactId for contact-specific cooldowns)
        markInsightShown(patternInsight.patternType, patternInsight.scope, contactId);

        // Re-add loading for the actual response
        const newLoadingMsg: ChatLoadingMessage = {
          id: `chat-loading-${Date.now()}`,
          role: "chat-loading",
          content: "",
          timestamp: Date.now(),
          loadingType: "chat",
          loadingState: "loading",
          mode: "understand",
        };
        addMessageToActiveLoopRaw(newLoadingMsg);
      }

      // Check if there's a previous structured analysis (meaning user is providing context)
      const previousStructuredAnalysis = decodeMessages.find(
        (m) => m.role === "structured-analysis"
      ) as StructuredAnalysisMessage | undefined;

      // Check if there was a post-decode clarity message (context suggestions)
      const hasPostDecodeClarity = decodeMessages.some(
        (m) => m.role === "assistant" && m.id.includes("_post_decode_clarity")
      );

      // If user is providing context after analysis, use the expanded decode response
      const isProvidingContext = previousStructuredAnalysis && hasPostDecodeClarity && conversationHistory.length >= 2;

      // Generate decode response for text-only messages with streaming
      const assistantMsgId = Date.now().toString() + "_decode_response";
      let hasReceivedFirstChunk = false;

      // Create assistant message placeholder for streaming
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        mode: capturedMode, // Include mode so updates preserve it
      };

      // Mark this message as streaming for fade animation
      setStreamingMessageId(assistantMsgId);

      // Choose the appropriate response generator
      if (isProvidingContext) {
        // Use context-aware expanded decode response
        const contactName = previousStructuredAnalysis.analysis.contactName || activePersonContext?.name || null;
        await generateContextAwareDecodeResponse(
          userMessage.content,
          conversationHistory,
          previousStructuredAnalysis.analysis,
          contactName,
          (_chunk, fullText) => {
            if (!hasReceivedFirstChunk) {
              hasReceivedFirstChunk = true;
              removeMessageFromActiveLoop(loadingMsgId);
              addMessageWithMode({ ...assistantMsg, content: fullText }, capturedMode);
            } else {
              updateMessageInActiveLoop(assistantMsgId, {
                ...assistantMsg,
                content: fullText,
              });
            }
          }
        );
      } else {
        // Stream the regular response - keep loading indicator until first content arrives
        await generateDecodeResponseStreaming(
          userMessage.content,
          conversationHistory,
          (_chunk, fullText) => {
            // On first chunk, remove loading and add assistant message
            if (!hasReceivedFirstChunk) {
              hasReceivedFirstChunk = true;
              removeMessageFromActiveLoop(loadingMsgId);
              addMessageWithMode({ ...assistantMsg, content: fullText }, capturedMode);
            } else {
              // Update the message content as chunks arrive
              updateMessageInActiveLoop(assistantMsgId, {
                ...assistantMsg,
                content: fullText,
              });
            }
          }
        );
      }

      // Streaming complete - clear streaming state
      setStreamingMessageId(null);

      // If no chunks were received (edge case), clean up loading indicator
      if (!hasReceivedFirstChunk) {
        removeMessageFromActiveLoop(loadingMsgId);
        addMessageWithMode({
          ...assistantMsg,
          content: "I want to make sure I understand. Could you tell me more about what you are trying to figure out?",
        }, capturedMode);
      }

      // Check if user wants more from a completed search
      const activeLoop = getActiveLoop();
      const deepSearchAlreadyCompleted = activeLoop?.deepSearchCompleted || false;

      // Get the latest search summary to find person context
      const searchSummaryMsg = decodeMessages.find(
        (m) => m.role === "deep-search-summary"
      ) as DeepSearchSummaryChatMessage | undefined;

      if (deepSearchAlreadyCompleted && isWantingMoreFromSearch(userMessage.content) && searchSummaryMsg) {
        // User wants more from the search - show follow-up card to collect more info
        const personContext = searchSummaryMsg.personContextId
          ? getPersonContextById(searchSummaryMsg.personContextId)
          : null;

        if (personContext) {
          // Determine what data types might help
          const missingDataTypes: string[] = [];
          if (!personContext.knownUsername) missingDataTypes.push("username");
          if (!personContext.location) missingDataTypes.push("location");
          if (personContext.contextAnchor?.type !== "workplace") missingDataTypes.push("workplace");
          if (personContext.contextAnchor?.type !== "school") missingDataTypes.push("school");
          if (!personContext.approximateAge) missingDataTypes.push("age");

          const followUp = getBestFollowUpQuestion(missingDataTypes, personContext);

          if (followUp) {
            const followUpMessage: DeepDiveFollowUpMessage = {
              id: `search-more-followup-${Date.now()}`,
              role: "deep-dive-follow-up",
              content: "",
              timestamp: Date.now(),
              personName: searchSummaryMsg.personName,
              personContextId: searchSummaryMsg.personContextId,
              question: followUp.question,
              dataType: followUp.dataType,
              placeholder: followUp.placeholder,
              isOptional: true,
              isSearchAgain: true, // Flag to indicate this is a fresh search
              mode: "understand",
            };
            addMessageToActiveLoopRaw(followUpMessage);
          }
        }
      } else {
        // Check if we should suggest Deep Search after the assistant response
        // Only suggest if no deep search has been completed in this loop
        const hasSuggestionCardAlready = decodeMessages.some(
          (msg) => msg.role === "deep-search-suggestion"
        );

        if (
          !deepSearchAlreadyCompleted &&
          !hasSuggestionCardAlready &&
          shouldSuggestDeepSearch(userMessage.content, conversationHistory)
        ) {
          // Add the Deep Search suggestion card
          const suggestionMsg: DeepSearchSuggestionMessage = {
            id: `deep-search-suggestion-${Date.now()}`,
            role: "deep-search-suggestion",
            content: "",
            timestamp: Date.now(),
            suggestionState: "collapsed",
            personContextId: activeLoopPersonContextId || undefined,
            mode: "understand",
          };
          addMessageToActiveLoopRaw(suggestionMsg);
        }
      }
    } catch (error: any) {
      console.error("Error processing decode message:", error?.message || error);
      // Remove loading bubble if it exists
      removeMessageFromActiveLoop(loadingMsgId);

      // Show error in loading bubble style
      const errorMsg: ChatLoadingMessage = {
        id: `chat-error-${Date.now()}`,
        role: "chat-loading",
        content: "",
        timestamp: Date.now(),
        loadingType: "chat",
        loadingState: "error",
        errorMessage: "Could not generate a response. Please try again.",
        mode: "understand",
      };
      addMessageToActiveLoopRaw(errorMsg);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  // Process user response in a clarification conversation
  const processClarificationResponse = async (userMessage: ChatMessage) => {
    if (!clarificationContext || !activeClarificationId) {
      // Fallback to normal decode processing if context is missing
      await processDecodeMessage(userMessage);
      return;
    }

    setIsProcessing(true);
    setIsLoading(true);

    const capturedMode: MessageMode = "understand";

    try {
      // Show loading indicator
      const loadingMsgId = `chat-loading-${Date.now()}`;
      const loadingMsg: ChatLoadingMessage = {
        id: loadingMsgId,
        role: "chat-loading",
        content: "",
        timestamp: Date.now(),
        loadingType: "chat",
        loadingState: "loading",
        mode: capturedMode,
      };
      addMessageToActiveLoopRaw(loadingMsg);

      // Update conversation history with user's message
      const updatedHistory = [
        ...clarificationContext.conversationHistory,
        { role: "user" as const, content: userMessage.content },
      ];

      const updatedContext: DecodeClarificationContext = {
        ...clarificationContext,
        conversationHistory: updatedHistory,
        turnsCompleted: clarificationContext.turnsCompleted + 1,
      };

      // Generate Klarity's response
      const clarificationResult = await generateDecodeClarificationResponse(
        userMessage.content,
        updatedContext
      );

      // Remove loading bubble
      removeMessageFromActiveLoop(loadingMsgId);

      // Add Klarity's response as assistant message
      const assistantMsg: ChatMessage = {
        id: Date.now().toString() + "_clarification_response",
        role: "assistant",
        content: clarificationResult.response,
        timestamp: Date.now(),
        mode: capturedMode,
      };
      addMessageWithMode(assistantMsg, capturedMode);

      // Update context with Klarity's response
      updatedHistory.push({ role: "assistant" as const, content: clarificationResult.response });

      // Update clarification context for conversation history tracking
      setClarificationContext({
        ...updatedContext,
        conversationHistory: updatedHistory,
      });

      // Scroll to show response
      setTimeout(() => {
        decodeScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("[processClarificationResponse] Error:", error?.message || error);
      // Clear clarification state on error
      setActiveClarificationId(null);
      setClarificationContext(null);
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

    // Capture the mode at submission time
    const capturedMode = inputModeRef.current as MessageMode;

    try {
      // Show typing indicator
      const typingMsg: TypingMessage = {
        id: Date.now().toString() + "_typing",
        role: "typing",
        content: "",
        timestamp: Date.now(),
      };
      addMessageWithMode(typingMsg, capturedMode);

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
      addMessageWithMode(continuationMsg, capturedMode);

      // Add updated suggested reply
      const replyMsg: SuggestedReplyCardMessage = {
        id: Date.now().toString() + "_reply",
        role: "suggested-reply-card",
        content: "",
        timestamp: Date.now(),
        replies: [result.updatedReply],
        intention: "maintain",
      };
      addMessageWithMode(replyMsg, capturedMode);

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

  // Check if there's any generated content in the chat
  const hasGeneratedContent = useMemo(() => {
    const activeLoop = getActiveLoop();
    const messages = activeLoop?.messages || [];
    return messages.some(m => m.role === "assistant" || m.role === "suggested-reply-card" || m.role === "dysfunctional-communication");
  }, [replyMessages, decodeMessages]);

  // Collapse input bar animation (skip when bar should stay permanent until user sends)
  const collapseInputBar = useCallback(() => {
    if (!hasGeneratedContent || isInputBarCollapsed || inputBarPermanentUntilSend) return;
    setIsInputBarCollapsed(true);
    Animated.timing(inputBarTranslateY, {
      toValue: 100, // Slide down off screen
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: true,
    }).start();
  }, [hasGeneratedContent, isInputBarCollapsed, inputBarPermanentUntilSend, inputBarTranslateY]);

  // Expand input bar animation
  const expandInputBar = useCallback(() => {
    if (!isInputBarCollapsed) return;
    setIsInputBarCollapsed(false);
    Animated.timing(inputBarTranslateY, {
      toValue: 0,
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: true,
    }).start();
  }, [isInputBarCollapsed, inputBarTranslateY]);

  // Handle scroll for collapsing/expanding input bar (no collapse while inputBarPermanentUntilSend)
  const handleScroll = useCallback((event: any) => {
    if (!hasGeneratedContent || inputBarPermanentUntilSend) return;

    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    // Only respond to significant scroll
    if (Math.abs(diff) > 5) {
      if (diff > 0 && currentY > 50) {
        // Scrolling down - collapse input bar
        collapseInputBar();
      }
      scrollDirection.current = diff > 0 ? "down" : "up";
    }

    lastScrollY.current = currentY;
  }, [hasGeneratedContent, inputBarPermanentUntilSend, collapseInputBar]);

  // Handle input bar tap to expand
  const handleInputBarTap = useCallback(() => {
    if (isInputBarCollapsed) {
      expandInputBar();
    }
    // Keep type bar visible until user sends
    setInputBarPermanentUntilSend(true);
  }, [isInputBarCollapsed, expandInputBar]);

  const handleInputFocus = () => {
    // Expand input bar when focused
    expandInputBar();
    // Keep type bar visible until user sends
    setInputBarPermanentUntilSend(true);
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
  const renderDecodeMessage = useCallback((message: ChatMessage) => {
    if (message.role === "typing") {
      return <TypingIndicator key={message.id} />;
    }

    // Chat loading - use simple TypingIndicator to match reply loop
    if (message.role === "chat-loading") {
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

    // Person Context Card - HIDDEN FOR NOW
    // if (message.role === "person-context-card") {
    //   return (
    //     <PersonContextCard
    //       key={message.id}
    //       showLinkOption={true}
    //       onPersonContextCreated={(personContextId, linkedToChat) => {
    //         // Card stays visible with completed state - don't remove
    //         // Trigger deep search for the new person context
    //         setTimeout(() => {
    //           runDeepSearchForPerson(personContextId);
    //         }, 300);
    //       }}
    //       onDismiss={() => {
    //         // Remove the card from chat when dismissed via X button
    //         removeMessageFromActiveLoop(message.id);
    //       }}
    //     />
    //   );
    // }

    // Deep Search Suggestion Card - suggested inline in chat
    if (message.role === "deep-search-suggestion") {
      const suggestionMsg = message as DeepSearchSuggestionMessage;
      return (
        <DeepSearchSuggestionCard
          key={message.id}
          messageId={message.id}
          initialState={suggestionMsg.suggestionState}
          existingPersonContextId={suggestionMsg.personContextId}
          searchResult={suggestionMsg.searchResult}
          errorMessage={suggestionMsg.errorMessage}
          showLinkOption={true}
          onRunDeepSearch={async (personContextId, linkedToChat) => {
            // Update the suggestion card state to running
            updateMessageInActiveLoop(message.id, {
              ...suggestionMsg,
              suggestionState: "running",
              personContextId,
            } as DeepSearchSuggestionMessage);

            try {
              const personContext = getPersonContextById(personContextId);
              if (!personContext) {
                throw new Error("Person context not found");
              }

              // Execute Deep Search
              const result = await executeDeepSearch({
                personContext: personContext,
                onProgress: (status) => {
                  console.log("[DeepSearch Suggestion] Progress:", status);
                },
              });

              if (result.success && result.result) {
                // Remove the suggestion card - we will show results as chat messages
                removeMessageFromActiveLoop(message.id);

                const sources = result.result.sources;

                if (sources.length === 0) {
                  // No results found - show no results message
                  const noResultsMsg: DeepSearchNoResultsChatMessage = {
                    id: `deep-search-no-results-${Date.now()}`,
                    role: "deep-search-no-results",
                    content: "",
                    timestamp: Date.now(),
                    personName: personContext.name,
                    mode: "understand",
                  };
                  addMessageToActiveLoopRaw(noResultsMsg);
                } else {
                  // Add intro message
                  const introMsg: DeepSearchIntroMessage = {
                    id: `deep-search-intro-${Date.now()}`,
                    role: "deep-search-intro",
                    content: "",
                    timestamp: Date.now(),
                    personName: personContext.name,
                    totalResults: sources.length,
                    mode: "understand",
                  };
                  addMessageToActiveLoopRaw(introMsg);

                  // Add individual profile messages with staggered timing
                  for (let i = 0; i < sources.length; i++) {
                    const profileMsg: DeepSearchProfileChatMessage = {
                      id: `deep-search-profile-${Date.now()}-${i}`,
                      role: "deep-search-profile",
                      content: "",
                      timestamp: Date.now() + i,
                      source: sources[i],
                      index: i,
                      total: sources.length,
                      personContextId,
                      verificationStatus: "pending",
                      mode: "understand",
                    };
                    addMessageToActiveLoopRaw(profileMsg);
                  }
                }

                setActiveLoopDeepSearchCompleted(true);

                // Scroll to bottom to show results
                setTimeout(() => {
                  decodeScrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              } else if (result.safetyBlock) {
                // Safety block - show error state
                updateMessageInActiveLoop(message.id, {
                  ...suggestionMsg,
                  suggestionState: "error",
                  personContextId,
                  errorMessage: result.safetyBlock.reason === "safety_concern"
                    ? "I noticed some safety concerns. Your well-being comes first."
                    : "This search cannot be completed.",
                } as DeepSearchSuggestionMessage);
              } else if (result.error) {
                // Error state
                updateMessageInActiveLoop(message.id, {
                  ...suggestionMsg,
                  suggestionState: "error",
                  personContextId,
                  errorMessage: result.error,
                } as DeepSearchSuggestionMessage);
              }
            } catch (error) {
              console.error("[DeepSearch Suggestion] Error:", error);
              // Update to error state
              updateMessageInActiveLoop(message.id, {
                ...suggestionMsg,
                suggestionState: "error",
                personContextId,
                errorMessage: "Something went wrong while searching. Please try again.",
              } as DeepSearchSuggestionMessage);
            }
          }}
          onDismiss={() => {
            // Remove the suggestion card when dismissed
            removeMessageFromActiveLoop(message.id);
          }}
          onUpdateState={(newState) => {
            // Update the suggestion state in the message
            updateMessageInActiveLoop(message.id, {
              ...suggestionMsg,
              suggestionState: newState,
            } as DeepSearchSuggestionMessage);
          }}
        />
      );
    }

    // Deep Search Intro Message - chat loop format
    if (message.role === "deep-search-intro") {
      const introMsg = message as DeepSearchIntroMessage;
      return (
        <DeepSearchIntroBubble
          key={message.id}
          personName={introMsg.personName}
          totalResults={introMsg.totalResults}
        />
      );
    }

    // Deep Search Profile Message - individual profile in chat loop format
    if (message.role === "deep-search-profile") {
      const profileMsg = message as DeepSearchProfileChatMessage;
      return (
        <DeepSearchProfileMessage
          key={message.id}
          source={profileMsg.source}
          index={profileMsg.index}
          total={profileMsg.total}
          showVerificationButtons={profileMsg.verificationStatus === "pending"}
          onVerify={(isVerified) => {
            // Update the verification status in store
            updateMessageInActiveLoop(message.id, {
              ...profileMsg,
              verificationStatus: isVerified ? "verified" : "rejected",
            } as DeepSearchProfileChatMessage);

            // Get fresh state from store after update
            setTimeout(() => {
              const activeLoop = getActiveLoop();
              if (!activeLoop) return;

              const allProfilesInStore = activeLoop.messages.filter(
                (m) => m.role === "deep-search-profile"
              ) as DeepSearchProfileChatMessage[];

              // Update the current profile's status in our check
              const updatedProfiles = allProfilesInStore.map((p) =>
                p.id === message.id
                  ? { ...p, verificationStatus: isVerified ? "verified" : "rejected" }
                  : p
              );

              const pendingProfiles = updatedProfiles.filter(
                (p) => p.verificationStatus === "pending"
              );

              // If all profiles are verified/rejected, show summary
              if (pendingProfiles.length === 0) {
                const verifiedProfiles = updatedProfiles.filter(
                  (p) => p.verificationStatus === "verified"
                );

                const personContext = getPersonContextById(profileMsg.personContextId);
                const personName = personContext?.name || "this person";

                // Add summary message
                const summaryMsg: DeepSearchSummaryChatMessage = {
                  id: `deep-search-summary-${Date.now()}`,
                  role: "deep-search-summary",
                  content: "",
                  timestamp: Date.now(),
                  personName,
                  personContextId: profileMsg.personContextId,
                  verifiedCount: verifiedProfiles.length,
                  rejectedCount: updatedProfiles.length - verifiedProfiles.length,
                  totalCount: allProfilesInStore.length,
                  verifiedSources: verifiedProfiles.map((p) => p.source),
                  mode: "understand",
                };
                addMessageToActiveLoopRaw(summaryMsg);

                // Scroll to bottom to show summary
                setTimeout(() => {
                  decodeScrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }, 50); // Small delay to ensure store update is processed
          }}
        />
      );
    }

    // Deep Search Summary Message - shown after verification
    if (message.role === "deep-search-summary") {
      const summaryMsg = message as DeepSearchSummaryChatMessage;
      return (
        <DeepSearchSummaryMessage
          key={message.id}
          verifiedCount={summaryMsg.verifiedCount}
          rejectedCount={summaryMsg.rejectedCount}
          totalCount={summaryMsg.totalCount}
          personName={summaryMsg.personName}
          onSearchAgain={() => {
            // When no profiles verified, allow searching with different details
            const personContext = getPersonContextById(summaryMsg.personContextId);
            if (!personContext) return;

            // Show follow-up card to collect additional info
            const followUp = getBestFollowUpQuestion(
              ["username", "location", "workplace", "school", "relationship"],
              personContext
            );

            if (followUp) {
              const followUpMessage: DeepDiveFollowUpMessage = {
                id: `search-again-followup-${Date.now()}`,
                role: "deep-dive-follow-up",
                content: "",
                timestamp: Date.now(),
                personName: summaryMsg.personName,
                personContextId: summaryMsg.personContextId,
                question: followUp.question,
                dataType: followUp.dataType,
                placeholder: followUp.placeholder,
                isOptional: false,
                isSearchAgain: true, // Flag to indicate this is a fresh search, not deep dive
                mode: "understand",
              };
              addMessageToActiveLoopRaw(followUpMessage);

              setTimeout(() => {
                decodeScrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
        />
      );
    }

    // Deep Dive Evaluation Message - collaborative trust flow
    if (message.role === "deep-dive-evaluation") {
      const evalMsg = message as DeepDiveEvaluationMessage;
      return (
        <DeepDiveEvaluationBubble
          key={message.id}
          personName={evalMsg.personName}
          resultQuality={evalMsg.resultQuality}
          sourcesCount={evalMsg.sourcesCount}
          acknowledgmentText={evalMsg.acknowledgmentText}
          suggestFollowUp={evalMsg.suggestFollowUp}
          followUpReason={evalMsg.followUpReason}
          missingDataTypes={evalMsg.missingDataTypes}
          onProvideMoreInfo={() => {
            // Get the best follow-up question to ask
            const personContext = getPersonContextById(evalMsg.personContextId);
            if (!personContext) return;

            const followUp = getBestFollowUpQuestion(
              evalMsg.missingDataTypes || [],
              personContext
            );

            if (followUp) {
              // Add follow-up card
              const followUpMessage: DeepDiveFollowUpMessage = {
                id: `deep-dive-followup-${Date.now()}`,
                role: "deep-dive-follow-up",
                content: "",
                timestamp: Date.now(),
                personName: evalMsg.personName,
                personContextId: evalMsg.personContextId,
                question: followUp.question,
                dataType: followUp.dataType,
                placeholder: followUp.placeholder,
                isOptional: true,
                mode: "understand",
              };
              addMessageToActiveLoopRaw(followUpMessage);

              setTimeout(() => {
                decodeScrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
          onContinueWithResults={() => {
            // User chooses to continue with current results
            // Add a confirmation message to the chat
            const confirmMessage: ChatMessage = {
              id: `continue-confirm-${Date.now()}`,
              role: "assistant",
              content: `Got it! I'll keep what I found about ${evalMsg.personName} in mind as we continue our conversation. Feel free to ask me anything about them or share more context anytime.`,
              timestamp: Date.now(),
              mode: "understand",
            };
            addMessageToActiveLoopRaw(confirmMessage);

            setTimeout(() => {
              decodeScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
        />
      );
    }

    // Deep Dive Follow-Up Card - for collecting additional info
    if (message.role === "deep-dive-follow-up") {
      const followUpMsg = message as DeepDiveFollowUpMessage;
      return (
        <DeepDiveFollowUpCard
          key={message.id}
          personName={followUpMsg.personName}
          dataType={followUpMsg.dataType}
          customQuestion={followUpMsg.question}
          placeholder={followUpMsg.placeholder}
          isOptional={followUpMsg.isOptional}
          onSubmit={async (value, dataType) => {
            // Remove the follow-up card
            removeMessageFromActiveLoop(message.id);

            const personContext = getPersonContextById(followUpMsg.personContextId);
            if (!personContext) return;

            // Update person context with the new info
            const updateData: Record<string, string> = {};
            if (dataType === "username") updateData.knownUsername = value;
            if (dataType === "location") updateData.location = value;
            if (dataType === "workplace" || dataType === "school" || dataType === "relationship") {
              // Add to extended context
              const existingContext = personContext.extendedContext || "";
              updateData.extendedContext = existingContext
                ? `${existingContext}\n${dataType}: ${value}`
                : `${dataType}: ${value}`;
            }
            if (dataType === "age") updateData.approximateAge = value;

            if (Object.keys(updateData).length > 0) {
              updatePersonContext(followUpMsg.personContextId, updateData);
            }

            // Get updated person context after the update
            const updatedPersonContext = getPersonContextById(followUpMsg.personContextId);
            if (!updatedPersonContext) return;

            // Add loading message
            const loadingMsgId = `search-retry-loading-${Date.now()}`;
            const loadingMessage: ChatLoadingMessage = {
              id: loadingMsgId,
              role: "chat-loading",
              content: "",
              timestamp: Date.now(),
              loadingType: "deep-search",
              loadingState: "loading",
              customAction: followUpMsg.isSearchAgain
                ? `Searching for ${followUpMsg.personName} with ${dataType}: ${value}...`
                : `Searching with ${dataType}: ${value}...`,
              mode: "understand",
            };
            addMessageToActiveLoopRaw(loadingMessage);

            setTimeout(() => {
              decodeScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            try {
              // If this is a "search again" flow (no verified sources), run fresh search
              if (followUpMsg.isSearchAgain) {
                const result = await executeDeepSearch({
                  personContext: updatedPersonContext,
                  onProgress: (status) => console.log("[Search Again] Progress:", status),
                });

                removeMessageFromActiveLoop(loadingMsgId);

                if (result.success && result.result) {
                  const sources = result.result.sources || [];

                  if (sources.length === 0) {
                    // No results found
                    const noResultsMessage: DeepSearchNoResultsChatMessage = {
                      id: `deep-search-no-results-${Date.now()}`,
                      role: "deep-search-no-results",
                      content: "",
                      timestamp: Date.now(),
                      personName: followUpMsg.personName,
                      mode: "understand",
                    };
                    addMessageToActiveLoopRaw(noResultsMessage);
                  } else {
                    // Show intro message
                    const introMessage: DeepSearchIntroMessage = {
                      id: `deep-search-intro-${Date.now()}`,
                      role: "deep-search-intro",
                      content: "",
                      timestamp: Date.now(),
                      personName: followUpMsg.personName,
                      totalResults: sources.length,
                      mode: "understand",
                    };
                    addMessageToActiveLoopRaw(introMessage);

                    // Add profile messages for each source
                    sources.forEach((source, index) => {
                      const profileMsg: DeepSearchProfileChatMessage = {
                        id: `deep-search-profile-${Date.now()}-${index}`,
                        role: "deep-search-profile",
                        content: "",
                        timestamp: Date.now() + index,
                        source,
                        index,
                        total: sources.length,
                        personContextId: followUpMsg.personContextId,
                        verificationStatus: "pending",
                        mode: "understand",
                      };
                      addMessageToActiveLoopRaw(profileMsg);
                    });
                  }
                } else {
                  const errorMessage: ChatLoadingMessage = {
                    id: `search-retry-error-${Date.now()}`,
                    role: "chat-loading",
                    content: "",
                    timestamp: Date.now(),
                    loadingType: "deep-search",
                    loadingState: "error",
                    errorMessage: result.error || "Search failed. Please try again.",
                    mode: "understand",
                  };
                  addMessageToActiveLoopRaw(errorMessage);
                }
              } else {
                // Deep dive with additional info flow (has verified sources)
                const summaryMessages = allMessages.filter(
                  (m) => m.role === "deep-search-summary"
                ) as DeepSearchSummaryChatMessage[];
                const latestSummary = summaryMessages[summaryMessages.length - 1];
                const verifiedSources = latestSummary?.verifiedSources || [];

                const result = await executeDeepDiveWithAdditionalInfo(
                  updatedPersonContext,
                  { dataType, value },
                  verifiedSources,
                  (status) => console.log("[DeepDive Retry] Progress:", status)
                );

                removeMessageFromActiveLoop(loadingMsgId);

                if (result.success && result.result) {
                  // Evaluate the new results
                  const evaluation = evaluateDeepDiveResults(
                    result.result,
                    updatedPersonContext,
                    verifiedSources.length
                  );

                  // Show new results
                  const resultMessage: DeepSearchResultMessage = {
                    id: `deep-dive-retry-result-${Date.now()}`,
                    role: "deep-search-result",
                    content: "",
                    timestamp: Date.now(),
                    searchResult: result.result,
                    mode: "understand",
                  };
                  addMessageToActiveLoopRaw(resultMessage);

                  // Show new evaluation
                  const evaluationMessage: DeepDiveEvaluationMessage = {
                    id: `deep-dive-retry-eval-${Date.now()}`,
                    role: "deep-dive-evaluation",
                    content: "",
                    timestamp: Date.now(),
                    personName: followUpMsg.personName,
                    personContextId: followUpMsg.personContextId,
                    resultQuality: evaluation.quality,
                    sourcesCount: evaluation.sourcesCount,
                    acknowledgmentText: evaluation.acknowledgmentText,
                    suggestFollowUp: evaluation.suggestFollowUp,
                    followUpReason: evaluation.followUpReason,
                    missingDataTypes: evaluation.missingDataTypes,
                    mode: "understand",
                  };
                  addMessageToActiveLoopRaw(evaluationMessage);
                } else {
                  const errorMessage: ChatLoadingMessage = {
                    id: `deep-dive-retry-error-${Date.now()}`,
                    role: "chat-loading",
                    content: "",
                    timestamp: Date.now(),
                    loadingType: "deep-search",
                    loadingState: "error",
                    errorMessage: result.error || "Search with additional info failed.",
                    mode: "understand",
                  };
                  addMessageToActiveLoopRaw(errorMessage);
                }
              }

              setTimeout(() => {
                decodeScrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            } catch (error) {
              console.error("[Search Retry] Error:", error);
              removeMessageFromActiveLoop(loadingMsgId);

              const errorMessage: ChatLoadingMessage = {
                id: `search-retry-error-${Date.now()}`,
                role: "chat-loading",
                content: "",
                timestamp: Date.now(),
                loadingType: "deep-search",
                loadingState: "error",
                errorMessage: "Something went wrong. Please try again.",
                mode: "understand",
              };
              addMessageToActiveLoopRaw(errorMessage);
            }
          }}
          onSkip={() => {
            // Remove the follow-up card
            removeMessageFromActiveLoop(message.id);
          }}
        />
      );
    }

    // Deep Search No Results Message
    if (message.role === "deep-search-no-results") {
      const noResultsMsg = message as DeepSearchNoResultsChatMessage;
      return (
        <DeepSearchNoResultsMessage
          key={message.id}
          personName={noResultsMsg.personName}
        />
      );
    }

    // Deep Decode Result - floating text bubble
    if (message.role === "deep-decode-result") {
      const decodeMsg = message as DeepDecodeResultMessage;
      return (
        <DeepDecodeResultBubble
          key={message.id}
          result={decodeMsg.decodeResult}
        />
      );
    }

    // Structured Analysis Card - new format with signal strength and power moves
    if (message.role === "structured-analysis") {
      const analysisMsg = message as StructuredAnalysisMessage;
      return (
        <StructuredAnalysisCard
          key={message.id}
          analysis={analysisMsg.analysis}
        />
      );
    }

    // Pattern Mirror Card - behavioral pattern insights
    if (message.role === "pattern-mirror") {
      const patternMsg = message as PatternMirrorMessage;
      return (
        <PatternMirrorCard
          key={message.id}
          insight={patternMsg.insight}
          onDismiss={() => {
            // Optional: could remove the card from the loop
          }}
        />
      );
    }

    // Only render user and assistant messages in Decode mode - no cards
    if (message.role === "user" || message.role === "assistant") {
      // Check if this is a post-decode clarity message (uses typographic hierarchy)
      const isPostDecodeClarity = message.id.includes("_post_decode_clarity");

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
          isStreaming={message.role === "assistant" && message.id === streamingMessageId}
          isPostDecode={isPostDecodeClarity}
          hasAnimated={message.hasAnimated}
          onAnimationComplete={() => {
            if (!message.hasAnimated) {
              updateMessageInActiveLoop(message.id, { ...message, hasAnimated: true });
            }
          }}
        />
      );
    }

    // Skip all card types in Decode mode
    return null;
  }, [handleEditMessage, getPersonContextById, updatePersonContext, removeMessageFromActiveLoop, updateMessageInActiveLoop, addMessageToActiveLoopRaw, getActiveLoop, activeLoopPersonContextId, streamingMessageId]);

  const renderMessage = useCallback((message: ChatMessage) => {
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
          responseGuidance={msg.responseGuidance}
          communicationMistake={msg.communicationMistake}
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
        isStreaming={message.role === "assistant" && message.id === streamingMessageId}
        hasAnimated={message.hasAnimated}
        onAnimationComplete={() => {
          if (!message.hasAnimated) {
            updateMessageInActiveLoop(message.id, { ...message, hasAnimated: true });
          }
        }}
      />
    );
  }, [handleEditMessage, handleSelectReply, handleModifyReplyLength, handleGenerateDifferentReply, handleAddEmojiToReply, handleContextSubmit, handleContextCancel, handleUseRewrittenReply, streamingMessageId, updateMessageInActiveLoop]);

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Main content - slides with drawer */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          transform: [{ translateX: mainContentTranslateX }],
        }}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={isDark ? ["#050608", "#0A0A0C", "#050608"] : ["#FFFFFF", "#F8F9FA", "#FFFFFF"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        {isDark && <SoftFlares />}
        {isDark && <FloatingParticles count={20} />}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <Header
            isAnalyzing={isLoading}
            onMenuPress={() => setIsDrawerOpen(true)}
            inputMode={inputMode}
            onModeChange={handleModeChangeWithAnimation}
            onPersonContextPress={() => {
              const activeLoop = getActiveLoop();
              const messages = activeLoop?.messages || [];

              // Check if there's an active person context linked
              if (activeLoopPersonContextId && activePersonContext) {
                // Find any existing deep search results for this person context
                const deepSearchResultIndex = messages.findIndex(
                  (msg) =>
                    msg.role === "deep-search-result" &&
                    (msg as DeepSearchResultMessage).searchResult?.personContextId === activeLoopPersonContextId
                );

                // Also check for results in deep-search-suggestion messages
                const suggestionWithResultIndex = messages.findIndex(
                  (msg) =>
                    msg.role === "deep-search-suggestion" &&
                    (msg as DeepSearchSuggestionMessage).searchResult &&
                    (msg as DeepSearchSuggestionMessage).personContextId === activeLoopPersonContextId
                );

                const hasExistingResult = deepSearchResultIndex !== -1 || suggestionWithResultIndex !== -1;

                if (hasExistingResult) {
                  // Check if results are recent (within last 5 messages)
                  const resultIndex = deepSearchResultIndex !== -1 ? deepSearchResultIndex : suggestionWithResultIndex;
                  const isRecent = messages.length - resultIndex <= 5;

                  if (isRecent) {
                    // Results are recent, just scroll to them
                    Haptics.selectionAsync();
                    setTimeout(() => {
                      decodeScrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                    return;
                  }

                  // Results exist but not recent - re-add them to show again
                  const existingResultMsg = deepSearchResultIndex !== -1
                    ? messages[deepSearchResultIndex] as DeepSearchResultMessage
                    : null;
                  const existingSuggestionMsg = suggestionWithResultIndex !== -1
                    ? messages[suggestionWithResultIndex] as DeepSearchSuggestionMessage
                    : null;

                  if (existingResultMsg?.searchResult) {
                    // Re-add the deep search result
                    const newResultMessage: DeepSearchResultMessage = {
                      id: `deep-search-result-${Date.now()}`,
                      role: "deep-search-result",
                      content: "",
                      timestamp: Date.now(),
                      searchResult: existingResultMsg.searchResult,
                      showSafetyResources: false,
                      mode: "understand",
                    };
                    addMessageToActiveLoopRaw(newResultMessage);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } else if (existingSuggestionMsg?.searchResult) {
                    // Re-add the deep search result from suggestion
                    const newResultMessage: DeepSearchResultMessage = {
                      id: `deep-search-result-${Date.now()}`,
                      role: "deep-search-result",
                      content: "",
                      timestamp: Date.now(),
                      searchResult: existingSuggestionMsg.searchResult,
                      showSafetyResources: false,
                      mode: "understand",
                    };
                    addMessageToActiveLoopRaw(newResultMessage);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }

                  // Scroll to bottom to show the results
                  setTimeout(() => {
                    decodeScrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                  return;
                }
              }

              // No linked person context or no results yet - toggle person context card
              // Check if there's already a person-context-card in recent messages
              const existingCardIndex = messages.findIndex(
                (msg) => msg.role === "person-context-card"
              );

              if (existingCardIndex !== -1) {
                // Card exists - remove it (toggle off)
                const existingCard = messages[existingCardIndex];
                removeMessageFromActiveLoop(existingCard.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } else {
                // No card exists - add one (toggle on)
                const personContextCardMsg: PersonContextCardMessage = {
                  id: `person-context-card-${Date.now()}`,
                  role: "person-context-card",
                  content: "",
                  timestamp: Date.now(),
                  mode: "understand",
                };
                addMessageToActiveLoopRaw(personContextCardMsg);
                // Scroll to bottom to show the card
                setTimeout(() => {
                  decodeScrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            showPersonContext={true}
            onDeepDecodePress={() => setShowDeepDecodeModal(true)}
            showDeepDecode={true}
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
                <FlatList
                  ref={replyScrollViewRef}
                  data={replyMessages}
                  renderItem={({ item }) => renderMessage(item)}
                  keyExtractor={(item) => item.id}
                  className="flex-1"
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-20">
                      <Text className="text-gray-500 text-center text-base">
                        Reply mode - craft your response
                      </Text>
                    </View>
                  }
                  ListFooterComponent={<View style={{ height: 20 }} />}
                  removeClippedSubviews={Platform.OS === "android"}
                  initialNumToRender={8}
                  maxToRenderPerBatch={5}
                  windowSize={5}
                  updateCellsBatchingPeriod={50}
                />
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
                <FlatList
                  ref={decodeScrollViewRef}
                  data={decodeMessages}
                  renderItem={({ item }) => renderDecodeMessage(item)}
                  keyExtractor={(item) => item.id}
                  className="flex-1"
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-20">
                      <Text className="text-gray-500 text-center text-base">
                        Decode mode - understand the message
                      </Text>
                    </View>
                  }
                  ListFooterComponent={<View style={{ height: 20 }} />}
                  removeClippedSubviews={Platform.OS === "android"}
                  initialNumToRender={8}
                  maxToRenderPerBatch={5}
                  windowSize={5}
                  updateCellsBatchingPeriod={50}
                />
              </Animated.View>
            </View>
          </Animated.View>

          <View
            style={{
              backgroundColor: colors.headerBackground,
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
              placeholder={inputMode === "understand" ? "Ask Klarity social nuances…" : "Type how you want to reply..."}
              disabled={isLoading}
              inputMode={inputMode}
              onInputFocus={handleInputFocus}
              isEditing={isEditingMessage}
              onCancelEdit={handleCancelEdit}
            />
          </View>

          <LoopHistoryPanel
            visible={isHistoryPanelOpen}
            onClose={() => setHistoryPanelOpen(false)}
          />
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Drawer - slides over the screen from the left */}
      <SlideOverDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        drawerProgress={drawerProgress}
      />

      {/* Deep Decode Modal */}
      <DeepDecodeModal
        visible={showDeepDecodeModal}
        onClose={() => setShowDeepDecodeModal(false)}
        onAnalyze={handleDeepDecodeAnalyze}
        isAnalyzing={isDeepDecodeAnalyzing}
      />

      {/* Deep Decode Results - Full screen modal */}
      {showDeepDecodeResults && deepDecodeResult && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          <DeepDecodeResultView
            result={deepDecodeResult}
            onClose={handleDeepDecodeClose}
            onNewAnalysis={handleDeepDecodeNewAnalysis}
          />
        </View>
      )}
    </View>
  );
}
