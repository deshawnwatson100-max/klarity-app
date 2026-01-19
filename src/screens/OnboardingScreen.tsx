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
import { useOnboardingStore, OnboardingAnswers } from "../state/onboardingStore";
import { useTheme } from "../theme";
import { InputBar, InputBarRef } from "../components/InputBar";
import { MessageBubble } from "../components/MessageBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { VoiceRecordingVisualizer } from "../components/VoiceRecordingVisualizer";
import { VoiceProcessingIndicator } from "../components/VoiceProcessingIndicator";
import { QuestionOptions } from "../components/QuestionOptions";
import { getOpenAITextResponse } from "../api/chat-service";
import { transcribeAudio } from "../api/transcribe-audio";
import { AIMessage } from "../types/ai";

type OnboardingStep =
  | "welcome"
  | "intro"
  | "name"
  | "situation"
  | "skip_prompt"
  | "question_1"
  | "question_2"
  | "question_3"
  | "question_4"
  | "question_5"
  | "question_6"
  | "summary"
  | "summary_confirm"
  | "summary_correction"
  | "complete";

interface Message {
  id: string;
  type: "bot" | "user" | "options" | "confirmation" | "skip_choice";
  content: string;
  options?: string[];
  questionKey?: keyof OnboardingAnswers;
  selectedOption?: string | null;
  confirmationType?: "summary";
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

type InputMode = "understand" | "rewrite";

// Question definitions
const ONBOARDING_QUESTIONS: {
  key: keyof OnboardingAnswers;
  question: string;
  options: string[];
}[] = [
  {
    key: "conversationTrigger",
    question: "When conversations go wrong, what usually starts it?",
    options: [
      "Mixed signals or unclear tone",
      "Emotional or tense situations",
      "Texts that feel off",
      "Pressure to respond fast",
      "Not knowing what the other person wants",
    ],
  },
  {
    key: "responseOutcome",
    question: "When a response doesn't land, what usually happens?",
    options: [
      "Awkwardness or distance",
      "Misunderstanding",
      "Tension or conflict",
      "Missed opportunity",
      "I regret it later",
    ],
  },
  {
    key: "conversationCost",
    question: "When this happens, what does it cost you most?",
    options: [
      "Peace of mind",
      "Confidence",
      "Connection",
      "Momentum in the conversation",
      "Time replaying it in my head",
    ],
  },
  {
    key: "afterConfusion",
    question: "After a confusing conversation, what do you usually do?",
    options: [
      "Replay it mentally",
      "Ask someone else for advice",
      "Over-explain or follow up",
      "Avoid responding",
      "Move on but feel uneasy",
    ],
  },
  {
    key: "klarityHelps",
    question: "Using Klarity would help you avoid:",
    options: [
      "Saying something I regret",
      "Being misunderstood",
      "Escalating tension",
      "Second-guessing myself",
      "Losing an important connection",
    ],
  },
  {
    key: "bestOutcome",
    question: "In these moments, the best outcome would feel like:",
    options: [
      "Feeling calm and clear",
      "Saying the right thing the first time",
      "Being understood",
      "Keeping things smooth",
      "Feeling confident afterward",
    ],
  },
];

const SYSTEM_PROMPT = `You are Klarity's friendly setup assistant. Klarity is an app that helps users understand messages and craft better responses.

Your role is to set up Klarity for the user in a warm, conversational way.

TONE GUIDELINES:
- Be warm and friendly, like a helpful guide
- Keep responses short (1-2 sentences max)
- Sound calm and human, not clinical
- Frame this as getting to know them to help better

Do NOT:
- Ask deeply personal or probing questions
- Sound like a therapist or counselor
- Use clinical language
- Be overly enthusiastic or use exclamation marks excessively`;

// Shaking button component for "Let's do it!"
interface ShakingLetsDoItButtonProps {
  isDisabled: boolean;
  selectedOption: string | null | undefined;
  isDark: boolean;
  colors: { textTertiary: string };
  onContinue: () => void;
  onSkip: () => void;
}

function ShakingLetsDoItButton({
  isDisabled,
  selectedOption,
  isDark,
  colors,
  onContinue,
  onSkip,
}: ShakingLetsDoItButtonProps) {
  const [shakeOffset, setShakeOffset] = useState(0);

  useEffect(() => {
    if (isDisabled) return;

    let animationFrame: number;
    let startTime: number | null = null;
    let hapticTimeout: ReturnType<typeof setTimeout>;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Shake pattern: quick shakes for 400ms, then pause for 2000ms
      const cycleTime = elapsed % 2400;

      if (cycleTime < 400) {
        // During shake phase
        const shakePhase = cycleTime / 100;
        const offset = Math.sin(shakePhase * Math.PI * 2) * 3;
        setShakeOffset(offset);
      } else {
        setShakeOffset(0);
      }

      animationFrame = requestAnimationFrame(animate);
    };

    // Start after a brief delay
    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);

      // Trigger haptic at start of each shake cycle
      const triggerHaptic = () => {
        if (!isDisabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        hapticTimeout = setTimeout(triggerHaptic, 2400);
      };
      hapticTimeout = setTimeout(triggerHaptic, 100);
    }, 800);

