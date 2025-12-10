import React from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { CalendarLogEntry } from "../types/calendar";
import { EVENT_TYPES, INTENTIONS } from "../types/calendar";
import { BlurView } from "expo-blur";

interface DayDetailDrawerProps {
  visible: boolean;
  date: string; // YYYY-MM-DD
  entries: CalendarLogEntry[];
  onClose: () => void;
  onOpenLoop: (loopId: string) => void;
  onAddReflection: (entryId: string) => void;
}

export function DayDetailDrawer({
  visible,
  date,
  entries,
  onClose,
  onOpenLoop,
  onAddReflection,
}: DayDetailDrawerProps) {
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
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/60"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        {/* Drawer - bottom sheet */}
        <Animated.View
          entering={FadeInUp.duration(300).springify()}
          className="absolute bottom-0 left-0 right-0 bg-neutral-950 rounded-t-3xl"
          style={{
            maxHeight: "75%",
            borderTopWidth: 1,
            borderTopColor: "#262626",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View className="items-center py-3">
              <View
                className="w-12 h-1 bg-neutral-700 rounded-full"
                style={{ opacity: 0.5 }}
              />
            </View>

            {/* Header */}
            <View className="px-6 pb-4 border-b border-neutral-800">
              <Text className="text-white text-2xl font-semibold mb-1">
                {formattedDate}
              </Text>
              <Text className="text-neutral-400 text-sm">
                {entries.length} {entries.length === 1 ? "event" : "events"}
              </Text>
            </View>

            {/* Events List */}
            <ScrollView
              className="flex-1 px-6 pt-4"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 450 }}
            >
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
                    {/* Event Card */}
                    <View
                      className="bg-neutral-900/60 rounded-2xl p-4 border"
                      style={{
                        borderColor: EVENT_TYPES[entry.eventType].color + "40",
                        shadowColor: EVENT_TYPES[entry.eventType].glowColor,
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
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
                              className="px-2 py-1 rounded-full bg-neutral-800"
                            >
                              <Text className="text-neutral-400 text-xs">
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
                            className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-xl py-2.5 items-center active:opacity-70"
                          >
                            <Text className="text-blue-400 text-sm font-medium">
                              Open Chat Loop
                            </Text>
                          </Pressable>
                        )}

                        {isPastDate && !entry.reflectionNotes && (
                          <Pressable
                            onPress={() => onAddReflection(entry.id)}
                            className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-xl py-2.5 items-center active:opacity-70"
                          >
                            <Text className="text-purple-400 text-sm font-medium">
                              Add Reflection
                            </Text>
                          </Pressable>
                        )}

                        {entry.reflectionNotes && (
                          <View className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl py-2.5 px-3">
                            <Text className="text-green-400 text-xs font-medium mb-1">
                              Reflection Added
                            </Text>
                            {entry.clarityScore && (
                              <Text className="text-neutral-400 text-xs">
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

              {/* Bottom padding */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
