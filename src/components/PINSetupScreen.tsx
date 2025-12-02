import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface PINSetupScreenProps {
  onSetupComplete: (pin: string) => void;
}

/**
 * PINSetupScreen Component
 *
 * First-time PIN setup for securing the app.
 *
 * Features:
 * - Create 4-digit PIN
 * - Confirm PIN by entering twice
 * - Visual feedback for mismatches
 * - Clean numeric keypad
 * - Pitch black background with lavender accents
 */
export function PINSetupScreen({ onSetupComplete }: PINSetupScreenProps) {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [createdPIN, setCreatedPIN] = useState("");
  const [enteredPIN, setEnteredPIN] = useState("");

  // Shake animation for mismatch
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
    if (step === "create") {
      // Store first PIN and move to confirmation
      setCreatedPIN(pin);
      setEnteredPIN("");
      setStep("confirm");
    } else {
      // Check if confirmation matches
      if (pin === createdPIN) {
        onSetupComplete(pin);
      } else {
        // PINs don't match - shake and reset
        shakeX.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );

        setTimeout(() => {
          setEnteredPIN("");
          setStep("create");
          setCreatedPIN("");
        }, 500);
      }
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

      <Text style={styles.pinInstruction}>
        {step === "create" ? "Create your PIN" : "Confirm your PIN"}
      </Text>

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
      <Text style={styles.securityText}>
        {step === "create"
          ? "Your PIN will protect your clarity."
          : "Make sure they match."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 80,
  },
  logo: {
    fontSize: 32,
    fontWeight: "600",
    color: "#A78BFA",
    letterSpacing: 0.5,
  },
  pinDotsContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.3)",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: "#A78BFA",
    borderColor: "#A78BFA",
  },
  pinInstruction: {
    fontSize: 15,
    fontWeight: "300",
    color: "#9CA3AF",
    marginBottom: 64,
    letterSpacing: 0.3,
  },
  keypad: {
    width: "100%",
    maxWidth: 300,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 20,
  },
  keypadButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.2)",
    backgroundColor: "rgba(167, 139, 250, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadButtonPressed: {
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderColor: "rgba(167, 139, 250, 0.4)",
  },
  keypadText: {
    fontSize: 26,
    fontWeight: "300",
    color: "#E5E7EB",
  },
  securityText: {
    fontSize: 13,
    fontWeight: "300",
    color: "#6B7280",
    marginTop: 56,
    letterSpacing: 0.5,
  },
});
