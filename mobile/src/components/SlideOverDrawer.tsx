import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  BackHandler,
  ScrollView,
  Keyboard,
  Animated,
  Easing,
  PanResponder,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";
import * as ContextMenu from "zeego/context-menu";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityLoop } from "../types/loop";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
import { ThemeColors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Constants
export const DRAWER_WIDTH = SCREEN_WIDTH * 0.80;

// Swipe action constants
const SWIPE_THRESHOLD = 80;
const ACTION_BUTTON_WIDTH = 70;

interface SlideOverDrawerProps {
  visible: boolean;
  onClose: () => void;
  drawerProgress: Animated.Value; // Shared animation value for coordinated animations
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

interface ContextMenuChatListItemProps {
  loop: KlarityLoop;
  onPress: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onPin: () => void;
  isLast?: boolean;
  isActive?: boolean;
  isPendingDelete?: boolean;
  colors: ThemeColors;
}

function ContextMenuChatListItem({
  loop,
  onPress,
  onDelete,
  onArchive,
  onPin,
  isLast = false,
  isActive = false,
  isPendingDelete = false,
  colors
}: ContextMenuChatListItemProps) {
  // Hooks must be called unconditionally (before any early return)
  const handlePin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Pin doesn't remove the item, so it's safe to execute immediately
    // But still defer slightly for smooth UX
    setTimeout(() => {
      onPin();
    }, 50);
  }, [onPin]);

  const handleArchive = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Step 1 of 2-step archive: just notify parent, don't mutate yet
    onArchive();
  }, [onArchive]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Step 1 of 2-step delete: just notify parent, don't mutate yet
    onDelete();
  }, [onDelete]);

  // If pending delete, render a fading-out placeholder to prevent unmount during animation
  if (isPendingDelete) {
    return (
      <View
        style={{
          backgroundColor: isActive ? colors.drawerItemActive : "transparent",
          borderRadius: isActive ? 12 : 0,
          marginHorizontal: isActive ? 8 : 0,
          marginVertical: isActive ? 4 : 0,
          opacity: 0.5,
        }}
      >
        <View className="px-5 py-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-sm font-medium flex-1 mr-2"
              style={{ color: colors.drawerItemText }}
              numberOfLines={1}
            >
              {loop.title}
            </Text>
          </View>
          <Text
            className="text-xs"
            style={{ color: colors.textSecondary }}
          >
            Deleting...
          </Text>
        </View>
      </View>
    );
  }

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

      const cleanContent = content.replace(/\[Image\]/gi, "").replace(/\[Screenshot shared\]/gi, "").trim();
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
    <View
      style={{
        backgroundColor: isActive ? colors.drawerItemActive : "transparent",
        borderRadius: isActive ? 12 : 0,
        marginHorizontal: isActive ? 8 : 0,
        marginVertical: isActive ? 4 : 0,
      }}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Pressable
            onPress={onPress}
            className="active:opacity-60"
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.surfaceElevated : "transparent",
              borderRadius: isActive ? 12 : 0,
            })}
          >
          <View className="px-5 py-3">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1 mr-2">
                {loop.isPinned && (
                  <View className="mr-1.5">
                    <Ionicons name="pin" size={12} color={colors.warning} />
                  </View>
                )}
                <Text
                  className="text-sm font-medium flex-1"
                  style={{ color: colors.drawerItemText }}
                  numberOfLines={1}
                >
                  {loop.title}
                </Text>
              </View>
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                {formatDate(loop.updatedAt)}
              </Text>
            </View>
            {showImageIcon ? (
              <View className="flex-row items-center">
                <Ionicons name="image-outline" size={14} color={colors.textSecondary} />
                <Text
                  className="text-xs ml-1"
                  style={{ color: colors.textSecondary }}
                >
                  Image conversation
                </Text>
              </View>
            ) : (
              <Text
                className="text-xs"
                style={{ color: colors.textSecondary }}
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
                        ? colors.success
                        : loop.emotionalClarity >= 40
                        ? colors.warning
                        : colors.error,
                    marginRight: 6,
                  }}
                />
                <Text className="text-xs" style={{ color: colors.textTertiary }}>
                  {loop.emotionalClarity}% clarity
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item key="pin" onSelect={handlePin}>
          <ContextMenu.ItemIcon
            ios={{
              name: loop.isPinned ? "pin.slash" : "pin",
              pointSize: 18,
            }}
          />
          <ContextMenu.ItemTitle>
            {loop.isPinned ? "Unpin" : "Pin to Top"}
          </ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key="archive" onSelect={handleArchive}>
          <ContextMenu.ItemIcon
            ios={{
              name: "archivebox",
              pointSize: 18,
            }}
          />
          <ContextMenu.ItemTitle>Archive</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key="delete" onSelect={handleDelete} destructive>
          <ContextMenu.ItemIcon
            ios={{
              name: "trash",
              pointSize: 18,
            }}
          />
          <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
    </View>
  );
}

