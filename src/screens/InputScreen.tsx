import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { InputBar } from "../components/InputBar";
import { Header } from "../components/Header";
import { SlideOverDrawer } from "../components/SlideOverDrawer";
import { VoiceRecordingVisualizer } from "../components/VoiceRecordingVisualizer";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { transcribeAudio } from "../api/transcribe-audio";
import { getOpenAITextResponse } from "../api/chat-service";

type Props = StackScreenProps<RootStackParamList, "InputScreen">;

export function InputScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentInput, setCurrentInput] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Track if this is the first focus (skip animation on initial app load)
  const isFirstFocus = useRef(true);

  // Content area animation values (for focused chat area transition)
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  // Bottom elements animation values (feature buttons and input bar)
  const bottomOpacity = useSharedValue(1);
  const bottomTranslateY = useSharedValue(0);

  // Track if we can navigate to chat (has messages)
  const canNavigate = useSharedValue(false);

  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);

  // Get active loop - this will re-render when activeLoopId changes
  const activeLoop = getActiveLoop();

  // iOS-native easing for content transitions
  const CONTENT_TRANSITION_DURATION = 250;
  const CONTENT_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

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

  // Animate content in when screen gains focus using navigation listener
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("[InputScreen] Focus event - isFirstFocus:", isFirstFocus.current);

      // Skip animation on initial app load, animate on subsequent focuses (returning from other screens)
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      // Cancel any running animations first
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslateY);
      cancelAnimation(bottomOpacity);
      cancelAnimation(bottomTranslateY);

      // Reset to starting position instantly (invisible, offset)
      contentOpacity.value = 0;
      contentTranslateY.value = 30;
      bottomOpacity.value = 0;
      bottomTranslateY.value = 20;

      // Small delay to ensure reset is applied before animation starts
      setTimeout(() => {
        // Then animate in
        contentOpacity.value = withTiming(1, {
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
        });
        contentTranslateY.value = withTiming(0, {
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
        });

        // Animate bottom elements (input bar)
        bottomOpacity.value = withTiming(1, {
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
        });
        bottomTranslateY.value = withTiming(0, {
          duration: CONTENT_TRANSITION_DURATION,
          easing: CONTENT_EASING,
        });
      }, 16); // One frame delay
    });

    return unsubscribe;
  }, [navigation]);

  // Animated style for content area (center content only)
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  // Animated style for bottom elements (feature buttons and input bar)
  const bottomAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
    transform: [{ translateY: bottomTranslateY.value }],
  }));

  // Navigation helper functions for runOnJS
  const navigateToChatScreen = () => {
    navigation.navigate("ChatScreen");
  };

  const navigateToCalendarScreen = () => {
    navigation.navigate("CalendarScreen");
  };

  // Animate content out before navigation
  const animateContentOutAndNavigate = (destination: "ChatScreen" | "CalendarScreen") => {
    // Fade out and slide up slightly - center content
    contentOpacity.value = withTiming(0, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
    contentTranslateY.value = withTiming(-20, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    }, (finished) => {
      if (finished) {
        if (destination === "ChatScreen") {
          runOnJS(navigateToChatScreen)();
        } else {
          runOnJS(navigateToCalendarScreen)();
        }
      }
    });

    // Fade out bottom elements - slide down slightly for natural exit
    bottomOpacity.value = withTiming(0, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
    bottomTranslateY.value = withTiming(15, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
  };

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

    // Animate content out then navigate to chat screen
    animateContentOutAndNavigate("ChatScreen");
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

  const handleVoicePress = async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setProcessingMessage("Microphone permission denied");
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording", error);
      setProcessingMessage("Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);
      setProcessingMessage("Stopping recording...");

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        setProcessingMessage("Failed to get recording");
        setIsProcessing(false);
        return;
      }

      // Transcribe the audio
      setProcessingMessage("Transcribing your voice...");

      try {
        const transcription = await transcribeAudio(uri);

        if (!transcription) {
          setProcessingMessage("Failed to transcribe audio");
          setIsProcessing(false);
          return;
        }

        // Analyze the transcription with AI
        setProcessingMessage("Analyzing your message...");

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
          content: transcription,
          timestamp: Date.now(),
          isVoiceMessage: true, // Mark as voice message for emotion analysis
        });

        // Navigate to chat screen for AI response
        setIsProcessing(false);
        setProcessingMessage("");
        animateContentOutAndNavigate("ChatScreen");
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        setProcessingMessage("Unable to transcribe audio. Please check your connection and try again.");
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingMessage("");
        }, 3000);
      }

    } catch (error) {
      console.error("Error processing recording:", error);
      setProcessingMessage("Failed to process recording");
      setIsProcessing(false);
      setRecording(null);
    }
  };

  // Handler for navigating to chat screen with animation
  const handleNavigateToChat = () => {
    animateContentOutAndNavigate("ChatScreen");
  };

  // Handler for navigating to calendar screen with animation
  const handleNavigateToCalendar = () => {
    animateContentOutAndNavigate("CalendarScreen");
  };

  // Swipe gesture handler - triggers content animation, not full-screen swipe
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-50, 50])
        .onEnd((event) => {
          // Left swipe - navigate to ChatScreen (only if has messages)
          if (event.velocityX < -500 && event.translationX < -80) {
            if (canNavigate.value) {
              runOnJS(handleNavigateToChat)();
            }
          }
          // Right swipe - navigate to Calendar
          else if (event.velocityX > 500 && event.translationX > 80) {
            runOnJS(handleNavigateToCalendar)();
          }
        }),
    []
  );

  // Static container style (no full-screen animation - content area animates instead)
  const animatedContainerStyle = useAnimatedStyle(() => ({
    flex: 1,
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        {/* Deep charcoal background - minimal and calming */}
        <LinearGradient
          colors={["#050608", "#0A0A0C", "#050608"]}
          locations={[0, 0.5, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        {/* Soft flares - monochromatic minimal glow - Layer 1 */}
        <SoftFlares />

        {/* Floating particles - cool-toned minimal - Layer 2 */}
        <FloatingParticles count={20} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          <Header onMenuPress={() => setIsDrawerOpen(true)} />

          {/* Center Content - Animated for transitions */}
          <Animated.View style={[{ flex: 1 }, contentAnimatedStyle]} className="items-center justify-center px-6">
            {isRecording ? (
              <View className="items-center justify-center w-full">
                <Text
                  className="text-xl font-medium mb-6"
                  style={{ color: "#9CA3AF" }}
                >
                  Recording...
                </Text>
                <VoiceRecordingVisualizer isRecording={isRecording} barCount={35} />
                <Text style={{ color: "#E5E7EB" }} className="text-sm mt-6">
                  Tap the stop button when done
                </Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Bottom Elements - Input Bar - Animated for transitions */}
          <Animated.View style={bottomAnimatedStyle}>
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
              isRecording={isRecording}
            />
          </Animated.View>

          {/* Processing Overlay */}
          {isProcessing && (
            <View className="absolute inset-0 bg-black/80 items-center justify-center z-50">
              <View className="bg-neutral-900 rounded-2xl p-6 items-center">
                <ActivityIndicator size="large" color="#B4FF39" />
                {processingMessage && (
                  <Text className="text-white text-base mt-4 text-center">
                    {processingMessage}
                  </Text>
                )}
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        {/* Slide Over Drawer */}
        <SlideOverDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </Animated.View>
    </GestureDetector>
  );
}
