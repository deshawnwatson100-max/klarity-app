import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
  type PurchasesPackage,
} from "../lib/revenuecatClient";
import { useSubscriptionStore } from "../state/subscriptionStore";

type PlanType = "weekly" | "monthly" | "annual";

interface PlanOption {
  id: PlanType;
  identifier: string;
  title: string;
  price: string;
  subtitle: string;
  badge?: string;
}

const DEFAULT_PLANS: PlanOption[] = [
  {
    id: "weekly",
    identifier: "$rc_weekly",
    title: "Weekly",
    price: "$2.99/wk",
    subtitle: "$2.99/week",
  },
  {
    id: "monthly",
    identifier: "$rc_monthly",
    title: "Monthly",
    price: "$11.99/mo",
    subtitle: "$11.99/month",
  },
  {
    id: "annual",
    identifier: "$rc_annual",
    title: "Annual",
    price: "$59.99/yr",
    subtitle: "$4.99/mo",
    badge: "Best Value",
  },
];

const FEATURES: Array<{
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
}> = [
  {
    icon: "chatbubble-outline",
    title: "Understand any message instantly",
    description: "Decode tone, intent, and subtext in seconds",
  },
  {
    icon: "sparkles-outline",
    title: "Craft replies that land perfectly",
    description: "Responses tailored to the moment",
  },
  {
    icon: "bulb-outline",
    title: "Decode tone, intent and emotion",
    description: "See what is really being communicated",
  },
  {
    icon: "heart-outline",
    title: "Feel grounded in every conversation",
    description: "Navigate relationships with calm clarity",
  },
];

