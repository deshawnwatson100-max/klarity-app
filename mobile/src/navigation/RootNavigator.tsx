import React, { useState, useEffect, useRef } from "react";
import { View, Text, Animated, AppState, AppStateStatus } from "react-native";
import { createStackNavigator, TransitionSpecs, CardStyleInterpolators } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { InputScreen } from "../screens/InputScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { RelationshipDirectionScreen } from "../screens/RelationshipDirectionScreen";
import { SuggestionsScreen } from "../screens/SuggestionsScreen";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { CommunicationStylesScreen } from "../screens/CommunicationStylesScreen";
import { StyleDetailScreen } from "../screens/StyleDetailScreen";
import { EmotionScanScreen } from "../screens/EmotionScanScreen";
import { LegalScreen } from "../screens/LegalScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { PaywallScreen } from "../screens/PaywallScreen";
import { HardPaywallScreen } from "../screens/HardPaywallScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { useOnboardingStore } from "../state/onboardingStore";
import { useSubscriptionStore, isInTrialWindow } from "../state/subscriptionStore";import { hasEntitlement, isRevenueCatEnabled } from "../lib/revenuecatClient";
import { scheduleTrialEndReminder } from "../lib/notifications";
import { useTheme } from "../theme";

export type RootStackParamList = {
  InputScreen: undefined;
  ChatScreen: { inputMode?: "understand" | "rewrite"; triggerDeepSearch?: boolean; showPersonContextCard?: boolean } | undefined;
  EmotionScanScreen: undefined;
  AnalysisScreen: {
    analysis: import("../types/chat").EmotionalAnalysis;
    userMessage: string;
  };
  RelationshipDirectionScreen: undefined;
  SuggestionsScreen: {
    intention: import("../types/calendar").IntentionType;
  };
  CommunicationStylesScreen: undefined;
  StyleDetailScreen: {
    profileId: string;
  };
  LegalScreen: {
    tab?: "terms" | "privacy";
  };
  SettingsScreen: undefined;
  PaywallScreen: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors } = useTheme();
  const hasPaidSubscription = useSubscriptionStore((s) => s.hasPaidSubscription);
  const showHardPaywall = useSubscriptionStore((s) => s.showHardPaywall);
  const startTrial = useSubscriptionStore((s) => s.startTrial);
  const setHasPaidSubscription = useSubscriptionStore((s) => s.setHasPaidSubscription);
  const setRequiresPaywallOnResume = useSubscriptionStore((s) => s.setRequiresPaywallOnResume);
  const setShowHardPaywall = useSubscriptionStore((s) => s.setShowHardPaywall);

  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Wait for both stores to hydrate from AsyncStorage
  useEffect(() => {
    let onboardingHydrated = useOnboardingStore.persist.hasHydrated();
    let subscriptionHydrated = useSubscriptionStore.persist.hasHydrated();

    const checkHydration = () => {
      if (!onboardingHydrated || !subscriptionHydrated) return;

      const completed = useOnboardingStore.getState().hasCompletedOnboarding;
      setShowOnboarding(!completed);
      setShowSplash(completed);
      setIsHydrated(true);

      // If onboarding is already completed but trial hasn't started,
      // start the trial now (handles users who existed before trial was added)
      if (completed) {
        const subState = useSubscriptionStore.getState();
        if (subState.trialStartedAt === null && !subState.hasPaidSubscription) {
          subState.startTrial();
          const newTrialStart = useSubscriptionStore.getState().trialStartedAt;
          if (newTrialStart) {
            scheduleTrialEndReminder(newTrialStart);
          }
        }
      }
    };

    const unsubscribeOnboarding = useOnboardingStore.persist.onFinishHydration(() => {
      onboardingHydrated = true;
      checkHydration();
    });

    const unsubscribeSubscription = useSubscriptionStore.persist.onFinishHydration(() => {
      subscriptionHydrated = true;
      checkHydration();
    });

    // If both already hydrated
    checkHydration();

    return () => {
      unsubscribeOnboarding();
      unsubscribeSubscription();
    };
  }, []);

  // Check subscription status on launch — only dismiss paywall if user is now paid/in trial.
  // Post-trial users without a subscription can browse freely; paywall only appears
  // when they attempt to generate a response (via paywallGate).
  useEffect(() => {
    if (!isHydrated) return;

    const checkSubscription = async () => {
      // If RevenueCat is configured, check the real subscription status
      if (isRevenueCatEnabled()) {
        const result = await hasEntitlement("premium");
        if (result.ok) {
          setHasPaidSubscription(result.data);
          if (result.data) {
            // Paid — make sure paywall is dismissed
            setShowHardPaywall(false);
            return;
          }
        }
      }

      // Only hide the paywall if the user is in their trial window.
      // If trial is expired, we do NOT proactively show the hard paywall here —
      // it will appear when they try to generate a response (paywallGate).
      const currentTrialStartedAt = useSubscriptionStore.getState().trialStartedAt;
      const inTrial = isInTrialWindow(currentTrialStartedAt);
      const paid = useSubscriptionStore.getState().hasPaidSubscription;

      if (inTrial || paid) {
        setShowHardPaywall(false);
      }
      // If !inTrial && !paid: leave showHardPaywall as-is (false on fresh open)
    };

    checkSubscription();
  }, [isHydrated, hasPaidSubscription]);


  // When app goes to background/inactive, mark that the paywall-on-resume flag should
  // be reset on next launch (full close resets it). When app returns to foreground
  // mid-session, show the paywall if they had been blocked before.
  // On a full app close + reopen, requiresPaywallOnResume is cleared so users
  // can browse freely and only hit the paywall when generating a response.
  useEffect(() => {
    if (!isHydrated) return;

    // Clear the resume flag on mount — this handles the "full app close + reopen" case.
    // The flag persists to AsyncStorage, so we reset it here on every fresh launch.
    setRequiresPaywallOnResume(false);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const paid = useSubscriptionStore.getState().hasPaidSubscription;
      const inTrial = isInTrialWindow(useSubscriptionStore.getState().trialStartedAt);

      // If user doesn't have access, flag for paywall on resume (background switch, not full close)
      if (!paid && !inTrial) {
        if (nextState === "background" || nextState === "inactive") {
          setRequiresPaywallOnResume(true);
        } else if (nextState === "active") {
          const shouldShow = useSubscriptionStore.getState().requiresPaywallOnResume;
          if (shouldShow) {
            setRequiresPaywallOnResume(false);
            setShowHardPaywall(true);
          }
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isHydrated]);

  // Handle splash screen animations
  useEffect(() => {
    if (showSplash && isHydrated) {
      // Fade in content smoothly
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Wait 1.2 seconds, then fade out over 400ms
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [showSplash, isHydrated, fadeAnim, contentFadeAnim]);

  // Show loading state while hydrating (blank screen with background color)
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    );
  }

  // For new users, show onboarding (which has its own splash)
  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => {
      startTrial(); // Start 3-day trial when onboarding completes
      // Schedule trial-end reminder for 2 days from now (1 day before expiry)
      const trialStartedAt = useSubscriptionStore.getState().trialStartedAt ?? Date.now();
      scheduleTrialEndReminder(trialStartedAt);
      setShowOnboarding(false);
    }} />;
  }

  // Hard paywall: trial expired and no paid subscription
  if (showHardPaywall) {
    return <HardPaywallScreen />;
  }

  // Main app with splash overlay for returning users
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        cardStyle: { backgroundColor: "#050608" },
        cardOverlayEnabled: false,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="InputScreen"
        component={InputScreen}
        options={{
          gestureEnabled: false,
          cardStyle: { backgroundColor: "#050608" },
          cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          gestureEnabled: false,
          cardStyle: { backgroundColor: "#050608" },
          cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
        }}
      />
      {/* Analysis Screen - iOS horizontal slide from right */}
      <Stack.Screen
        name="AnalysisScreen"
        component={AnalysisScreen}
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyle: { backgroundColor: "#050505" },
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0], // Slide from right
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5], // Dark overlay
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: "spring",
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: TransitionSpecs.TransitionIOSSpec,
          },
        }}
      />

      {/* Relationship Direction Selector - Modal presentation */}
      <Stack.Screen
        name="RelationshipDirectionScreen"
        component={RelationshipDirectionScreen}
        options={{
          presentation: "modal",
          gestureEnabled: true,
          gestureDirection: "vertical",
          cardStyle: { backgroundColor: "transparent" },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0], // Slide from bottom
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.7], // Dark overlay
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: "spring",
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: TransitionSpecs.TransitionIOSSpec,
          },
        }}
      />

      {/* Suggestions Screen - Horizontal slide from right */}
      <Stack.Screen
        name="SuggestionsScreen"
        component={SuggestionsScreen}
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyle: { backgroundColor: "#050505" },
          cardStyleInterpolator: ({ current, next, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0], // Slide from right
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3], // Subtle overlay
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: "spring",
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: TransitionSpecs.TransitionIOSSpec,
          },
        }}
      />

      {/* Communication Styles Screen - iOS horizontal slide from right */}
      <Stack.Screen
        name="CommunicationStylesScreen"
        component={CommunicationStylesScreen}
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyle: { backgroundColor: "#050505" },
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0], // Slide from right
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5], // Dark overlay
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: "spring",
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: TransitionSpecs.TransitionIOSSpec,
          },
        }}
      />

      {/* Style Detail Screen - iOS horizontal slide from right */}
      <Stack.Screen
        name="StyleDetailScreen"
        component={StyleDetailScreen}
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyle: { backgroundColor: "#050505" },
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0], // Slide from right
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5], // Dark overlay
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: "spring",
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: TransitionSpecs.TransitionIOSSpec,
          },
        }}
      />

      {/* Emotion Scan Screen - Full screen modal */}
      <Stack.Screen
        name="EmotionScanScreen"
        component={EmotionScanScreen}
        options={{
          presentation: "modal",
          gestureEnabled: false,
          cardStyle: { backgroundColor: "black" },
        }}
      />

      {/* Legal Screen - Terms of Service & Privacy Policy */}
      <Stack.Screen
        name="LegalScreen"
        component={LegalScreen}
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyle: { backgroundColor: "#0A0A0B" },
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />

      {/* Settings Screen */}
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyle: { backgroundColor: "#0A0A0B" },
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />

      {/* Paywall Screen - Modal presentation from bottom */}
      <Stack.Screen
        name="PaywallScreen"
        component={PaywallScreen}
        options={{
          presentation: "modal",
          gestureEnabled: true,
          gestureDirection: "vertical",
          cardStyle: { backgroundColor: "#050608" },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.7],
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: "spring",
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: TransitionSpecs.TransitionIOSSpec,
          },
        }}
      />

      </Stack.Navigator>

      {/* Splash screen overlay for returning users */}
      {showSplash && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
            opacity: fadeAnim,
          }}
        >
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              opacity: contentFadeAnim,
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: colors.textPrimary,
                marginRight: 10,
              }}
            >
              Klarity
            </Text>
            <View style={{ position: "relative", width: 28, height: 28 }}>
              <Ionicons
                name="chatbubble-outline"
                size={28}
                color={colors.textPrimary}
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={14} color={colors.textPrimary} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}
