import React, { useState, useEffect, useRef, memo } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeContext";

const ACCENT = "#10A37F";
const ERROR = "#EF4444";
const ERROR_BG = "rgba(239, 68, 68, 0.15)";

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
  customAction?: string;
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
  const { isDark } = useTheme();

  // Theme-aware colors
  const surface = isDark ? "#0D0D0D" : "#F3F4F6";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#ECECEC" : "rgba(37,99,235,0.85)";
  const textSecondary = isDark ? "#B4B4B4" : "rgba(59,130,246,0.7)";
  const textMuted = isDark ? "#8E8E8E" : "rgba(96,165,250,0.6)";
  const cancelBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.07)";

  // Pulsing dot animation
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Pulse animation
  useEffect(() => {
    if (state === "loading") {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.4,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [state, pulseOpacity]);

  const statusTexts = type === "deep-search" ? DEEP_SEARCH_STATUSES : CHAT_STATUSES;

  // Timer effect
  useEffect(() => {
    if (state !== "loading") return;

    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setStatusIndex(0);
    setReassuranceText(null);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= 20 && elapsed < 25) {
        setReassuranceText("Still working—almost done.");
      } else if (elapsed >= 8 && elapsed < 12) {
        setReassuranceText("This can take a moment.");
      } else if (elapsed >= 25) {
        setReassuranceText("Still working—almost done.");
      }
    }, 1000);

    statusIntervalRef.current = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusTexts.length);
    }, 2500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [state, statusTexts.length]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getActionLine = (): string => {
    if (customAction) return customAction;
    return type === "deep-search" ? "Running deep search" : "Thinking of a reply";
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCancel?.();
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry?.();
  };

  if (state === "loading") {
    return (
      <Animated.View style={{ marginVertical: 8, paddingHorizontal: 4, opacity: fadeAnim }}>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Animated.View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: ACCENT,
                  marginRight: 10,
                  opacity: pulseOpacity,
                }}
              />
              <Text style={{ fontSize: 15, fontWeight: "600", color: textPrimary }}>
                Working on it...
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "monospace", color: textMuted }}>
              {formatTime(elapsedSeconds)}
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 6 }}>
            {getActionLine()}
          </Text>

          <Text style={{ fontSize: 13, color: textMuted, fontStyle: "italic" }}>
            {statusTexts[statusIndex]}
          </Text>

          {reassuranceText && (
            <Text style={{ fontSize: 12, color: ACCENT, marginTop: 10 }}>
              {reassuranceText}
            </Text>
          )}

          {onCancel && (
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => ({
                marginTop: 14,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: cancelBg,
                alignSelf: "flex-start",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 13, color: textMuted }}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  if (state === "error") {
    return (
      <Animated.View style={{ marginVertical: 8, paddingHorizontal: 4, opacity: fadeAnim }}>
        <View
          style={{
            backgroundColor: ERROR_BG,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: textPrimary, marginBottom: 6 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 12 }}>
            {errorMessage || "Could not complete the request. Please try again."}
          </Text>
          {onRetry && (
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: ACCENT,
                alignSelf: "flex-start",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Try again</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  if (state === "cancelled") {
    return (
      <Animated.View style={{ marginVertical: 8, paddingHorizontal: 4, opacity: fadeAnim }}>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: textPrimary, marginBottom: 6 }}>
            Stopped
          </Text>
          <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 12 }}>
            The request was cancelled.
          </Text>
          {onRetry && (
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: ACCENT,
                alignSelf: "flex-start",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Run again</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  return null;
});
