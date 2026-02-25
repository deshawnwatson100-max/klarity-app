import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Linking,
  Share,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";
import * as Application from "expo-application";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import {
  useSettingsStore,
  ThemeMode,
  FontSize,
  ResponseStyle,
  ResponseLength,
} from "../state/settingsStore";
import { useLoopsStore } from "../state/loopsStore";
import { usePersonContextStore } from "../state/personContextStore";
import { useOnboardingStore } from "../state/onboardingStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Section Header Component
function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center px-5 pt-6 pb-3">
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          backgroundColor: colors.buttonBackground,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
      </View>
      <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
        {title}
      </Text>
    </View>
  );
}

// Settings Row Component
interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
  destructive?: boolean;
  subtitle?: string;
}

function SettingsRow({
  label,
  value,
  onPress,
  rightElement,
  isFirst = false,
  isLast = false,
  destructive = false,
  subtitle,
}: SettingsRowProps) {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    if (onPress) {
      if (hapticsEnabled) {
        Haptics.selectionAsync();
      }
      onPress();
    }
  }, [onPress, hapticsEnabled]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      className="active:opacity-70"
      style={({ pressed }) => ({
        backgroundColor: pressed && onPress ? colors.surfaceElevated : colors.surface,
        marginHorizontal: 16,
        borderTopLeftRadius: isFirst ? 12 : 0,
        borderTopRightRadius: isFirst ? 12 : 0,
        borderBottomLeftRadius: isLast ? 12 : 0,
        borderBottomRightRadius: isLast ? 12 : 0,
      })}
    >
      <View
        className="flex-row items-center justify-between px-4 py-3.5"
        style={{
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: colors.divider,
        }}
      >
        <View className="flex-1 mr-3">
          <Text
            className="text-base"
            style={{ color: destructive ? colors.error : colors.textPrimary }}
          >
            {label}
          </Text>
          {subtitle && (
            <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightElement ? (
          rightElement
        ) : value ? (
          <View className="flex-row items-center">
            <Text className="text-base mr-1" style={{ color: colors.textTertiary }}>
              {value}
            </Text>
            {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
          </View>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        ) : null}
      </View>
    </Pressable>
  );
}

// Toggle Row Component
interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
  subtitle?: string;
}

function ToggleRow({
  label,
  value,
  onValueChange,
  isFirst = false,
  isLast = false,
  subtitle,
}: ToggleRowProps) {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const { colors } = useTheme();

  const handleChange = useCallback(
    (newValue: boolean) => {
      if (hapticsEnabled) {
        Haptics.selectionAsync();
      }
      onValueChange(newValue);
    },
    [onValueChange, hapticsEnabled]
  );

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        borderTopLeftRadius: isFirst ? 12 : 0,
        borderTopRightRadius: isFirst ? 12 : 0,
        borderBottomLeftRadius: isLast ? 12 : 0,
        borderBottomRightRadius: isLast ? 12 : 0,
      }}
    >
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: colors.divider,
        }}
      >
        <View className="flex-1 mr-3">
          <Text className="text-base" style={{ color: colors.textPrimary }}>
            {label}
          </Text>
          {subtitle && (
            <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
              {subtitle}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={handleChange}
          trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
          thumbColor={colors.switchThumb}
          ios_backgroundColor={colors.switchTrackOff}
        />
      </View>
    </View>
  );
}

