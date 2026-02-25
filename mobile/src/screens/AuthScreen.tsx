import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { getBackendUrl } from "../lib/config";

interface AuthScreenProps {
  onComplete: () => void;
}

export function AuthScreen({ onComplete }: AuthScreenProps) {
  const setSession = useAuthStore((s) => s.setSession);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      shake();
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      shake();
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      shake();
      return;
    }

    setLoading(true);
    try {
      const base = getBackendUrl();

      if (mode === "signup") {
        const res = await fetch(`${base}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Sign up failed. Try again.");
        }
        // After signup, sign in to get a session token
        const loginRes = await fetch(`${base}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginData?.message || "Sign in after sign up failed.");
        }
        setSession(
          { id: loginData.user?.id ?? "", email: loginData.user?.email ?? email.trim(), name: loginData.user?.name ?? name.trim() },
          loginData.token ?? loginData.session?.token ?? ""
        );
      } else {
        const res = await fetch(`${base}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Invalid email or password.");
        }
        setSession(
          { id: data.user?.id ?? "", email: data.user?.email ?? email.trim(), name: data.user?.name ?? "" },
          data.token ?? data.session?.token ?? ""
        );
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050608" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Brand */}
          <View style={{ alignItems: "center", marginBottom: 52 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 34, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.5 }}>
                Klarity
              </Text>
              <View style={{ position: "relative", width: 30, height: 30 }}>
                <Ionicons name="chatbubble-outline" size={30} color="#FFFFFF" />
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 8, letterSpacing: 0.1 }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
          </View>

          {/* Form */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>

            {mode === "signup" && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#9CA3AF", marginBottom: 8, letterSpacing: 0.3 }}>
                  NAME
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#3F3F46"
                  autoCapitalize="words"
                  style={{
                    backgroundColor: "#111115",
                    borderWidth: 1,
                    borderColor: "#1F1F27",
                    borderRadius: 14,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    fontSize: 16,
                    color: "#FFFFFF",
                    letterSpacing: 0.1,
                  }}
                />
              </View>
            )}

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#9CA3AF", marginBottom: 8, letterSpacing: 0.3 }}>
                EMAIL
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#3F3F46"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={{
                  backgroundColor: "#111115",
                  borderWidth: 1,
                  borderColor: "#1F1F27",
                  borderRadius: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  fontSize: 16,
                  color: "#FFFFFF",
                  letterSpacing: 0.1,
                }}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#9CA3AF", marginBottom: 8, letterSpacing: 0.3 }}>
                PASSWORD
              </Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  placeholderTextColor="#3F3F46"
                  secureTextEntry={!showPassword}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={{
                    backgroundColor: "#111115",
                    borderWidth: 1,
                    borderColor: "#1F1F27",
                    borderRadius: 14,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    paddingRight: 52,
                    fontSize: 16,
                    color: "#FFFFFF",
                    letterSpacing: 0.1,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={{ position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.2)",
              }}>
                <Text style={{ color: "#F87171", fontSize: 14, lineHeight: 20 }}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 17,
                alignItems: "center",
                marginBottom: 20,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#050608" size="small" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#050608", letterSpacing: 0.1 }}>
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle mode */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
