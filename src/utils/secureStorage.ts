import AsyncStorage from "@react-native-async-storage/async-storage";

const PIN_KEY = "@klarity_user_pin";
const APP_LOCKED_KEY = "@klarity_app_locked";

/**
 * Secure Storage Utility
 *
 * Handles PIN storage and app lock state using AsyncStorage.
 *
 * Note: For production apps with sensitive data, consider using
 * expo-secure-store for encrypted storage.
 */

/**
 * Store the user's PIN
 */
export async function storePIN(pin: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PIN_KEY, pin);
  } catch (error) {
    console.error("Error storing PIN:", error);
    throw error;
  }
}

/**
 * Retrieve the user's PIN
 */
export async function getPIN(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PIN_KEY);
  } catch (error) {
    console.error("Error retrieving PIN:", error);
    return null;
  }
}

/**
 * Check if PIN exists (user has set up security)
 */
export async function hasPIN(): Promise<boolean> {
  try {
    const pin = await AsyncStorage.getItem(PIN_KEY);
    return pin !== null;
  } catch (error) {
    console.error("Error checking PIN:", error);
    return false;
  }
}

/**
 * Clear the stored PIN (for testing or reset)
 */
export async function clearPIN(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PIN_KEY);
  } catch (error) {
    console.error("Error clearing PIN:", error);
    throw error;
  }
}

/**
 * Set app locked state
 */
export async function setAppLocked(locked: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LOCKED_KEY, locked.toString());
  } catch (error) {
    console.error("Error setting app locked state:", error);
    throw error;
  }
}

/**
 * Get app locked state
 */
export async function isAppLocked(): Promise<boolean> {
  try {
    const locked = await AsyncStorage.getItem(APP_LOCKED_KEY);
    return locked === "true";
  } catch (error) {
    console.error("Error getting app locked state:", error);
    return false;
  }
}
