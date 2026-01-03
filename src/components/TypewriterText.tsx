import React, { useEffect, useState, useRef } from "react";
import { TextStyle, View, Animated, Easing } from "react-native";

interface TypewriterTextProps {
  text: string;
  style?: TextStyle;
  speed?: number; // ms per word
  onComplete?: () => void;
  startDelay?: number; // ms delay before starting
}

interface WordProps {
  word: string;
  style?: TextStyle;
  isVisible: boolean;
  isLast: boolean;
}

/**
 * Individual word component with fade-in animation
 */
function AnimatedWord({ word, style, isVisible, isLast }: WordProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, opacity]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.Text style={[style, { opacity }]}>
      {word}{isLast ? "" : " "}
    </Animated.Text>
  );
}

/**
 * TypewriterText - ChatGPT-style streaming text animation
 * Text appears word by word, each word fading in as it appears
 */
export function TypewriterText({
  text,
  style,
  speed = 85,
  onComplete,
  startDelay = 0,
}: TypewriterTextProps) {
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(startDelay === 0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const words = text ? text.split(" ") : [];

  useEffect(() => {
    // Start delay before typing begins (only if delay > 0)
    if (startDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        setHasStarted(true);
      }, startDelay);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startDelay]);

  useEffect(() => {
    if (!text || !hasStarted) return;

    setVisibleWordCount(0);
    setIsComplete(false);

    let currentWordIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentWordIndex < words.length) {
        currentWordIndex++;
        setVisibleWordCount(currentWordIndex);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, hasStarted, words.length]);

  if (!hasStarted) {
    return null;
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {words.map((word, index) => (
        <AnimatedWord
          key={`${index}-${word}`}
          word={word}
          style={style}
          isVisible={index < visibleWordCount}
          isLast={index === words.length - 1}
        />
      ))}
    </View>
  );
}
