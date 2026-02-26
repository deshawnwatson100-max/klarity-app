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
  Alert,
  ActionSheetIOS,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityLoop } from "../types/loop";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
import { ThemeColors } from "../theme/colors";
import { useAuthStore } from "../state/authStore";
import { useSettingsStore } from "../state/settingsStore";
import { getBackendUrl } from "../lib/config";

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

interface LongPressChatListItemProps {
  loop: KlarityLoop;
  onPress: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onPin: () => void;
  isLast?: boolean;
  isActive?: boolean;
  colors: ThemeColors;
}

function LongPressChatListItem({
  loop,
  onPress,
  onDelete,
  onArchive,
  onPin,
  isLast = false,
  isActive = false,
  colors
}: LongPressChatListItemProps) {
  // Show action sheet on long press - no zeego context menu to avoid native crashes
  const showActionSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            loop.isPinned ? "Unpin" : "Pin to Top",
            "Archive",
            "Delete",
          ],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: loop.title,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Pin/Unpin
            onPin();
          } else if (buttonIndex === 2) {
            // Archive
            onArchive();
          } else if (buttonIndex === 3) {
            // Delete
            onDelete();
          }
        }
      );
    } else {
      // Android fallback using Alert
      Alert.alert(
        loop.title,
        "Choose an action",
        [
          { text: "Cancel", style: "cancel" },
          { text: loop.isPinned ? "Unpin" : "Pin to Top", onPress: onPin },
          { text: "Archive", onPress: onArchive },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ]
      );
    }
  }, [loop.isPinned, loop.title, onPin, onArchive, onDelete]);

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
      <Pressable
        onPress={onPress}
        onLongPress={showActionSheet}
        delayLongPress={400}
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
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Pending delete state - set by onSelect, Alert shown via useEffect (outside onSelect)
  const [pendingDeleteLoopId, setPendingDeleteLoopId] = useState<string | null>(null);

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

  // Settings store - individual selectors to avoid infinite loop
  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const pushNotificationsEnabled = useSettingsStore((s) => s.pushNotificationsEnabled);
  const dailyRemindersEnabled = useSettingsStore((s) => s.dailyRemindersEnabled);
  const responseStyle = useSettingsStore((s) => s.responseStyle);
  const responseLength = useSettingsStore((s) => s.responseLength);
  const autoSuggestReplies = useSettingsStore((s) => s.autoSuggestReplies);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setPushNotificationsEnabled = useSettingsStore((s) => s.setPushNotificationsEnabled);
  const setDailyRemindersEnabled = useSettingsStore((s) => s.setDailyRemindersEnabled);
  const setResponseStyle = useSettingsStore((s) => s.setResponseStyle);
  const setResponseLength = useSettingsStore((s) => s.setResponseLength);
  const setAutoSuggestReplies = useSettingsStore((s) => s.setAutoSuggestReplies);

  // Auth store
  const authUser = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      const base = getBackendUrl();
      await fetch(`${base}/api/auth/sign-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
      });
    } catch {}
    clearSession();
  };

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Show delete confirmation Alert when pendingDeleteLoopId is set
  // This runs OUTSIDE of zeego onSelect, after context menu is dismissed
  useEffect(() => {
    if (pendingDeleteLoopId) {
      // Small delay to ensure context menu is fully closed
      const timer = setTimeout(() => {
        Alert.alert(
          "Delete Conversation",
          "Are you sure you want to delete this conversation? This cannot be undone.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setPendingDeleteLoopId(null),
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                if (isMountedRef.current) {
                  deleteLoop(pendingDeleteLoopId);
                }
                setPendingDeleteLoopId(null);
              },
            },
          ],
          { cancelable: true, onDismiss: () => setPendingDeleteLoopId(null) }
        );
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingDeleteLoopId, deleteLoop]);

  // Mark loop for deletion - just sets state, does NOT delete yet
  const handleRequestDelete = useCallback((loopId: string) => {
    setPendingDeleteLoopId(loopId);
  }, []);

  // Archive handler - also use delayed Alert pattern for safety
  const handleSafeArchive = useCallback((loopId: string) => {
    if (!isMountedRef.current) return;
    // Small delay to ensure context menu is fully closed
    setTimeout(() => {
      Alert.alert(
        "Archive Conversation",
        "Move this conversation to archives?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            onPress: () => {
              archiveLoop(loopId);
            },
          },
        ]
      );
    }, 100);
  }, [archiveLoop]);

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
      setShowSettingsPanel(false);
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
                <LongPressChatListItem
                  key={loop.id}
                  loop={loop}
                  onPress={() => handleSelectChat(loop.id)}
                  onDelete={() => handleRequestDelete(loop.id)}
                  onArchive={() => handleSafeArchive(loop.id)}
                  onPin={() => togglePinLoop(loop.id)}
                  isLast={index === pinnedLoops.length - 1}
                  isActive={loop.id === activeLoopId}
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
                <LongPressChatListItem
                  key={loop.id}
                  loop={loop}
                  onPress={() => handleSelectChat(loop.id)}
                  onDelete={() => handleRequestDelete(loop.id)}
                  onArchive={() => handleSafeArchive(loop.id)}
                  onPin={() => togglePinLoop(loop.id)}
                  isLast={index === unpinnedLoops.length - 1}
                  isActive={loop.id === activeLoopId}
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
        <>
          {showSettingsPanel ? (
            /* Full settings panel inside drawer */
            <View style={{ flex: 1 }}>
              {/* Panel header with back button */}
              <View
                style={{
                  paddingTop: insets.top + 16,
                  paddingBottom: 14,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSettingsPanel(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="active:opacity-60"
                >
                  <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                </Pressable>
                <Text
                  className="text-lg font-semibold ml-3"
                  style={{ color: colors.textPrimary }}
                >
                  Account & Settings
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
              >
                {/* Profile card */}
                <View
                  style={{
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 16,
                    marginHorizontal: 16,
                    marginBottom: 4,
                    marginTop: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.buttonBackground,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={22} color={colors.textSecondary} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: colors.textPrimary }}
                      numberOfLines={1}
                    >
                      {authUser?.name || authUser?.email || "Personal"}
                    </Text>
                    {authUser?.email ? (
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: colors.textTertiary }}
                        numberOfLines={1}
                      >
                        {authUser.email}
                      </Text>
                    ) : (
                      <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                        Free Plan
                      </Text>
                    )}
                  </View>
                </View>

                {/* APPEARANCE section */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginHorizontal: 20,
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                >
                  Appearance
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    marginHorizontal: 16,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Theme row */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
                      setTheme(next);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Theme
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textTertiary, marginRight: 6 }}>
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </Pressable>

                  {/* Font size row */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const next = fontSize === "small" ? "medium" : fontSize === "medium" ? "large" : "small";
                      setFontSize(next);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Font Size
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textTertiary, marginRight: 6 }}>
                        {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </Pressable>

                  {/* Haptics toggle */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                      Haptic Feedback
                    </Text>
                    <Switch
                      value={hapticsEnabled}
                      onValueChange={(val) => {
                        setHapticsEnabled(val);
                        if (val) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                      thumbColor={colors.switchThumb}
                    />
                  </View>
                </View>

                {/* NOTIFICATIONS section */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginHorizontal: 20,
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                >
                  Notifications
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    marginHorizontal: 16,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Push notifications */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.divider,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                      Push Notifications
                    </Text>
                    <Switch
                      value={pushNotificationsEnabled}
                      onValueChange={(val) => {
                        setPushNotificationsEnabled(val);
                        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                      thumbColor={colors.switchThumb}
                    />
                  </View>

                  {/* Daily reminders */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                      Daily Reminders
                    </Text>
                    <Switch
                      value={dailyRemindersEnabled}
                      onValueChange={(val) => {
                        setDailyRemindersEnabled(val);
                        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                      thumbColor={colors.switchThumb}
                    />
                  </View>
                </View>

                {/* AI PREFERENCES section */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginHorizontal: 20,
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                >
                  AI Preferences
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    marginHorizontal: 16,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Response style */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const next = responseStyle === "balanced" ? "casual" : responseStyle === "casual" ? "formal" : "balanced";
                      setResponseStyle(next);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Response Style
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textTertiary, marginRight: 6 }}>
                        {responseStyle.charAt(0).toUpperCase() + responseStyle.slice(1)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </Pressable>

                  {/* Response length */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const next = responseLength === "balanced" ? "concise" : responseLength === "concise" ? "detailed" : "balanced";
                      setResponseLength(next);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Response Length
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textTertiary, marginRight: 6 }}>
                        {responseLength.charAt(0).toUpperCase() + responseLength.slice(1)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </Pressable>

                  {/* Auto-suggest replies toggle */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                      Auto-Suggest Replies
                    </Text>
                    <Switch
                      value={autoSuggestReplies}
                      onValueChange={(val) => {
                        setAutoSuggestReplies(val);
                        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
                      thumbColor={colors.switchThumb}
                    />
                  </View>
                </View>

                {/* ARCHIVED CHATS section */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginHorizontal: 20,
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Archived Chats
                  </Text>
                  {archivedLoops.length > 0 && (
                    <View
                      style={{
                        marginLeft: 8,
                        backgroundColor: colors.buttonBackground,
                        borderRadius: 9,
                        paddingHorizontal: 7,
                        paddingVertical: 1,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary }}>
                        {archivedLoops.length}
                      </Text>
                    </View>
                  )}
                </View>

                {archivedLoops.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      marginHorizontal: 16,
                      borderRadius: 12,
                      padding: 20,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="archive-outline" size={28} color={colors.textTertiary} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: colors.textSecondary,
                        marginTop: 10,
                      }}
                    >
                      No archived chats
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textTertiary,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      Swipe left on a chat to archive it
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      marginHorizontal: 16,
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {archivedLoops.map((loop, index) => {
                      const userMessages = loop.messages.filter((m) => m.role === "user");
                      const firstUserMsg = userMessages[0];
                      let snippet = "No messages";
                      if (firstUserMsg) {
                        const clean = firstUserMsg.content
                          .replace(/\[Image\]/gi, "")
                          .replace(/\[Screenshot shared\]/gi, "")
                          .trim();
                        snippet = clean.length > 50 ? clean.substring(0, 50) + "..." : clean || "Image attachment";
                      }
                      return (
                        <View
                          key={loop.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderBottomWidth: index < archivedLoops.length - 1 ? 0.5 : 0,
                            borderBottomColor: colors.divider,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text
                              style={{ fontSize: 14, fontWeight: "500", color: colors.textPrimary }}
                              numberOfLines={1}
                            >
                              {loop.title}
                            </Text>
                            <Text
                              style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}
                              numberOfLines={1}
                            >
                              {snippet}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              unarchiveLoop(loop.id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className="active:opacity-60"
                            style={{ marginRight: 12 }}
                          >
                            <Ionicons name="arrow-undo-outline" size={20} color={colors.success} />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              deleteArchivedLoop(loop.id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className="active:opacity-60"
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* LEGAL section */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginHorizontal: 20,
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                >
                  Legal
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    marginHorizontal: 16,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    onPress={() => {
                      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      closeDrawer();
                      setTimeout(() => {
                        navigation.navigate("LegalScreen", { tab: "terms" });
                      }, 100);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Terms of Service
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      closeDrawer();
                      setTimeout(() => {
                        navigation.navigate("LegalScreen", { tab: "privacy" });
                      }, 100);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Privacy Policy
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </Pressable>
                </View>

                {/* ACCOUNT section */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginHorizontal: 20,
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                >
                  Account
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    marginHorizontal: 16,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {authUser?.email && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textSecondary }}>
                        Signed in as
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.textTertiary, maxWidth: "55%" }}
                        numberOfLines={1}
                      >
                        {authUser.email}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => {
                      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleSignOut();
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: colors.error }}>
                        Sign Out
                      </Text>
                      <Ionicons name="log-out-outline" size={18} color={colors.error} />
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          ) : (
            /* Normal drawer view */
            <>
              {renderHeader()}
              <View style={{ flex: 1 }}>{renderContent()}</View>
              {/* Single bottom button */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: insets.bottom + 16,
                  backgroundColor: colors.drawerBackground,
                }}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSettingsPanel(true);
                  }}
                  className="active:opacity-70"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 12,
                  }}
                >
                  {/* Avatar circle */}
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
                  <Text
                    className="text-sm font-medium ml-2.5 flex-1"
                    style={{ color: colors.drawerItemText }}
                    numberOfLines={1}
                  >
                    Account & Settings
                  </Text>
                  {archivedLoops.length > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.buttonBackground,
                        borderRadius: 10,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary }}>
                        {archivedLoops.length}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                </Pressable>
              </View>
            </>
          )}
        </>
      </Animated.View>
    </View>
  );
}
