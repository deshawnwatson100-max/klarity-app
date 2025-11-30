import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { InputScreen } from "../screens/InputScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { LogDetailScreen } from "../screens/LogDetailScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  InputScreen: undefined;
  ChatScreen: undefined;
  CalendarScreen: undefined;
  LogDetailScreen: {
    date: string;
    entryIds: string[];
  };
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Wrapper components for tab screens
function HomeTabScreen() {
  return <ChatScreen navigation={{} as any} route={{} as any} />;
}

function CalendarTabScreen() {
  return <CalendarScreen navigation={{} as any} route={{} as any} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "#262626",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#B4FF39",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarTabScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#000000" },
      }}
    >
      <Stack.Screen name="InputScreen" component={InputScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="LogDetailScreen" component={LogDetailScreen} />
    </Stack.Navigator>
  );
}