interface SwipeableChatListItemProps {
  loop: KlarityLoop;
  onPress: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isLast?: boolean;
  isActive?: boolean;
}

function SwipeableChatListItem({ loop, onPress, onDelete, onArchive, isLast = false, isActive = false }: SwipeableChatListItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpenRef = useRef(false);

  // Background color based on active state
  const bgColor = isActive ? "#000000" : "#171717";

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

      const cleanContent = content.replace(/\[Image\]/gi, "").replace(/\[Screenshot shared\]/gi, "").trim();
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
      {/* Action buttons behind the item - hide for active item */}
      {!isActive && (
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
      )}

      {/* Swipeable content */}
      <Animated.View
        style={{
          backgroundColor: bgColor,
          transform: [{ translateX }],
          borderRadius: isActive ? 12 : 0,
          marginHorizontal: isActive ? 8 : 0,
          marginVertical: isActive ? 4 : 0,
        }}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={handlePress}
          className="active:opacity-60"
          style={({ pressed }) => ({
            backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : bgColor,
            borderRadius: isActive ? 12 : 0,
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

      const cleanContent = content.replace(/\[Image\]/gi, "").replace(/\[Screenshot shared\]/gi, "").trim();
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

export function SlideOverDrawer({ visible, onClose, drawerProgress }: SlideOverDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();

  // State
  const [isRendered, setIsRendered] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);

  // 2-step delete/archive state - prevents crash during context menu close animation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);

  // Store
  const loops = useLoopsStore((s) => s.loops);
  const archivedLoops = useLoopsStore((s) => s.archivedLoops);
  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);
  const deleteLoop = useLoopsStore((s) => s.deleteLoop);
  const archiveLoop = useLoopsStore((s) => s.archiveLoop);
  const unarchiveLoop = useLoopsStore((s) => s.unarchiveLoop);
  const deleteArchivedLoop = useLoopsStore((s) => s.deleteArchivedLoop);
  const togglePinLoop = useLoopsStore((s) => s.togglePinLoop);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Step 2: Execute pending delete after context menu fully closes (300ms delay)
  useEffect(() => {
    if (pendingDeleteId) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          try {
            deleteLoop(pendingDeleteId);
          } catch (error) {
            console.error('[SlideOverDrawer] Delete failed:', error);
          }
          setPendingDeleteId(null);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingDeleteId, deleteLoop]);

  // Step 2: Execute pending archive after context menu fully closes (300ms delay)
  useEffect(() => {
    if (pendingArchiveId) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          try {
            archiveLoop(pendingArchiveId);
          } catch (error) {
            console.error('[SlideOverDrawer] Archive failed:', error);
          }
          setPendingArchiveId(null);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingArchiveId, archiveLoop]);

  // Step 1: Mark for delete - does NOT mutate list yet, just sets pending state
  const handleSafeDelete = useCallback((loopId: string) => {
    if (!isMountedRef.current) return;
    setPendingDeleteId(loopId);
  }, []);

  // Step 1: Mark for archive - does NOT mutate list yet, just sets pending state
  const handleSafeArchive = useCallback((loopId: string) => {
    if (!isMountedRef.current) return;
    setPendingArchiveId(loopId);
  }, []);

  // Sort loops: pinned first, then by updatedAt
  const sortedLoops = useMemo(() => {
    return [...loops].sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by updatedAt (most recent first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [loops]);

  // Animation config
  const ANIMATION_DURATION = 300;
  const EASING_BEZIER = Easing.bezier(0.32, 0.72, 0, 1);

  // Reset account page when drawer closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setShowAccountPage(false);
      }, 300);
    }
  }, [visible]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Dismiss keyboard when drawer opens
      Keyboard.dismiss();
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

  // Drawer slides in from left
  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
    extrapolate: "clamp",
  });

  // Backdrop opacity
  const backdropOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  // Don't render if not visible and animation completed
  if (!visible && !isRendered) {
    return null;
  }

  // Handle Deep Search navigation
  const handleDeepSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDrawer();
    setTimeout(() => {
      createNewLoop();
      // Navigate to ChatScreen with person context card to trigger Deep Search flow
      (navigation as any).navigate("ChatScreen", { showPersonContextCard: true });
    }, 100);
  };

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
          <Text className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
            Klarity
          </Text>
        </View>

        <View className="flex-row items-center">
          <Pressable
            onPress={handleDeepSearch}
            className="flex-row items-center flex-1 px-3 py-2.5 rounded-xl active:opacity-70"
            style={{ backgroundColor: colors.surfaceElevated }}
          >
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <Text
              className="flex-1 ml-2 text-base"
              style={{ color: colors.textTertiary }}
            >
              Chat Search...
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNewChat}
            className="active:opacity-60 ml-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.textSecondary} />
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
                <Ionicons name="add" size={12} color={colors.textSecondary} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render content
  const renderContent = () => {
    const pinnedLoops = sortedLoops.filter((loop) => loop.isPinned);
    const unpinnedLoops = sortedLoops.filter((loop) => !loop.isPinned);

    return (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {pinnedLoops.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View className="px-5 pb-2">
                <Text className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.warning }}>
                  Pinned
                </Text>
              </View>
              {pinnedLoops.map((loop, index) => (
                <ContextMenuChatListItem
                  key={loop.id}
                  loop={loop}
                  onPress={() => handleSelectChat(loop.id)}
                  onDelete={() => handleSafeDelete(loop.id)}
                  onArchive={() => handleSafeArchive(loop.id)}
                  onPin={() => togglePinLoop(loop.id)}
                  isLast={index === pinnedLoops.length - 1}
                  isActive={loop.id === activeLoopId}
                  isPendingDelete={pendingDeleteId === loop.id || pendingArchiveId === loop.id}
                  colors={colors}
                />
              ))}
            </View>
          )}
          {unpinnedLoops.length > 0 && (
            <View style={{ marginTop: pinnedLoops.length > 0 ? 16 : 8 }}>
              <View className="px-5 pb-2">
                <Text className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                  Recent
                </Text>
              </View>
              {unpinnedLoops.map((loop, index) => (
                <ContextMenuChatListItem
                  key={loop.id}
                  loop={loop}
                  onPress={() => handleSelectChat(loop.id)}
                  onDelete={() => handleSafeDelete(loop.id)}
                  onArchive={() => handleSafeArchive(loop.id)}
                  onPin={() => togglePinLoop(loop.id)}
                  isLast={index === unpinnedLoops.length - 1}
                  isActive={loop.id === activeLoopId}
                  isPendingDelete={pendingDeleteId === loop.id || pendingArchiveId === loop.id}
                  colors={colors}
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
      pointerEvents={visible || isRendered ? "auto" : "none"}
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000",
          opacity: backdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: colors.drawerBackground,
          transform: [{ translateX: drawerTranslateX }],
        }}
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
                  <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                </Pressable>
                <Text className="text-xl font-semibold ml-3" style={{ color: colors.textPrimary }}>
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
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.buttonBackground,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={24} color={colors.textSecondary} />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text
                    className="text-base font-semibold"
                    style={{ color: colors.drawerItemText }}
                  >
                    Personal
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textTertiary }}>
                    Free Plan
                  </Text>
                </View>
              </View>
            </View>

            {/* Legal Links */}
            <View className="px-5 py-2">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  closeDrawer();
                  setTimeout(() => {
                    navigation.navigate("LegalScreen", { tab: "terms" });
                  }, 100);
                }}
                className="active:opacity-60"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.textTertiary} />
                <Text className="text-sm ml-3" style={{ color: "#9CA3AF" }}>
                  Terms of Service
                </Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={16} color="#4B5563" />
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  closeDrawer();
                  setTimeout(() => {
                    navigation.navigate("LegalScreen", { tab: "privacy" });
                  }, 100);
                }}
                className="active:opacity-60"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 12,
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
                <Text className="text-sm ml-3" style={{ color: "#9CA3AF" }}>
                  Privacy Policy
                </Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={16} color="#4B5563" />
              </Pressable>
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
            {/* Settings and Account Row */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: insets.bottom + 20,
                backgroundColor: colors.drawerBackground,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                }}
              >
              {/* Settings Button */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  closeDrawer();
                  setTimeout(() => {
                    navigation.navigate("SettingsScreen");
                  }, 100);
                }}
                className="active:opacity-70"
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
                <Text
                  className="text-sm font-medium ml-2"
                  style={{ color: colors.textSecondary }}
                >
                  Settings
                </Text>
              </Pressable>

              {/* Account Button */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAccountPage(true);
                }}
                className="active:opacity-70"
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 12,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.buttonBackground,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={14} color={colors.textSecondary} />
                  </View>
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text
                      className="text-xs font-medium"
                      style={{ color: colors.drawerItemText }}
                      numberOfLines={1}
                    >
                      Account
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                </View>
              </Pressable>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}
