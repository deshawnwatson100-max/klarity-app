import React, { useState, useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
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
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { useOnboardingStore } from "../state/onboardingStore";
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
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Wait for store to hydrate from AsyncStorage
  useEffect(() => {
    // Check if the store has been hydrated
    const unsubscribe = useOnboardingStore.persist.onFinishHydration(() => {
      const completed = useOnboardingStore.getState().hasCompletedOnboarding;
      setShowOnboarding(!completed);
      setShowSplash(completed); // Show splash for returning users
      setIsHydrated(true);
    });

    // If already hydrated (happens on fast loads)
    if (useOnboardingStore.persist.hasHydrated()) {
      const completed = useOnboardingStore.getState().hasCompletedOnboarding;
      setShowOnboarding(!completed);
      setShowSplash(completed);
      setIsHydrated(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle splash screen fade out for returning users
  useEffect(() => {
    if (showSplash && isHydrated) {
      // Wait 2 seconds, then fade out over 400ms
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSplash, isHydrated, fadeAnim]);

  // Show loading state while hydrating (blank screen with background color)
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    );
  }

  // For new users, show onboarding (which has its own splash)
  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  // For returning users, show splash first then main app
  if (showSplash) {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          opacity: fadeAnim,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
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
        </View>
      </Animated.View>
    );
  }

  // Main app
  return (
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
  );
}
