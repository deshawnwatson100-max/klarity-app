import React, { useEffect, useState, useRef } from "react";
import { Text, TextStyle, View, Animated, Easing } from "react-native";
import { useTheme } from "../theme";

interface TypewriterTextProps {
  text: string;
  style?: TextStyle;
  speed?: number; // ms per word
  onComplete?: () => void;
  startDelay?: number; // ms delay before starting
}

/**
 * Parse inline formatting (bold, italic, code) and return styled elements
 * Also applies subtle emphasis to interpretive phrases
 */
const parseInlineFormatting = (
  str: string,
  baseStyle: TextStyle,
  isDark: boolean,
  lineIndex: number,
  partIndex: number = 0,
  emphasisPhrases: string[] = []
): React.ReactNode[] => {
  const boldColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const italicColor = isDark ? "#D1D5DB" : "#636366";
  const codeTextColor = isDark ? "#A5F3FC" : "#0284C7";
  const codeBgColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)";
  const emphasisColor = isDark ? "#F3F4F6" : "#374151"; // Slightly brighter for emphasis

  const parts: React.ReactNode[] = [];
  // Match bold (**text** or __text__), italic (*text* or _text_), and inline code (`text`)
  const formatRegex = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let match;

  // Helper to apply emphasis to plain text segments
  const applyEmphasis = (text: string, keyPrefix: string): React.ReactNode[] => {
    if (emphasisPhrases.length === 0) {
      return [<Text key={keyPrefix} style={baseStyle}>{text}</Text>];
    }

    const result: React.ReactNode[] = [];
    let remaining = text;
    let segmentIndex = 0;

    while (remaining.length > 0) {
      // Find the earliest matching emphasis phrase
      let earliestMatch: { phrase: string; index: number } | null = null;

      for (const phrase of emphasisPhrases) {
        const lowerRemaining = remaining.toLowerCase();
        const lowerPhrase = phrase.toLowerCase();
        const idx = lowerRemaining.indexOf(lowerPhrase);
        if (idx !== -1 && (earliestMatch === null || idx < earliestMatch.index)) {
          earliestMatch = { phrase: remaining.slice(idx, idx + phrase.length), index: idx };
        }
      }

      if (earliestMatch) {
        // Add text before the match
        if (earliestMatch.index > 0) {
          result.push(
            <Text key={`${keyPrefix}-pre-${segmentIndex}`} style={baseStyle}>
              {remaining.slice(0, earliestMatch.index)}
            </Text>
          );
        }
        // Add the emphasized phrase
        result.push(
          <Text
            key={`${keyPrefix}-emph-${segmentIndex}`}
            style={[baseStyle, { fontWeight: "600", color: emphasisColor }]}
          >
            {earliestMatch.phrase}
          </Text>
        );
        remaining = remaining.slice(earliestMatch.index + earliestMatch.phrase.length);
        segmentIndex++;
      } else {
        // No more matches, add remaining text
        result.push(
          <Text key={`${keyPrefix}-rest-${segmentIndex}`} style={baseStyle}>
            {remaining}
          </Text>
        );
        break;
      }
    }

    return result;
  };

  while ((match = formatRegex.exec(str)) !== null) {
    // Add text before the formatted part (with emphasis applied)
    if (match.index > lastIndex) {
      const textBefore = str.slice(lastIndex, match.index);
      parts.push(...applyEmphasis(textBefore, `text-${lineIndex}-${partIndex}-${lastIndex}`));
    }

    if (match[1] || match[2]) {
      // Bold text
      parts.push(
        <Text
          key={`bold-${lineIndex}-${partIndex}-${match.index}`}
          style={[baseStyle, { fontWeight: "700", color: boldColor }]}
        >
          {match[1] || match[2]}
        </Text>
      );
    } else if (match[3]) {
      // Inline code
      parts.push(
        <Text
          key={`code-${lineIndex}-${partIndex}-${match.index}`}
          style={[
            baseStyle,
            {
              fontFamily: "Courier",
              backgroundColor: codeBgColor,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              fontSize: (baseStyle.fontSize || 15) - 1,
              color: codeTextColor,
            },
          ]}
        >
          {match[3]}
        </Text>
      );
    } else if (match[4] || match[5]) {
      // Italic text
      parts.push(
        <Text
          key={`italic-${lineIndex}-${partIndex}-${match.index}`}
          style={[baseStyle, { fontStyle: "italic", color: italicColor }]}
        >
          {match[4] || match[5]}
        </Text>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text (with emphasis applied)
  if (lastIndex < str.length) {
    const textAfter = str.slice(lastIndex);
    parts.push(...applyEmphasis(textAfter, `text-${lineIndex}-${partIndex}-${lastIndex}-end`));
  }

  // If no markdown was found, apply emphasis to the whole string
  if (parts.length === 0) {
    return applyEmphasis(str, `text-${lineIndex}-${partIndex}`);
  }

  return parts;
};

/**
 * Render formatted text with proper markdown styling
 * Includes special styling for intro phrases like "With that context," to maintain visual consistency
 */
const renderFormattedText = (text: string, baseStyle: TextStyle, isDark: boolean) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  // Theme-aware colors
  const codeTextColor = isDark ? "#A5F3FC" : "#0284C7";
  const headerColors = {
    1: isDark ? "#FFFFFF" : "#1C1C1E",
    2: isDark ? "#F3F4F6" : "#374151",
    3: isDark ? "#E5E7EB" : "#4B5563",
  };
  const bulletColor = isDark ? "#0A84FF" : "#007AFF";
  const quoteTextColor = isDark ? "#9CA3AF" : "#6B7280";
  const quoteBorderColor = isDark ? "#6B7280" : "#D1D5DB";
  const codeBlockBg = isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.04)";

  // Intro phrase color (teal/aqua for "With that context," etc.)
  const introPhraseColor = isDark ? "#5EEAD4" : "#0D9488";

  // Intro phrases that should be highlighted (teal + bold + larger)
  const introPhrases = [
    "With that context,",
    "With that context",
    "Here is more context you can add",
    "So the real question is",
    "Common misreads here:",
    "Common misreads:",
  ];

  // Emphasis phrases that should be slightly bolder (interpretive patterns)
  // These highlight key insights in the decode chat loop
  const emphasisPhrases = [
    // Reads / interpretations
    "this reads less like",
    "this reads more like",
    "this reads like",
    "this leans more toward",
    "this leans less toward",
    "this leans toward",
    "more like",
    "less like",
    "reads as",
    "reads like",

    // Patterns & dynamics
    "the pattern here",
    "the pattern tells",
    "the real pattern",
    "the dynamic here",
    "the dynamic is",
    "there's a pattern",
    "effort imbalance",
    "emotional weight",
    "the ratio",
    "default mode",
    "baseline behavior",
    "wired to handle",

    // What it signals
    "what this signals",
    "what that signals",
    "signals that",
    "this signals",
    "that signals",
    "usually signals",
    "often signals",

    // Key insight phrases
    "isn't about you",
    "isn't necessarily",
    "isn't the same as",
    "doesn't mean",
    "the real question is",
    "the actual issue",
    "what's actually happening",
    "what's really going on",
    "the underlying",
    "beneath the surface",
    "the real tell",
    "the tell here",
    "worth noticing",
    "worth paying attention",
    "the key thing",
    "the key here",

    // Behavior / communication style
    "inconsistent texting",
    "inconsistent communication",
    "pacing style",
    "communication habits",
    "comfort-level fluctuation",
    "emotional availability",
    "their texting style",
    "texting habits",
    "response time",
    "one-sided",
    "matched energy",
    "mirroring",
    "closing the gap",
    "keeping you at arm's length",
    "pulling back",
    "pulling away",
    "testing the waters",

    // Stakes / positioning
    "you're positioned",
    "how you're positioned",
    "perceived value",
    "your pace",
    "their pace",
    "carrying more",
    "carrying the weight",
    "let them close",
    "let them respond",
    "observe their",

    // Reframes
    "could also be",
    "another read",
    "different possibility",
    "not necessarily",
    "more likely",
    "less likely",
    "the safer read",
    "the honest read",
    "the neutral read",
    "two possibilities",

    // Common misread patterns
    "people often mistake",
    "easy to misread",
    "common misread",
    "trap people fall into",
    "mistaken for",
    "confused with",
  ];

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Handle code blocks
    if (trimmedLine.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <View
            key={`codeblock-${lineIndex}`}
            style={{
              backgroundColor: codeBlockBg,
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              marginBottom: 8,
              borderLeftWidth: 3,
              borderLeftColor: bulletColor,
            }}
          >
            {codeBlockContent.map((codeLine, i) => (
              <Text
                key={`codeline-${i}`}
                style={{
                  fontFamily: "Courier",
                  fontSize: 14,
                  lineHeight: 20,
                  color: codeTextColor,
                }}
              >
                {codeLine}
              </Text>
            ))}
          </View>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Check for headers (# ## ###)
    const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const headerStyles = {
        1: { fontSize: 22, fontWeight: "700" as const, marginTop: 20, marginBottom: 12, color: headerColors[1] },
        2: { fontSize: 19, fontWeight: "600" as const, marginTop: 16, marginBottom: 10, color: headerColors[2] },
        3: { fontSize: 17, fontWeight: "600" as const, marginTop: 14, marginBottom: 8, color: headerColors[3] },
      };
      elements.push(
        <Text
          key={`header-${lineIndex}`}
          style={[baseStyle, headerStyles[level as 1 | 2 | 3], { lineHeight: headerStyles[level as 1 | 2 | 3].fontSize * 1.3 }]}
        >
          {headerText}
        </Text>
      );
      return;
    }

    // Check for bullet points (- or • or *)
    const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <View
          key={`bullet-${lineIndex}`}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: 10,
            paddingLeft: 4,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: bulletColor,
              marginTop: 9,
              marginRight: 12,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={baseStyle}>{parseInlineFormatting(bulletMatch[1], baseStyle, isDark, lineIndex, 0, emphasisPhrases)}</Text>
          </View>
        </View>
      );
      return;
    }

    // Check for numbered lists (1. 2. etc)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <View
          key={`numbered-${lineIndex}`}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: 10,
            paddingLeft: 4,
          }}
        >
          <Text
            style={[
              baseStyle,
              {
                fontWeight: "600",
                color: bulletColor,
                marginRight: 10,
                minWidth: 22,
              },
            ]}
          >
            {numberedMatch[1]}.
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={baseStyle}>{parseInlineFormatting(numberedMatch[2], baseStyle, isDark, lineIndex, 0, emphasisPhrases)}</Text>
          </View>
        </View>
      );
      return;
    }

    // Check for blockquote (> text)
    const quoteMatch = trimmedLine.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      elements.push(
        <View
          key={`quote-${lineIndex}`}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: quoteBorderColor,
            paddingLeft: 14,
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          <Text style={[baseStyle, { fontStyle: "italic", color: quoteTextColor }]}>
            {parseInlineFormatting(quoteMatch[1], baseStyle, isDark, lineIndex, 0, emphasisPhrases)}
          </Text>
        </View>
      );
      return;
    }

    // Regular paragraph text
    if (trimmedLine.length > 0) {
      const prevLine = lineIndex > 0 ? lines[lineIndex - 1].trim() : "";
      const isNewParagraph = lineIndex > 0 && prevLine.length === 0;
      const isAfterSpecial = prevLine.match(/^[-•*#>\d]/) !== null;

      // Check if this line starts with an intro phrase (apply to any matching line)
      let introMatch: string | null = null;
      for (const phrase of introPhrases) {
        if (trimmedLine.startsWith(phrase)) {
          introMatch = phrase;
          break;
        }
      }

      if (introMatch) {
        // Render intro phrase with special color and larger font, rest with normal style
        const restOfLine = line.slice(line.indexOf(introMatch) + introMatch.length);
        elements.push(
          <Text
            key={`line-${lineIndex}`}
            style={[
              baseStyle,
              {
                marginTop: isNewParagraph ? 16 : isAfterSpecial ? 12 : lineIndex > 0 ? 4 : 0,
              },
            ]}
          >
            <Text style={{ color: introPhraseColor, fontWeight: "700", fontSize: 17 }}>{introMatch}</Text>
            {parseInlineFormatting(restOfLine, baseStyle, isDark, lineIndex, 0, emphasisPhrases)}
          </Text>
        );
      } else {
        elements.push(
          <Text
            key={`line-${lineIndex}`}
            style={[
              baseStyle,
              {
                marginTop: isNewParagraph ? 16 : isAfterSpecial ? 12 : lineIndex > 0 ? 4 : 0,
              },
            ]}
          >
            {parseInlineFormatting(line, baseStyle, isDark, lineIndex, 0, emphasisPhrases)}
          </Text>
        );
      }
    }
  });

  return elements;
};

