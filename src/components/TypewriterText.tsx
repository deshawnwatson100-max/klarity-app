import React, { useEffect, useState } from "react";
import { Text, TextStyle } from "react-native";

interface TypewriterTextProps {
  text: string;
  style?: TextStyle;
  speed?: number; // ms per character
  onComplete?: () => void;
}

/**
 * TypewriterText - ChatGPT-style streaming text animation
 * Text appears character by character with a natural typing effect
 */
export function TypewriterText({
  text,
  style,
  speed = 12,
  onComplete,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    setDisplayedText("");
    setIsComplete(false);

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(intervalId);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return (
    <Text style={style}>
      {displayedText}
      {!isComplete && (
        <Text style={{ opacity: 0.5 }}>|</Text>
      )}
    </Text>
  );
}
