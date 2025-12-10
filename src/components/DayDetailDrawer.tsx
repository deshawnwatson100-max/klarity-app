import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, Keyboard } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CalendarLogEntry } from "../types/calendar";
import { EVENT_TYPES, INTENTIONS } from "../types/calendar";
import {
  DailyClaritySummaryCard,
  DailyClaritySummary,
} from "./DailyClaritySummaryCard";
import { useCalendarStore } from "../state/calendarStore";

interface DayDetailDrawerProps {
  visible: boolean;
  date: string; // YYYY-MM-DD
  entries: CalendarLogEntry[];
  onClose: () => void;
  onOpenLoop: (loopId: string) => void;
  onAddReflection: (entryId: string) => void;
  summary?: DailyClaritySummary | null;
  onViewChatLoops?: () => void;
}

export function DayDetailDrawer({
  visible,
  date,
  entries,
  onClose,
  onOpenLoop,
  onAddReflection,
  summary,
  onViewChatLoops,
}: DayDetailDrawerProps) {
  const setDailyComment = useCalendarStore((s) => s.setDailyComment);
  const getDailyComment = useCalendarStore((s) => s.getDailyComment);

  const [comment, setComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Load existing comment when drawer opens
  useEffect(() => {
    if (visible && date) {
      const existingComment = getDailyComment(date);
      setComment(existingComment);
      setIsSaved(false);
    }
  }, [visible, date, getDailyComment]);

  const handleSaveComment = () => {
    if (comment.trim()) {
      setDailyComment(date, comment.trim());
      setIsSaved(true);
      Keyboard.dismiss();
      // Reset saved indicator after 2 seconds
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  if (!visible) return null;

  // Format date for display
  const dateObj = new Date(date + "T12:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isPastDate = dateObj < new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop with dark gradient */}
      <Pressable
        className="flex-1"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={["rgba(5, 6, 8, 0.75)", "rgba(10, 10, 12, 0.85)", "rgba(5, 6, 8, 0.9)"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        {/* Drawer - bottom sheet with blur-glass effect */}
        <Animated.View
          entering={FadeInUp.duration(300).springify()}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
          style={{
            maxHeight: "75%",
            backgroundColor: "rgba(10, 10, 12, 0.85)",
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderRightWidth: 0.5,
            borderTopColor: "rgba(156, 163, 175, 0.15)",
            borderLeftColor: "rgba(156, 163, 175, 0.08)",
            borderRightColor: "rgba(156, 163, 175, 0.08)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.5,
            shadowRadius: 24,
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View className="items-center py-3">
              <View
                className="w-12 h-1 rounded-full"
                style={{
                  backgroundColor: "rgba(156, 163, 175, 0.25)",
                }}
              />
            </View>

            {/* Header */}
            <View className="px-6 pb-4" style={{ borderBottomWidth: 0.5, borderBottomColor: "rgba(156, 163, 175, 0.1)" }}>
              <Text className="text-white text-2xl font-semibold mb-1">
                {formattedDate}
              </Text>
              <Text className="text-sm" style={{ color: "#9CA3AF" }}>
                {entries.length} {entries.length === 1 ? "event" : "events"}
              </Text>
            </View>

            {/* Events List */}
            <ScrollView
              className="flex-1 pt-4"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 450 }}
            >
              {/* Daily Clarity Summary Card */}
              <DailyClaritySummaryCard
                summary={summary || null}
                onViewChatLoops={() => {
                  if (onViewChatLoops) {
                    onViewChatLoops();
                  } else {
                    console.log("View chat loops for date:", date);
                  }
                }}
              />

              {/* Events List Container */}
              <View className="px-6">
              {entries.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <Ionicons name="calendar-outline" size={48} color="#6B7280" />
                  <Text className="text-neutral-400 text-base mt-4">
                    No events for this day
                  </Text>
                </View>
              ) : (
                entries.map((entry, index) => (
                  <Animated.View
                    key={entry.id}
                    entering={FadeInDown.delay(index * 50)
                      .duration(300)
                      .springify()}
                    className="mb-4"
                  >
                    {/* Event Card with frosted glass */}
                    <View
                      className="rounded-2xl p-4"
                      style={{
                        backgroundColor: "rgba(20, 20, 24, 0.5)",
                        borderWidth: 0.5,
                        borderColor: EVENT_TYPES[entry.eventType].color + "30",
                        shadowColor: EVENT_TYPES[entry.eventType].color,
                        shadowOpacity: 0.2,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                      }}
                    >
                      {/* Event Type Badge */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="w-8 h-8 rounded-full items-center justify-center"
                            style={{
                              backgroundColor:
                                EVENT_TYPES[entry.eventType].color + "20",
                            }}
                          >
                            <Ionicons
                              name={EVENT_TYPES[entry.eventType].icon as any}
                              size={16}
                              color={EVENT_TYPES[entry.eventType].color}
                            />
                          </View>
                          <Text
                            className="text-sm font-medium"
                            style={{
                              color: EVENT_TYPES[entry.eventType].color,
                            }}
                          >
                            {EVENT_TYPES[entry.eventType].label}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          className="px-3 py-1 rounded-full"
                          style={{
                            backgroundColor:
                              entry.status === "completed"
                                ? "#10B98120"
                                : entry.status === "in-progress"
                                ? "#F59E0B20"
                                : "#6B728020",
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{
                              color:
                                entry.status === "completed"
                                  ? "#10B981"
                                  : entry.status === "in-progress"
                                  ? "#F59E0B"
                                  : "#9CA3AF",
                            }}
                          >
                            {entry.status === "completed"
                              ? "Complete"
                              : entry.status === "in-progress"
                              ? "In Progress"
                              : "Upcoming"}
                          </Text>
                        </View>
                      </View>

                      {/* Title */}
                      <Text className="text-white text-base font-medium mb-2">
                        {entry.title || entry.quickSummary}
                      </Text>

                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <View className="flex-row flex-wrap gap-2 mb-3">
                          {entry.tags.map((tag, i) => (
                            <View
                              key={i}
                              className="px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: "rgba(156, 163, 175, 0.15)",
                                borderWidth: 0.5,
                                borderColor: "rgba(156, 163, 175, 0.2)",
                              }}
                            >
                              <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                                {tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Intention Indicator */}
                      <View className="flex-row items-center gap-2 mb-3">
                        <View
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: INTENTIONS[entry.intention].color,
                          }}
                        />
                        <Text className="text-neutral-400 text-xs">
                          {INTENTIONS[entry.intention].label} •{" "}
                          {new Date(entry.timestamp).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View className="flex-row gap-2 mt-2">
                        {entry.loopId && (
                          <Pressable
                            onPress={() => onOpenLoop(entry.loopId!)}
                            className="flex-1 rounded-xl py-2.5 items-center active:opacity-70"
                            style={{
                              backgroundColor: "rgba(59, 130, 246, 0.15)",
                              borderWidth: 0.5,
                              borderColor: "rgba(59, 130, 246, 0.3)",
                            }}
                          >
                            <Text className="text-sm font-medium" style={{ color: "#60A5FA" }}>
                              Open Chat Loop
                            </Text>
                          </Pressable>
                        )}

                        {isPastDate && !entry.reflectionNotes && (
                          <Pressable
                            onPress={() => onAddReflection(entry.id)}
                            className="flex-1 rounded-xl py-2.5 items-center active:opacity-70"
                            style={{
                              backgroundColor: "rgba(168, 85, 247, 0.15)",
                              borderWidth: 0.5,
                              borderColor: "rgba(168, 85, 247, 0.3)",
                            }}
                          >
                            <Text className="text-sm font-medium" style={{ color: "#B47CFF" }}>
                              Add Reflection
                            </Text>
                          </Pressable>
                        )}

                        {entry.reflectionNotes && (
                          <View className="flex-1 rounded-xl py-2.5 px-3" style={{
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            borderWidth: 0.5,
                            borderColor: "rgba(16, 185, 129, 0.2)",
                          }}>
                            <Text className="text-xs font-medium mb-1" style={{ color: "#10B981" }}>
                              Reflection Added
                            </Text>
                            {entry.clarityScore && (
                              <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                                Clarity: {entry.clarityScore}/10
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                ))
              )}
              </View>

              {/* Bottom padding */}
              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Comment Input Bar */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "rgba(156, 163, 175, 0.1)",
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "rgba(10, 10, 12, 0.95)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(20, 20, 24, 0.8)",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(156, 163, 175, 0.15)",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Add a comment about this day..."
                    placeholderTextColor="#6B7280"
                    multiline
                    style={{
                      flex: 1,
                      color: "#E5E7EB",
                      fontSize: 14,
                      maxHeight: 80,
                      lineHeight: 20,
                    }}
                  />
                </View>
                <Pressable
                  onPress={handleSaveComment}
                  disabled={!comment.trim()}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: comment.trim()
                      ? isSaved
                        ? "#10B981"
                        : "#A855F7"
                      : "rgba(156, 163, 175, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons
                    name={isSaved ? "checkmark" : "arrow-up"}
                    size={20}
                    color={comment.trim() ? "#FFFFFF" : "#6B7280"}
                  />
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
