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
import { KlarityLoop, TrackedRelationship } from "../types/loop";
import { KlarityOrb } from "./KlarityOrb";
import { PersonTimelineDrawer } from "./PersonTimelineDrawer";

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

interface PersonItemProps {
  relationship: TrackedRelationship;
  timelineCount: number;
  onPress: () => void;
}

function PersonItem({ relationship, timelineCount, onPress }: PersonItemProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get color based on relationship type
  const getTypeColor = (type?: string) => {
    switch (type) {
      case "family":
        return "#F59E0B";
      case "romantic":
        return "#EF4444";
      case "friend":
        return "#10B981";
      case "work":
        return "#3B82F6";
      default:
        return "#8B5CF6";
    }
  };

  const color = getTypeColor(relationship.relationshipType);

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
      })}
    >
      <View className="flex-row items-center px-5 py-3">
        {/* Avatar */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${color}20`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color }}
          >
            {getInitials(relationship.name)}
          </Text>
        </View>

        {/* Name and timeline count */}
        <View className="ml-3 flex-1">
          <Text
            className="text-sm font-medium"
            style={{ color: "#E5E7EB" }}
            numberOfLines={1}
          >
            {relationship.name}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
            {timelineCount > 0
              ? `${timelineCount} insight${timelineCount !== 1 ? "s" : ""}`
              : "Tap to view timeline"}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons name="time-outline" size={18} color="#6B7280" />
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

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState<TrackedRelationship | null>(null);
  const [timelineDrawerVisible, setTimelineDrawerVisible] = useState(false);

  // Store
  const loops = useLoopsStore((s) => s.loops);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);
  const trackedRelationships = useLoopsStore((s) => s.trackedRelationships);
  const getTimelineForRelationship = useLoopsStore((s) => s.getTimelineForRelationship);

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

  const handleSelectChat = (loopId: string) => {
    closeDrawer();
    setTimeout(() => {
      switchToLoop(loopId);
      navigation.navigate("ChatScreen" as never);
    }, 100);
  };

  const handleRelationshipGrowth = () => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate("RelationshipGrowthScreen" as never);
    }, 100);
  };

  const handleOpenPersonTimeline = (relationship: TrackedRelationship) => {
    setSelectedRelationship(relationship);
    setTimelineDrawerVisible(true);
  };

  const handleCloseTimelineDrawer = () => {
    setTimelineDrawerVisible(false);
    setTimeout(() => {
      setSelectedRelationship(null);
    }, 300);
  };

  if (!visible && translateX.value === -DRAWER_WIDTH) {
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
        {/* Search Bar */}
        <View className="flex-row items-center">
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

        {/* Klarity Branding */}
        <View className="flex-row items-center mt-4">
          <KlarityOrb size="small" />
          <Text className="text-lg font-semibold ml-2" style={{ color: "#F9FAFB" }}>
            Klarity
          </Text>
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
          <View style={{ marginTop: 8 }}>
            <MenuItem
              icon="heart-outline"
              label="Relationship Growth"
              subtitle="Track patterns over time"
              onPress={handleRelationshipGrowth}
              isLast={trackedRelationships.length === 0 && loops.length === 0}
            />
          </View>

          {/* People with Reply Timelines */}
          {trackedRelationships.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View className="px-5 pb-2">
                <Text className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  PEOPLE
                </Text>
              </View>
              {trackedRelationships.map((relationship) => {
                const timeline = getTimelineForRelationship(relationship.id);
                return (
                  <PersonItem
                    key={relationship.id}
                    relationship={relationship}
                    timelineCount={timeline.length}
                    onPress={() => handleOpenPersonTimeline(relationship)}
                  />
                );
              })}
            </View>
          )}

          {/* Past Chats - show directly if available */}
          {loops.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View className="px-5 pb-2">
                <Text className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  PAST CHATS
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 12,
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

      {/* Person Timeline Drawer */}
      <PersonTimelineDrawer
        visible={timelineDrawerVisible}
        relationship={selectedRelationship}
        onClose={handleCloseTimelineDrawer}
      />
    </View>
  );
}
