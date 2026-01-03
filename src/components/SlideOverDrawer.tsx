import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  BackHandler,
  TextInput,
  ScrollView,
  Keyboard,
  Animated,
  Easing,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityLoop } from "../types/loop";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Constants for the ChatGPT-style effect (exported for parent use)
export const DRAWER_WIDTH = SCREEN_WIDTH * 0.80;
export const MAIN_CONTENT_TRANSLATE = DRAWER_WIDTH;
export const MAIN_CONTENT_SCALE = 0.88;
export const MAIN_CONTENT_BORDER_RADIUS = 20;

// Swipe action constants
const SWIPE_THRESHOLD = 80;
const ACTION_BUTTON_WIDTH = 70;

interface SlideOverDrawerProps {
  visible: boolean;
  onClose: () => void;
  drawerProgress?: Animated.Value; // Optional external animation value for coordinated animations
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
  subtitle?: string;
}

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

interface SwipeableChatListItemProps {
  loop: KlarityLoop;
  onPress: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isLast?: boolean;
}

function SwipeableChatListItem({ loop, onPress, onDelete, onArchive, isLast = false }: SwipeableChatListItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpenRef = useRef(false);

  // Get emotional theme from first user message or title
  const getPreview = () => {
    const userMessages = loop.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0];
      const hasImage = !!(firstMessage as any).imageUrl || !!(firstMessage as any).imageBase64;
      const content = firstMessage.content;

      if (content === "[Image]" && hasImage) {
        return null;
      }

      const cleanContent = content.replace(/\[Image\]/gi, "").trim();
      if (cleanContent) {
        return cleanContent.length > 60
          ? cleanContent.substring(0, 60) + "..."
          : cleanContent;
      }

      if (hasImage) {
        return null;
      }

      return firstMessage.content.length > 60
        ? firstMessage.content.substring(0, 60) + "..."
        : firstMessage.content;
    }
    return "No messages yet";
  };

  const hasImageAttachment = () => {
    const userMessages = loop.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0];
      return !!(firstMessage as any).imageUrl || !!(firstMessage as any).imageBase64;
    }
    return false;
  };

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -(ACTION_BUTTON_WIDTH * 2 + 8)));
        } else if (isSwipeOpenRef.current) {
          translateX.setValue(Math.min(0, -(ACTION_BUTTON_WIDTH * 2 + 8) + gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD && !isSwipeOpenRef.current) {
          Animated.spring(translateX, {
            toValue: -(ACTION_BUTTON_WIDTH * 2 + 8),
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
          isSwipeOpenRef.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (gestureState.dx > SWIPE_THRESHOLD && isSwipeOpenRef.current) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
          isSwipeOpenRef.current = false;
        } else {
          if (isSwipeOpenRef.current) {
            Animated.spring(translateX, {
              toValue: -(ACTION_BUTTON_WIDTH * 2 + 8),
              useNativeDriver: true,
              damping: 20,
              stiffness: 300,
            }).start();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 300,
            }).start();
          }
        }
      },
    })
  ).current;

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    isSwipeOpenRef.current = false;
    onDelete();
  }, [onDelete]);

  const handleArchive = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    isSwipeOpenRef.current = false;
    onArchive();
  }, [onArchive]);

  const handlePress = useCallback(() => {
    if (isSwipeOpenRef.current) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 300,
      }).start();
      isSwipeOpenRef.current = false;
    } else {
      onPress();
    }
  }, [onPress]);

  return (
    <View style={{ position: "relative", overflow: "hidden" }}>
      {/* Action buttons behind the item */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          flexDirection: "row",
          alignItems: "center",
          paddingRight: 4,
        }}
      >
        <Pressable
          onPress={handleArchive}
          style={{
            width: ACTION_BUTTON_WIDTH,
            height: "100%",
            backgroundColor: "#3B82F6",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            marginRight: 4,
          }}
        >
          <Ionicons name="archive-outline" size={20} color="#FFF" />
          <Text style={{ color: "#FFF", fontSize: 10, marginTop: 2 }}>Archive</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={{
            width: ACTION_BUTTON_WIDTH,
            height: "100%",
            backgroundColor: "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#FFF" />
          <Text style={{ color: "#FFF", fontSize: 10, marginTop: 2 }}>Delete</Text>
        </Pressable>
      </View>

      {/* Swipeable content */}
      <Animated.View
        style={{ backgroundColor: "#171717", transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={handlePress}
          className="active:opacity-60"
          style={({ pressed }) => ({
            backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "#171717",
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
      </Animated.View>
    </View>
  );
}

interface ChatListItemProps {
  loop: KlarityLoop;
  onPress: () => void;
  isLast?: boolean;
}

function ChatListItem({ loop, onPress, isLast = false }: ChatListItemProps) {
  const getPreview = () => {
    const userMessages = loop.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0];
      const hasImage = !!(firstMessage as any).imageUrl || !!(firstMessage as any).imageBase64;
      const content = firstMessage.content;

      if (content === "[Image]" && hasImage) {
        return null;
      }

      const cleanContent = content.replace(/\[Image\]/gi, "").trim();
      if (cleanContent) {
        return cleanContent.length > 60
          ? cleanContent.substring(0, 60) + "..."
          : cleanContent;
      }

      if (hasImage) {
        return null;
      }

      return firstMessage.content.length > 60
        ? firstMessage.content.substring(0, 60) + "..."
        : firstMessage.content;
    }
    return "No messages yet";
  };

  const hasImageAttachment = () => {
    const userMessages = loop.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0];
      return !!(firstMessage as any).imageUrl || !!(firstMessage as any).imageBase64;
    }
    return false;
  };

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

export function SlideOverDrawer({ visible, onClose, drawerProgress: externalDrawerProgress }: SlideOverDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [isRendered, setIsRendered] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);

  // Drawer animation progress - use external if provided, otherwise create internal
  const internalDrawerProgress = useRef(new Animated.Value(0)).current;
  const drawerProgress = externalDrawerProgress || internalDrawerProgress;

  // Store
  const loops = useLoopsStore((s) => s.loops);
  const archivedLoops = useLoopsStore((s) => s.archivedLoops);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);
  const deleteLoop = useLoopsStore((s) => s.deleteLoop);
  const archiveLoop = useLoopsStore((s) => s.archiveLoop);
  const unarchiveLoop = useLoopsStore((s) => s.unarchiveLoop);
  const deleteArchivedLoop = useLoopsStore((s) => s.deleteArchivedLoop);

  // Animation config
  const ANIMATION_DURATION = 300;
  const EASING_BEZIER = Easing.bezier(0.32, 0.72, 0, 1);

  // Filter loops based on search query
  const filteredLoops = useMemo(() => {
    if (!searchQuery.trim()) return loops;

    const query = searchQuery.toLowerCase();
    return loops.filter((loop) => {
      if (loop.title.toLowerCase().includes(query)) return true;
      return loop.messages.some(
        (msg) =>
          msg.role === "user" && msg.content.toLowerCase().includes(query)
      );
    });
  }, [loops, searchQuery]);

  // Reset search and account page when drawer closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setSearchQuery("");
        setShowAccountPage(false);
      }, 300);
    }
  }, [visible]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.timing(drawerProgress, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: EASING_BEZIER,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerProgress, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: EASING_BEZIER,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsRendered(false);
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

  // Swipe gesture to close using PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -20 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          const newProgress = 1 + (gestureState.dx / DRAWER_WIDTH);
          drawerProgress.setValue(Math.max(0, Math.min(1, newProgress)));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80 || gestureState.vx < -0.5) {
          Animated.timing(drawerProgress, {
            toValue: 0,
            duration: 250,
            easing: EASING_BEZIER,
            useNativeDriver: true,
          }).start();
          closeDrawer();
        } else {
          Animated.spring(drawerProgress, {
            toValue: 1,
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  // Animated styles - Drawer slides in from left
  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
    extrapolate: "clamp",
  });

  // Menu handlers
  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDrawer();
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
        <View className="flex-row items-center mb-4">
          <Text className="text-xl font-semibold" style={{ color: "#F9FAFB" }}>
            Klarity
          </Text>
        </View>

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
            <SwipeableChatListItem
              key={loop.id}
              loop={loop}
              onPress={() => handleSelectChat(loop.id)}
              onDelete={() => deleteLoop(loop.id)}
              onArchive={() => archiveLoop(loop.id)}
              isLast={index === filteredLoops.length - 1}
            />
          ))}
          <View style={{ height: insets.bottom + 100 }} />
        </ScrollView>
      );
    }

    return (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loops.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View className="px-5 pb-2">
                <Text className="text-xs font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>
                  Recent
                </Text>
              </View>
              {loops.map((loop, index) => (
                <SwipeableChatListItem
                  key={loop.id}
                  loop={loop}
                  onPress={() => handleSelectChat(loop.id)}
                  onDelete={() => deleteLoop(loop.id)}
                  onArchive={() => archiveLoop(loop.id)}
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
      {/* Backdrop */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          opacity: drawerProgress,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: "#171717",
          transform: [{ translateX: drawerTranslateX }],
        }}
        {...panResponder.panHandlers}
      >
        {showAccountPage ? (
          // Account Page with Archives
          <View style={{ flex: 1 }}>
            <View
              style={{
                paddingTop: insets.top + 16,
                paddingBottom: 16,
                paddingHorizontal: 20,
              }}
            >
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAccountPage(false);
                  }}
                  className="active:opacity-60"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
                </Pressable>
                <Text className="text-xl font-semibold ml-3" style={{ color: "#F9FAFB" }}>
                  Account
                </Text>
              </View>
            </View>

            <View className="px-5 py-4">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text
                    className="text-base font-semibold"
                    style={{ color: "#E5E7EB" }}
                  >
                    Personal
                  </Text>
                  <Text className="text-sm" style={{ color: "#6B7280" }}>
                    Free Plan
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View className="px-5 pb-2 pt-4">
                <View className="flex-row items-center">
                  <Ionicons name="archive-outline" size={16} color="#6B7280" />
                  <Text className="text-xs font-medium uppercase tracking-wider ml-2" style={{ color: "#6B7280" }}>
                    Archived Chats ({archivedLoops.length})
                  </Text>
                </View>
              </View>

              {archivedLoops.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8 py-12">
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="archive-outline" size={28} color="#4B5563" />
                  </View>
                  <Text
                    className="text-sm font-medium text-center"
                    style={{ color: "#9CA3AF" }}
                  >
                    No archived chats
                  </Text>
                  <Text
                    className="text-xs mt-2 text-center"
                    style={{ color: "#6B7280" }}
                  >
                    Swipe left on a chat to archive it
                  </Text>
                </View>
              ) : (
                <ScrollView
                  className="flex-1"
                  showsVerticalScrollIndicator={false}
                >
                  {archivedLoops.map((loop) => (
                    <View key={loop.id} style={{ position: "relative", overflow: "hidden" }}>
                      <View
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          flexDirection: "row",
                          alignItems: "center",
                          paddingRight: 4,
                        }}
                      >
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            unarchiveLoop(loop.id);
                          }}
                          style={{
                            width: ACTION_BUTTON_WIDTH,
                            height: "100%",
                            backgroundColor: "#10B981",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            marginRight: 4,
                          }}
                        >
                          <Ionicons name="arrow-undo-outline" size={20} color="#FFF" />
                          <Text style={{ color: "#FFF", fontSize: 10, marginTop: 2 }}>Restore</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            deleteArchivedLoop(loop.id);
                          }}
                          style={{
                            width: ACTION_BUTTON_WIDTH,
                            height: "100%",
                            backgroundColor: "#EF4444",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#FFF" />
                          <Text style={{ color: "#FFF", fontSize: 10, marginTop: 2 }}>Delete</Text>
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          unarchiveLoop(loop.id);
                          setShowAccountPage(false);
                        }}
                        className="active:opacity-60"
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "#171717",
                        })}
                      >
                        <View className="px-5 py-3">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text
                              className="text-sm font-medium flex-1 mr-2"
                              style={{ color: "#9CA3AF" }}
                              numberOfLines={1}
                            >
                              {loop.title}
                            </Text>
                            <View className="flex-row items-center">
                              <Pressable
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  unarchiveLoop(loop.id);
                                }}
                                className="active:opacity-60 mr-3"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="arrow-undo-outline" size={18} color="#10B981" />
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  deleteArchivedLoop(loop.id);
                                }}
                                className="active:opacity-60"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                              </Pressable>
                            </View>
                          </View>
                          <Text
                            className="text-xs"
                            style={{ color: "#6B7280" }}
                            numberOfLines={2}
                          >
                            {loop.messages.filter((m) => m.role === "user")[0]?.content?.substring(0, 60) || "No messages"}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  ))}
                  <View style={{ height: insets.bottom + 40 }} />
                </ScrollView>
              )}
            </View>
          </View>
        ) : (
          <>
            {renderHeader()}
            <View style={{ flex: 1 }}>{renderContent()}</View>
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
                    setShowAccountPage(true);
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
                    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                  </View>
                </Pressable>
              </View>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}
