import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions, KeyboardAvoidingView, Platform, Animated, PanResponder } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { InputBar, InputMode, InputBarRef } from "../components/InputBar";
import { Header } from "../components/Header";
import { SlideOverDrawer } from "../components/SlideOverDrawer";
import { VoiceRecordingVisualizer } from "../components/VoiceRecordingVisualizer";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";
import { VoiceProcessingIndicator } from "../components/VoiceProcessingIndicator";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { transcribeAudio } from "../api/transcribe-audio";
import { MessageMode } from "../types/chat";

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
  const [inputMode, setInputMode] = useState<InputMode>("understand");

  // Track if this is the first focus (skip animation on initial app load)
  const isFirstFocus = useRef(true);
  // Track current input mode for navigation
  const inputModeRef = useRef<InputMode>(inputMode);
  inputModeRef.current = inputMode;
  // Ref for input bar to focus programmatically
  const inputBarRef = useRef<InputBarRef>(null);

  // Content area animation values (using React Native Animated)
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  // Bottom elements animation values
  const bottomOpacity = useRef(new Animated.Value(1)).current;
  const bottomTranslateY = useRef(new Animated.Value(0)).current;

  const activeLoopId = useLoopsStore((s) => s.activeLoopId);
  const getActiveLoop = useLoopsStore((s) => s.getActiveLoop);
  const createNewLoop = useLoopsStore((s) => s.createNewLoop);
  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);

  // Get active loop - this will re-render when activeLoopId changes
  const activeLoop = getActiveLoop();

  // Animation duration
  const CONTENT_TRANSITION_DURATION = 250;

  // Pan responder for swipe to open drawer
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes starting from left edge
        return gestureState.dx > 20 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Right swipe to open drawer
        if (gestureState.dx > 80 && gestureState.vx > 0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsDrawerOpen(true);
        }
      },
    })
  ).current;

  // Ensure we always have an active loop
  useEffect(() => {
    const activeLoop = getActiveLoop();
    if (!activeLoop) {
      createNewLoop();
    }
    // Focus input bar on mount to bring up keyboard
    setTimeout(() => {
      inputBarRef.current?.focus();
    }, 300);
  }, []);

  // Animate content in when screen gains focus using navigation listener
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("[InputScreen] Focus event - isFirstFocus:", isFirstFocus.current);

      // Focus the input bar when screen gains focus
      setTimeout(() => {
        inputBarRef.current?.focus();
      }, 100);

      // Skip animation on initial app load, animate on subsequent focuses (returning from other screens)
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      // Reset to starting position instantly (invisible, offset)
      contentOpacity.setValue(0);
      contentTranslateY.setValue(30);
      bottomOpacity.setValue(0);
      bottomTranslateY.setValue(20);

      // Then animate in
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: CONTENT_TRANSITION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: CONTENT_TRANSITION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(bottomOpacity, {
          toValue: 1,
          duration: CONTENT_TRANSITION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslateY, {
          toValue: 0,
          duration: CONTENT_TRANSITION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return unsubscribe;
  }, [navigation]);

  // Navigation helper functions
  const navigateToChatScreen = () => {
    navigation.navigate("ChatScreen", { inputMode: inputModeRef.current });
  };

  // Animate content out before navigation
  const animateContentOutAndNavigate = () => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: CONTENT_TRANSITION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: -20,
        duration: CONTENT_TRANSITION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(bottomOpacity, {
        toValue: 0,
        duration: CONTENT_TRANSITION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(bottomTranslateY, {
        toValue: 15,
        duration: CONTENT_TRANSITION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigateToChatScreen();
    });
  };

  const handleSend = () => {
    if (!currentInput.trim() && !selectedImageUri) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Ensure we have an active loop
    let activeLoop = getActiveLoop();
    if (!activeLoop) {
      createNewLoop();
      activeLoop = getActiveLoop();
    }

    // Add user message to active loop with mode
    const messageMode = inputMode as "rewrite" | "understand";
    console.log("[InputScreen] Sending message with mode:", messageMode);

    addMessageToActiveLoop({
      id: Date.now().toString(),
      role: "user",
      content: currentInput || "[Image]",
      timestamp: Date.now(),
      imageUrl: selectedImageUri,
      imageBase64: selectedImageBase64,
      mode: messageMode,
    });

    // Animate content out then navigate to chat screen
    animateContentOutAndNavigate();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        const voiceMessageMode = inputMode as "rewrite" | "understand";
        console.log("[InputScreen] Sending voice message with mode:", voiceMessageMode);
        addMessageToActiveLoop({
          id: Date.now().toString(),
          role: "user",
          content: transcription,
          timestamp: Date.now(),
          isVoiceMessage: true,
          mode: voiceMessageMode,
        });

        // Navigate to chat screen for AI response
        setIsProcessing(false);
        setProcessingMessage("");
        animateContentOutAndNavigate();
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

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Main content */}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
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
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <Header
            onMenuPress={() => setIsDrawerOpen(true)}
            inputMode={inputMode}
            onModeChange={setInputMode}
          />

          {/* Center Content */}
          <Animated.View
            style={{
              flex: 1,
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            {isRecording ? (
              <View style={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
                <Text
                  style={{ fontSize: 20, fontWeight: "500", marginBottom: 24, color: "#9CA3AF" }}
                >
                  Recording...
                </Text>
                <VoiceRecordingVisualizer isRecording={isRecording} barCount={35} />
                <Text style={{ color: "#E5E7EB", fontSize: 14, marginTop: 24 }}>
                  Tap the stop button when done
                </Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Input Bar */}
          <Animated.View
            style={{
              opacity: bottomOpacity,
              transform: [{ translateY: bottomTranslateY }],
            }}
          >
            <InputBar
              ref={inputBarRef}
              value={currentInput}
              onChangeText={setCurrentInput}
              onSend={handleSend}
              onVoicePress={handleVoicePress}
              onImageSelected={handleImageSelected}
              onClearImage={handleClearImage}
              selectedImageUri={selectedImageUri}
              placeholder="Type a message..."
              isRecording={isRecording}
              inputMode={inputMode}
              autoFocus
            />
          </Animated.View>

          {/* Processing Overlay */}
          {isProcessing && <VoiceProcessingIndicator />}
        </KeyboardAvoidingView>
      </View>

      {/* Slide Over Drawer - outside main content so it's not affected by transform */}
      <SlideOverDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </View>
  );
}
