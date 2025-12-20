import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useLoopsStore } from "../state/loopsStore";
import { TrackedRelationship, ReplyTimelineEntry } from "../types/loop";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.92;

interface PersonTimelineDrawerProps {
  visible: boolean;
  relationship: TrackedRelationship | null;
  onClose: () => void;
}

// Get icon for insight type
function getInsightIcon(type: ReplyTimelineEntry["insightType"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "boundary-held":
      return "shield-checkmark-outline";
    case "boundary-softened":
      return "heart-outline";
    case "communication-style":
      return "chatbubble-outline";
    case "friction-pattern":
      return "warning-outline";
    case "positive-outcome":
      return "sparkles-outline";
    default:
      return "information-circle-outline";
  }
}

// Get color for insight type
function getInsightColor(type: ReplyTimelineEntry["insightType"]): string {
  switch (type) {
    case "boundary-held":
      return "#10B981"; // Green
    case "boundary-softened":
      return "#F59E0B"; // Amber
    case "communication-style":
      return "#3B82F6"; // Blue
    case "friction-pattern":
      return "#EF4444"; // Red
    case "positive-outcome":
      return "#8B5CF6"; // Purple
    default:
      return "#6B7280"; // Gray
  }
}

// Format relative date
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function TimelineEntryItem({ entry }: { entry: ReplyTimelineEntry }) {
  const color = getInsightColor(entry.insightType);
  const icon = getInsightIcon(entry.insightType);

  return (
    <View className="flex-row px-5 py-3">
      {/* Timeline line and dot */}
      <View className="items-center mr-4" style={{ width: 24 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.5,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        <View
          style={{
            flex: 1,
            width: 2,
            backgroundColor: "rgba(75, 85, 99, 0.3)",
            marginTop: 4,
          }}
        />
      </View>

      {/* Content */}
      <View className="flex-1 pb-4">
        <View className="flex-row items-center mb-1">
          <Ionicons name={icon} size={14} color={color} />
          <Text className="text-xs ml-1.5" style={{ color: "#6B7280" }}>
            {formatRelativeDate(entry.createdAt)}
          </Text>
        </View>
        <Text
          className="text-sm"
          style={{ color: "#E5E7EB", lineHeight: 20 }}
        >
          {entry.insight}
        </Text>
      </View>
    </View>
  );
}

export function PersonTimelineDrawer({
  visible,
  relationship,
  onClose,
}: PersonTimelineDrawerProps) {
  const insets = useSafeAreaInsets();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Store
  const getTimelineForRelationship = useLoopsStore((s) => s.getTimelineForRelationship);
  const getInsightSummary = useLoopsStore((s) => s.getInsightSummary);
  const isLearningPaused = useLoopsStore((s) => s.isLearningPaused);
  const clearTimelineForRelationship = useLoopsStore((s) => s.clearTimelineForRelationship);
  const pauseLearning = useLoopsStore((s) => s.pauseLearning);
  const resumeLearning = useLoopsStore((s) => s.resumeLearning);

  // Animation values
  const translateX = useSharedValue(DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  // Animation config
  const ANIMATION_DURATION = 300;
  const EASING_CURVE = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  // Get data for relationship
  const timelineEntries = relationship ? getTimelineForRelationship(relationship.id) : [];
  const insightSummary = relationship ? getInsightSummary(relationship.id) : undefined;
  const learningPaused = relationship ? isLearningPaused(relationship.id) : false;

  // Handle visibility changes
  React.useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING_CURVE,
      });
      backdropOpacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: EASING_CURVE,
      });
    } else {
      translateX.value = withTiming(DRAWER_WIDTH, {
        duration: ANIMATION_DURATION,
        easing: EASING_CURVE,
      });
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING_CURVE,
      });
    }
  }, [visible]);

  // Handle back button on Android
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (visible) {
          onClose();
          return true;
        }
        return false;
      }
    );
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Swipe gesture to close
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(20)
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, DRAWER_WIDTH);
      }
    })
    .onEnd((event) => {
      if (event.translationX > 80 || event.velocityX > 500) {
        translateX.value = withTiming(DRAWER_WIDTH, {
          duration: 200,
          easing: EASING_CURVE,
        });
        backdropOpacity.value = withTiming(0, {
          duration: 200,
          easing: EASING_CURVE,
        });
        runOnJS(onClose)();
      } else {
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  // Animated styles
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? "auto" : "none",
  }));

  // Handlers
  const handleToggleLearning = () => {
    if (!relationship) return;
    if (learningPaused) {
      resumeLearning(relationship.id);
    } else {
      pauseLearning(relationship.id);
    }
  };

  const handleClearHistory = () => {
    if (!relationship) return;
    clearTimelineForRelationship(relationship.id);
    setShowClearConfirm(false);
  };

  if (!visible && translateX.value === DRAWER_WIDTH) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1001,
      }}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              backgroundColor: "#0A0A0C",
              borderLeftWidth: 1,
              borderLeftColor: "rgba(255, 255, 255, 0.06)",
              shadowColor: "#000",
              shadowOffset: { width: -4, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10,
            },
            drawerStyle,
          ]}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingBottom: 16,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={onClose}
                className="active:opacity-60"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
              </Pressable>
              <Text
                className="text-lg font-semibold flex-1 text-center"
                style={{ color: "#F9FAFB" }}
              >
                {relationship?.name || "Timeline"}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Subtitle */}
            <Text
              className="text-xs text-center mt-1"
              style={{ color: "#6B7280" }}
            >
              Klarity remembers what helps you reply better
            </Text>
          </View>

          {/* Adaptive Summary */}
          {insightSummary && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="mx-5 mt-4 p-4 rounded-2xl"
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons name="bulb-outline" size={16} color="#A78BFA" />
                <Text
                  className="text-xs font-medium ml-1.5"
                  style={{ color: "#A78BFA" }}
                >
                  Insight
                </Text>
              </View>
              <Text
                className="text-sm"
                style={{ color: "#E5E7EB", lineHeight: 20 }}
              >
                {insightSummary.summary}
              </Text>
            </Animated.View>
          )}

          {/* Learning Paused Banner */}
          {learningPaused && (
            <View
              className="mx-5 mt-3 p-3 rounded-xl flex-row items-center"
              style={{
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(251, 191, 36, 0.2)",
              }}
            >
              <Ionicons name="pause-circle-outline" size={18} color="#FBBF24" />
              <Text className="text-xs ml-2" style={{ color: "#FBBF24" }}>
                Learning paused for this person
              </Text>
            </View>
          )}

          {/* Timeline */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 120 }}
          >
            {timelineEntries.length === 0 ? (
              <View className="items-center justify-center py-16 px-8">
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(107, 114, 128, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="time-outline" size={28} color="#6B7280" />
                </View>
                <Text
                  className="text-base font-medium text-center mb-2"
                  style={{ color: "#9CA3AF" }}
                >
                  No timeline entries yet
                </Text>
                <Text
                  className="text-sm text-center"
                  style={{ color: "#6B7280", lineHeight: 20 }}
                >
                  As you chat about this person, Klarity will automatically learn what communication patterns work best.
                </Text>
              </View>
            ) : (
              timelineEntries.map((entry) => (
                <TimelineEntryItem key={entry.id} entry={entry} />
              ))
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: insets.bottom + 20,
              paddingTop: 16,
              paddingHorizontal: 20,
              backgroundColor: "#0A0A0C",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            {showClearConfirm ? (
              <View>
                <Text
                  className="text-sm text-center mb-3"
                  style={{ color: "#9CA3AF" }}
                >
                  Clear all history for this person?
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setShowClearConfirm(false)}
                    className="flex-1 py-3 rounded-xl active:opacity-70"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <Text
                      className="text-sm font-medium text-center"
                      style={{ color: "#9CA3AF" }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClearHistory}
                    className="flex-1 py-3 rounded-xl active:opacity-70"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                    }}
                  >
                    <Text
                      className="text-sm font-medium text-center"
                      style={{ color: "#EF4444" }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setShowClearConfirm(true)}
                  className="flex-1 py-3 rounded-xl flex-row items-center justify-center active:opacity-70"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#6B7280" />
                  <Text
                    className="text-sm font-medium ml-2"
                    style={{ color: "#6B7280" }}
                  >
                    Clear history
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleToggleLearning}
                  className="flex-1 py-3 rounded-xl flex-row items-center justify-center active:opacity-70"
                  style={{
                    backgroundColor: learningPaused
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(251, 191, 36, 0.1)",
                    borderWidth: 1,
                    borderColor: learningPaused
                      ? "rgba(16, 185, 129, 0.2)"
                      : "rgba(251, 191, 36, 0.2)",
                  }}
                >
                  <Ionicons
                    name={learningPaused ? "play-outline" : "pause-outline"}
                    size={16}
                    color={learningPaused ? "#10B981" : "#FBBF24"}
                  />
                  <Text
                    className="text-sm font-medium ml-2"
                    style={{ color: learningPaused ? "#10B981" : "#FBBF24" }}
                  >
                    {learningPaused ? "Resume" : "Pause"} learning
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
