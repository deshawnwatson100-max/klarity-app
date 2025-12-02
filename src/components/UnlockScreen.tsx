import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface UnlockScreenProps {
  onUnlock: () => void;
  storedPIN: string;
}

/**
 * UnlockScreen Component
 *
 * Secure unlock with 4-digit PIN.
 *
 * Features:
 * - 4-digit PIN authentication
 * - Clean numeric keypad
 * - Pitch black background
 * - Soft lavender glow effects
 * - Shake animation for wrong PIN
 */
export function UnlockScreen({ onUnlock, storedPIN }: UnlockScreenProps) {
  const [enteredPIN, setEnteredPIN] = useState("");

  // Shake animation for wrong PIN
  const shakeX = useSharedValue(0);

  const handlePINPress = (digit: string) => {
    if (enteredPIN.length < 4) {
      const newPIN = enteredPIN + digit;
      setEnteredPIN(newPIN);

      // Auto-check when 4 digits entered
      if (newPIN.length === 4) {
        setTimeout(() => checkPIN(newPIN), 100);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPIN(enteredPIN.slice(0, -1));
  };

  const checkPIN = (pin: string) => {
    if (pin === storedPIN) {
      onUnlock();
    } else {
      // Wrong PIN - shake animation
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );

      // Clear PIN after shake
      setTimeout(() => {
        setEnteredPIN("");
      }, 500);
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>Klarity AI ✨</Text>
      </View>

      {/* PIN Dots */}
      <Animated.View style={[styles.pinDotsContainer, shakeStyle]}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < enteredPIN.length && styles.pinDotFilled,
            ]}
          />
        ))}
      </Animated.View>

      <Text style={styles.pinInstruction}>Enter your PIN</Text>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {/* Row 1 */}
        <View style={styles.keypadRow}>
          {["1", "2", "3"].map((digit) => (
            <Pressable
              key={digit}
              onPress={() => handlePINPress(digit)}
              style={({ pressed }) => [
                styles.keypadButton,
                pressed && styles.keypadButtonPressed,
              ]}
            >
              <Text style={styles.keypadText}>{digit}</Text>
            </Pressable>
          ))}
        </View>

        {/* Row 2 */}
        <View style={styles.keypadRow}>
          {["4", "5", "6"].map((digit) => (
            <Pressable
              key={digit}
              onPress={() => handlePINPress(digit)}
              style={({ pressed }) => [
                styles.keypadButton,
                pressed && styles.keypadButtonPressed,
              ]}
            >
              <Text style={styles.keypadText}>{digit}</Text>
            </Pressable>
          ))}
        </View>

        {/* Row 3 */}
        <View style={styles.keypadRow}>
          {["7", "8", "9"].map((digit) => (
            <Pressable
              key={digit}
              onPress={() => handlePINPress(digit)}
              style={({ pressed }) => [
                styles.keypadButton,
                pressed && styles.keypadButtonPressed,
              ]}
            >
              <Text style={styles.keypadText}>{digit}</Text>
            </Pressable>
          ))}
        </View>

        {/* Row 4 */}
        <View style={styles.keypadRow}>
          <View style={styles.keypadButton} />

          <Pressable
            onPress={() => handlePINPress("0")}
            style={({ pressed }) => [
              styles.keypadButton,
              pressed && styles.keypadButtonPressed,
            ]}
          >
            <Text style={styles.keypadText}>0</Text>
          </Pressable>

          <Pressable
            onPress={handleBackspace}
            style={({ pressed }) => [
              styles.keypadButton,
              pressed && styles.keypadButtonPressed,
            ]}
          >
            <Ionicons name="backspace-outline" size={24} color="#A78BFA" />
          </Pressable>
        </View>
      </View>

      {/* Security message */}
      <Text style={styles.securityText}>Your clarity is protected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 64,
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#A78BFA",
    letterSpacing: 0.5,
  },
  pinDotsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.4)",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: "#A78BFA",
  },
  pinInstruction: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 48,
  },
  keypad: {
    width: "100%",
    maxWidth: 320,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    backgroundColor: "rgba(167, 139, 250, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadButtonPressed: {
    backgroundColor: "rgba(167, 139, 250, 0.15)",
  },
  keypadText: {
    fontSize: 28,
    fontWeight: "400",
    color: "#FFFFFF",
  },
  securityText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 48,
    fontStyle: "italic",
  },
});
