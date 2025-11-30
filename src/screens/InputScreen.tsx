import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InputBar } from "../components/InputBar";
import { Header } from "../components/Header";
import { LoopHistoryPanel } from "../components/LoopHistoryPanel";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "InputScreen">;

export function InputScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentInput, setCurrentInput] = useState("");

  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  // Ensure we always have an active loop
  useEffect(() => {
    const activeLoop = getActiveLoop();
    if (!activeLoop) {
      createNewLoop();
    }
  }, []);

  const handleSend = () => {
    if (!currentInput.trim()) return;

    // Ensure we have an active loop
    let activeLoop = getActiveLoop();
    if (!activeLoop) {
      createNewLoop();
      activeLoop = getActiveLoop();
    }

    // Add user message to active loop
    addMessageToActiveLoop({
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: Date.now(),
    });

    // Navigate to main tabs (chat screen)
    navigation.navigate("MainTabs");
    setCurrentInput("");
  };

  const handleVoicePress = () => {
    // TODO: Implement voice input
    console.log("Voice input pressed");
  };

  const handlePlusPress = () => {
    // TODO: Implement image upload or other options
    console.log("Plus button pressed");
  };

  return (
    <View className="flex-1 bg-black">
      <Header />

      {/* Center Content */}
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-neutral-400 text-2xl font-light text-center leading-relaxed mb-12">
          How can I help bring clarity?
        </Text>

        {/* Calendar Quick Access */}
        <Pressable
          onPress={() => navigation.navigate("MainTabs")}
          className="active:opacity-80"
        >
          <View
            style={{
              shadowColor: "#B4FF39",
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 8,
            }}
            className="bg-neutral-950 border border-[#B4FF39] rounded-2xl px-8 py-5 flex-row items-center"
          >
            <View
              style={{
                backgroundColor: "#B4FF39",
                shadowColor: "#B4FF39",
                shadowOpacity: 0.6,
                shadowRadius: 10,
              }}
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
            >
              <Ionicons name="calendar" size={24} color="#000" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold mb-1">
                View Your Timeline
              </Text>
              <Text className="text-neutral-400 text-sm">
                Track your emotional journey
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#B4FF39" />
          </View>
        </Pressable>
      </View>

      {/* Input Bar */}
      <InputBar
        value={currentInput}
        onChangeText={setCurrentInput}
        onSend={handleSend}
        onVoicePress={handleVoicePress}
        onPlusPress={handlePlusPress}
        placeholder="Type a message..."
      />

      {/* History Panel */}
      <LoopHistoryPanel
        visible={isHistoryPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
      />
    </View>
  );
}
