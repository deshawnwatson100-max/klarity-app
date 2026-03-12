import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Animated,
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
  | "splash"
  | "welcome"
  | "intro"
  | "name"
  | "primary_use_case"
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
  type: "bot" | "user" | "options" | "confirmation" | "skip_choice" | "use_case";
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

// Question type definition
type QuestionSet = {
  key: keyof OnboardingAnswers;
  question: string;
  options: string[];
}[];

// Generic questions (used when user types their own response or selects "Mixed")
const GENERIC_QUESTIONS: QuestionSet = [
  {
    key: "conversationTrigger",
    question: "What type of conversations throw you off the most?",
    options: [
      "Emotional",
      "High-stakes",
      "Unexpected",
      "Text-based",
      "Time-sensitive",
    ],
  },
  {
    key: "responseOutcome",
    question: "When you respond without clarity, what happens?",
    options: [
      "I regret it",
      "I overthink later",
      "It causes confusion",
      "It escalates",
      "I avoid responding",
    ],
  },
  {
    key: "conversationCost",
    question: "What does that usually cost you?",
    options: [
      "Confidence",
      "Peace of mind",
      "Connection",
      "Time",
      "Energy",
    ],
  },
  {
    key: "afterConfusion",
    question: "What is your default reaction afterward?",
    options: [
      "Replay it",
      "Ask others",
      "Over-explain",
      "Avoid follow-up",
      "Move on but feel off",
    ],
  },
  {
    key: "klarityHelps",
    question: "What would you most like to avoid?",
    options: [
      "Saying the wrong thing",
      "Being misunderstood",
      "Creating tension",
      "Missing opportunities",
      "Mental spirals",
    ],
  },
  {
    key: "bestOutcome",
    question: "If Klarity worked perfectly, it would help you feel:",
    options: [
      "Clear",
      "Calm",
      "Confident",
      "Grounded",
      "Certain",
    ],
  },
  {
    key: "momentFrequency",
    question: "How often do moments like this come up?",
    options: [
      "Almost daily",
      "A few times a week",
      "Occasionally",
      "Rarely, but they matter",
    ],
  },
  {
    key: "reminderPreference",
    question: "If Klarity helps you handle these moments better, would you want reminders or tips outside the app?",
    options: [
      "Yes, that would help",
      "Maybe occasionally",
      "Not right now",
    ],
  },
];

// Dating / Relationships questions
const DATING_QUESTIONS: QuestionSet = [
  {
    key: "conversationTrigger",
    question: "When things go wrong in dating conversations, what usually causes it?",
    options: [
      "Mixed signals",
      "Saying too much",
      "Saying too little",
      "Misreading tone",
      "Responding too fast or too slow",
    ],
  },
  {
    key: "responseOutcome",
    question: "When a message does not land, what is the result?",
    options: [
      "Awkward silence",
      "Losing momentum",
      "Tension or distance",
      "Confusion",
      "It fizzles out",
    ],
  },
  {
    key: "conversationCost",
    question: "What do you usually replay afterward?",
    options: [
      "What I should have said",
      "How it sounded",
      "Their reaction",
      "The timing",
      "Everything",
    ],
  },
  {
    key: "afterConfusion",
    question: "What is the biggest thing you want to avoid?",
    options: [
      "Saying something unattractive",
      "Being misunderstood",
      "Coming off the wrong way",
      "Missing a connection",
      "Regretting the reply",
    ],
  },
  {
    key: "klarityHelps",
    question: "How often do these moments show up?",
    options: [
      "Almost every interaction",
      "A few times a week",
      "Occasionally",
      "Only in important moments",
    ],
  },
  {
    key: "bestOutcome",
    question: "A good outcome would leave you feeling:",
    options: [
      "Confident",
      "Calm",
      "Connected",
      "Clear",
      "Relieved",
    ],
  },
  {
    key: "reminderPreference",
    question: "If Klarity helps you handle these moments better, would you want reminders or tips outside the app?",
    options: [
      "Yes, that would help",
      "Maybe occasionally",
      "Not right now",
    ],
  },
];

