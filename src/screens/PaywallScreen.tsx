import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from "../lib/revenuecatClient";
import type { PurchasesPackage } from "react-native-purchases";

type Props = StackScreenProps<RootStackParamList, "PaywallScreen">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "infinite-outline" as const,
    title: "Unlimited Conversations",
    description: "No daily limits on AI clarity sessions",
  },
  {
    icon: "search-outline" as const,
    title: "Deep Search",
    description: "Comprehensive background insights on people",
  },
  {
    icon: "analytics-outline" as const,
    title: "Advanced Analysis",
    description: "Deeper emotional and communication insights",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Priority Support",
    description: "Fast, dedicated help when you need it",
  },
];

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation values using React Native Animated
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Breathing glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle scale pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    if (!isRevenueCatEnabled()) {
      setError("Payments are not available on this platform");
      setIsLoading(false);
      return;
    }

    const result = await getOfferings();
    if (result.ok && result.data.current) {
      const monthly = result.data.current.availablePackages.find(
        (pkg) => pkg.identifier === "$rc_monthly"
      );
      setMonthlyPackage(monthly ?? null);
    } else {
      setError("Unable to load subscription options");
    }
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!monthlyPackage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);
    setError(null);

    const result = await purchasePackage(monthlyPackage);
    setIsPurchasing(false);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } else if (result.reason === "sdk_error") {
      // User cancelled or other error
      const errorMessage = result.error instanceof Error ? result.error.message : "Purchase failed";
      if (!errorMessage.includes("cancelled") && !errorMessage.includes("canceled")) {
        setError(errorMessage);
      }
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);
    setError(null);

    const result = await restorePurchases();
    setIsRestoring(false);

    if (result.ok) {
      const hasActive = Object.keys(result.data.entitlements.active || {}).length > 0;
      if (hasActive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        setError("No active subscriptions found");
      }
    } else {
      setError("Could not restore purchases");
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const priceText = monthlyPackage?.product.priceString ?? "$11.99";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark ? ["#050608", "#0A0A0C", "#050608"] : ["#FFFFFF", "#F8F9FA", "#FFFFFF"]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Close button */}
      <Pressable
        onPress={handleClose}
        style={{
          position: "absolute",
          top: insets.top + 12,
          right: 16,
          zIndex: 10,
          padding: 8,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Orb/Glow */}
        <Animated.View
          style={{
            alignItems: "center",
            marginBottom: 24,
            opacity: fadeAnim,
          }}
        >
          <Animated.View
            style={{
              opacity: glowAnim,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <LinearGradient
              colors={["#8B5CF6", "#6366F1", "#A855F7", "#7DD3C0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                opacity: 0.4,
              }}
            />
          </Animated.View>
          <View
            style={{
              position: "absolute",
              top: 30,
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: isDark ? "#1A1A1C" : "#F5F5F7",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Ionicons name="sparkles" size={28} color="#A855F7" />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.textPrimary,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Unlock Klarity Premium
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Get deeper insights and unlimited access to all features
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {FEATURES.map((feature, index) => (
            <View
              key={feature.title}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Ionicons name={feature.icon} size={22} color="#A855F7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: 2,
                  }}
                >
                  {feature.title}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  {feature.description}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#34C759" />
            </View>
          ))}
        </Animated.View>

        {/* Pricing Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View
            style={{
              marginTop: 8,
              marginBottom: 24,
              padding: 20,
              borderRadius: 20,
              backgroundColor: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)",
              borderWidth: 2,
              borderColor: "#8B5CF6",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center" }}>
              <Text
                style={{
                  fontSize: 42,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {priceText}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  marginLeft: 4,
                }}
              >
                /month
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Cancel anytime
            </Text>
          </View>
        </Animated.View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: "#EF4444",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Subscribe Button */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Pressable
            onPress={handlePurchase}
            disabled={isLoading || isPurchasing || !monthlyPackage}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <LinearGradient
              colors={["#8B5CF6", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                opacity: isLoading || !monthlyPackage ? 0.5 : 1,
              }}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Subscribe Now
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Restore Purchases */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            style={{
              marginTop: 16,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            {isRestoring ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  color: colors.textSecondary,
                }}
              >
                Restore Purchases
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Terms & Privacy */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("LegalScreen", { tab: "terms" });
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textTertiary,
                  textDecorationLine: "underline",
                }}
              >
                Terms of Service
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("LegalScreen", { tab: "privacy" });
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textTertiary,
                  textDecorationLine: "underline",
                }}
              >
                Privacy Policy
              </Text>
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              textAlign: "center",
              marginTop: 16,
              lineHeight: 18,
              paddingHorizontal: 16,
            }}
          >
            Subscription automatically renews unless cancelled at least 24 hours
            before the end of the current period.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
