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
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLoopsStore } from "../state/loopsStore";
import { KlarityLoop } from "../types/loop";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
import { ThemeColors } from "../theme/colors";
import { useAuthStore } from "../state/authStore";
import { useSettingsStore } from "../state/settingsStore";
import { getBackendUrl } from "../lib/config";
import { useSubscriptionStore, isInTrialWindow, trialDaysRemaining } from "../state/subscriptionStore";

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
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const pushNotificationsEnabled = useSettingsStore((s) => s.pushNotificationsEnabled);
  const dailyRemindersEnabled = useSettingsStore((s) => s.dailyRemindersEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setPushNotificationsEnabled = useSettingsStore((s) => s.setPushNotificationsEnabled);
  const setDailyRemindersEnabled = useSettingsStore((s) => s.setDailyRemindersEnabled);

  // Auth store
  const authUser = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  // Subscription state
  const trialStartedAt = useSubscriptionStore((s) => s.trialStartedAt);
  const hasPaidSubscription = useSubscriptionStore((s) => s.hasPaidSubscription);
  const inTrial = isInTrialWindow(trialStartedAt);
  const daysLeft = trialDaysRemaining(trialStartedAt);

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

  // Profile editing state
  const [profileSaving, setProfileSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const PROFILE_COLORS = [
    "#E57373", "#F06292", "#BA68C8", "#9575CD",
    "#7986CB", "#64B5F6", "#4DD0E1", "#4DB6AC",
    "#81C784", "#AED581", "#FFD54F", "#FFB74D",
    "#FF8A65", "#A1887F", "#90A4AE", "#78909C",
  ];

  const currentColor = authUser?.profileColor || "#7986CB";
  const currentImage = authUser?.profileImage;
  const displayName = authUser?.name || authUser?.email || "User";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const saveProfile = useCallback(async (patch: { profileImage?: string | null; profileColor?: string }) => {
    if (!sessionToken) return;
    const base = getBackendUrl();
    try {
      const body: Record<string, string> = {};
      if (patch.profileImage !== undefined) body.image = patch.profileImage ?? "";
      if (patch.profileColor) body.profileColor = patch.profileColor;
      await fetch(`${base}/api/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch {}
  }, [sessionToken]);

  const handlePickImage = useCallback(async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const imageData = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : asset.uri;
    setProfileSaving(true);
    updateProfile({ profileImage: imageData });
    await saveProfile({ profileImage: imageData });
    setProfileSaving(false);
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [hapticsEnabled, updateProfile, saveProfile]);

  const handleRemoveImage = useCallback(async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateProfile({ profileImage: null });
    await saveProfile({ profileImage: null });
  }, [hapticsEnabled, updateProfile, saveProfile]);

  const handleSelectColor = useCallback(async (color: string) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateProfile({ profileColor: color });
    await saveProfile({ profileColor: color });
    setShowColorPicker(false);
  }, [hapticsEnabled, updateProfile, saveProfile]);

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
                  Settings
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
              >
                {/* PROFILE HEADER */}
                <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
                  {/* Avatar */}
                  <Pressable onPress={handlePickImage} style={{ position: "relative", marginBottom: 12 }}>
                    {currentImage ? (
                      <Image
                        source={{ uri: currentImage }}
                        style={{ width: 80, height: 80, borderRadius: 40 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          backgroundColor: currentColor,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 28, fontWeight: "700", color: "#FFF" }}>
                          {initials}
                        </Text>
                      </View>
                    )}
                    {/* Camera badge */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        borderColor: isDark ? "#3A3A3C" : "#E5E5EA",
                      }}
                    >
                      {profileSaving ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : (
                        <Ionicons name="camera" size={12} color={colors.textSecondary} />
                      )}
                    </View>
                  </Pressable>

                  {/* Name */}
                  <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 }}>
                    {displayName}
                  </Text>
                  {authUser?.email && (
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 14 }}>
                      {authUser.email}
                    </Text>
                  )}

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
                    marginTop: 4,
                    marginBottom: 6,
                  }}
                >
                  Account
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    marginHorizontal: 16,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  {/* Email row */}
                  {authUser?.email && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="mail-outline" size={19} color={colors.textSecondary} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Email
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.textTertiary, maxWidth: "45%" }}
                        numberOfLines={1}
                      >
                        {authUser.email}
                      </Text>
                    </View>
                  )}

                  {/* Subscription row */}
                  <Pressable
                    onPress={() => {
                      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowSettingsPanel(false);
                      setTimeout(() => (navigation as any).navigate("PaywallScreen"), 300);
                    }}
                    className="active:opacity-60"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        borderBottomWidth: 0.5,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="card-outline" size={19} color={colors.textSecondary} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
                        Subscription
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textTertiary, marginRight: 4 }}>
                        {hasPaidSubscription ? "Pro" : inTrial ? "Trial" : "Free"}
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
                    </View>
                  </Pressable>

                  {/* Sign Out row */}
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
                        paddingVertical: 13,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="log-out-outline" size={19} color={colors.error} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: colors.error }}>
                        Sign Out
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </ScrollView>

              {/* Color Picker Modal */}
              <Modal
                visible={showColorPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowColorPicker(false)}
              >
                <Pressable
                  style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                  onPress={() => setShowColorPicker(false)}
                >
                  <Pressable onPress={(e) => e.stopPropagation()}>
                    <View
                      style={{
                        backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        paddingBottom: insets.bottom + 24,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textPrimary }}>
                          Profile Color
                        </Text>
                        <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                          <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {/* Preview */}
                      <View style={{ alignItems: "center", marginBottom: 24 }}>
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: currentColor,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 22, fontWeight: "700", color: "#FFF" }}>
                            {initials}
                          </Text>
                        </View>
                      </View>

                      {/* Color grid */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                        {PROFILE_COLORS.map((color) => (
                          <TouchableOpacity
                            key={color}
                            onPress={() => handleSelectColor(color)}
                            activeOpacity={0.85}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: color,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: currentColor === color ? 3 : 0,
                              borderColor: isDark ? "#FFFFFF" : "#000000",
                            }}
                          >
                            {currentColor === color && (
                              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                </Pressable>
              </Modal>
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
              {/* Account button — avatar + name */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSettingsPanel(true);
                }}
                className="active:opacity-70"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 14,
                }}
              >
                {/* Avatar */}
                {currentImage ? (
                  <Image
                    source={{ uri: currentImage }}
                    style={{ width: 36, height: 36, borderRadius: 18 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: currentColor,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>
                      {initials}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginLeft: 10,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
              </Pressable>
              </View>
            </>
          )}
        </>
      </Animated.View>
    </View>
  );
}
