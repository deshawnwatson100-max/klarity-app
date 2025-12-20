import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLoopsStore } from "../state/loopsStore";
import { ReplyTimelineEntry, TrackedRelationship } from "../types/loop";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Format vague relative date - no exact dates
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

// Timeline entry component
function TimelineEntryItem({
  entry,
  isFirst,
}: {
  entry: ReplyTimelineEntry;
  isFirst: boolean;
}) {
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

      {/* Content */}
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

// Person picker modal
function PersonPicker({
  visible,
  relationships,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  relationships: TrackedRelationship[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Pressable
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 100,
      }}
      onPress={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          position: "absolute",
          top: insets.top + 100,
          left: 20,
          right: 20,
          backgroundColor: "#1A1A1C",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.06)",
          overflow: "hidden",
          maxHeight: 400,
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* All conversations option */}
          <Pressable
            onPress={() => {
              onSelect(null);
              onClose();
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: pressed
                ? "rgba(255, 255, 255, 0.05)"
                : selectedId === null
                ? "rgba(255, 255, 255, 0.03)"
                : "transparent",
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(156, 163, 175, 0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#9CA3AF" />
            </View>
            <Text
              style={{
                color: selectedId === null ? "#F9FAFB" : "#D1D5DB",
                fontSize: 15,
                fontWeight: selectedId === null ? "500" : "400",
                marginLeft: 12,
                flex: 1,
              }}
            >
              All conversations
            </Text>
            {selectedId === null && (
              <Ionicons name="checkmark" size={20} color="#9CA3AF" />
            )}
          </Pressable>

          {/* Divider */}
          {relationships.length > 0 && (
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                marginHorizontal: 16,
              }}
            />
          )}

          {/* Person options */}
          {relationships.map((rel) => {
            const isSelected = selectedId === rel.id;
            const initials = rel.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <Pressable
                key={rel.id}
                onPress={() => {
                  onSelect(rel.id);
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: pressed
                    ? "rgba(255, 255, 255, 0.05)"
                    : isSelected
                    ? "rgba(255, 255, 255, 0.03)"
                    : "transparent",
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#A78BFA",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {initials}
                  </Text>
                </View>
                <Text
                  style={{
                    color: isSelected ? "#F9FAFB" : "#D1D5DB",
                    fontSize: 15,
                    fontWeight: isSelected ? "500" : "400",
                    marginLeft: 12,
                    flex: 1,
                  }}
                >
                  {rel.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color="#9CA3AF" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Pressable>
  );
}

export function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // State
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Store selectors
  const timelineEntries = useLoopsStore((s) => s.timelineEntries);
  const trackedRelationships = useLoopsStore((s) => s.trackedRelationships);
  const clearTimelineForRelationship = useLoopsStore(
    (s) => s.clearTimelineForRelationship
  );
  const isLearningPaused = useLoopsStore((s) => s.isLearningPaused);
  const pauseLearning = useLoopsStore((s) => s.pauseLearning);
  const resumeLearning = useLoopsStore((s) => s.resumeLearning);
  const getRelationshipById = useLoopsStore((s) => s.getRelationshipById);

  // Get selected person
  const selectedPerson = selectedPersonId
    ? getRelationshipById(selectedPersonId)
    : null;

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let entries = [...timelineEntries];

    // Filter by person if selected
    if (selectedPersonId) {
      entries = entries.filter((e) => e.relationshipId === selectedPersonId);
    }

    // Sort newest to oldest
    return entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [timelineEntries, selectedPersonId]);

  // Check if learning is paused for selected person
  const learningPaused = selectedPersonId
    ? isLearningPaused(selectedPersonId)
    : false;

  // Handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleToggleLearning = () => {
    if (!selectedPersonId) return;
    if (learningPaused) {
      resumeLearning(selectedPersonId);
    } else {
      pauseLearning(selectedPersonId);
    }
  };

  const handleClearTimeline = () => {
    if (selectedPersonId) {
      clearTimelineForRelationship(selectedPersonId);
    } else {
      // Clear all - clear for each relationship
      trackedRelationships.forEach((rel) => {
        clearTimelineForRelationship(rel.id);
      });
    }
    setShowClearConfirm(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0C" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        {/* Back button and title row */}
        <View className="flex-row items-center">
          <Pressable
            onPress={handleBack}
            className="active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
          </Pressable>

          <View className="flex-1 ml-3">
            <Text
              style={{
                color: "#F9FAFB",
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              Timeline
              {selectedPerson && (
                <Text style={{ color: "#6B7280", fontWeight: "400" }}>
                  {" "}
                  · {selectedPerson.name}
                </Text>
              )}
            </Text>
          </View>
        </View>

        {/* Person filter selector */}
        <Pressable
          onPress={() => setShowPersonPicker(true)}
          className="flex-row items-center mt-3 py-2 px-3 rounded-xl active:opacity-70"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            alignSelf: "flex-start",
          }}
        >
          <Ionicons
            name={selectedPerson ? "person-outline" : "chatbubbles-outline"}
            size={16}
            color="#6B7280"
          />
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 14,
              marginLeft: 8,
            }}
          >
            {selectedPerson ? selectedPerson.name : "All conversations"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color="#6B7280"
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>

      {/* Learning Paused Banner */}
      {selectedPersonId && learningPaused && (
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
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 120,
        }}
      >
        {filteredEntries.length === 0 ? (
          <View className="items-center justify-center py-16 px-8">
            <Text
              style={{
                color: "#6B7280",
                fontSize: 15,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              {selectedPerson
                ? "Nothing here yet. As you chat, patterns will quietly appear."
                : "Nothing here yet. As you have conversations, meaningful moments will be remembered."}
            </Text>
          </View>
        ) : (
          filteredEntries.map((entry, index) => (
            <TimelineEntryItem
              key={entry.id}
              entry={entry}
              isFirst={index === 0}
            />
          ))
        )}
      </ScrollView>

      {/* Footer Controls */}
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
          <View>
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {selectedPerson
                ? `Clear all history for ${selectedPerson.name}?`
                : "Clear all timeline history?"}
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
                onPress={handleClearTimeline}
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
                {selectedPerson
                  ? "Clear timeline for this person"
                  : "Clear timeline"}
              </Text>
            </Pressable>
            {selectedPersonId && (
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
                  {learningPaused
                    ? "Resume learning for this person"
                    : "Pause learning for this person"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Person Picker Modal */}
      <PersonPicker
        visible={showPersonPicker}
        relationships={trackedRelationships}
        selectedId={selectedPersonId}
        onSelect={setSelectedPersonId}
        onClose={() => setShowPersonPicker(false)}
      />
    </View>
  );
}