// Selection Modal Component
interface SelectionModalProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { value: T; label: string; description?: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

function SelectionModal<T extends string>({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: SelectionModalProps<T>) {
  const insets = useSafeAreaInsets();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (value: T) => {
      if (hapticsEnabled) {
        Haptics.selectionAsync();
      }
      onSelect(value);
      onClose();
    },
    [onSelect, onClose, hapticsEnabled]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
        >
          <View style={{ width: 60 }} />
          <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            className="active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-base font-medium" style={{ color: colors.info }}>
              Done
            </Text>
          </Pressable>
        </View>

        {/* Options */}
        <ScrollView className="flex-1 px-4">
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              marginTop: 8,
            }}
          >
            {options.map((option, index) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                className="active:opacity-70"
              >
                <View
                  className="flex-row items-center px-4 py-4"
                  style={{
                    borderBottomWidth: index === options.length - 1 ? 0 : 0.5,
                    borderBottomColor: colors.divider,
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-base" style={{ color: colors.textPrimary }}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {selectedValue === option.value && (
                    <Ionicons name="checkmark" size={22} color={colors.success} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Clear Data Confirmation Modal
function ClearDataModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const { colors, isDark } = useTheme();

  const handleConfirm = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onConfirm();
    onClose();
  }, [onConfirm, onClose, hapticsEnabled]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            borderRadius: 14,
            width: "100%",
            maxWidth: 320,
            overflow: "hidden",
          }}
        >
          <View className="px-5 pt-5 pb-4">
            <Text
              className="text-lg font-semibold text-center"
              style={{ color: colors.textPrimary }}
            >
              {title}
            </Text>
            <Text
              className="text-sm text-center mt-2"
              style={{ color: colors.textSecondary }}
            >
              {message}
            </Text>
          </View>
          <View
            style={{
              borderTopWidth: 0.5,
              borderTopColor: colors.divider,
            }}
          >
            <Pressable
              onPress={handleConfirm}
              className="active:opacity-70"
              style={{ paddingVertical: 14 }}
            >
              <Text
                className="text-base font-medium text-center"
                style={{ color: colors.error }}
              >
                Delete
              </Text>
            </Pressable>
            <View
              style={{
                borderTopWidth: 0.5,
                borderTopColor: colors.divider,
              }}
            >
              <Pressable
                onPress={onClose}
                className="active:opacity-70"
                style={{ paddingVertical: 14 }}
              >
                <Text
                  className="text-base font-medium text-center"
                  style={{ color: colors.info }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();

  // Settings store
  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const pushNotificationsEnabled = useSettingsStore((s) => s.pushNotificationsEnabled);
  const dailyRemindersEnabled = useSettingsStore((s) => s.dailyRemindersEnabled);
  const reminderTime = useSettingsStore((s) => s.reminderTime);
  const responseStyle = useSettingsStore((s) => s.responseStyle);
  const responseLength = useSettingsStore((s) => s.responseLength);
  const autoSuggestReplies = useSettingsStore((s) => s.autoSuggestReplies);
  const cloudSyncEnabled = useSettingsStore((s) => s.cloudSyncEnabled);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);

  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setPushNotificationsEnabled = useSettingsStore((s) => s.setPushNotificationsEnabled);
  const setDailyRemindersEnabled = useSettingsStore((s) => s.setDailyRemindersEnabled);
  const setReminderTime = useSettingsStore((s) => s.setReminderTime);
  const setResponseStyle = useSettingsStore((s) => s.setResponseStyle);
  const setResponseLength = useSettingsStore((s) => s.setResponseLength);
  const setAutoSuggestReplies = useSettingsStore((s) => s.setAutoSuggestReplies);
  const setCloudSyncEnabled = useSettingsStore((s) => s.setCloudSyncEnabled);
  const setAnalyticsEnabled = useSettingsStore((s) => s.setAnalyticsEnabled);

  // Loops store for clearing data
  const loops = useLoopsStore((s) => s.loops);
  const archivedLoops = useLoopsStore((s) => s.archivedLoops);

  // Person context store
  const personContexts = usePersonContextStore((s) => s.personContexts);
  const resetPersonContextStore = usePersonContextStore((s) => s.resetStore);

  // Onboarding store
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  // Modal states
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showResponseStyleModal, setShowResponseStyleModal] = useState(false);
  const [showResponseLengthModal, setShowResponseLengthModal] = useState(false);
  const [showClearChatsModal, setShowClearChatsModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Get app version
  const appVersion = Application.nativeApplicationVersion || "1.0.0";
  const buildNumber = Application.nativeBuildVersion || "1";

  // Theme options
  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    { value: "dark", label: "Dark", description: "Always use dark mode" },
    { value: "light", label: "Light", description: "Always use light mode" },
    { value: "system", label: "System", description: "Follow system settings" },
  ];

  // Font size options
  const fontSizeOptions: { value: FontSize; label: string; description: string }[] = [
    { value: "small", label: "Small", description: "Compact text for more content" },
    { value: "medium", label: "Medium", description: "Default text size" },
    { value: "large", label: "Large", description: "Larger text for readability" },
  ];

  // Response style options
  const responseStyleOptions: { value: ResponseStyle; label: string; description: string }[] = [
    { value: "formal", label: "Formal", description: "Professional and structured responses" },
    { value: "balanced", label: "Balanced", description: "Mix of formal and casual" },
    { value: "casual", label: "Casual", description: "Friendly and conversational" },
  ];

  // Response length options
  const responseLengthOptions: { value: ResponseLength; label: string; description: string }[] = [
    { value: "concise", label: "Concise", description: "Brief and to the point" },
    { value: "balanced", label: "Balanced", description: "Moderate detail level" },
    { value: "detailed", label: "Detailed", description: "Comprehensive explanations" },
  ];

  // Get display labels
  const getThemeLabel = (t: ThemeMode) => themeOptions.find((o) => o.value === t)?.label || t;
  const getFontSizeLabel = (s: FontSize) => fontSizeOptions.find((o) => o.value === s)?.label || s;
  const getResponseStyleLabel = (s: ResponseStyle) =>
    responseStyleOptions.find((o) => o.value === s)?.label || s;
  const getResponseLengthLabel = (l: ResponseLength) =>
    responseLengthOptions.find((o) => o.value === l)?.label || l;