/**
 * TypewriterText - ChatGPT-style streaming text animation with markdown formatting
 * Text appears word by word with proper formatting applied throughout
 */
export function TypewriterText({
  text,
  style,
  speed = 85,
  onComplete,
  startDelay = 0,
}: TypewriterTextProps) {
  const [visibleCharCount, setVisibleCharCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(startDelay === 0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const { isDark } = useTheme();

  // Split text into words to animate word by word
  const words = text ? text.split(/(\s+)/) : []; // Keep whitespace as separate items
  const totalChars = text?.length || 0;

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

    // If speed is 0 or already completed, show full text immediately without animation
    if (speed === 0 || hasCompletedRef.current) {
      setVisibleCharCount(totalChars);
      return;
    }

    setVisibleCharCount(0);

    // Calculate word boundaries for word-by-word animation
    let wordBoundaries: number[] = [];
    let currentPos = 0;
    for (const word of words) {
      currentPos += word.length;
      // Only add boundary after actual words (not whitespace)
      if (word.trim().length > 0) {
        wordBoundaries.push(currentPos);
      }
    }

    let currentWordIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentWordIndex < wordBoundaries.length) {
        setVisibleCharCount(wordBoundaries[currentWordIndex]);
        currentWordIndex++;
      } else {
        // Show full text
        setVisibleCharCount(totalChars);
        hasCompletedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, hasStarted, totalChars]);

  if (!hasStarted || !text) {
    return null;
  }

  // Get the visible portion of text
  const visibleText = text.slice(0, visibleCharCount);

  const baseStyle: TextStyle = {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
    fontWeight: "400",
    ...style,
  };

  return (
    <View>
      {renderFormattedText(visibleText, baseStyle, isDark)}
    </View>
  );
}
