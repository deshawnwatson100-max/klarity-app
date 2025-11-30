import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { InputBar } from "../components/InputBar";
import { Header } from "../components/Header";
import { LoopHistoryPanel } from "../components/LoopHistoryPanel";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = StackScreenProps<RootStackParamList, "InputScreen">;

export function InputScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentInput, setCurrentInput] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | undefined>();

  // Shared values for swipe transition
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const canNavigate = useSharedValue(false);
  const opacity = useSharedValue(1);

  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);
  const isHistoryPanelOpen = useLoopsStore((s) => s.isHistoryPanelOpen);
  const setHistoryPanelOpen = useLoopsStore((s) => s.setHistoryPanelOpen);

  const activeLoop = getActiveLoop();

  // Update shared value when messages change
  useEffect(() => {
    canNavigate.value = !!(activeLoop && activeLoop.messages.length > 0);
  }, [activeLoop?.messages.length]);

  // Ensure we always have an active loop
  useEffect(() => {
    const activeLoop = getActiveLoop();
    if (!activeLoop) {
      createNewLoop();
    }
  }, []);

  // Reset animation values when screen is focused
  useEffect(() => {
    translateX.value = 0;
    scale.value = 1;
    opacity.value = 1;
  }, []);

  const handleSend = () => {
    if (!currentInput.trim() && !selectedImageUri) return;

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
      content: currentInput || "[Image]",
      timestamp: Date.now(),
      imageUrl: selectedImageUri,
      imageBase64: selectedImageBase64,
    });

    // Navigate to chat screen
    navigation.navigate("ChatScreen");
    setCurrentInput("");
    setSelectedImageUri(undefined);
    setSelectedImageBase64(undefined);
  };

  const handleImageSelected = (uri: string, base64: string) => {
    setSelectedImageUri(uri);
    setSelectedImageBase64(base64);
  };

  const handleClearImage = () => {
    setSelectedImageUri(undefined);
    setSelectedImageBase64(undefined);
  };

  const handleVoicePress = () => {
    // TODO: Implement voice input
    console.log("Voice input pressed");
  };

  // Handler for navigating to chat screen (must be wrapped with runOnJS)
  const handleNavigateToChat = () => {
    navigation.navigate("ChatScreen");
  };

  // Handler for opening past loops panel (must be wrapped with runOnJS)
  const handleOpenPastLoops = () => {
    setHistoryPanelOpen(true);
  };

  // Handler for navigating to calendar screen (must be wrapped with runOnJS)
  const handleNavigateToCalendar = () => {
    navigation.navigate("CalendarScreen");
  };

  // Swipe gesture handler - handles both left and right swipes
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          // Handle left swipe (to ChatScreen/Past Loops)
          if (event.translationX < -80) {
            translateX.value = event.translationX;
            scale.value = interpolate(
              Math.abs(event.translationX),
              [0, 150],
              [1, 0.92],
              Extrapolate.CLAMP
            );
            opacity.value = interpolate(
              Math.abs(event.translationX),
              [0, 100],
              [1, 0.7],
              Extrapolate.CLAMP
            );
          }
          // Handle right swipe (to Calendar)
          else if (event.translationX > 80) {
            translateX.value = event.translationX;
            scale.value = interpolate(
              event.translationX,
              [0, 150],
              [1, 0.92],
              Extrapolate.CLAMP
            );
            opacity.value = interpolate(
              event.translationX,
              [0, 100],
              [1, 0.7],
              Extrapolate.CLAMP
            );
          }
        })
        .onEnd((event) => {
          // Left swipe - navigate to ChatScreen or open Past Loops
          if (event.velocityX < -800 && event.translationX < -120) {
            if (canNavigate.value) {
              translateX.value = withTiming(-400, { duration: 120 }, (finished) => {
                if (finished) {
                  runOnJS(handleNavigateToChat)();
                }
              });
              scale.value = withTiming(0.85, { duration: 120 });
              opacity.value = withTiming(0, { duration: 120 });
            } else {
              translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
              scale.value = withSpring(1, { damping: 20, stiffness: 300 });
              opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
              runOnJS(handleOpenPastLoops)();
            }
          }
          // Right swipe - navigate to Calendar
          else if (event.velocityX > 800 && event.translationX > 120) {
            translateX.value = withTiming(400, { duration: 120 }, (finished) => {
              if (finished) {
                runOnJS(handleNavigateToCalendar)();
              }
            });
            scale.value = withTiming(0.85, { duration: 120 });
            opacity.value = withTiming(0, { duration: 120 });
          }
          // Spring back if gesture didn't meet threshold
          else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            scale.value = withSpring(1, { damping: 20, stiffness: 300 });
            opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
          }
        }),
    [navigation]
  );

  // Animated style for the swipe transition
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
    // Add shadow during transition for depth effect
    shadowOpacity: interpolate(
      Math.abs(translateX.value),
      [0, 400],
      [0, 0.3],
      Extrapolate.CLAMP
    ),
    shadowRadius: 20,
    shadowColor: "#000000",
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: 'black' }, animatedContainerStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
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
            onImageSelected={handleImageSelected}
            onClearImage={handleClearImage}
            selectedImageUri={selectedImageUri}
            placeholder="Type a message..."
          />

          {/* History Panel */}
          <LoopHistoryPanel
            visible={isHistoryPanelOpen}
            onClose={() => setHistoryPanelOpen(false)}
          />
        </KeyboardAvoidingView>
      </Animated.View>
    </GestureDetector>
  );
}
