import React, { useEffect, useState, useRef } from "react";
import { Text, TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface TypewriterTextProps {
  text: string;
  style?: TextStyle;
  speed?: number; // ms per character
  onComplete?: () => void;
  startDelay?: number; // ms delay before starting
}

/**
 * TypewriterText - ChatGPT-style streaming text animation
 * Text appears word by word with a smooth, calm feel
 */
export function TypewriterText({
  text,
  style,
  speed = 20,
  onComplete,
  startDelay = 0,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fade in smoothly
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });

    // Start delay before typing begins
    timeoutRef.current = setTimeout(() => {
      setHasStarted(true);
    }, startDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startDelay]);

  useEffect(() => {
    if (!text || !hasStarted) return;

    setDisplayedText("");
    setIsComplete(false);

    // Split into words for smoother word-by-word animation
    const words = text.split(" ");
    let currentWordIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentWordIndex < words.length) {
        const newText = words.slice(0, currentWordIndex + 1).join(" ");
        setDisplayedText(newText);
        currentWordIndex++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, hasStarted]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!hasStarted) {
    return null;
  }

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {displayedText}
      {!isComplete && <Text style={{ opacity: 0.4 }}> ▍</Text>}
    </Animated.Text>
  );
}