  // Format reminder time for display
  const formatReminderTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Parse reminder time to Date
  const parseReminderTime = () => {
    const [hours, minutes] = reminderTime.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date;
  };

  // Handle time change
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setReminderTime(`${hours}:${minutes}`);
    }
  };

  // Clear all chats
  const handleClearChats = useCallback(() => {
    useLoopsStore.setState({
      loops: [],
      archivedLoops: [],
      activeLoopId: null,
    });
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled]);

  // Clear all data
  const handleClearAllData = useCallback(() => {
    useLoopsStore.setState({
      loops: [],
      archivedLoops: [],
      activeLoopId: null,
      trackedRelationships: [],
    });
    resetPersonContextStore();
    useSettingsStore.getState().resetToDefaults();
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled, resetPersonContextStore]);

  // Share app
  const handleShareApp = useCallback(async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await Share.share({
        message: "Check out Klarity - an AI-powered relationship communication coach! Download it now.",
        title: "Share Klarity",
      });
    } catch (error) {
      // User cancelled or error
    }
  }, [hapticsEnabled]);

  // Rate app (opens App Store)
  const handleRateApp = useCallback(async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const appStoreUrl = "https://apps.apple.com/app/id123456789";
    try {
      const canOpen = await Linking.canOpenURL(appStoreUrl);
      if (canOpen) {
        await Linking.openURL(appStoreUrl);
      }
    } catch (error) {
      // Handle error silently
    }
  }, [hapticsEnabled]);

  // Contact support
  const handleContactSupport = useCallback(async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const email = "support@klarityai.com";
    const subject = `Klarity Support - v${appVersion}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    try {
      await Linking.openURL(mailtoUrl);
    } catch (error) {
      // Handle error silently
    }
  }, [hapticsEnabled, appVersion]);

  // Handle back press
  const handleBack = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  }, [navigation, hapticsEnabled]);

  // Total data count
  const totalChats = loops.length + archivedLoops.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.divider,
        }}
      >
        <View className="flex-row items-center justify-between px-4 h-14">
          <Pressable
            onPress={handleBack}
            className="active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </Pressable>
          <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            Settings
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Subscription Banner */}
        <Pressable
          onPress={() => {
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            navigation.navigate("PaywallScreen");
          }}
          className="mx-4 mt-4 overflow-hidden active:opacity-90"
          style={{ borderRadius: 16 }}
        >
          <View
            style={{
              paddingVertical: 20,
              paddingHorizontal: 20,
              backgroundColor: isDark ? "#2A2A2C" : "#F0F0F2",
            }}
          >
            <View className="flex-row items-center">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="sparkles" size={18} color={isDark ? "#E5E7EB" : "#1C1C1E"} />
                  <Text
                    className="text-base font-bold ml-2"
                    style={{ color: isDark ? "#E5E7EB" : "#1C1C1E" }}
                  >
                    Subscription
                  </Text>
                </View>
                <Text className="text-sm" style={{ color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.5)" }}>
                  Unlock unlimited chats, advanced AI features, and more
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: isDark ? "#E5E7EB" : "#1C1C1E" }}>
                  View
                </Text>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Appearance Section */}
        <SectionHeader title="Appearance" icon="color-palette-outline" />
        <SettingsRow
          label="Theme"
          value={getThemeLabel(theme)}
          onPress={() => setShowThemeModal(true)}
          isFirst
        />
        <SettingsRow
          label="Font Size"
          value={getFontSizeLabel(fontSize)}
          onPress={() => setShowFontSizeModal(true)}
        />
        <ToggleRow
          label="Haptic Feedback"
          subtitle="Vibrations for interactions"
          value={hapticsEnabled}
          onValueChange={setHapticsEnabled}
          isLast
        />

        {/* Notifications Section */}
        <SectionHeader title="Notifications" icon="notifications-outline" />
        <ToggleRow
          label="Push Notifications"
          subtitle="Get notified about important updates"
          value={pushNotificationsEnabled}
          onValueChange={setPushNotificationsEnabled}
          isFirst
        />
        <ToggleRow
          label="Daily Reminders"
          subtitle="Check in with your conversations"
          value={dailyRemindersEnabled}
          onValueChange={setDailyRemindersEnabled}
          isLast={!dailyRemindersEnabled}
        />
        {dailyRemindersEnabled && (
          <SettingsRow
            label="Reminder Time"
            value={formatReminderTime(reminderTime)}
            onPress={() => setShowTimePicker(true)}
            isLast
          />
        )}

        {/* AI Preferences Section */}
        <SectionHeader title="AI Preferences" icon="sparkles-outline" />
        <SettingsRow
          label="Response Style"
          value={getResponseStyleLabel(responseStyle)}
          onPress={() => setShowResponseStyleModal(true)}
          isFirst
        />
        <SettingsRow
          label="Response Length"
          value={getResponseLengthLabel(responseLength)}
          onPress={() => setShowResponseLengthModal(true)}
        />
        <ToggleRow
          label="Auto-Suggest Replies"
          subtitle="Get smart reply suggestions"
          value={autoSuggestReplies}
          onValueChange={setAutoSuggestReplies}
          isLast
        />

        {/* Data & Privacy Section */}
        <SectionHeader title="Data & Privacy" icon="shield-checkmark-outline" />
        <ToggleRow
          label="Cloud Sync"
          subtitle="Sync your data across devices"
          value={cloudSyncEnabled}
          onValueChange={setCloudSyncEnabled}
          isFirst
        />
        <ToggleRow
          label="Analytics"
          subtitle="Help improve Klarity"
          value={analyticsEnabled}
          onValueChange={setAnalyticsEnabled}
        />
        <SettingsRow
          label="Clear Chat History"
          subtitle={`${totalChats} conversation${totalChats !== 1 ? "s" : ""}`}
          onPress={() => setShowClearChatsModal(true)}
          destructive
        />
        <SettingsRow
          label="Clear All Data"
          subtitle="Chats, profiles, and settings"
          onPress={() => setShowClearAllModal(true)}
          destructive
        />
        <SettingsRow
          label="Reset Onboarding"
          subtitle="Show onboarding flow again"
          onPress={() => {
            if (hapticsEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            resetOnboarding();
          }}
          isLast
        />

        {/* Legal Section */}
        <SectionHeader title="Legal" icon="document-text-outline" />
        <SettingsRow
          label="Terms of Service"
          onPress={() => navigation.navigate("LegalScreen", { tab: "terms" })}
          isFirst
        />
        <SettingsRow
          label="Privacy Policy"
          onPress={() => navigation.navigate("LegalScreen", { tab: "privacy" })}
          isLast
        />

        {/* About Section */}
        <SectionHeader title="About" icon="information-circle-outline" />
        <SettingsRow
          label="Rate Klarity"
          onPress={handleRateApp}
          rightElement={
            <View className="flex-row items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name="star" size={14} color={colors.warning} style={{ marginRight: 2 }} />
              ))}
            </View>
          }
          isFirst
        />
        <SettingsRow
          label="Share with Friends"
          onPress={handleShareApp}
          rightElement={<Ionicons name="share-outline" size={20} color={colors.textTertiary} />}
        />
        <SettingsRow
          label="Contact Support"
          onPress={handleContactSupport}
          rightElement={<Ionicons name="mail-outline" size={20} color={colors.textTertiary} />}
        />
        <SettingsRow
          label="Version"
          value={`${appVersion} (${buildNumber})`}
          isLast
        />

        {/* Footer */}
        <View className="items-center mt-8 mb-4">
          <Text className="text-xs" style={{ color: colors.textTertiary }}>
            Made with care by the Klarity team
          </Text>
        </View>
      </ScrollView>

      {/* Theme Selection Modal */}
      <SelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title="Theme"
        options={themeOptions}
        selectedValue={theme}
        onSelect={setTheme}
      />

      {/* Font Size Selection Modal */}
      <SelectionModal
        visible={showFontSizeModal}
        onClose={() => setShowFontSizeModal(false)}
        title="Font Size"
        options={fontSizeOptions}
        selectedValue={fontSize}
        onSelect={setFontSize}
      />

      {/* Response Style Selection Modal */}
      <SelectionModal
        visible={showResponseStyleModal}
        onClose={() => setShowResponseStyleModal(false)}
        title="Response Style"
        options={responseStyleOptions}
        selectedValue={responseStyle}
        onSelect={setResponseStyle}
      />

      {/* Response Length Selection Modal */}
      <SelectionModal
        visible={showResponseLengthModal}
        onClose={() => setShowResponseLengthModal(false)}
        title="Response Length"
        options={responseLengthOptions}
        selectedValue={responseLength}
        onSelect={setResponseLength}
      />

      {/* Clear Chats Confirmation Modal */}
      <ClearDataModal
        visible={showClearChatsModal}
        onClose={() => setShowClearChatsModal(false)}
        onConfirm={handleClearChats}
        title="Clear Chat History?"
        message={`This will permanently delete ${totalChats} conversation${totalChats !== 1 ? "s" : ""}. This action cannot be undone.`}
      />

      {/* Clear All Data Confirmation Modal */}
      <ClearDataModal
        visible={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={handleClearAllData}
        title="Clear All Data?"
        message="This will permanently delete all your chats, profiles, and reset settings to defaults. This action cannot be undone."
      />

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={parseReminderTime()}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={handleTimeChange}
          themeVariant={isDark ? "dark" : "light"}
        />
      )}
    </View>
  );
}
