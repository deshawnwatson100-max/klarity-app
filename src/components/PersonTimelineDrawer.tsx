import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useLoopsStore } from "../state/loopsStore";
import { TrackedRelationship, ReplyTimelineEntry } from "../types/loop";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.92;

interface PersonTimelineDrawerProps {
  visible: boolean;
  relationship: TrackedRelationship | null;
  onClose: () => void;
}

// Format vague relative date - no exact dates, just "recently" or "earlier"
function formatVagueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) {
    return "recently";
  } else if (diffDays <= 14) {
    return "earlier";
  } else {
    return "a while back";
  }
}

// Timeline entry component - clean, minimal, no icons or scores
function TimelineEntryItem({ entry, isFirst }: { entry: ReplyTimelineEntry; isFirst: boolean }) {
  return (
    <View className="flex-row px-6 py-2">
      {/* Timeline line and dot */}
      <View className="items-center mr-4" style={{ width: 12 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(156, 163, 175, 0.4)",
            marginTop: 6,
          }}
        />
        <View
          style={{
            flex: 1,
            width: 1,
            backgroundColor: "rgba(75, 85, 99, 0.2)",
            marginTop: 6,
          }}
        />
      </View>

      {/* Content - just the insight, clean and observational */}
      <View className="flex-1 pb-4">
        <Text
          style={{
            color: "#D1D5DB",
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          {entry.insight}
        </Text>
        {!isFirst && (
          <Text
            style={{
              color: "#4B5563",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {formatVagueDate(entry.createdAt)}
          </Text>
        )}
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

  // Store selectors - individual to avoid re-renders
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

  // Swipe gesture to close (swipe right to close)
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
              borderLeftColor: "rgba(255, 255, 255, 0.04)",
              shadowColor: "#000",
              shadowOffset: { width: -4, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10,
            },
            drawerStyle,
          ]}
        >
          {/* Header - Minimal, just name and subtitle */}
          <View
            style={{
              paddingTop: insets.top + 20,
              paddingBottom: 20,
              paddingHorizontal: 24,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            {/* Drag indicator for swipe-down gesture hint */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(156, 163, 175, 0.3)",
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            {/* Person's name */}
            <Text
              style={{
                color: "#F9FAFB",
                fontSize: 22,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {relationship?.name || "Timeline"}
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                color: "#6B7280",
                fontSize: 14,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              How conversations usually go
            </Text>
          </View>

          {/* Top Insight Card - Soft, neutral, no icons implying judgment */}
          {insightSummary && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={{
                marginHorizontal: 20,
                marginTop: 20,
                padding: 18,
                borderRadius: 16,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.06)",
              }}
            >
              <Text
                style={{
                  color: "#E5E7EB",
                  fontSize: 15,
                  lineHeight: 23,
                  fontWeight: "400",
                }}
              >
                {insightSummary.summary}
              </Text>
            </Animated.View>
          )}

          {/* Learning Paused Banner - subtle */}
          {learningPaused && (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "rgba(156, 163, 175, 0.06)",
                borderWidth: 1,
                borderColor: "rgba(156, 163, 175, 0.1)",
              }}
            >
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Learning paused for this person
              </Text>
            </View>
          )}

          {/* Timeline Feed */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}
          >
            {timelineEntries.length === 0 ? (
              <View className="items-center justify-center py-16 px-8">
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: 15,
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  Nothing here yet. As you chat, patterns will quietly appear.
                </Text>
              </View>
            ) : (
              timelineEntries.map((entry, index) => (
                <TimelineEntryItem
                  key={entry.id}
                  entry={entry}
                  isFirst={index === 0}
                />
              ))
            )}
          </ScrollView>

          {/* Footer Controls - Low Emphasis, muted styling */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: insets.bottom + 20,
              paddingTop: 16,
              paddingHorizontal: 24,
              backgroundColor: "#0A0A0C",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            {showClearConfirm ? (
              // Confirmation modal for destructive action
              <View>
                <Text
                  style={{
                    color: "#9CA3AF",
                    fontSize: 14,
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  Clear all history for this person?
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setShowClearConfirm(false)}
                    className="flex-1 py-3 rounded-xl active:opacity-70"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 14,
                        fontWeight: "500",
                        textAlign: "center",
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClearHistory}
                    className="flex-1 py-3 rounded-xl active:opacity-70"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#EF4444",
                        fontSize: 14,
                        fontWeight: "500",
                        textAlign: "center",
                      }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              // Default footer - muted text buttons
              <View className="gap-2">
                <Pressable
                  onPress={() => setShowClearConfirm(true)}
                  className="py-3 active:opacity-60"
                >
                  <Text
                    style={{
                      color: "#4B5563",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    Clear history for this person
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleToggleLearning}
                  className="py-3 active:opacity-60"
                >
                  <Text
                    style={{
                      color: "#4B5563",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {learningPaused ? "Resume learning for this person" : "Pause learning for this person"}
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
