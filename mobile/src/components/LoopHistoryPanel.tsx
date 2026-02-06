import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoopsStore } from "../state/loopsStore";
import { cn } from "../utils/cn";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LoopHistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  onLoopSelected?: () => void; // Optional callback when a loop is selected
}

/**
 * LoopHistoryPanel Component
 *
 * Side panel that displays all past conversation loops.
 * Shows loop title, preview, date, and emotional clarity score.
 * Allows users to switch between loops or delete old ones.
 *
 * Styling follows Klarity AI design:
 * - Dark background with luxury grey (#9CA3AF) accents
 * - Minimalist, clean cards with rounded corners
 * - Subtle hover/active states
 */
export function LoopHistoryPanel({ visible, onClose, onLoopSelected }: LoopHistoryPanelProps) {
  const insets = useSafeAreaInsets();

  const loops = useLoopsStore((s) => s.loops);
  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);
  const deleteLoop = useLoopsStore((s) => s.deleteLoop);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateX = useRef(new Animated.Value(SCREEN_WIDTH * 0.85)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslateX, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslateX, {
          toValue: SCREEN_WIDTH * 0.85,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelectLoop = (loopId: string) => {
    // switchToLoop will set isHistoryPanelOpen to false automatically
    // This makes the chat update immediately without waiting for modal close animation
    switchToLoop(loopId);
    // Notify parent component that a loop was selected (for navigation)
    onLoopSelected?.();
  };

  const handleDeleteLoop = (loopId: string, event: any) => {
    event.stopPropagation();
    deleteLoop(loopId);
  };

  const handleNewLoop = () => {
    // createNewLoop already updates activeLoopId, no need to call onClose
    createNewLoop();
    // Close panel after creating new loop
    onClose();
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getFirstUserMessage = (loop: any) => {
    const firstUserMsg = loop.messages.find((m: any) => m.role === "user");
    if (!firstUserMsg) return "No messages yet";

    const preview = firstUserMsg.content.trim();
    const maxLength = 80;
    return preview.length > maxLength
      ? preview.substring(0, maxLength) + "..."
      : preview;
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            opacity: backdropOpacity,
          }}
        />
      </Pressable>

      {/* Side Panel */}
      <Animated.View
        className="absolute top-0 right-0 bottom-0 bg-neutral-950 border-l border-neutral-900"
        style={{
          width: "85%",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          transform: [{ translateX: panelTranslateX }],
        }}
      >
        {/* Header */}
        <View className="px-4 py-4 border-b border-neutral-900">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-semibold">
              Past Loops
            </Text>
            <Pressable
              onPress={onClose}
              className="active:opacity-60 w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* New Loop Button */}
          <Pressable
            onPress={handleNewLoop}
            className="flex-row items-center justify-center rounded-xl py-3 active:opacity-80"
            style={{
              backgroundColor: "#9CA3AF",
              shadowColor: "#9CA3AF",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#000" />
            <Text className="text-black font-semibold ml-2">
              Start New Loop
            </Text>
          </Pressable>
        </View>

        {/* Loops List */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          showsVerticalScrollIndicator={false}
        >
          {loops.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="time-outline" size={48} color="#404040" />
              <Text className="text-neutral-500 text-center mt-4">
                No past loops yet
              </Text>
              <Text className="text-neutral-600 text-sm text-center mt-2 px-8">
                Your conversation history will appear here
              </Text>
            </View>
          ) : (
            loops.map((loop) => {
              const isActive = loop.id === activeLoopId;
              const firstMessage = getFirstUserMessage(loop);

              return (
                <Pressable
                  key={loop.id}
                  onPress={() => handleSelectLoop(loop.id)}
                  className={cn(
                    "mb-3 p-4 rounded-xl border active:opacity-80",
                    isActive
                      ? "bg-neutral-800/50 border-neutral-700"
                      : "bg-neutral-900/50 border-neutral-800"
                  )}
                  style={
                    isActive
                      ? {
                          shadowColor: "#9CA3AF",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                        }
                      : undefined
                  }
                >
                  {/* Title Row */}
                  <View className="flex-row items-start justify-between mb-2">
                    <Text
                      className={cn(
                        "text-base font-medium flex-1",
                        isActive ? "text-neutral-300" : "text-white"
                      )}
                      style={isActive ? { color: "#9CA3AF" } : undefined}
                      numberOfLines={2}
                    >
                      {loop.title}
                    </Text>

                    {/* Delete Button */}
                    <Pressable
                      onPress={(e) => handleDeleteLoop(loop.id, e)}
                      className="ml-2 w-6 h-6 items-center justify-center active:opacity-60"
                    >
                      <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>

                  {/* Preview */}
                  <Text
                    className="text-neutral-400 text-sm mb-3"
                    numberOfLines={2}
                  >
                    {firstMessage}
                  </Text>

                  {/* Metadata Row */}
                  <View className="flex-row items-center justify-between">
                    {/* Date */}
                    <View className="flex-row items-center">
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color="#737373"
                      />
                      <Text className="text-neutral-500 text-xs ml-1">
                        {formatDate(loop.updatedAt)}
                      </Text>
                    </View>

                    {/* Emotional Clarity Score */}
                    {loop.emotionalClarity !== undefined && (
                      <View
                        className="flex-row items-center px-2 py-1 rounded-full"
                        style={{ backgroundColor: "rgba(156, 163, 175, 0.15)" }}
                      >
                        <Ionicons
                          name="analytics-outline"
                          size={12}
                          color="#9CA3AF"
                        />
                        <Text
                          className="text-xs font-medium ml-1"
                          style={{ color: "#9CA3AF" }}
                        >
                          {Math.round(loop.emotionalClarity)}% clarity
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Active Indicator */}
                  {isActive && (
                    <View className="absolute top-4 right-4">
                      <View
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "#9CA3AF" }}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
