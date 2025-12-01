import React from "react";
import { createStackNavigator, TransitionSpecs, CardStyleInterpolators } from "@react-navigation/stack";
import { InputScreen } from "../screens/InputScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { LogDetailScreen } from "../screens/LogDetailScreen";
import { RelationshipDirectionScreen } from "../screens/RelationshipDirectionScreen";
import { GuidanceScreen } from "../screens/GuidanceScreen";

export type RootStackParamList = {
  InputScreen: undefined;
  ChatScreen: undefined;
  CalendarScreen: undefined;
  LogDetailScreen: {
    date: string;
    entryIds: string[];
  };
  RelationshipDirectionScreen: undefined;
  GuidanceScreen: {
    intention: import("../types/calendar").IntentionType;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        cardStyle: { backgroundColor: "transparent" },
        cardOverlayEnabled: true,
        detachPreviousScreen: false, // CRITICAL: Keep both screens mounted
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="InputScreen"
        component={InputScreen}
        options={{
          gestureEnabled: false,
          cardStyle: { backgroundColor: "black" },
          // Add parallax effect to InputScreen when ChatScreen slides over it
          cardStyleInterpolator: ({ current, next, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: next
                      ? next.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -layouts.screen.width * 0.3], // Parallax - move 30% left
                        })
                      : 0,
                  },
                  {
                    scale: next
                      ? next.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.95], // Slight scale down for depth
                        })
                      : 1,
                  },
                ],
                opacity: next
                  ? next.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.7], // Dim when ChatScreen is on top
                    })
                  : 1,
              },
            };
          },
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          gestureEnabled: false,
          cardStyle: { backgroundColor: "transparent" },
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
                  outputRange: [0, 0.5], // Dark overlay on InputScreen
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: 'spring',
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
      <Stack.Screen name="CalendarScreen" component={CalendarScreen}
        options={{
          gestureEnabled: false,
          cardStyle: { backgroundColor: "transparent" },
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-layouts.screen.width, 0], // Slide from left
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5], // Dark overlay on InputScreen
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: 'spring',
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
      <Stack.Screen name="LogDetailScreen" component={LogDetailScreen} />

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

      {/* Guidance Screen - Horizontal slide from right */}
      <Stack.Screen
        name="GuidanceScreen"
        component={GuidanceScreen}
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
    </Stack.Navigator>
  );
}
