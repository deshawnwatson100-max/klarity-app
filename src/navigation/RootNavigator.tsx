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
        animation: "none", // Disable default animation to use custom gesture
        contentStyle: { backgroundColor: "#000000" },
        gestureEnabled: false, // Disable native gestures by default
      }}
    >
      <Stack.Screen
        name="InputScreen"
        component={InputScreen}
        options={{
          gestureEnabled: false, // Prevent system back gesture on home screen
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          gestureEnabled: false, // Use custom gesture instead
        }}
      />
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
      <Stack.Screen name="LogDetailScreen" component={LogDetailScreen} />
    </Stack.Navigator>
  );
}
