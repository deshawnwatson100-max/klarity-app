import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme";
import { OnboardingAnswers } from "../state/onboardingStore";

interface Question {
  id: keyof OnboardingAnswers;
  question: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    id: "conversationTrigger",
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
    id: "responseOutcome",
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
    id: "conversationCost",
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
    id: "afterConfusion",
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
    id: "klarityHelps",
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
    id: "bestOutcome",
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

interface OnboardingQuestionsProps {
  onAnswer: (key: keyof OnboardingAnswers, value: string) => void;
  onComplete: () => void;
}

export function OnboardingQuestions({
  onAnswer,
  onComplete,
}: OnboardingQuestionsProps) {
  const { colors, isDark } = useTheme();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;

  useEffect(() => {
    // Reset animations when question changes
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentQuestionIndex]);

  const handleOptionSelect = (option: string) => {
    if (isTransitioning) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option);
    onAnswer(currentQuestion.id, option);

    // Brief delay to show selection, then transition
    setTimeout(() => {
      setIsTransitioning(true);

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (isLastQuestion) {
          onComplete();
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsTransitioning(false);
        }
      });
    }, 300);
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        paddingHorizontal: 4,
      }}
    >
      {/* Question from Klarity */}
      <View
        style={{
          backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
          borderRadius: 20,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 16,
          maxWidth: "85%",
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 16,
            lineHeight: 22,
          }}
        >
          {currentQuestion.question}
        </Text>
      </View>

      {/* Options as tap-to-select bubbles */}
      <View style={{ gap: 10, paddingLeft: 8 }}>
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedOption === option;

          return (
            <Pressable
              key={index}
              onPress={() => handleOptionSelect(option)}
              disabled={isTransitioning}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  backgroundColor: isSelected
                    ? isDark
                      ? "#3A3A3C"
                      : "#007AFF"
                    : isDark
                    ? "#2C2C2E"
                    : "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? isDark
                      ? "#48484A"
                      : "#007AFF"
                    : isDark
                    ? "#3A3A3C"
                    : "#E5E5EA",
                }}
              >
                <Text
                  style={{
                    color: isSelected
                      ? isDark
                        ? "#FFFFFF"
                        : "#FFFFFF"
                      : colors.textPrimary,
                    fontSize: 15,
                    lineHeight: 20,
                  }}
                >
                  {option}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Progress indicator */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 24,
          gap: 6,
        }}
      >
        {QUESTIONS.map((_, index) => (
          <View
            key={index}
            style={{
              width: index === currentQuestionIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                index === currentQuestionIndex
                  ? isDark
                    ? "#FFFFFF"
                    : "#007AFF"
                  : index < currentQuestionIndex
                  ? isDark
                    ? "#48484A"
                    : "#007AFF"
                  : isDark
                  ? "#3A3A3C"
                  : "#D1D1D6",
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}