// Work / Professional questions
const WORK_QUESTIONS: QuestionSet = [
  {
    key: "conversationTrigger",
    question: "What makes work conversations difficult for you?",
    options: [
      "Choosing the right tone",
      "Saying things diplomatically",
      "Navigating power dynamics",
      "Responding under pressure",
      "Reading between the lines",
    ],
  },
  {
    key: "responseOutcome",
    question: "When you say the wrong thing at work, what happens?",
    options: [
      "Misalignment",
      "Tension",
      "Loss of credibility",
      "Confusion",
      "Missed opportunity",
    ],
  },
  {
    key: "conversationCost",
    question: "What does that usually cost you?",
    options: [
      "Confidence",
      "Momentum",
      "Trust",
      "Energy",
      "Peace of mind",
    ],
  },
  {
    key: "afterConfusion",
    question: "Afterward, what do you do?",
    options: [
      "Replay it",
      "Draft follow-ups",
      "Over-correct",
      "Avoid the topic",
      "Move on but feel uneasy",
    ],
  },
  {
    key: "klarityHelps",
    question: "What would you most like to avoid at work?",
    options: [
      "Being misunderstood",
      "Escalating tension",
      "Saying something unprofessional",
      "Damaging relationships",
      "Second-guessing myself",
    ],
  },
  {
    key: "bestOutcome",
    question: "The ideal outcome is:",
    options: [
      "Clear alignment",
      "Calm communication",
      "Mutual respect",
      "Confidence in my response",
      "No lingering doubt",
    ],
  },
  {
    key: "momentFrequency",
    question: "How often do moments like this come up?",
    options: [
      "Almost daily",
      "A few times a week",
      "Occasionally",
      "Rarely, but they matter",
    ],
  },
  {
    key: "reminderPreference",
    question: "If Klarity helps you handle these moments better, would you want reminders or tips outside the app?",
    options: [
      "Yes, that would help",
      "Maybe occasionally",
      "Not right now",
    ],
  },
];

// Conflict / Tense Situations questions
const CONFLICT_QUESTIONS: QuestionSet = [
  {
    key: "conversationTrigger",
    question: "What usually triggers tension in conversations?",
    options: [
      "Emotional topics",
      "Miscommunication",
      "Past issues resurfacing",
      "Poor timing",
      "Feeling misunderstood",
    ],
  },
  {
    key: "responseOutcome",
    question: "When things escalate, what is the outcome?",
    options: [
      "Raised emotions",
      "Distance",
      "Arguments",
      "Silence",
      "Regret afterward",
    ],
  },
  {
    key: "conversationCost",
    question: "What do you struggle with most in conflict?",
    options: [
      "Staying calm",
      "Choosing the right words",
      "Not overreacting",
      "Being understood",
      "Knowing when to respond",
    ],
  },
  {
    key: "afterConfusion",
    question: "What do you wish you could avoid?",
    options: [
      "Saying something hurtful",
      "Making it worse",
      "Regretting my response",
      "Escalating tension",
      "Losing the relationship",
    ],
  },
  {
    key: "klarityHelps",
    question: "After conflict, what lingers the most?",
    options: [
      "Mental replay",
      "Emotional weight",
      "Uncertainty",
      "Guilt",
      "Frustration",
    ],
  },
  {
    key: "bestOutcome",
    question: "A better outcome would feel like:",
    options: [
      "Calm resolution",
      "Mutual understanding",
      "Emotional clarity",
      "Closure",
      "Relief",
    ],
  },
  {
    key: "momentFrequency",
    question: "How often do moments like this come up?",
    options: [
      "Almost daily",
      "A few times a week",
      "Occasionally",
      "Rarely, but they matter",
    ],
  },
  {
    key: "reminderPreference",
    question: "If Klarity helps you handle these moments better, would you want reminders or tips outside the app?",
    options: [
      "Yes, that would help",
      "Maybe occasionally",
      "Not right now",
    ],
  },
];

