import React from "react";
import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InputBar } from "../components/InputBar";
import { Header } from "../components/Header";
import { useChatStore } from "../state/chatStore";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "InputScreen">;

export function InputScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const currentInput = useChatStore((s) => s.currentInput);
  const setCurrentInput = useChatStore((s) => s.setCurrentInput);
  const addMessage = useChatStore((s) => s.addMessage);

  const handleSend = () => {
    if (!currentInput.trim()) return;

    // Add user message
    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: Date.now(),
    });

    // Navigate to chat screen
    navigation.navigate("ChatScreen");
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
        <Text className="text-neutral-400 text-2xl font-light text-center leading-relaxed">
          How can I help bring clarity?
        </Text>
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
    </View>
  );
}
