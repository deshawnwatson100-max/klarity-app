import React from "react";
import { createStackNavigator, TransitionSpecs, CardStyleInterpolators } from "@react-navigation/stack";
import { InputScreen } from "../screens/InputScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { RelationshipDirectionScreen } from "../screens/RelationshipDirectionScreen";
import { SuggestionsScreen } from "../screens/SuggestionsScreen";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { CommunicationStylesScreen } from "../screens/CommunicationStylesScreen";
import { StyleDetailScreen } from "../screens/StyleDetailScreen";
import { EmotionScanScreen } from "../screens/EmotionScanScreen";

export type RootStackParamList = {
  InputScreen: undefined;
  ChatScreen: { inputMode?: "understand" | "rewrite" } | undefined;
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
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
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

    </Stack.Navigator>
  );
}
