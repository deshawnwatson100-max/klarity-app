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
import { KlarityLogo } from "../components/KlarityLogo";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from "../lib/revenuecatClient";
import type { PurchasesPackage } from "react-native-purchases";

type Props = StackScreenProps<RootStackParamList, "PaywallScreen">;

type PlanType = "weekly" | "monthly" | "annual";

interface PlanOption {
  id: PlanType;
  identifier: string;
  title: string;
  price: string;
  subtitle: string;
  badge?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Suggested replies that cycle with typewriter effect
const SUGGESTED_REPLIES = [
  "I appreciate you sharing that with me",
  "Let me think about that and get back to you",
  "I hear what you are saying",
  "That makes sense, thank you for explaining",
  "I understand where you are coming from",
];

const FEATURES = [
  {
    icon: "eye-outline" as const,
    title: "Understand intent, tone, and subtext",
  },
  {
    icon: "chatbubble-outline" as const,
    title: "Get clear replies when your mind goes blank",
  },
  {
    icon: "leaf-outline" as const,
    title: "Avoid overthinking and regret",
  },
  {
    icon: "heart-outline" as const,
    title: "Feel grounded in real conversations",
  },
];

const DEFAULT_PLANS: PlanOption[] = [
  {
    id: "weekly",
    identifier: "$rc_weekly",
    title: "Weekly",
    price: "$4.99",
    subtitle: "$0.71/day",
  },
  {
    id: "monthly",
    identifier: "$rc_monthly",
    title: "Monthly",
    price: "$11.99",
    subtitle: "$2.99/week",
  },
  {
    id: "annual",
    identifier: "$rc_annual",
    title: "Annual",
    price: "$59.99",
    subtitle: "$4.99/mo",
    badge: "Best Value",
  },
];

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [packages, setPackages] = useState<Map<string, PurchasesPackage>>(new Map());
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [plans, setPlans] = useState<PlanOption[]>(DEFAULT_PLANS);
  const [error, setError] = useState<string | null>(null);

  // Typewriter effect state
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Blinking cursor animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    loadOfferings();
  }, []);

  // Typewriter effect
  useEffect(() => {
    const currentReply = SUGGESTED_REPLIES[currentReplyIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      // Typing
      if (displayedText.length < currentReply.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentReply.slice(0, displayedText.length + 1));
        }, 40 + Math.random() * 30); // Variable typing speed for realism
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    } else {
      // Deleting
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 25); // Faster deletion
      } else {
        // Finished deleting, move to next reply
        setIsDeleting(false);
        setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, currentReplyIndex]);

  const loadOfferings = async () => {
    if (!isRevenueCatEnabled()) {
      setError("Payments are not available on this platform");
      setIsLoading(false);
      return;
    }

    const result = await getOfferings();
    if (result.ok && result.data.current) {
      const pkgMap = new Map<string, PurchasesPackage>();

      result.data.current.availablePackages.forEach((pkg) => {
        pkgMap.set(pkg.identifier, pkg);
      });

      setPackages(pkgMap);

      // Update plans with actual prices from RevenueCat
      const updatedPlans = DEFAULT_PLANS.map((plan) => {
        const pkg = pkgMap.get(plan.identifier);
        if (pkg) {
          return {
            ...plan,
            price: pkg.product.priceString,
          };
        }
        return plan;
      });
      setPlans(updatedPlans);
    } else {
      setError("Unable to load subscription options");
    }
    setIsLoading(false);
  };

  const handleSelectPlan = (planId: PlanType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
  };

  const handlePurchase = async () => {
    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    const pkg = packages.get(plan.identifier);
    if (!pkg) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);
    setError(null);

    const result = await purchasePackage(pkg);
    setIsPurchasing(false);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } else if (result.reason === "sdk_error") {
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

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

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
        {/* Typewriter Suggested Reply Bubble */}
        <Animated.View
          style={{
            alignItems: "center",
            marginBottom: 20,
            opacity: fadeAnim,
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? "rgba(16,163,127,0.15)" : "rgba(16,163,127,0.1)",
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(16,163,127,0.25)",
              maxWidth: SCREEN_WIDTH - 60,
              minHeight: 48,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 15,
                  color: isDark ? "#10A37F" : "#0D8A6A",
                  fontWeight: "500",
                }}
              >
                {displayedText}
              </Text>
              <Animated.Text
                style={{
                  fontSize: 15,
                  color: isDark ? "#10A37F" : "#0D8A6A",
                  fontWeight: "500",
                  opacity: cursorOpacity,
                  marginLeft: 1,
                }}
              >
                |
              </Animated.Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              marginTop: 8,
              fontWeight: "500",
              letterSpacing: 0.5,
            }}
          >
            SUGGESTED REPLY
          </Text>
        </Animated.View>

        {/* Title with Logo */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
              gap: 10,
            }}
          >
            <KlarityLogo size={32} />
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              Klarity
            </Text>
          </View>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 24,
              paddingHorizontal: 8,
            }}
          >
            Understand social dynamics and respond with clarity and confidence when it matters most
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {FEATURES.map((feature) => (
            <View
              key={feature.title}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  backgroundColor: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name={feature.icon} size={18} color="#3B82F6" />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.textPrimary,
                }}
              >
                {feature.title}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
          ))}
        </Animated.View>

        {/* Pricing Options */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 20 }}>
          <View style={{ gap: 12 }}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => handleSelectPlan(plan.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: isSelected
                      ? isDark
                        ? "rgba(59,130,246,0.12)"
                        : "rgba(59,130,246,0.08)"
                      : isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.02)",
                    borderWidth: 2,
                    borderColor: isSelected ? "#3B82F6" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Radio button */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? "#3B82F6" : colors.textTertiary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#3B82F6",
                        }}
                      />
                    )}
                  </View>

                  {/* Plan details */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: colors.textPrimary,
                        }}
                      >
                        {plan.title}
                      </Text>
                      {plan.badge && (
                        <View
                          style={{
                            backgroundColor: "#34C759",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: "#FFFFFF",
                            }}
                          >
                            {plan.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {plan.subtitle}
                    </Text>
                  </View>

                  {/* Price */}
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: colors.textPrimary,
                    }}
                  >
                    {plan.price}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              padding: 12,
              borderRadius: 12,
              marginTop: 16,
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
        <Animated.View style={{ opacity: fadeAnim, marginTop: 24 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={isLoading || isPurchasing || packages.size === 0}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <LinearGradient
              colors={["#3B82F6", "#1D4ED8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                opacity: isLoading || packages.size === 0 ? 0.5 : 1,
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
                  Continue with {selectedPlanData?.title}
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