// Texting / Online Messages questions
const TEXTING_QUESTIONS: QuestionSet = [
  {
    key: "conversationTrigger",
    question: "What makes texting hard for you?",
    options: [
      "Tone is unclear",
      "No immediate feedback",
      "Overthinking wording",
      "Timing responses",
      "Reading intent",
    ],
  },
  {
    key: "responseOutcome",
    question: "When a text does not land, what happens?",
    options: [
      "No reply",
      "Confusion",
      "Awkward follow-ups",
      "Misunderstanding",
      "Regret",
    ],
  },
  {
    key: "conversationCost",
    question: "What do you usually overthink?",
    options: [
      "Word choice",
      "Tone",
      "Length",
      "Timing",
      "Their interpretation",
    ],
  },
  {
    key: "afterConfusion",
    question: "What do you want to avoid in texting?",
    options: [
      "Sounding rude",
      "Sounding desperate",
      "Being misunderstood",
      "Killing momentum",
      "Over-explaining",
    ],
  },
  {
    key: "klarityHelps",
    question: "How often do you rethink messages after sending?",
    options: [
      "Almost always",
      "Often",
      "Sometimes",
      "Rarely",
    ],
  },
  {
    key: "bestOutcome",
    question: "The best outcome feels like:",
    options: [
      "Clear communication",
      "Confidence",
      "Ease",
      "No second-guessing",
      "Smooth flow",
    ],
  },
  {
    key: "momentFrequency",
    question: "How often do moments like this come up?",
    options: [
      "Almost daily",
      "A few times a week",
      "Occasionally",
      "Rarely, but they matter",
    ],
  },
  {
    key: "reminderPreference",
    question: "If Klarity helps you handle these moments better, would you want reminders or tips outside the app?",
    options: [
      "Yes, that would help",
      "Maybe occasionally",
      "Not right now",
    ],
  },
];

// Friends / Family (Relationships) questions
const RELATIONSHIPS_QUESTIONS: QuestionSet = [
  {
    key: "conversationTrigger",
    question: "What makes conversations with friends or family hard?",
    options: [
      "Emotional history",
      "Misunderstandings",
      "Sensitive topics",
      "Poor timing",
      "Tone being misread",
    ],
  },
  {
    key: "responseOutcome",
    question: "When things go wrong, what usually happens?",
    options: [
      "Awkwardness",
      "Hurt feelings",
      "Distance",
      "Tension",
      "Unspoken issues",
    ],
  },
  {
    key: "conversationCost",
    question: "What do you often worry about afterward?",
    options: [
      "How it sounded",
      "If I hurt them",
      "If they misunderstood me",
      "If I should follow up",
      "If I made it worse",
    ],
  },
  {
    key: "afterConfusion",
    question: "What is the biggest thing you want to avoid?",
    options: [
      "Conflict",
      "Hurt feelings",
      "Being misunderstood",
      "Long-term tension",
      "Regret",
    ],
  },
  {
    key: "klarityHelps",
    question: "How often do these moments happen?",
    options: [
      "Often",
      "Sometimes",
      "Rarely",
      "Only in serious conversations",
    ],
  },
  {
    key: "bestOutcome",
    question: "A good conversation would leave you feeling:",
    options: [
      "Understood",
      "Calm",
      "Connected",
      "Clear",
      "At ease",
    ],
  },
  {
    key: "reminderPreference",
    question: "If Klarity helps you handle these moments better, would you want reminders or tips outside the app?",
    options: [
      "Yes, that would help",
      "Maybe occasionally",
      "Not right now",
    ],
  },
];

// Map use cases to question sets
const USE_CASE_QUESTIONS: Record<string, QuestionSet> = {
  "Dating": DATING_QUESTIONS,
  "Work": WORK_QUESTIONS,
  "Conflict": CONFLICT_QUESTIONS,
  "Texting": TEXTING_QUESTIONS,
  "Relationships": RELATIONSHIPS_QUESTIONS,
};

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

