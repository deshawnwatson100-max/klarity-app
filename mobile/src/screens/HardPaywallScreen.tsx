import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TypewriterText } from "../components/TypewriterText";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
  type PurchasesPackage,
} from "../lib/revenuecatClient";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { RootStackParamList } from "../navigation/RootNavigator";

type PlanType = "monthly" | "annual";

interface PlanOption {
  id: PlanType;
  identifier: string;
  title: string;
  price: string;
  subtitle: string;
  badge?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SUGGESTED_REPLIES = [
  {
    text: "I really appreciate you sharing that with me, it means a lot 💙",
    guidanceNote: "Acknowledges their vulnerability without overcommitting",
  },
  {
    text: "Let me think about that and get back to you soon 🤔",
    guidanceNote: "Buys time while showing you take it seriously",
  },
  {
    text: "I hear what you are saying and I understand your perspective 👂",
    guidanceNote: "Validates without necessarily agreeing",
  },
  {
    text: "That makes a lot of sense, thank you for explaining it to me 🙏",
    guidanceNote: "Shows understanding and appreciation",
  },
  {
    text: "I completely understand where you are coming from on this ❤️",
    guidanceNote: "Demonstrates empathy while staying neutral",
  },
];

const FEATURES = [
  {
    icon: "leaf-outline" as const,
    title: "Avoid overthinking and regret",
  },
  {
    icon: "chatbubble-outline" as const,
    title: "Get clear replies when your mind goes blank",
  },
  {
    icon: "eye-outline" as const,
    title: "Understand intent, tone, and subtext",
  },
  {
    icon: "heart-outline" as const,
    title: "Feel grounded in real conversations",
  },
];

const DEFAULT_PLANS: PlanOption[] = [
  {
    id: "monthly",
    identifier: "$rc_monthly",
    title: "Monthly",
    price: "$9.99",
    subtitle: "Billed monthly · $9.99/month",
  },
  {
    id: "annual",
    identifier: "$rc_annual",
    title: "Annual",
    price: "$59.99",
    subtitle: "Billed annually · $59.99/year ($4.99/month equivalent)",
    badge: "Best Value",
  },
];

// Hard (non-dismissible) paywall shown when the 3-day trial has expired.
// Matches the soft PaywallScreen design exactly — no close button, updated copy.
export function HardPaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [packages, setPackages] = useState<Map<string, PurchasesPackage>>(new Map());
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [plans, setPlans] = useState<PlanOption[]>(DEFAULT_PLANS);
  const [error, setError] = useState<string | null>(null);

