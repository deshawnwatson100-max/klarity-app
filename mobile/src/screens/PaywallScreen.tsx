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
  Switch,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
import { TypewriterText } from "../components/TypewriterText";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
  type PurchasesPackage,
} from "../lib/revenuecatClient";
import {
  useSubscriptionStore,
  isInTrialWindow,
} from "../state/subscriptionStore";
import {
  requestNotificationPermissions,
  scheduleTrialEndReminder,
  cancelTrialReminder,
} from "../lib/notifications";

type Props = StackScreenProps<RootStackParamList, "PaywallScreen">;

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

// Suggested replies with guidance notes that cycle with typewriter effect
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

export function PaywallScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const hasPaidSubscription = useSubscriptionStore((s) => s.hasPaidSubscription);
  const trialStartedAt = useSubscriptionStore((s) => s.trialStartedAt);
  const inTrial = isInTrialWindow(trialStartedAt);
  const previewAsPro = route.params?.previewAsPro ?? false;
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [packages, setPackages] = useState<Map<string, PurchasesPackage>>(new Map());
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [plans, setPlans] = useState<PlanOption[]>(DEFAULT_PLANS);
  const [error, setError] = useState<string | null>(null);
  const [notifyBeforeCharge, setNotifyBeforeCharge] = useState(true);

  // Suggested reply animation state
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0);
  const [isTypingText, setIsTypingText] = useState(true);
  const [isTypingGuidance, setIsTypingGuidance] = useState(false);
  const [showReply, setShowReply] = useState(true);
  const [hasCompletedFirstCycle, setHasCompletedFirstCycle] = useState(false);
  const [showBulbIcon, setShowBulbIcon] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Animation for text cycling (used after first cycle)
  const textOpacity = useRef(new Animated.Value(1)).current;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(4)).current;

  // Theme-aware colors matching SuggestedReplyCard exactly
  const accentColor = isDark ? "#7DD3C0" : "#34C759";
  const accentColorLight = isDark ? "rgba(125, 211, 192, 0.2)" : "rgba(52, 199, 89, 0.2)";
  const cardBg = isDark ? "#000000" : "#FFFFFF";
  const cardBorderColor = isDark ? "transparent" : "rgba(0, 0, 0, 0.08)";
  const textColor = isDark ? "#EDEDED" : "#1C1C1E";
  const textTertiary = isDark ? "#6B7280" : "#8E8E93";
  const buttonBg = isDark ? "#1F1F22" : "#F5F5F7";
  const buttonTextColor = isDark ? "#E5E7EB" : "#1C1C1E";
  const iconColor = isDark ? "#E5E7EB" : "#636366";
  const dividerColor = isDark ? "#374151" : "rgba(0, 0, 0, 0.1)";

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Card entrance animation - matching SuggestedReplyCard exactly
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

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      textOpacity.stopAnimation();
      fadeAnim.stopAnimation();
      cardOpacity.stopAnimation();
      cardTranslateY.stopAnimation();
    };
  }, []);

  // Cycle through suggested replies - text completes first, then guidance
  const handleTextComplete = () => {
    if (!isMountedRef.current) return;
    setIsTypingText(false);
    if (!hasCompletedFirstCycle) {
      // First cycle: show guidance with typewriter
      setShowBulbIcon(true);
      setIsTypingGuidance(true);
    } else {
      // After first cycle: wait then cycle to next text only
      setTimeout(() => {
        if (!isMountedRef.current) return;
        // Smooth fade out the text
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          if (!isMountedRef.current) return;
          // Move to next reply
          setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);

          // Small delay before starting to type again
          setTimeout(() => {
            if (!isMountedRef.current) return;
            setIsTypingText(true);
            // Smooth fade text back in
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

    // Wait, then start cycling only the text
    setTimeout(() => {
      if (!isMountedRef.current) return;
      // Smooth fade out the text
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (!isMountedRef.current) return;
        // Move to next reply
        setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);

        // Small delay before starting to type again
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setIsTypingText(true);
          // Smooth fade text back in
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

      // Update plans with actual prices from RevenueCat
      const updatedPlans = DEFAULT_PLANS.map((plan) => {
        const pkg = pkgMap.get(plan.identifier);
        if (pkg) {
          const priceStr = pkg.product.priceString;
          const subtitle =
            plan.id === "monthly"
              ? `Billed monthly · ${priceStr}/month`
              : `Billed annually · ${priceStr}/year ($4.99/month equivalent)`;
          return {
            ...plan,
            price: priceStr,
            subtitle,
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

  // Paying user — show confirmation screen
  if (hasPaidSubscription || previewAsPro) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LinearGradient
          colors={isDark ? ["#050608", "#0A0A0C", "#050608"] : ["#FFFFFF", "#F8F9FA", "#FFFFFF"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        {/* Close */}
        <Pressable
          onPress={handleClose}
          style={{ position: "absolute", top: insets.top + 12, right: 16, zIndex: 10, padding: 8 }}
        >
          <View
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </View>
        </Pressable>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          {/* Badge */}
          <View
            style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: isDark ? "rgba(52,211,153,0.15)" : "rgba(52,199,89,0.12)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Ionicons name="checkmark-circle" size={44} color="#34C759" />
          </View>

          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.textPrimary, marginBottom: 10, textAlign: "center" }}>
            Klarity Pro
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
            You have full access to all Klarity Pro features. Thanks for subscribing.
          </Text>

          {/* Feature list */}
          {FEATURES.map((feature) => (
            <View
              key={feature.title}
              style={{
                flexDirection: "row", alignItems: "center",
                width: "100%", marginBottom: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#34C759" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 15, color: colors.textPrimary, flex: 1 }}>{feature.title}</Text>
            </View>
          ))}

          {/* Manage subscription */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL("https://apps.apple.com/account/subscriptions");
            }}
            style={{
              marginTop: 32,
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderRadius: 14,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          >
            <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: "500" }}>
              Manage Subscription
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
        {/* Klarity title above card */}
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
                color: colors.textPrimary,
              }}
            >
              Klarity
            </Text>
            {/* New chat loop icon */}
            <View style={{ position: "relative" }}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textPrimary} />
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
                <Ionicons name="add" size={14} color={colors.textPrimary} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Suggested Reply Card - matching SuggestedReplyCard exactly */}
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
              borderWidth: isDark ? 0 : 1,
              borderColor: cardBorderColor,
              shadowColor: isDark ? "transparent" : "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0 : 0.06,
              shadowRadius: 8,
              minHeight: 156,
            }}
          >
            {/* Soft accent gradient left edge - persistent */}
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

            {/* Reply text with accent glow - matching ReplyItem */}
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
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: textColor,
                  }}
                  speed={75}
                  startDelay={hasCompletedFirstCycle ? 200 : 0}
                  onComplete={handleTextComplete}
                />
              ) : showReply ? (
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: textColor,
                  }}
                >
                  {SUGGESTED_REPLIES[currentReplyIndex].text}
                </Text>
              ) : null}
            </Animated.View>

            {/* Guidance Note - subtle - always rendered to maintain position */}
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
                style={{
                  marginTop: 2,
                  marginRight: 6,
                  opacity: showBulbIcon ? 1 : 0,
                }}
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
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: textTertiary,
                    }}
                    speed={70}
                    onComplete={handleGuidanceComplete}
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: textTertiary,
                    }}
                  >
                    {SUGGESTED_REPLIES[currentReplyIndex].guidanceNote}
                  </Text>
                )}
              </Animated.View>
            </View>

            {/* Action buttons row - always rendered to maintain position */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                opacity: showReply && (hasCompletedFirstCycle || (!isTypingText && !isTypingGuidance)) ? 1 : 0,
              }}
            >
              {/* Primary action buttons */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {/* Use this reply button */}
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
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: buttonTextColor,
                    }}
                  >
                    Use this reply
                  </Text>
                </View>
              </View>

              {/* Icon buttons row */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Emoji button */}
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="happy-outline" size={16} color={iconColor} />
                </View>

                {/* Shorter button */}
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="remove-outline" size={16} color={iconColor} />
                </View>

                {/* Longer button */}
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="add-outline" size={16} color={iconColor} />
                </View>

                {/* Divider */}
                <View style={{ width: 1, height: 16, backgroundColor: dividerColor, marginHorizontal: 4 }} />

                {/* Like button */}
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="thumbs-up-outline" size={16} color={iconColor} />
                </View>

                {/* Dislike button */}
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

        {/* Free Trial Info */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 20 }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            3-day free trial of Klarity Pro, then {selectedPlan === "annual" ? "$59.99/year" : "$9.99/month"} · Cancel anytime
          </Text>
        </Animated.View>

        {/* Notification Toggle */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 16 }}>
          <Pressable
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const newValue = !notifyBeforeCharge;
              if (newValue) {
                const granted = await requestNotificationPermissions();
                if (granted) {
                  const trialStartedAt = useSubscriptionStore.getState().trialStartedAt;
                  if (trialStartedAt) {
                    await scheduleTrialEndReminder(trialStartedAt);
                  }
                  setNotifyBeforeCharge(true);
                } else {
                  setNotifyBeforeCharge(false);
                }
              } else {
                await cancelTrialReminder();
                setNotifyBeforeCharge(false);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textPrimary,
                  flex: 1,
                }}
              >
                Remind me before trial ends
              </Text>
            </View>
            <Switch
              value={notifyBeforeCharge}
              onValueChange={async (value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (value) {
                  const granted = await requestNotificationPermissions();
                  if (granted) {
                    const trialStartedAt = useSubscriptionStore.getState().trialStartedAt;
                    if (trialStartedAt) {
                      await scheduleTrialEndReminder(trialStartedAt);
                    }
                    setNotifyBeforeCharge(true);
                  } else {
                    // Permission denied — keep toggle off
                    setNotifyBeforeCharge(false);
                  }
                } else {
                  await cancelTrialReminder();
                  setNotifyBeforeCharge(false);
                }
              }}
              trackColor={{ false: isDark ? "#39393D" : "#E5E5EA", true: "#3B82F6" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#39393D" : "#E5E5EA"}
            />
          </Pressable>
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
                  Start 3-Day Free Trial
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
                Linking.openURL("https://www.notion.so/Klarity-Terms-of-Service-312419876aa5807c98a4e92ae5e91179");
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textDecorationLine: "underline",
                }}
              >
                Terms of Service
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL("https://www.notion.so/Klarity-Privacy-Policy-312419876aa580e8ab13c9df40960fb3");
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textDecorationLine: "underline",
                }}
              >
                Privacy Policy
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textDecorationLine: "underline",
                }}
              >
                EULA
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
            Klarity Pro Subscription{"\n\n"}Monthly: $9.99 per month{"\n"}Annual: $59.99 per year ($4.99/month equivalent){"\n\n"}3-day free trial. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.{"\n\n"}Payment will be charged to your Apple ID account at confirmation of purchase.{"\n\n"}Manage or cancel in your Apple ID account settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