// Progress Meter component for onboarding questions
interface ProgressMeterProps {
  currentQuestion: number;
  totalQuestions: number;
  isVisible: boolean;
  isDark: boolean;
}

function ProgressMeter({
  currentQuestion,
  totalQuestions,
  isVisible,
  isDark,
}: ProgressMeterProps) {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Fade in
      const fadeTimer = setTimeout(() => setOpacity(1), 50);
      // Progress is based on current question (0-indexed), showing completed questions
      const targetProgress = (currentQuestion / totalQuestions) * 100;
      const progressTimer = setTimeout(() => setProgress(targetProgress), 100);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(progressTimer);
      };
    } else {
      setOpacity(0);
      setProgress(0);
    }
  }, [isVisible, currentQuestion, totalQuestions]);

  if (!isVisible) return null;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: isDark ? "#1C1C1E" : "#F8F8F8",
        opacity: opacity,
      }}
    >
      {/* Progress text */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: isDark ? "#8E8E93" : "#6B6B70",
          }}
        >
          Question {currentQuestion + 1} of {totalQuestions}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: isDark ? "#8E8E93" : "#6B6B70",
          }}
        >
          {Math.round((currentQuestion / totalQuestions) * 100)}%
        </Text>
      </View>
      {/* Progress bar track */}
      <View
        style={{
          height: 4,
          backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Progress bar fill */}
        <View
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: isDark ? "#FFFFFF" : "#1C1C1E",
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<InputBarRef>(null);
  const keepKeyboardOpenRef = useRef(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<AIMessage[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("splash");
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("understand");
  // Onboarding header icon card state
  const [showOnboardingCard, setShowOnboardingCard] = useState(false);
  const [onboardingCardTapCount, setOnboardingCardTapCount] = useState(0);
  const onboardingCardOpacity = useRef(new Animated.Value(0)).current;
  const onboardingCardScale = useRef(new Animated.Value(0.92)).current;
  const [inputPlaceholder, setInputPlaceholder] = useState("Type your message...");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userSituationContext, setUserSituationContext] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [localUserName, setLocalUserName] = useState("");
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({});
  const [activeQuestions, setActiveQuestions] = useState<QuestionSet>(GENERIC_QUESTIONS);
  const [splashOpacity, setSplashOpacity] = useState(1);
  const [keyboardPersistUntilSend, setKeyboardPersistUntilSend] = useState(true);

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

  const addUseCaseMessage = useCallback(() => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "use_case",
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
      const question = activeQuestions[questionIndex];
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
    [activeQuestions, addBotMessage, addOptionsMessage, scrollToBottom]
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

      if (nextIndex < activeQuestions.length) {
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
      activeQuestions,
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

  const setPrimaryUseCase = useOnboardingStore((s) => s.setPrimaryUseCase);

  const handleUseCaseSelect = useCallback(
    async (useCase: string, messageId: string) => {
      // Update the message to show selection
      updateOptionSelection(messageId, useCase);

      // Save to store
      setPrimaryUseCase(useCase);
      setUserSituationContext(useCase);

      // Set the appropriate question set based on use case
      const questions = USE_CASE_QUESTIONS[useCase] || GENERIC_QUESTIONS;
      setActiveQuestions(questions);

      // Add user's selection as a message
      setTimeout(() => {
        addUserMessage(useCase);
      }, 200);

      // Show intro message with ETA and benefits
      setTimeout(() => {
        setIsTyping(true);
        scrollToBottom();

        setTimeout(() => {
          setIsTyping(false);
          const questionCount = (useCase === "Dating" || useCase === "Texting" || useCase === "Relationships") ? 7 : 8;
          addBotMessage(`I have ${questionCount} quick questions that take 30 seconds to a minute. They help me understand how you communicate so I can give you more personalized insights and better responses.`);

          // Show the skip choice
          setTimeout(() => {
            setCurrentStep("skip_prompt");
            addSkipChoiceMessage();
          }, 400);
        }, 700);
      }, 500);
    },
    [updateOptionSelection, setPrimaryUseCase, addUserMessage, addBotMessage, scrollToBottom, addSkipChoiceMessage]
  );

  // Scroll to bottom when Get Started button appears
  useEffect(() => {
    if (showGetStarted) {
      // Delay to allow the padding to update first
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [showGetStarted, scrollToBottom]);

  // Focus input after splash screen completes (only when entering name step)
  useEffect(() => {
    if (currentStep === "name") {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [currentStep]);

  // Initial welcome message
  useEffect(() => {
    // Start with splash screen, then transition to onboarding
    if (currentStep !== "splash") return;

    const transitionFromSplash = async () => {
      // Show splash for 2 seconds, then fade out
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fade out splash
      setSplashOpacity(0);

      // Wait for fade animation, then start onboarding
      await new Promise((resolve) => setTimeout(resolve, 400));
      setCurrentStep("welcome");

      // Start the actual onboarding flow
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

    transitionFromSplash();
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!userInput.trim() || isTyping) return;

    keepKeyboardOpenRef.current = false;
    setKeyboardPersistUntilSend(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const input = userInput.trim();
    addUserMessage(input);
    setUserInput("");

    if (currentStep === "name") {
      setUserName(input);
      setLocalUserName(input);
      setCurrentStep("primary_use_case");
      setInputPlaceholder("Type your answer...");

      // Ask about primary use case and show options
      setIsTyping(true);
      scrollToBottom();

      setTimeout(() => {
        setIsTyping(false);
        addBotMessage(`Nice to meet you, ${input}! What do you mostly need help with?`);

        // Add use case options
        setTimeout(() => {
          addUseCaseMessage();
        }, 300);
      }, 600);
    } else if (currentStep === "primary_use_case") {
      // User typed their own response instead of selecting a use case option
      // Use generic questions for custom responses
      setPrimaryUseCase(input);
      setUserSituationContext(input);
      setActiveQuestions(GENERIC_QUESTIONS);

      // Show intro message with ETA and benefits
      setIsTyping(true);
      scrollToBottom();

      setTimeout(() => {
        setIsTyping(false);
        addBotMessage("I have 7 quick questions that take about a minute. They help me understand how you communicate so I can give you more personalized insights and better responses.");

        // Show the skip choice
        setTimeout(() => {
          setCurrentStep("skip_prompt");
          addSkipChoiceMessage();
        }, 400);
      }, 700);
    } else if (currentStep.startsWith("question_")) {
      // User typed their own answer during a question
      const question = activeQuestions[currentQuestionIndex];
      if (!question) return;

      // Save the typed answer
      setOnboardingAnswer(question.key, input);
      setCollectedAnswers(prev => ({ ...prev, [question.key]: input }));

      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < activeQuestions.length) {
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
    } else if (currentStep === "summary_confirm" || currentStep === "summary_correction") {
      // User is sharing what they really have going on (either typed directly or after clicking "Not quite")
      setIsTyping(true);
      scrollToBottom();

      try {
        // Generate a new empathetic response based on their input
        const correctionPrompt = `The user shared this about what's really going on for them: "${input}"

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
          { temperature: 0.85, maxTokens: 350 }
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
          setCurrentStep("primary_use_case");
          setInputPlaceholder("Type your answer...");

          // Ask about primary use case and show options
          setIsTyping(true);
          scrollToBottom();

          setTimeout(() => {
            setIsTyping(false);
            addBotMessage(`Nice to meet you, ${transcription}! What do you mostly need help with?`);

            // Add use case options
            setTimeout(() => {
              addUseCaseMessage();
            }, 300);
          }, 600);
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
              { temperature: 0.85, maxTokens: 350 }
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

  const dismissOnboardingCard = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(onboardingCardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(onboardingCardScale, { toValue: 0.92, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowOnboardingCard(false);
      callback?.();
    });
  };

  const handleOnboardingIconPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newCount = onboardingCardTapCount + 1;
    setOnboardingCardTapCount(newCount);
    setShowOnboardingCard(true);
    onboardingCardOpacity.setValue(0);
    onboardingCardScale.setValue(0.92);
    Animated.parallel([
      Animated.spring(onboardingCardOpacity, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
      Animated.spring(onboardingCardScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
    ]).start();
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
  const isInUseCaseMode = currentStep === "primary_use_case";
  const isComplete = currentStep === "complete";

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

    if (message.type === "use_case") {
      const useCaseOptions = ["Dating", "Work", "Conflict", "Texting", "Relationships"];
      const isDisabled = message.selectedOption !== null;

      // Hide options once selected
      if (isDisabled) {
        return null;
      }

      return (
        <View key={message.id} className="mt-4 mb-2" style={{ gap: 10 }}>
          {useCaseOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleUseCaseSelect(option, message.id);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                borderWidth: 1,
                borderColor: isDark ? "#3A3A3C" : "#E5E5EA",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: colors.textPrimary,
                }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }

    if (message.type === "confirmation") {
      // Hide the options once one is selected
      if (message.selectedOption !== null) {
        return null;
      }
      return (
        <View key={message.id} className="flex-row justify-center mt-4 mb-2" style={{ gap: 12 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleSummaryConfirmation(true, message.id);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 20,
              backgroundColor: isDark ? "#2A2A2C" : "#F2F2F7",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textPrimary,
              }}
            >
              Yes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleSummaryConfirmation(false, message.id);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 20,
              backgroundColor: isDark ? "#2A2A2C" : "#F2F2F7",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textPrimary,
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

  // Splash screen for onboarding
  const isSplash = currentStep === "splash";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Splash Screen */}
      {isSplash && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
            opacity: splashOpacity,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              Klarity
            </Text>
            {/* Chat loop icon - matching PaywallScreen */}
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textPrimary} />
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
                <Ionicons name="add" size={14} color={colors.textPrimary} />
              </View>
            </View>
          </View>
        </View>
      )}

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
                  handleOnboardingIconPress();
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
                  handleOnboardingIconPress();
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
                    handleOnboardingIconPress();
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
                    handleOnboardingIconPress();
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
                onPress={handleOnboardingIconPress}
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

        {/* Progress Meter - shows during questions */}
        <ProgressMeter
          currentQuestion={currentQuestionIndex}
          totalQuestions={activeQuestions.length}
          isVisible={isInQuestionMode}
          isDark={isDark}
        />

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{
            paddingTop: 20,
            paddingBottom: showGetStarted ? 60 + Math.max(insets.bottom, 16) : 20
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps={keyboardPersistUntilSend ? "always" : "never"}
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
        {!isRecording && !showGetStarted && !isComplete && !isSplash && (
          <InputBar
            ref={inputRef}
            value={userInput}
            onChangeText={setUserInput}
            onSend={handleSubmit}
            onVoicePress={handleVoicePress}
            onImageButtonPress={handleOnboardingIconPress}
            placeholder={isInQuestionMode || isInSkipPromptMode || isInUseCaseMode ? "Or type your own answer..." : (isInSummaryConfirmMode ? "Or share what feels more accurate..." : inputPlaceholder)}
            autoFocus={!isInQuestionMode && !isInSkipPromptMode && !isInUseCaseMode && !isInSummaryConfirmMode}
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
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 4),
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
              paddingVertical: 8,
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

      {/* Onboarding header icon card */}
      {showOnboardingCard && (
        <Modal transparent animationType="none" onRequestClose={() => dismissOnboardingCard()}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}
            onPress={() => dismissOnboardingCard()}
          >
            <Animated.View
              style={{
                opacity: onboardingCardOpacity,
                transform: [{ scale: onboardingCardScale }],
                backgroundColor: isDark ? "#12131A" : "#FFFFFF",
                borderRadius: 28,
                paddingVertical: 40,
                paddingHorizontal: 32,
                width: "100%",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: isDark ? 0.6 : 0.15,
                shadowRadius: 40,
                elevation: 20,
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "transparent",
              }}
            >
              {onboardingCardTapCount <= 1 ? (
                /* First tap — continue onboarding */
                <>
                  <View style={{ alignItems: "center", marginBottom: 24 }}>
                    <View style={{
                      width: 56, height: 56, borderRadius: 28,
                      backgroundColor: isDark ? "rgba(120, 160, 255, 0.12)" : "rgba(80, 120, 255, 0.08)",
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(120, 160, 255, 0.2)" : "rgba(80, 120, 255, 0.15)",
                    }}>
                      <Text style={{ fontSize: 26 }}>✨</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary, textAlign: "center", marginBottom: 14, letterSpacing: -0.5 }}>
                    Almost there
                  </Text>
                  <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: "center", lineHeight: 24, marginBottom: 28 }}>
                    Finish setting up so Klarity can personalize everything to how you communicate.
                  </Text>
                  <Pressable
                    onPress={() => dismissOnboardingCard()}
                    style={({ pressed }) => ({
                      backgroundColor: isDark ? "rgba(120, 160, 255, 0.15)" : "rgba(80, 120, 255, 0.1)",
                      borderRadius: 16, paddingVertical: 15, alignItems: "center",
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(120, 160, 255, 0.3)" : "rgba(80, 120, 255, 0.25)",
                    })}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#7AA0FF" : "#5078FF", letterSpacing: 0.1 }}>
                      Continue onboarding
                    </Text>
                  </Pressable>
                </>
              ) : (
                /* Second tap — choose to continue or dive into the app */
                <>
                  <View style={{ alignItems: "center", marginBottom: 24 }}>
                    <View style={{
                      width: 56, height: 56, borderRadius: 28,
                      backgroundColor: isDark ? "rgba(120, 160, 255, 0.12)" : "rgba(80, 120, 255, 0.08)",
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(120, 160, 255, 0.2)" : "rgba(80, 120, 255, 0.15)",
                    }}>
                      <Text style={{ fontSize: 26 }}>🚀</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary, textAlign: "center", marginBottom: 14, letterSpacing: -0.5 }}>
                    Ready to dive in?
                  </Text>
                  <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: "center", lineHeight: 24, marginBottom: 28 }}>
                    Pick up where you left off, or jump straight into the app.
                  </Text>
                  {/* Continue onboarding */}
                  <Pressable
                    onPress={() => dismissOnboardingCard()}
                    style={({ pressed }) => ({
                      backgroundColor: isDark ? "rgba(120, 160, 255, 0.15)" : "rgba(80, 120, 255, 0.1)",
                      borderRadius: 16, paddingVertical: 15, alignItems: "center",
                      opacity: pressed ? 0.7 : 1, marginBottom: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(120, 160, 255, 0.3)" : "rgba(80, 120, 255, 0.25)",
                    })}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#7AA0FF" : "#5078FF", letterSpacing: 0.1 }}>
                      Continue onboarding
                    </Text>
                  </Pressable>
                  {/* Craft a reply */}
                  <Pressable
                    onPress={() => dismissOnboardingCard(handleGetStarted)}
                    style={({ pressed }) => ({
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      borderRadius: 16, paddingVertical: 15, alignItems: "center",
                      opacity: pressed ? 0.7 : 1, marginBottom: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                    })}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary, letterSpacing: 0.1 }}>
                      Craft a reply
                    </Text>
                  </Pressable>
                  {/* Decode a message */}
                  <Pressable
                    onPress={() => dismissOnboardingCard(handleGetStarted)}
                    style={({ pressed }) => ({
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      borderRadius: 16, paddingVertical: 15, alignItems: "center",
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                    })}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary, letterSpacing: 0.1 }}>
                      Decode a message
                    </Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