  // Suggested reply animation state
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0);
  const [isTypingText, setIsTypingText] = useState(true);
  const [isTypingGuidance, setIsTypingGuidance] = useState(false);
  const [showReply] = useState(true);
  const [hasCompletedFirstCycle, setHasCompletedFirstCycle] = useState(false);
  const [showBulbIcon, setShowBulbIcon] = useState(false);

  const isMountedRef = useRef(true);

  const textOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(4)).current;

  // Dark theme colors (always dark, matching the soft paywall dark mode)
  const accentColor = "#7DD3C0";
  const accentColorLight = "rgba(125, 211, 192, 0.2)";
  const cardBg = "#000000";
  const cardBorderColor = "transparent";
  const textColor = "#EDEDED";
  const textTertiary = "#6B7280";
  const buttonBg = "#1F1F22";
  const buttonTextColor = "#E5E7EB";
  const iconColor = "#E5E7EB";
  const dividerColor = "#374151";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    loadOfferings();

    return () => {
      isMountedRef.current = false;
      textOpacity.stopAnimation();
      fadeAnim.stopAnimation();
      cardOpacity.stopAnimation();
      cardTranslateY.stopAnimation();
    };
  }, []);

  const handleTextComplete = () => {
    if (!isMountedRef.current) return;
    setIsTypingText(false);
    if (!hasCompletedFirstCycle) {
      setShowBulbIcon(true);
      setIsTypingGuidance(true);
    } else {
      setTimeout(() => {
        if (!isMountedRef.current) return;
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          if (!isMountedRef.current) return;
          setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);
          setTimeout(() => {
            if (!isMountedRef.current) return;
            setIsTypingText(true);
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }).start();
          }, 150);
        });
      }, 2500);
    }
  };

  const handleGuidanceComplete = () => {
    if (!isMountedRef.current) return;
    setIsTypingGuidance(false);
    setHasCompletedFirstCycle(true);

    setTimeout(() => {
      if (!isMountedRef.current) return;
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (!isMountedRef.current) return;
        setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setIsTypingText(true);
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }, 150);
      });
    }, 2500);
  };

  const loadOfferings = async () => {
    if (!isRevenueCatEnabled()) {
      setError("Payments are not available on this platform");
      setIsLoading(false);
      return;
    }

    const result = await getOfferings();
    if (result.ok && result.data.current) {
      const pkgMap = new Map<string, PurchasesPackage>();
      result.data.current.availablePackages.forEach((pkg: PurchasesPackage) => {
        pkgMap.set(pkg.identifier, pkg);
      });
      setPackages(pkgMap);

      const updatedPlans = DEFAULT_PLANS.map((plan) => {
        const pkg = pkgMap.get(plan.identifier);
        if (pkg) {
          const priceStr = pkg.product.priceString;
          const subtitle =
            plan.id === "monthly"
              ? `Billed monthly · ${priceStr}/month`
              : `Billed annually · ${priceStr}/year ($4.99/month equivalent)`;
          return { ...plan, price: priceStr, subtitle };
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
      useSubscriptionStore.getState().setHasPaidSubscription(true);
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
        useSubscriptionStore.getState().setHasPaidSubscription(true);
      } else {
        setError("No active subscriptions found");
      }
    } else {
      setError("Could not restore purchases");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050608" }}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#050608", "#0A0A0C", "#050608"]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Klarity title */}
        <Animated.View style={{ opacity: fadeAnim, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: "#EDEDED",
              }}
            >
              Klarity
            </Text>
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={28} color="#EDEDED" />
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 0,
                  right: 0,
                  bottom: 4,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={14} color="#EDEDED" />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Suggested Reply Card */}
        <Animated.View
          style={{
            alignSelf: "flex-start",
            width: "100%",
            marginBottom: 20,
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              padding: 16,
              borderWidth: 0,
              borderColor: cardBorderColor,
              minHeight: 156,
            }}
          >
            {/* Accent left edge */}
            <LinearGradient
              colors={[accentColorLight, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: "absolute",
                left: 16,
                top: 16,
                height: 48,
                width: 3,
                borderRadius: 2,
              }}
            />

            {/* Reply text */}
            <Animated.View
              style={{
                paddingLeft: 12,
                position: "relative",
                opacity: textOpacity,
                minHeight: 48,
              }}
            >
              {showReply && isTypingText ? (
                <TypewriterText
                  key={`reply-${currentReplyIndex}`}
                  text={SUGGESTED_REPLIES[currentReplyIndex].text}
                  style={{ fontSize: 15, lineHeight: 24, color: textColor }}
                  speed={75}
                  startDelay={hasCompletedFirstCycle ? 200 : 0}
                  onComplete={handleTextComplete}
                />
              ) : showReply ? (
                <Text style={{ fontSize: 15, lineHeight: 24, color: textColor }}>
                  {SUGGESTED_REPLIES[currentReplyIndex].text}
                </Text>
              ) : null}
            </Animated.View>

            {/* Guidance note */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginTop: 8,
                paddingLeft: 12,
              }}
            >
              <Ionicons
                name="bulb-outline"
                size={12}
                color={textTertiary}
                style={{ marginTop: 2, marginRight: 6, opacity: showBulbIcon ? 1 : 0 }}
              />
              <Animated.View
                style={{
                  flex: 1,
                  opacity: hasCompletedFirstCycle
                    ? textOpacity
                    : showReply && !isTypingText && (isTypingGuidance || hasCompletedFirstCycle)
                    ? 1
                    : 0,
                }}
              >
                {isTypingGuidance && !hasCompletedFirstCycle ? (
                  <TypewriterText
                    key={`guidance-${currentReplyIndex}`}
                    text={SUGGESTED_REPLIES[currentReplyIndex].guidanceNote}
                    style={{ fontSize: 13, lineHeight: 18, color: textTertiary }}
                    speed={70}
                    onComplete={handleGuidanceComplete}
                  />
                ) : (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: textTertiary }}>
                    {SUGGESTED_REPLIES[currentReplyIndex].guidanceNote}
                  </Text>
                )}
              </Animated.View>
            </View>

            {/* Action buttons row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                opacity:
                  showReply && (hasCompletedFirstCycle || (!isTypingText && !isTypingGuidance))
                    ? 1
                    : 0,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: buttonBg,
                  }}
                >
                  <Ionicons name="copy-outline" size={14} color={buttonTextColor} />
                  <Text style={{ fontSize: 13, fontWeight: "500", color: buttonTextColor }}>
                    Use this reply
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="happy-outline" size={16} color={iconColor} />
                </View>
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="remove-outline" size={16} color={iconColor} />
                </View>
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="add-outline" size={16} color={iconColor} />
                </View>
                <View style={{ width: 1, height: 16, backgroundColor: dividerColor, marginHorizontal: 4 }} />
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="thumbs-up-outline" size={16} color={iconColor} />
                </View>
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="thumbs-down-outline" size={16} color={iconColor} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text
            style={{
              fontSize: 16,
              color: "#A1A8B0",
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 24,
              paddingHorizontal: 8,
            }}
          >
            Your free trial has ended. Subscribe to keep navigating every conversation with clarity.
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
                backgroundColor: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  backgroundColor: "rgba(59,130,246,0.15)",
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
                  color: "#EDEDED",
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
                      ? "rgba(59,130,246,0.12)"
                      : "rgba(255,255,255,0.03)",
                    borderWidth: 2,
                    borderColor: isSelected ? "#3B82F6" : "rgba(255,255,255,0.06)",
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? "#3B82F6" : "#6B7280",
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

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#EDEDED" }}>
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
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
                            {plan.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: "#A1A8B0", marginTop: 2 }}>
                      {plan.subtitle}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#EDEDED" }}>
                    {plan.price}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Fine print */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 20 }}>
          <Text
            style={{
              fontSize: 14,
              color: "#A1A8B0",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {selectedPlan === "annual" ? "$59.99/year" : "$9.99/month"} · Cancel anytime · Easy to find cancel option
          </Text>
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
            <Text style={{ color: "#EF4444", fontSize: 14, textAlign: "center" }}>
              {error}
            </Text>
          </View>
        )}

        {/* Subscribe Button */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 24 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={isLoading || isPurchasing || packages.size === 0}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
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
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>
                  Continue with Klarity Pro
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
            style={{ marginTop: 16, paddingVertical: 12, alignItems: "center" }}
          >
            {isRestoring ? (
              <ActivityIndicator color="#A1A8B0" size="small" />
            ) : (
              <Text style={{ fontSize: 15, color: "#A1A8B0" }}>Restore Purchases</Text>
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
                Linking.openURL("https://www.notion.so/Klarity-Terms-of-Service-312419876aa5807c98a4e92ae5e91179");
              }}
            >
              <Text style={{ fontSize: 13, color: "#9CA3AF", textDecorationLine: "underline" }}>
                Terms of Service
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL("https://www.notion.so/Klarity-Privacy-Policy-312419876aa580e8ab13c9df40960fb3");
              }}
            >
              <Text style={{ fontSize: 13, color: "#9CA3AF", textDecorationLine: "underline" }}>
                Privacy Policy
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
              }}
            >
              <Text style={{ fontSize: 13, color: "#9CA3AF", textDecorationLine: "underline" }}>
                EULA
              </Text>
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: "#6B7280",
              textAlign: "center",
              marginTop: 16,
              lineHeight: 18,
              paddingHorizontal: 16,
            }}
          >
            Klarity Pro Subscription{"\n\n"}Monthly: $9.99 per month{"\n"}Annual: $59.99 per year ($4.99/month equivalent){"\n\n"}3-day free trial. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.{"\n\n"}Payment will be charged to your Apple ID account at confirmation of purchase.{"\n\n"}Manage or cancel in your Apple ID account settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