// Hard (non-dismissible) paywall shown when the 3-day trial has expired.
// Rendered directly by RootNavigator — no navigation prop or close button.
export function HardPaywallScreen() {
  const insets = useSafeAreaInsets();
  const setHasPaidSubscription = useSubscriptionStore(
    (s) => s.setHasPaidSubscription
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [packages, setPackages] = useState<Map<string, PurchasesPackage>>(
    new Map()
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [plans, setPlans] = useState<PlanOption[]>(DEFAULT_PLANS);
  const [error, setError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const isMountedRef = useRef(true);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(20)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Design tokens — dark-only (this screen is always dark)
  const accentColor = "#7DD3C0";
  const accentColorLight = "rgba(125, 211, 192, 0.18)";
  const accentColorMedium = "rgba(125, 211, 192, 0.08)";
  const bgColor = "#050608";
  const cardBg = "#000000";
  const textPrimary = "#EDEDED";
  const textSecondary = "#A1A8B0";
  const textTertiary = "#6B7280";
  const buttonBg = "#1F1F22";
  const borderSubtle = "rgba(255, 255, 255, 0.06)";
  const borderFaint = "rgba(255, 255, 255, 0.04)";
  const selectedBg = "rgba(125, 211, 192, 0.10)";
  const selectedBorder = accentColor;
  const unselectedBg = "rgba(255, 255, 255, 0.025)";

  useEffect(() => {
    // Staggered entrance: hero slides up and fades in, then content fades in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heroSlideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    loadOfferings();

    return () => {
      isMountedRef.current = false;
      fadeAnim.stopAnimation();
      heroSlideAnim.stopAnimation();
      contentFadeAnim.stopAnimation();
    };
  }, []);

  const loadOfferings = async () => {
    if (!isRevenueCatEnabled()) {
      // RevenueCat not configured — show default plans and allow UI interaction
      setIsLoading(false);
      return;
    }

    const result = await getOfferings();

    if (!isMountedRef.current) return;

    if (result.ok && result.data.current) {
      const pkgMap = new Map<string, PurchasesPackage>();
      result.data.current.availablePackages.forEach((pkg: PurchasesPackage) => {
        pkgMap.set(pkg.identifier, pkg);
      });
      setPackages(pkgMap);

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
    }

    setIsLoading(false);
  };

  const handleSelectPlan = (planId: PlanType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
    setError(null);
  };

  const handlePurchase = async () => {
    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    if (!isRevenueCatEnabled()) {
      setError("Payments are not available in this build");
      return;
    }

    const pkg = packages.get(plan.identifier);
    if (!pkg) {
      setError("Unable to load this plan. Please try again.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);
    setError(null);

    const result = await purchasePackage(pkg);

    if (!isMountedRef.current) return;

    setIsPurchasing(false);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // RootNavigator detects this change and unmounts this screen automatically
      useSubscriptionStore.getState().setHasPaidSubscription(true);
    } else if (result.reason === "sdk_error") {
      const errorMsg =
        result.error instanceof Error ? result.error.message : "Purchase failed";
      const isCancelled =
        errorMsg.toLowerCase().includes("cancelled") ||
        errorMsg.toLowerCase().includes("canceled");
      if (!isCancelled) {
        setError(errorMsg);
      }
    } else {
      setError("Purchase could not be completed. Please try again.");
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);
    setError(null);
    setRestoreSuccess(false);

    const result = await restorePurchases();

    if (!isMountedRef.current) return;

    setIsRestoring(false);

    if (result.ok) {
      const hasActive =
        Object.keys(result.data.entitlements.active || {}).length > 0;
      if (hasActive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // RootNavigator detects this change and unmounts this screen automatically
        useSubscriptionStore.getState().setHasPaidSubscription(true);
      } else {
        setError("No active subscriptions found on this account");
      }
    } else {
      setError("Could not restore purchases. Please try again.");
    }
  };

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);
  const ctaLabel = selectedPlanData
    ? `Continue with ${selectedPlanData.title}`
    : "Start Klarity Pro";

  const canPurchase =
    !isLoading &&
    !isPurchasing &&
    (packages.size > 0 || !isRevenueCatEnabled());

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Full-screen background gradient */}
      <LinearGradient
        colors={["#070809", "#050608", "#030405"]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Subtle teal glow at top — gives premium depth */}
      <LinearGradient
        colors={["rgba(125,211,192,0.07)", "transparent"]}
        locations={[0, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 280,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO SECTION ────────────────────────────────────────── */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: heroSlideAnim }],
            alignItems: "center",
            marginBottom: 36,
          }}
        >
          {/* Crown icon with teal ring */}
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: accentColorMedium,
              borderWidth: 1.5,
              borderColor: "rgba(125, 211, 192, 0.22)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="diamond-outline" size={32} color={accentColor} />
          </View>

          {/* App name */}
          <Text
            style={{
              fontSize: 38,
              fontWeight: "700",
              color: textPrimary,
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Klarity
          </Text>

          {/* Expired trial pill */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.25)",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#EF4444",
                marginRight: 7,
              }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#F87171",
                letterSpacing: 0.1,
              }}
            >
              Your free trial has ended
            </Text>
          </View>

          {/* Warm, non-pushy message */}
          <Text
            style={{
              fontSize: 16,
              color: textSecondary,
              textAlign: "center",
              lineHeight: 24,
              paddingHorizontal: 12,
            }}
          >
            Continue your journey with Klarity Pro and navigate every
            conversation with clarity and confidence.
          </Text>
        </Animated.View>

        {/* ── FEATURE HIGHLIGHTS ──────────────────────────────────── */}
        <Animated.View style={{ opacity: contentFadeAnim, marginBottom: 28 }}>
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: borderSubtle,
              overflow: "hidden",
            }}
          >
            {/* Teal accent line at top of card */}
            <LinearGradient
              colors={[accentColor, "rgba(125, 211, 192, 0.0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 2 }}
            />

            <View style={{ padding: 20, gap: 4 }}>
              {FEATURES.map((feature, index) => {
                const isLast = index === FEATURES.length - 1;
                return (
                  <View key={feature.title}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                      }}
                    >
                      {/* Icon container */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 11,
                          backgroundColor: accentColorLight,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                          flexShrink: 0,
                        }}
                      >
                        <Ionicons
                          name={feature.icon}
                          size={18}
                          color={accentColor}
                        />
                      </View>

                      {/* Text block */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: textPrimary,
                            lineHeight: 20,
                          }}
                        >
                          {feature.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: textTertiary,
                            lineHeight: 18,
                            marginTop: 1,
                          }}
                        >
                          {feature.description}
                        </Text>
                      </View>

                      {/* Checkmark */}
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={accentColor}
                        style={{ marginLeft: 10, flexShrink: 0 }}
                      />
                    </View>

                    {/* Divider between rows */}
                    {!isLast && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: borderFaint,
                          marginHorizontal: 0,
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── PLAN SELECTOR ───────────────────────────────────────── */}
        <Animated.View style={{ opacity: contentFadeAnim, marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: textTertiary,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Choose your plan
          </Text>

          <View style={{ gap: 10 }}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => handleSelectPlan(plan.id)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: isSelected ? selectedBg : unselectedBg,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? selectedBorder : borderSubtle,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {/* Radio indicator */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? accentColor : textTertiary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: accentColor,
                        }}
                      />
                    )}
                  </View>

                  {/* Plan name + badge */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: isSelected ? textPrimary : textSecondary,
                        }}
                      >
                        {plan.title}
                      </Text>
                      {plan.badge && (
                        <LinearGradient
                          colors={[accentColor, "#5BC8B2"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#050608",
                              letterSpacing: 0.3,
                            }}
                          >
                            {plan.badge}
                          </Text>
                        </LinearGradient>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: textTertiary,
                        marginTop: 2,
                      }}
                    >
                      {plan.subtitle}
                    </Text>
                  </View>

                  {/* Price */}
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: isSelected ? accentColor : textSecondary,
                    }}
                  >
                    {plan.price}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ── ERROR BANNER ────────────────────────────────────────── */}
        {error && (
          <Animated.View style={{ opacity: contentFadeAnim }}>
            <View
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.10)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.22)",
                padding: 14,
                borderRadius: 12,
                marginTop: 16,
              }}
            >
              <Text
                style={{
                  color: "#F87171",
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {error}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── CTA BUTTON ──────────────────────────────────────────── */}
        <Animated.View style={{ opacity: contentFadeAnim, marginTop: 24 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={!canPurchase}
            style={({ pressed }) => ({
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <LinearGradient
              colors={
                canPurchase
                  ? [accentColor, "#5BC8B2"]
                  : ["rgba(125,211,192,0.4)", "rgba(91,200,178,0.4)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#050608" size="small" />
              ) : isLoading ? (
                <ActivityIndicator color="#050608" size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: "#050608",
                    letterSpacing: 0.1,
                  }}
                >
                  {ctaLabel}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── FOOTER ROW: Restore + Legal ─────────────────────────── */}
        <Animated.View
          style={{ opacity: contentFadeAnim, marginTop: 6 }}
        >
          {/* Restore Purchases */}
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            style={({ pressed }) => ({
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {isRestoring ? (
              <ActivityIndicator color={textTertiary} size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  color: textSecondary,
                  fontWeight: "500",
                }}
              >
                Restore Purchases
              </Text>
            )}
          </Pressable>

          {/* Legal links */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 20,
              marginTop: 2,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: textTertiary,
                textDecorationLine: "underline",
              }}
            >
              Terms of Service
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: textTertiary,
                textDecorationLine: "underline",
              }}
            >
              Privacy Policy
            </Text>
          </View>

          {/* Subscription fine print */}
          <Text
            style={{
              fontSize: 11,
              color: textTertiary,
              textAlign: "center",
              marginTop: 14,
              lineHeight: 17,
              paddingHorizontal: 8,
            }}
          >
            Subscription renews automatically unless cancelled at least 24 hours
            before the end of the current period. Cancel anytime in Settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
