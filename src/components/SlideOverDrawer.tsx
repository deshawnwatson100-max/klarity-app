import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  BackHandler,
  TextInput,
  ScrollView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityLoop } from "../types/loop";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Constants for the ChatGPT-style effect (exported for parent use)
export const DRAWER_WIDTH = SCREEN_WIDTH * 0.80;
export const MAIN_CONTENT_TRANSLATE = DRAWER_WIDTH;
export const MAIN_CONTENT_SCALE = 0.88;
export const MAIN_CONTENT_BORDER_RADIUS = 20;

interface SlideOverDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
  subtitle?: string;
}

// Drawer view states
// Only menu view now - chats are shown directly

function MenuItem({ icon, label, onPress, isLast = false, subtitle }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
      })}
    >
      <View className="flex-row items-center px-5 py-4">
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color="#9CA3AF" />
        </View>
        <View className="ml-3 flex-1">
          <Text
            className="text-base font-medium"
            style={{ color: "#E5E7EB" }}
          >
            {label}
          </Text>
          {subtitle && (
            <Text
              className="text-xs mt-0.5"
              style={{ color: "#6B7280" }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#4B5563" />
      </View>
    </Pressable>
  );
}

interface ChatListItemProps {
  loop: KlarityLoop;
  onPress: () => void;
  isLast?: boolean;
}

function ChatListItem({ loop, onPress, isLast = false }: ChatListItemProps) {
  // Get emotional theme from first user message or title
  const getPreview = () => {
    const userMessages = loop.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0];
      // Check if message has an image
      const hasImage = !!(firstMessage as any).imageUrl || !!(firstMessage as any).imageBase64;
      const content = firstMessage.content;

      // If it's just "[Image]" placeholder and has an actual image, return null to show icon instead
      if (content === "[Image]" && hasImage) {
        return null; // Will show image icon instead
      }

      // Remove [Image] from content if there's other text
      const cleanContent = content.replace(/\[Image\]/gi, "").trim();
      if (cleanContent) {
        return cleanContent.length > 60
          ? cleanContent.substring(0, 60) + "..."
          : cleanContent;
      }

      // Fallback if only [Image] with no actual image data
      if (hasImage) {
        return null; // Will show image icon instead
      }

      return firstMessage.content.length > 60
        ? firstMessage.content.substring(0, 60) + "..."
        : firstMessage.content;
    }
    return "No messages yet";
  };

  // Check if first message has an image
  const hasImageAttachment = () => {
    const userMessages = loop.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0];
      return !!(firstMessage as any).imageUrl || !!(firstMessage as any).imageBase64;
    }
    return false;
  };

  // Format date relative
  const formatDate = (dateStr: string) => {
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
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const preview = getPreview();
  const showImageIcon = preview === null && hasImageAttachment();

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
      })}
    >
      <View className="px-5 py-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className="text-sm font-medium flex-1 mr-2"
            style={{ color: "#E5E7EB" }}
            numberOfLines={1}
          >
            {loop.title}
          </Text>
          <Text className="text-xs" style={{ color: "#6B7280" }}>
            {formatDate(loop.updatedAt)}
          </Text>
        </View>
        {showImageIcon ? (
          <View className="flex-row items-center">
            <Ionicons name="image-outline" size={14} color="#9CA3AF" />
            <Text
              className="text-xs ml-1"
              style={{ color: "#9CA3AF" }}
            >
              Image conversation
            </Text>
          </View>
        ) : (
          <Text
            className="text-xs"
            style={{ color: "#9CA3AF" }}
            numberOfLines={2}
          >
            {preview}
          </Text>
        )}
        {loop.emotionalClarity !== undefined && (
          <View className="flex-row items-center mt-2">
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  loop.emotionalClarity >= 70
                    ? "#10B981"
                    : loop.emotionalClarity >= 40
                    ? "#F59E0B"
                    : "#EF4444",
                marginRight: 6,
              }}
            />
            <Text className="text-xs" style={{ color: "#6B7280" }}>
              {loop.emotionalClarity}% clarity
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// Shared animated value for parent components to sync with drawer animation
import { makeMutable } from "react-native-reanimated";

export const drawerProgress = makeMutable(0);

