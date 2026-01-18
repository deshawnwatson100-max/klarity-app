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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../theme";
import { KlarityLogo } from "../components/KlarityLogo";
import { TypewriterText } from "../components/TypewriterText";
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

// Suggested replies with guidance notes that cycle with typewriter effect
const SUGGESTED_REPLIES = [
  {
    text: "I appreciate you sharing that with me",
    guidanceNote: "Acknowledges their vulnerability without overcommitting",
  },
  {
    text: "Let me think about that and get back to you",
    guidanceNote: "Buys time while showing you take it seriously",
  },
  {
    text: "I hear what you are saying",
    guidanceNote: "Validates without necessarily agreeing",
  },
  {
    text: "That makes sense, thank you for explaining",
    guidanceNote: "Shows understanding and appreciation",
  },
  {
    text: "I understand where you are coming from",
    guidanceNote: "Demonstrates empathy while staying neutral",
  },
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

  // Suggested reply animation state
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0);
  const [isTypingText, setIsTypingText] = useState(true);
  const [isTypingGuidance, setIsTypingGuidance] = useState(false);
  const [showReply, setShowReply] = useState(true);
  const [hasCompletedFirstCycle, setHasCompletedFirstCycle] = useState(false);

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
  }, []);

  // Cycle through suggested replies - text completes first, then guidance
  const handleTextComplete = () => {
    setIsTypingText(false);
    if (!hasCompletedFirstCycle) {
      // First cycle: show guidance with typewriter
      setIsTypingGuidance(true);
    } else {
      // After first cycle: wait then cycle to next text only
      setTimeout(() => {
        // Fade out just the text
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          // Move to next reply
          setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);
          setIsTypingText(true);

          // Fade text back in
          textOpacity.setValue(1);
        });
      }, 2000);
    }
  };

  const handleGuidanceComplete = () => {
    setIsTypingGuidance(false);
    setHasCompletedFirstCycle(true);

    // Wait, then start cycling only the text
    setTimeout(() => {
      // Fade out just the text
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        // Move to next reply
        setCurrentReplyIndex((prev) => (prev + 1) % SUGGESTED_REPLIES.length);
        setIsTypingText(true);

        // Fade text back in
        textOpacity.setValue(1);
      });
    }, 2000);
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
            }}
          >
            {/* Reply text with accent glow - matching ReplyItem */}
            <Animated.View
              style={{
                paddingLeft: 12,
                position: "relative",
                opacity: isTypingText ? 1 : textOpacity,
              }}
            >
              {/* Soft accent gradient left edge */}
              <LinearGradient
                colors={[accentColorLight, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  borderRadius: 2,
                }}
              />
              {showReply && isTypingText ? (
                <TypewriterText
                  key={`reply-${currentReplyIndex}`}
                  text={SUGGESTED_REPLIES[currentReplyIndex].text}
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: textColor,
                  }}
                  speed={85}
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

            {/* Guidance Note - subtle */}
            {showReply && !isTypingText && (isTypingGuidance || hasCompletedFirstCycle) && (
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
                  style={{ marginTop: 2, marginRight: 6 }}
                />
                {isTypingGuidance && !hasCompletedFirstCycle ? (
                  <View style={{ flex: 1 }}>
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
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: textTertiary,
                      flex: 1,
                    }}
                  >
                    {hasCompletedFirstCycle
                      ? SUGGESTED_REPLIES[0].guidanceNote
                      : SUGGESTED_REPLIES[currentReplyIndex].guidanceNote}
                  </Text>
                )}
              </View>
            )}

            {/* Action buttons row */}
            {showReply && (hasCompletedFirstCycle || (!isTypingText && !isTypingGuidance)) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
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
            )}
          </View>
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
