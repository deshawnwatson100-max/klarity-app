import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SplashScreen } from "./src/components/SplashScreen";
import { PINSetupScreen } from "./src/components/PINSetupScreen";
import { UnlockScreen } from "./src/components/UnlockScreen";
import { storePIN, getPIN, hasPIN } from "./src/utils/secureStorage";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

type AppState = "splash" | "setup" | "locked" | "unlocked";

export default function App() {
  const [appState, setAppState] = useState<AppState>("splash");
  const [storedPIN, setStoredPIN] = useState<string>("");

  useEffect(() => {
    // Check if PIN exists when app loads
    checkPINStatus();
  }, []);

  const checkPINStatus = async () => {
    const pinExists = await hasPIN();
    if (pinExists) {
      const pin = await getPIN();
      setStoredPIN(pin || "");
    }
  };

  const handleSplashFinish = async () => {
    // Check if user has set up a PIN
    const pinExists = await hasPIN();
    if (pinExists) {
      const pin = await getPIN();
      setStoredPIN(pin || "");
      setAppState("locked");
    } else {
      // First time - show PIN setup
      setAppState("setup");
    }
  };

  const handlePINSetupComplete = async (pin: string) => {
    await storePIN(pin);
    setStoredPIN(pin);
    setAppState("unlocked");
  };

  const handleUnlock = () => {
    setAppState("unlocked");
  };

  // Show splash screen
  if (appState === "splash") {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // Show PIN setup for first-time users
  if (appState === "setup") {
    return <PINSetupScreen onSetupComplete={handlePINSetupComplete} />;
  }

  // Show unlock screen
  if (appState === "locked") {
    return <UnlockScreen onUnlock={handleUnlock} storedPIN={storedPIN} />;
  }

  // Main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
