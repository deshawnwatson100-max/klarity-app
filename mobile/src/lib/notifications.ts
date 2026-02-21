/**
 * Notifications Service
 *
 * Handles local push notifications for Klarity.
 * Currently used for:
 * - Trial-end reminder: notifies user 1 day before their 3-day trial expires
 *
 * Uses expo-notifications for scheduling local notifications.
 * Gracefully handles cases where the native module is unavailable
 * (Expo Go, web, or permission denied).
 */

import { Platform } from "react-native";

const TRIAL_REMINDER_ID = "klarity-trial-end-reminder";
const LOG_PREFIX = "[Notifications]";

// Lazy-load expo-notifications to avoid crashes in unsupported environments
let Notifications: typeof import("expo-notifications") | null = null;
try {
  Notifications = require("expo-notifications");
} catch {
  // Native module not available
}

const isAvailable = !!Notifications && Platform.OS !== "web";

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isAvailable || !Notifications) {
    console.log(`${LOG_PREFIX} Not available on this platform`);
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.log(`${LOG_PREFIX} Permission request failed:`, error);
    return false;
  }
}

/**
 * Check current notification permission status without prompting.
 */
export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  if (!isAvailable || !Notifications) return "denied";

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as "granted" | "denied" | "undetermined";
  } catch {
    return "denied";
  }
}

/**
 * Schedule a local notification to remind the user 1 day before their
 * trial ends (i.e., at trialStartedAt + 2 days).
 *
 * Cancels any existing trial reminder before scheduling a new one.
 * No-ops if the reminder time has already passed.
 */
export async function scheduleTrialEndReminder(trialStartedAt: number): Promise<void> {
  if (!isAvailable || !Notifications) return;

  try {
    // Cancel any existing reminder first
    await cancelTrialReminder();

    // Reminder fires 2 days after trial start (1 day before it ends)
    const reminderTime = trialStartedAt + 2 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (reminderTime <= now) {
      // Trial is already in its last day or expired — skip
      console.log(`${LOG_PREFIX} Trial reminder time already passed, skipping`);
      return;
    }

    const triggerDate = new Date(reminderTime);

    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: {
        title: "Your Klarity trial ends tomorrow",
        body: "Subscribe today to keep navigating every conversation with clarity.",
        sound: true,
        data: { type: "trial_end_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log(`${LOG_PREFIX} Trial reminder scheduled for ${triggerDate.toISOString()}`);
  } catch (error) {
    console.log(`${LOG_PREFIX} Failed to schedule trial reminder:`, error);
  }
}

/**
 * Cancel the trial-end reminder notification if it exists.
 */
export async function cancelTrialReminder(): Promise<void> {
  if (!isAvailable || !Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID);
    console.log(`${LOG_PREFIX} Trial reminder cancelled`);
  } catch {
    // Notification may not exist — that's fine
  }
}

/**
 * Set up the notification handler for how notifications appear when
 * the app is in the foreground.
 */
export function configureNotificationHandler(): void {
  if (!isAvailable || !Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
