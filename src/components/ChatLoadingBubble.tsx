import React, { useState, useEffect, useRef, memo } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ChatGPT-style colors
const COLORS = {
  background: "#1A1A1A",
  surface: "#0D0D0D",
  border: "rgba(255,255,255,0.06)",
  text: "#ECECEC",
  textSecondary: "#B4B4B4",
  textMuted: "#8E8E8E",
  accent: "#10A37F",
  accentDim: "rgba(16, 163, 127, 0.3)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.15)",
};

// Status text sets
const CHAT_STATUSES = [
  "Reading the details...",
  "Thinking through options...",
  "Writing a response...",
  "Polishing it...",
];

const DEEP_SEARCH_STATUSES = [
  "Searching the web...",
  "Opening a few results...",
  "Gathering links...",
  "Organizing results...",
];

export type LoadingType = "chat" | "deep-search";
export type LoadingState = "loading" | "success" | "error" | "cancelled";

interface ChatLoadingBubbleProps {
  type: LoadingType;
  state: LoadingState;
  onCancel?: () => void;
  onRetry?: () => void;
  customAction?: string; // Override the action line
  errorMessage?: string;
}

export const ChatLoadingBubble = memo(function ChatLoadingBubble({
  type,
  state,
  onCancel,
  onRetry,
  customAction,
  errorMessage,
}: ChatLoadingBubbleProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [reassuranceText, setReassuranceText] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pulsing dot animation
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (state === "loading") {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [state, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Get status texts based on type
  const statusTexts = type === "deep-search" ? DEEP_SEARCH_STATUSES : CHAT_STATUSES;

  // Timer effect
  useEffect(() => {
    if (state !== "loading") return;

    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setStatusIndex(0);
    setReassuranceText(null);

    // Update timer every second
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Time-based reassurance
      if (elapsed >= 20 && elapsed < 25) {
        setReassuranceText("Still working—almost done.");
      } else if (elapsed >= 8 && elapsed < 12) {
        setReassuranceText("This can take a moment.");
      } else if (elapsed >= 25) {
        setReassuranceText("Still working—almost done.");
      }
    }, 1000);

    // Rotate status every 2-3 seconds
    statusIntervalRef.current = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusTexts.length);
    }, 2500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [state, statusTexts.length]);

  // Format elapsed time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get action line
  const getActionLine = (): string => {
    if (customAction) return customAction;
    return type === "deep-search" ? "Running deep search" : "Thinking of a reply";
  };

  // Handle cancel
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCancel?.();
  };

  // Handle retry
  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry?.();
  };

  // Loading state
  if (state === "loading") {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          marginVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          {/* Header row: Title + Timer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Pulsing dot */}
              <Animated.View
                style={[
                  {
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: COLORS.accent,
                    marginRight: 10,
                  },
                  pulseStyle,
                ]}
              />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: COLORS.text,
                }}
              >
                Working on it...
              </Text>
            </View>
            {/* Timer */}
            <Text
              style={{
                fontSize: 13,
                fontFamily: "monospace",
                color: COLORS.textMuted,
              }}
            >
              {formatTime(elapsedSeconds)}
            </Text>
          </View>

          {/* Action line */}
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              marginBottom: 6,
            }}
          >
            {getActionLine()}
          </Text>

          {/* Status line (rotating) */}
          <Text
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              fontStyle: "italic",
            }}
          >
            {statusTexts[statusIndex]}
          </Text>

          {/* Reassurance text (time-based) */}
          {reassuranceText && (
            <Text
              style={{
                fontSize: 12,
                color: COLORS.accent,
                marginTop: 10,
              }}
            >
              {reassuranceText}
            </Text>
          )}

          {/* Cancel button (if supported) */}
          {onCancel && (
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => ({
                marginTop: 14,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.05)",
                alignSelf: "flex-start",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.textMuted,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          marginVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.errorBg,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: COLORS.text,
              marginBottom: 6,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              marginBottom: 12,
            }}
          >
            {errorMessage || "Could not complete the request. Please try again."}
          </Text>
          {onRetry && (
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: COLORS.accent,
                alignSelf: "flex-start",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                Try again
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  // Cancelled state
  if (state === "cancelled") {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          marginVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: COLORS.text,
              marginBottom: 6,
            }}
          >
            Stopped
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              marginBottom: 12,
            }}
          >
            The request was cancelled.
          </Text>
          {onRetry && (
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: COLORS.accent,
                alignSelf: "flex-start",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                Run again
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  // Success state - this component should be replaced, but fallback to null
  return null;
});