    return () => {
      clearTimeout(timeout);
      clearTimeout(hapticTimeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isDisabled]);

  return (
    <View className="mt-4 mb-2" style={{ gap: 20 }}>
      {/* Continue button - primary action, large and prominent */}
      <View style={{ transform: [{ translateX: shakeOffset }] }}>
        <Pressable
          onPress={onContinue}
          disabled={isDisabled}
          style={({ pressed }) => ({
            paddingHorizontal: 32,
            paddingVertical: 20,
            borderRadius: 20,
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            borderWidth: 1,
            borderColor: isDark ? "#3A3A3C" : "#E5E5EA",
            opacity: isDisabled && selectedOption !== "Continue" ? 0.5 : (pressed ? 0.85 : 1),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
          })}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: isDark ? "#FFFFFF" : "#1C1C1E",
              textAlign: "center",
            }}
          >
            {"Let's do it!"}
          </Text>
        </Pressable>
      </View>
      {/* Skip button - secondary, subtle text link style */}
      <Pressable
        onPress={onSkip}
        disabled={isDisabled}
        style={({ pressed }) => ({
          paddingVertical: 10,
          opacity: isDisabled && selectedOption !== "Skip" ? 0.3 : (pressed ? 0.5 : 1),
        })}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "400",
            color: colors.textTertiary,
            textAlign: "center",
          }}
        >
          Skip for now
        </Text>
      </Pressable>
    </View>
  );
}

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userSituationContext, setUserSituationContext] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [localUserName, setLocalUserName] = useState("");
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({});

  const setUserName = useOnboardingStore((s) => s.setUserName);
  const setOnboardingAnswer = useOnboardingStore((s) => s.setOnboardingAnswer);
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

  const addOptionsMessage = useCallback(
    (options: string[], questionKey: keyof OnboardingAnswers) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "options",
        content: "",
        options,
        questionKey,
        selectedOption: null,
      };
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const addConfirmationMessage = useCallback(
    (confirmationType: "summary") => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "confirmation",
        content: "",
        confirmationType,
        selectedOption: null,
      };
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const addSkipChoiceMessage = useCallback(() => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "skip_choice",
      content: "",
      selectedOption: null,
    };
    setMessages((prev) => [...prev, newMessage]);
    scrollToBottom();
  }, [scrollToBottom]);

  const updateOptionSelection = useCallback((messageId: string, selectedOption: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, selectedOption } : msg
      )
    );
  }, []);

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
          maxTokens: 200,
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
        return null;
      }
    },
    [conversationHistory, addBotMessage, scrollToBottom]
  );

  const askQuestion = useCallback(
    async (questionIndex: number, contextMessage?: string) => {
      const question = ONBOARDING_QUESTIONS[questionIndex];
      if (!question) return;

      setIsTyping(true);
      scrollToBottom();

      // Brief delay for natural feel
      await new Promise((resolve) => setTimeout(resolve, 600));

      setIsTyping(false);
      addBotMessage(question.question);

      // Add options after the question
      setTimeout(() => {
        addOptionsMessage(question.options, question.key);
      }, 300);
    },
    [addBotMessage, addOptionsMessage, scrollToBottom]
  );

  const generateUserSummary = useCallback(
    async (answers: Record<string, string>, situationContext: string, userName: string) => {
      setIsTyping(true);
      scrollToBottom();

      try {
        const summaryPrompt = `Based on what the user shared during onboarding, create a warm, empathetic summary that makes them feel truly heard and understood.

User's name: ${userName}
What they need help with: ${situationContext}
Their answers:
- What starts conversations going wrong: ${answers.conversationTrigger}
- What happens when responses don't land: ${answers.responseOutcome}
- What it costs them most: ${answers.conversationCost}
- What they do after confusing conversations: ${answers.afterConfusion}
- What Klarity helps them avoid: ${answers.klarityHelps}
- What the best outcome feels like: ${answers.bestOutcome}

Write a 2-3 sentence summary that:
1. Reflects back what you heard in a way that shows deep understanding
2. Validates their experience without being clinical
3. Speaks to their core desire (what they want to feel or achieve)

Keep it warm, personal, and conversational. Use "you" to speak directly to them. Don't be overly formal or therapeutic. Make them feel seen.`;

        const response = await getOpenAITextResponse(
          [
            { role: "system", content: "You are Klarity's empathetic onboarding assistant. Your goal is to make users feel deeply understood and validated." },
            { role: "user", content: summaryPrompt },
          ],
          { temperature: 0.85, maxTokens: 200 }
        );

        setIsTyping(false);
        return response.content;
      } catch (error) {
        console.error("Summary generation error:", error);
        setIsTyping(false);
        return `I hear you, ${userName}. You want your conversations to feel smoother and more confident - less second-guessing, more clarity. That makes complete sense.`;
      }
    },
    [scrollToBottom]
  );

  const handleOptionSelect = useCallback(
    async (option: string, questionKey: keyof OnboardingAnswers, messageId: string) => {
      // Update the message to show selection
      updateOptionSelection(messageId, option);

      // Save the answer
      setOnboardingAnswer(questionKey, option);

      // Track answer locally for summary generation
      setCollectedAnswers(prev => ({ ...prev, [questionKey]: option }));

      // Add user's selection as a message
      setTimeout(() => {
        addUserMessage(option);
      }, 200);

      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < ONBOARDING_QUESTIONS.length) {
        // Ask next question with brief acknowledgment
        setCurrentQuestionIndex(nextIndex);
        setCurrentStep(`question_${nextIndex + 1}` as OnboardingStep);

        // Brief typing indicator then next question
        setTimeout(() => {
          askQuestion(nextIndex);
        }, 500);
      } else {
        // All questions complete - generate personalized summary
        setCurrentStep("summary");

        // Collect all answers including this final one
        const allAnswers = { ...collectedAnswers, [questionKey]: option };

        setTimeout(async () => {
          const summary = await generateUserSummary(allAnswers, userSituationContext, localUserName);
          setGeneratedSummary(summary);

          // Show the summary
          addBotMessage(summary);

          // Ask if this resonates
          setTimeout(() => {
            setIsTyping(true);
            scrollToBottom();

            setTimeout(() => {
              setIsTyping(false);
              addBotMessage("Does this feel right to you?");

              // Add confirmation options
              setTimeout(() => {
                setCurrentStep("summary_confirm");
                addConfirmationMessage("summary");
              }, 300);
            }, 600);
          }, 800);
        }, 500);
      }
    },
    [
      currentQuestionIndex,
      updateOptionSelection,
      setOnboardingAnswer,
      addUserMessage,
      askQuestion,
      addBotMessage,
      scrollToBottom,
      generateUserSummary,
      collectedAnswers,
      userSituationContext,
      localUserName,
      addConfirmationMessage,
    ]
  );

  const handleSummaryConfirmation = useCallback(
    async (confirmed: boolean, messageId: string) => {
      // Update the message to show selection
      updateOptionSelection(messageId, confirmed ? "Yes" : "No");

      // Add user's response as a message
      setTimeout(() => {
        addUserMessage(confirmed ? "Yes, that feels right" : "Not quite");
      }, 200);

      if (confirmed) {
        // User agrees - show completion message and Get Started button
        setIsTyping(true);
        scrollToBottom();

        setTimeout(() => {
          setIsTyping(false);
          addBotMessage(
            "Great! I am here to help you navigate your conversations with clarity and confidence. Just paste or type any message - use Decode to understand it, or Reply to craft your response."
          );

          setCurrentStep("complete");
          setTimeout(() => setShowGetStarted(true), 1000);
        }, 800);
      } else {
        // User disagrees - allow them to share more
        setCurrentStep("summary_correction");
        setInputPlaceholder("Share what feels more accurate...");

        setIsTyping(true);
        scrollToBottom();

        setTimeout(() => {
          setIsTyping(false);
          addBotMessage("I want to understand you better. What would you say is really going on for you?");
        }, 600);
      }
    },
    [updateOptionSelection, addUserMessage, addBotMessage, scrollToBottom]
  );

  const handleSkipChoice = useCallback(
    async (shouldContinue: boolean, messageId: string) => {
      // Update the message to show selection
      updateOptionSelection(messageId, shouldContinue ? "Continue" : "Skip");

      // Add user's response as a message
      setTimeout(() => {
        addUserMessage(shouldContinue ? "Let's do it" : "Skip for now");
      }, 200);

      if (shouldContinue) {
        // User wants to continue with questions
        setCurrentStep("question_1");
        setCurrentQuestionIndex(0);

        setTimeout(() => {
          askQuestion(0);
        }, 500);
      } else {
        // User wants to skip - go straight to completion
        setIsTyping(true);
        scrollToBottom();

        setTimeout(() => {
          setIsTyping(false);
          addBotMessage(
            "No problem! You can always come back to personalize your experience later. Just paste or type any message - use Decode to understand it, or Reply to craft your response."
          );

          setCurrentStep("complete");
          setTimeout(() => setShowGetStarted(true), 1000);
        }, 800);
      }
    },
    [updateOptionSelection, addUserMessage, addBotMessage, scrollToBottom, askQuestion]
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
          "Start the setup by warmly welcoming the user to Klarity and asking what they would like to be called. Keep it brief and friendly, just 1-2 sentences.";
        const response = await getOpenAITextResponse(
          [
            ...conversationHistory,
            { role: "user", content: initialPrompt },
          ],
          { temperature: 0.8, maxTokens: 100 }
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
          "Hey, welcome to Klarity. What would you like me to call you?"
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
      setUserName(input);
      setLocalUserName(input);
      setCurrentStep("situation");
      setInputPlaceholder("Type your answer...");

      // Ask about conversation types
      const contextMessage = `The user said their name is "${input}". Acknowledge their name warmly in 1 sentence, then ask what types of communication support they find themselves needing most. Keep it brief and conversational.`;
      await getAIResponse(contextMessage);
    } else if (currentStep === "situation") {
      // Save the context for later use
      setUserSituationContext(input);

      // Acknowledge their input and transition to skip prompt
      setIsTyping(true);
      scrollToBottom();

      try {
        // Generate a dynamic response based on the length and content of their message
        const isLongMessage = input.length > 100;
        const acknowledgmentPrompt = isLongMessage
          ? `The user shared this about what they need help with: "${input}"

They wrote a detailed message, which shows they have a lot on their mind. Write a warm, reassuring 1-2 sentence response that:
1. Acknowledges that they came to the right place
2. Validates their situation without being clinical
3. Gives them confidence that Klarity can help with their specific needs

Keep it conversational and supportive. Don't repeat back their exact words.`
          : `The user shared this about what they need help with: "${input}"

Write a brief, warm 1 sentence acknowledgment that shows you heard them and appreciate them sharing. Keep it simple and conversational.`;

        const response = await getOpenAITextResponse(
          [
            { role: "system", content: "You are Klarity's friendly setup assistant. Be warm, brief, and conversational. Never sound clinical or overly enthusiastic." },
            { role: "user", content: acknowledgmentPrompt },
          ],
          { temperature: 0.8, maxTokens: 100 }
        );

        setIsTyping(false);
        addBotMessage(response.content);

        // Show intro message with ETA and benefits
        setTimeout(() => {
          setIsTyping(true);
          scrollToBottom();

          setTimeout(() => {
            setIsTyping(false);
            addBotMessage("I have 6 quick questions that take 30 seconds to a minute. They help me understand how you communicate so I can give you more personalized insights and better responses.");

            // Show the skip choice
            setTimeout(() => {
              setCurrentStep("skip_prompt");
              addSkipChoiceMessage();
            }, 400);
          }, 700);
        }, 600);
      } catch (error) {
        console.error("Acknowledgment response error:", error);
        setIsTyping(false);
        addBotMessage("I appreciate you sharing that with me.");

        // Show intro message with ETA and benefits
        setTimeout(() => {
          setIsTyping(true);
          scrollToBottom();

          setTimeout(() => {
            setIsTyping(false);
            addBotMessage("I have 6 quick questions that take 30 seconds to a minute. They help me understand how you communicate so I can give you more personalized insights and better responses.");

            // Show the skip choice
            setTimeout(() => {
              setCurrentStep("skip_prompt");
              addSkipChoiceMessage();
            }, 400);
          }, 700);
        }, 600);
      }
    } else if (currentStep.startsWith("question_")) {
      // User typed their own answer during a question
      const question = ONBOARDING_QUESTIONS[currentQuestionIndex];
      if (!question) return;

      // Save the typed answer
      setOnboardingAnswer(question.key, input);
      setCollectedAnswers(prev => ({ ...prev, [question.key]: input }));

      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < ONBOARDING_QUESTIONS.length) {
        // Ask next question
        setCurrentQuestionIndex(nextIndex);
        setCurrentStep(`question_${nextIndex + 1}` as OnboardingStep);

        setTimeout(() => {
          askQuestion(nextIndex);
        }, 500);
      } else {
        // All questions complete - generate personalized summary
        setCurrentStep("summary");

        const allAnswers = { ...collectedAnswers, [question.key]: input };

        setTimeout(async () => {
          const summary = await generateUserSummary(allAnswers, userSituationContext, localUserName);
          setGeneratedSummary(summary);

          addBotMessage(summary);

          setTimeout(() => {
            setIsTyping(true);
            scrollToBottom();

            setTimeout(() => {
              setIsTyping(false);
              addBotMessage("Does this feel right to you?");

              setTimeout(() => {
                setCurrentStep("summary_confirm");
                addConfirmationMessage("summary");
              }, 300);
            }, 600);
          }, 800);
        }, 500);
      }
    } else if (currentStep === "summary_correction") {
      // User is sharing what they really have going on
      setIsTyping(true);
      scrollToBottom();

      try {
        // Generate a new empathetic response based on their input
        const correctionPrompt = `The user didn't feel understood by our initial summary. They shared this about what's really going on for them: "${input}"

Write a warm, empathetic 1-2 sentence response that:
1. Shows you truly hear and understand them now
2. Validates their experience
3. Makes them feel seen

Don't apologize excessively. Just reflect back what you now understand with warmth.`;

        const response = await getOpenAITextResponse(
          [
            { role: "system", content: "You are Klarity's empathetic onboarding assistant. Your goal is to make users feel deeply understood and validated." },
            { role: "user", content: correctionPrompt },
          ],
          { temperature: 0.85, maxTokens: 150 }
        );

        setIsTyping(false);
        addBotMessage(response.content);

        // Show completion message and Get Started button
        setTimeout(() => {
          setIsTyping(true);
          scrollToBottom();

          setTimeout(() => {
            setIsTyping(false);
            addBotMessage("I am here to help you navigate your conversations with more clarity. Just paste or type any message when you are ready.");

            setCurrentStep("complete");
            setTimeout(() => setShowGetStarted(true), 1000);
          }, 800);
        }, 1000);
      } catch (error) {
        console.error("Correction response error:", error);
        setIsTyping(false);
        addBotMessage("Thank you for sharing that. I hear you, and I am here to help.");

        setCurrentStep("complete");
        setTimeout(() => setShowGetStarted(true), 1000);
      }
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

        addUserMessage(transcription);
        setUserInput("");

        if (currentStep === "name") {
          setUserName(transcription);
          setLocalUserName(transcription);
          setCurrentStep("situation");
          setInputPlaceholder("Type your answer...");

          const contextMessage = `The user said their name is "${transcription}". Acknowledge their name warmly in 1 sentence, then ask what types of communication support they find themselves needing most. Keep it brief and conversational.`;
          await getAIResponse(contextMessage);
        } else if (currentStep === "situation") {
          setUserSituationContext(transcription);

          setIsTyping(true);
          scrollToBottom();

          try {
            // Generate a dynamic response based on the length and content of their message
            const isLongMessage = transcription.length > 100;
            const acknowledgmentPrompt = isLongMessage
              ? `The user shared this about what they need help with: "${transcription}"

They shared a detailed response, which shows they have a lot on their mind. Write a warm, reassuring 1-2 sentence response that:
1. Acknowledges that they came to the right place
2. Validates their situation without being clinical
3. Gives them confidence that Klarity can help with their specific needs

Keep it conversational and supportive. Don't repeat back their exact words.`
              : `The user shared this about what they need help with: "${transcription}"

Write a brief, warm 1 sentence acknowledgment that shows you heard them and appreciate them sharing. Keep it simple and conversational.`;

            const response = await getOpenAITextResponse(
              [
                { role: "system", content: "You are Klarity's friendly setup assistant. Be warm, brief, and conversational. Never sound clinical or overly enthusiastic." },
                { role: "user", content: acknowledgmentPrompt },
              ],
              { temperature: 0.8, maxTokens: 100 }
            );

            setIsTyping(false);
            addBotMessage(response.content);

            // Show intro message with ETA and benefits
            setTimeout(() => {
              setIsTyping(true);
              scrollToBottom();

              setTimeout(() => {
                setIsTyping(false);
                addBotMessage("I have 6 quick questions that take 30 seconds to a minute. They help me understand how you communicate so I can give you more personalized insights and better responses.");

                // Show the skip choice
                setTimeout(() => {
                  setCurrentStep("skip_prompt");
                  addSkipChoiceMessage();
                }, 400);
              }, 700);
            }, 600);
          } catch (error) {
            console.error("Acknowledgment response error:", error);
            setIsTyping(false);
            addBotMessage("I appreciate you sharing that with me.");

            // Show intro message with ETA and benefits
            setTimeout(() => {
              setIsTyping(true);
              scrollToBottom();

              setTimeout(() => {
                setIsTyping(false);
                addBotMessage("I have 6 quick questions that take 30 seconds to a minute. They help me understand how you communicate so I can give you more personalized insights and better responses.");

                // Show the skip choice
                setTimeout(() => {
                  setCurrentStep("skip_prompt");
                  addSkipChoiceMessage();
                }, 400);
              }, 700);
            }, 600);
          }
        } else if (currentStep === "summary_correction") {
          // User is sharing what they really have going on via voice
          setIsTyping(true);
          scrollToBottom();

          try {
            const correctionPrompt = `The user didn't feel understood by our initial summary. They shared this about what's really going on for them: "${transcription}"

Write a warm, empathetic 1-2 sentence response that:
1. Shows you truly hear and understand them now
2. Validates their experience
3. Makes them feel seen

Don't apologize excessively. Just reflect back what you now understand with warmth.`;

            const response = await getOpenAITextResponse(
              [
                { role: "system", content: "You are Klarity's empathetic onboarding assistant. Your goal is to make users feel deeply understood and validated." },
                { role: "user", content: correctionPrompt },
              ],
              { temperature: 0.85, maxTokens: 150 }
            );

            setIsTyping(false);
            addBotMessage(response.content);

            setTimeout(() => {
              setIsTyping(true);
              scrollToBottom();

              setTimeout(() => {
                setIsTyping(false);
                addBotMessage("I am here to help you navigate your conversations with more clarity. Just paste or type any message when you are ready.");

                setCurrentStep("complete");
                setTimeout(() => setShowGetStarted(true), 1000);
              }, 800);
            }, 1000);
          } catch (error) {
            console.error("Correction response error:", error);
            setIsTyping(false);
            addBotMessage("Thank you for sharing that. I hear you, and I am here to help.");

            setCurrentStep("complete");
            setTimeout(() => setShowGetStarted(true), 1000);
          }
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

  // Check if we're in question mode (should hide input bar)
  const isInQuestionMode = currentStep.startsWith("question_");
  const isInSummaryConfirmMode = currentStep === "summary_confirm" || currentStep === "summary";
  const isInSkipPromptMode = currentStep === "skip_prompt";

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

    if (message.type === "options") {
      return (
        <QuestionOptions
          key={message.id}
          options={message.options || []}
          onSelect={(option) =>
            handleOptionSelect(option, message.questionKey!, message.id)
          }
          disabled={message.selectedOption !== null}
          selectedOption={message.selectedOption}
        />
      );
    }

    if (message.type === "skip_choice") {
      const isDisabled = message.selectedOption !== null;
      return (
        <ShakingLetsDoItButton
          key={message.id}
          isDisabled={isDisabled}
          selectedOption={message.selectedOption}
          isDark={isDark}
          colors={colors}
          onContinue={() => {
            if (!isDisabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleSkipChoice(true, message.id);
            }
          }}
          onSkip={() => {
            if (!isDisabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleSkipChoice(false, message.id);
            }
          }}
        />
      );
    }

    if (message.type === "confirmation") {
      const isDisabled = message.selectedOption !== null;
      return (
        <View key={message.id} className="flex-row justify-center mt-4 mb-2" style={{ gap: 12 }}>
          <Pressable
            onPress={() => {
              if (!isDisabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleSummaryConfirmation(true, message.id);
              }
            }}
            disabled={isDisabled}
            style={({ pressed }) => ({
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 20,
              backgroundColor: message.selectedOption === "Yes"
                ? (isDark ? "#FFFFFF" : "#1C1C1E")
                : (isDark ? "#2A2A2C" : "#F2F2F7"),
              opacity: isDisabled && message.selectedOption !== "Yes" ? 0.5 : (pressed ? 0.8 : 1),
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: message.selectedOption === "Yes"
                  ? (isDark ? "#1C1C1E" : "#FFFFFF")
                  : colors.textPrimary,
              }}
            >
              Yes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!isDisabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleSummaryConfirmation(false, message.id);
              }
            }}
            disabled={isDisabled}
            style={({ pressed }) => ({
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 20,
              backgroundColor: message.selectedOption === "No"
                ? (isDark ? "#FFFFFF" : "#1C1C1E")
                : (isDark ? "#2A2A2C" : "#F2F2F7"),
              opacity: isDisabled && message.selectedOption !== "No" ? 0.5 : (pressed ? 0.8 : 1),
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: message.selectedOption === "No"
                  ? (isDark ? "#1C1C1E" : "#FFFFFF")
                  : colors.textPrimary,
              }}
            >
              Not quite
            </Text>
          </Pressable>
        </View>
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
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: showGetStarted ? 80 : 20 }}
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
        {!isRecording && !showGetStarted && !isInSummaryConfirmMode && (
          <InputBar
            ref={inputRef}
            value={userInput}
            onChangeText={setUserInput}
            onSend={handleSubmit}
            onVoicePress={handleVoicePress}
            placeholder={isInQuestionMode || isInSkipPromptMode ? "Or type your own answer..." : inputPlaceholder}
            autoFocus={!isInQuestionMode && !isInSkipPromptMode}
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

      {/* Get Started Button - dark gray button shown at bottom when onboarding is complete */}
      {showGetStarted && !isRecording && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            zIndex: 999,
            backgroundColor: colors.headerBackground,
            alignItems: "flex-start",
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleGetStarted}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                color: "#4A4A4C",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Get Started!
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