export function SlideOverDrawer({ visible, onClose }: SlideOverDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [isRendered, setIsRendered] = useState(false);

  // Store
  const loops = useLoopsStore((s) => s.loops);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);

  // Animation config - ChatGPT-style smooth easing
  const ANIMATION_DURATION = 300;
  const EASING = Easing.bezier(0.32, 0.72, 0, 1);

  // Filter loops based on search query
  const filteredLoops = useMemo(() => {
    if (!searchQuery.trim()) return loops;

    const query = searchQuery.toLowerCase();
    return loops.filter((loop) => {
      // Search in title
      if (loop.title.toLowerCase().includes(query)) return true;

      // Search in messages
      return loop.messages.some(
        (msg) =>
          msg.role === "user" && msg.content.toLowerCase().includes(query)
      );
    });
  }, [loops, searchQuery]);

  // Reset search when drawer closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setSearchQuery("");
      }, 300);
    }
  }, [visible]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      drawerProgress.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    } else {
      drawerProgress.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      }, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
    }
  }, [visible]);

  // Handle back button on Android
  useEffect(() => {
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

  // Close drawer helper
  const closeDrawer = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Swipe gesture to close
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(-20)
    .onUpdate((event) => {
      if (event.translationX < 0) {
        // Map translation to drawerProgress (0 to 1)
        const newProgress = 1 + (event.translationX / DRAWER_WIDTH);
        drawerProgress.value = Math.max(0, Math.min(1, newProgress));
      }
    })
    .onEnd((event) => {
      if (event.translationX < -80 || event.velocityX < -500) {
        drawerProgress.value = withTiming(0, {
          duration: 250,
          easing: EASING,
        });
        runOnJS(closeDrawer)();
      } else {
        drawerProgress.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  // Animated styles - Drawer slides in from left
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drawerProgress.value, [0, 1], [-DRAWER_WIDTH, 0], Extrapolation.CLAMP) },
    ],
  }));

  // Backdrop style - controls both opacity and pointer events
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: drawerProgress.value,
  }));

  // Menu handlers
  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDrawer();
    // Create new loop and navigate to input
    setTimeout(() => {
      createNewLoop();
      navigation.navigate("InputScreen" as never);
    }, 100);
  };

  const handleSelectChat = (loopId: string) => {
    Haptics.selectionAsync();
    closeDrawer();
    setTimeout(() => {
      switchToLoop(loopId);
      navigation.navigate("ChatScreen" as never);
    }, 100);
  };

  // Don't render if not visible and animation completed
  if (!visible && !isRendered) {
    return null;
  }

  // Check if we're actively searching
  const isSearching = searchQuery.trim().length > 0;

  // Render header
  const renderHeader = () => {
    return (
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        {/* Klarity Branding */}
        <View className="flex-row items-center mb-4">
          <Text className="text-xl font-semibold" style={{ color: "#F9FAFB" }}>
            Klarity
          </Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center">
          <View
            className="flex-row items-center flex-1 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
          >
            <Ionicons name="search" size={18} color="#6B7280" />
            <TextInput
              className="flex-1 ml-2 text-base"
              style={{ color: "#E5E7EB" }}
              placeholder="Search chats..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} className="active:opacity-60">
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </Pressable>
            )}
          </View>

          {/* New Chat Button - matches Header style */}
          <Pressable
            onPress={handleNewChat}
            className="active:opacity-60 ml-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 0,
                  right: 0,
                  bottom: 4,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={12} color="#9CA3AF" />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render content
  const renderContent = () => {
    // If user is searching, show search results
    if (isSearching) {
      if (filteredLoops.length === 0) {
        return (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="search-outline" size={48} color="#4B5563" />
            <Text
              className="text-base font-medium mt-4 text-center"
              style={{ color: "#9CA3AF" }}
            >
              No chats found
            </Text>
            <Text
              className="text-sm mt-2 text-center"
              style={{ color: "#6B7280" }}
            >
              Try different keywords or phrases
            </Text>
          </View>
        );
      }

      return (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 py-3">
            <Text className="text-xs font-medium" style={{ color: "#6B7280" }}>
              {filteredLoops.length} result{filteredLoops.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {filteredLoops.map((loop, index) => (
            <ChatListItem
              key={loop.id}
              loop={loop}
              onPress={() => handleSelectChat(loop.id)}
              isLast={index === filteredLoops.length - 1}
            />
          ))}
          <View style={{ height: insets.bottom + 100 }} />
        </ScrollView>
      );
    }

    // Default view (not searching) - show menu and past chats
    return (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Past Chats - show directly if available */}
          {loops.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View className="px-5 pb-2">
                <Text className="text-xs font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>
                  Recent
                </Text>
              </View>
              {loops.map((loop, index) => (
                <ChatListItem
                  key={loop.id}
                  loop={loop}
                  onPress={() => handleSelectChat(loop.id)}
                  isLast={index === loops.length - 1}
                />
              ))}
            </View>
          )}
          <View style={{ height: insets.bottom + 100 }} />
        </ScrollView>
    );
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
      pointerEvents={visible || isRendered ? "box-none" : "none"}
    >
      {/* Backdrop - tappable area to close with animated opacity */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              backgroundColor: "#171717",
            },
            drawerStyle,
          ]}
        >
          {/* Dynamic Header */}
          {renderHeader()}

          {/* Dynamic Content */}
          <View style={{ flex: 1 }}>{renderContent()}</View>

          {/* Footer - only show when not searching */}
          {!isSearching && (
            <View
              style={{
                position: "absolute",
                bottom: insets.bottom + 20,
                left: 0,
                right: 0,
                paddingHorizontal: 20,
              }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="active:opacity-70"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: 12,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={18} color="#9CA3AF" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      className="text-sm font-medium"
                      style={{ color: "#E5E7EB" }}
                    >
                      Personal
                    </Text>
                    <Text className="text-xs" style={{ color: "#6B7280" }}>
                      Free Plan
                    </Text>
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
                </View>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
