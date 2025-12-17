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
import { KlarityLoop } from "../types/loop";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

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
type DrawerView = "menu" | "chats";

function MenuItem({ icon, label, onPress, isLast = false, subtitle }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
      })}
    >
      <View
        className="flex-row items-center px-5 py-4"
        style={{
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: "rgba(255, 255, 255, 0.06)",
        }}
      >
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
      const firstMessage = userMessages[0].content;
      return firstMessage.length > 60
        ? firstMessage.substring(0, 60) + "..."
        : firstMessage;
    }
    return "No messages yet";
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

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
      })}
    >
      <View
        className="px-5 py-3"
        style={{
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: "rgba(255, 255, 255, 0.06)",
        }}
      >
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
        <Text
          className="text-xs"
          style={{ color: "#9CA3AF" }}
          numberOfLines={2}
        >
          {getPreview()}
        </Text>
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

export function SlideOverDrawer({ visible, onClose }: SlideOverDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // View state
  const [currentView, setCurrentView] = useState<DrawerView>("menu");
  const [searchQuery, setSearchQuery] = useState("");

  // Store
  const loops = useLoopsStore((s) => s.loops);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);

  // Animation values
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  // Animation config
  const ANIMATION_DURATION = 280;
  const EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

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

  // Reset view when drawer closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setCurrentView("menu");
        setSearchQuery("");
      }, 300);
    }
  }, [visible]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
      backdropOpacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    }
  }, [visible]);

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (visible) {
          if (currentView !== "menu") {
            setCurrentView("menu");
            setSearchQuery("");
          } else {
            onClose();
          }
          return true;
        }
        return false;
      }
    );
    return () => backHandler.remove();
  }, [visible, currentView, onClose]);

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
        translateX.value = Math.max(event.translationX, -DRAWER_WIDTH);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -80 || event.velocityX < -500) {
        translateX.value = withTiming(-DRAWER_WIDTH, {
          duration: 200,
          easing: EASING,
        });
        backdropOpacity.value = withTiming(0, {
          duration: 200,
          easing: EASING,
        });
        runOnJS(closeDrawer)();
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

  // Menu handlers
  const handleNewChat = () => {
    closeDrawer();
    // Create new loop and navigate to input
    setTimeout(() => {
      createNewLoop();
      navigation.navigate("InputScreen" as never);
    }, 100);
  };

  const handleCalendar = () => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate("CalendarScreen" as never);
    }, 100);
  };

  const handleYourChats = () => {
    setCurrentView("chats");
  };

  const handleSelectChat = (loopId: string) => {
    closeDrawer();
    setTimeout(() => {
      switchToLoop(loopId);
      navigation.navigate("ChatScreen" as never);
    }, 100);
  };

  const handleBackToMenu = () => {
    setCurrentView("menu");
    setSearchQuery("");
  };

  if (!visible && translateX.value === -DRAWER_WIDTH) {
    return null;
  }

  // Check if we're actively searching
  const isSearching = searchQuery.trim().length > 0;

  // Render header based on current view
  const renderHeader = () => {
    if (currentView === "menu") {
      return (
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 0.5,
            borderBottomColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Text className="text-xl font-semibold" style={{ color: "#F9FAFB" }}>
            Klarity
          </Text>
          <Text className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Find your clarity
          </Text>

          {/* Search Bar */}
          <View className="flex-row items-center mt-4">
            <View
              className="flex-row items-center flex-1 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
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

            {/* New Chat Button */}
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
    }

    // Chats view header (search view is no longer used separately)
    return (
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={handleBackToMenu}
            className="active:opacity-60 mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
          </Pressable>
          <Text className="text-lg font-semibold" style={{ color: "#F9FAFB" }}>
            Your Chats
          </Text>
        </View>
      </View>
    );
  };

  // Render content based on current view
  const renderContent = () => {
    // If user is searching in the menu view, show search results
    if (currentView === "menu" && isSearching) {
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

    // Default menu view (not searching)
    if (currentView === "menu") {
      return (
        <View style={{ marginTop: 8 }}>
          <MenuItem
            icon="add-outline"
            label="New Chat"
            subtitle="Start a fresh conversation"
            onPress={handleNewChat}
          />
          <MenuItem
            icon="calendar-outline"
            label="Calendar"
            subtitle="View emotional timeline"
            onPress={handleCalendar}
          />
          <MenuItem
            icon="chatbubbles-outline"
            label="Your Chats"
            subtitle={`${loops.length} conversation${loops.length !== 1 ? "s" : ""}`}
            onPress={handleYourChats}
            isLast
          />
        </View>
      );
    }

    // Chats view - show list of all loops
    if (loops.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={48} color="#4B5563" />
          <Text
            className="text-base font-medium mt-4 text-center"
            style={{ color: "#9CA3AF" }}
          >
            No conversations yet
          </Text>
          <Text
            className="text-sm mt-2 text-center"
            style={{ color: "#6B7280" }}
          >
            Start a new chat to begin
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
        {loops.map((loop, index) => (
          <ChatListItem
            key={loop.id}
            loop={loop}
            onPress={() => handleSelectChat(loop.id)}
            isLast={index === loops.length - 1}
          />
        ))}
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
              backgroundColor: "#0A0A0C",
              borderRightWidth: 0.5,
              borderRightColor: "rgba(255, 255, 255, 0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 4, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10,
            },
            drawerStyle,
          ]}
        >
          {/* Dynamic Header */}
          {renderHeader()}

          {/* Dynamic Content */}
          <View style={{ flex: 1 }}>{renderContent()}</View>

          {/* Footer - only show on menu view when not searching */}
          {currentView === "menu" && !isSearching && (
            <View
              style={{
                position: "absolute",
                bottom: insets.bottom + 20,
                left: 0,
                right: 0,
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 12,
                  borderWidth: 0.5,
                  borderColor: "rgba(255, 255, 255, 0.06)",
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(167, 139, 250, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person-outline" size={18} color="#A78BFA" />
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
              </View>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
