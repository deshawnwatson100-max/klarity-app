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
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../state/authStore";
import { getBackendUrl } from "../lib/config";

WebBrowser.maybeCompleteAuthSession();

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
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
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

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setError(null);
    setSocialLoading(provider);
    try {
      const base = getBackendUrl();
      // Build the OAuth URL — Better Auth redirects to the provider
      const callbackUrl = `${base}/api/auth/callback/${provider}`;
      const oauthUrl = `${base}/api/auth/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(callbackUrl)}&disableRedirect=true`;

      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, "vibecode://");

      if (result.type !== "success") {
        // User cancelled or something went wrong
        return;
      }

      // The redirect URL contains a token — extract it or fetch the session
      // Better Auth returns the session via cookie; we fetch /api/auth/session to get user info
      const sessionRes = await fetch(`${base}/api/auth/session`, {
        credentials: "include",
        headers: {
          Cookie: "",
        },
      });

      if (!sessionRes.ok) {
        throw new Error("Failed to retrieve session after sign-in.");
      }

      const sessionData = await sessionRes.json();
      if (!sessionData?.session || !sessionData?.user) {
        throw new Error("Sign-in did not complete. Please try again.");
      }

      setSession(
        {
          id: sessionData.user.id ?? "",
          email: sessionData.user.email ?? "",
          name: sessionData.user.name ?? "",
        },
        sessionData.session.token ?? ""
      );

      onComplete();
    } catch (err: any) {
      setError(err.message || "Social sign-in failed. Please try again.");
      shake();
    } finally {
      setSocialLoading(null);
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

          {/* Email / Password Form */}
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
              disabled={loading || !!socialLoading}
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

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 28, marginBottom: 24, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#1F1F27" }} />
            <Text style={{ fontSize: 13, color: "#4B5563", letterSpacing: 0.3 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#1F1F27" }} />
          </View>

          {/* Social Sign-In Buttons */}
          <View style={{ gap: 12, marginBottom: 8 }}>
            {/* Apple Sign-In */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                onPress={() => handleSocialSignIn("apple")}
                disabled={!!socialLoading || loading}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  paddingVertical: 15,
                  gap: 10,
                  opacity: socialLoading === "apple" ? 0.7 : 1,
                }}
              >
                {socialLoading === "apple" ? (
                  <ActivityIndicator color="#050608" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color="#050608" />
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#050608", letterSpacing: 0.1 }}>
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Google Sign-In */}
            <TouchableOpacity
              onPress={() => handleSocialSignIn("google")}
              disabled={!!socialLoading || loading}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#111115",
                borderRadius: 14,
                paddingVertical: 15,
                gap: 10,
                borderWidth: 1,
                borderColor: "#1F1F27",
                opacity: socialLoading === "google" ? 0.7 : 1,
              }}
            >
              {socialLoading === "google" ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF", letterSpacing: 0.1 }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Inline Google "G" SVG icon
function GoogleIcon() {
  const { Svg, Path } = require("react-native-svg");
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}
