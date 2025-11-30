import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { InputScreen } from "../screens/InputScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { LogDetailScreen } from "../screens/LogDetailScreen";

export type RootStackParamList = {
  InputScreen: undefined;
  ChatScreen: undefined;
  CalendarScreen: undefined;
  LogDetailScreen: {
    date: string;
    entryIds: string[];
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "default", // Use default iOS animation
        contentStyle: { backgroundColor: "#000000" },
        gestureEnabled: false, // Disable native gestures
        presentation: "card", // Card presentation shows screen below
      }}
    >
      <Stack.Screen
        name="InputScreen"
        component={InputScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          gestureEnabled: false,
          presentation: "card", // Card presentation for layered effect
          animation: "default",
        }}
      />
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
      <Stack.Screen name="LogDetailScreen" component={LogDetailScreen} />
    </Stack.Navigator>
  );
}
