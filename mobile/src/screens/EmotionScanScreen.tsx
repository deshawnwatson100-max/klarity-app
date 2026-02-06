import React, { useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CameraView,
  CameraType,
  useCameraPermissions,
} from "expo-camera";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useLoopsStore } from "../state/loopsStore";
import { analyzeFacialEmotion } from "../api/klarity-api";
import { EmotionScanResultMessage } from "../types/chat";

type Props = StackScreenProps<RootStackParamList, "EmotionScanScreen">;

export function EmotionScanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("front");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addMessageToActiveLoop = useLoopsStore((s) => s.addMessageToActiveLoop);

  const handleClose = () => {
    navigation.goBack();
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing || isAnalyzing) return;

    try {
      setIsCapturing(true);

      // Take photo using the correct method
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo || !photo.base64) {
        setIsCapturing(false);
        return;
      }

      setIsCapturing(false);
      setIsAnalyzing(true);

      // Analyze facial emotion
      const emotionAnalysis = await analyzeFacialEmotion(photo.base64);

      // Add emotion scan result to active loop
      const emotionScanMsg: EmotionScanResultMessage = {
        id: Date.now().toString() + "_emotion_scan",
        role: "emotion-scan-result",
        content: emotionAnalysis.fullSummary,
        timestamp: Date.now(),
        emotionAnalysis,
      };
      addMessageToActiveLoop(emotionScanMsg);

      // Navigate back to chat
      navigation.navigate("ChatScreen");
    } catch (error) {
      console.error("Error capturing or analyzing photo:", error);
      setIsCapturing(false);
      setIsAnalyzing(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#5EEAD4" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-white text-lg text-center mb-6">
          Camera access is needed for emotional face scanning
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-teal-500 px-6 py-3 rounded-full active:opacity-70"
        >
          <Text className="text-white font-medium">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        enableTorch={false}
      >
        {/* Overlay UI */}
        <View
          className="absolute top-0 left-0 right-0 bottom-0 z-10"
          style={{ paddingTop: insets.top }}
        >
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-4 py-4">
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-black/40 active:opacity-70"
            >
              <Ionicons name="close" size={24} color="#F9FAFB" />
            </Pressable>

            <Text
              className="text-base font-light"
              style={{ color: "#F9FAFB", letterSpacing: 0.5 }}
            >
              Emotion Face Scan
            </Text>

            <Pressable
              onPress={toggleCameraFacing}
              className="w-10 h-10 items-center justify-center rounded-full bg-black/40 active:opacity-70"
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#F9FAFB" />
            </Pressable>
          </View>

          {/* Center Guide */}
          <View className="flex-1 items-center justify-center">
            {/* Face guide oval */}
            <View
              style={{
                width: 240,
                height: 320,
                borderRadius: 120,
                borderWidth: 2,
                borderColor: "rgba(94, 234, 212, 0.5)",
                borderStyle: "dashed",
              }}
            />

            {/* Instruction text */}
            <Text
              className="text-sm font-light mt-6 text-center"
              style={{ color: "#F9FAFB", letterSpacing: 0.3 }}
            >
              {isAnalyzing
                ? "Analyzing your emotional state..."
                : "Position your face within the guide"}
            </Text>
          </View>

          {/* Bottom Bar */}
          <View
            className="items-center pb-10"
            style={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}
          >
            {isAnalyzing ? (
              <View className="items-center">
                <ActivityIndicator size="large" color="#5EEAD4" />
                <Text
                  className="text-sm font-light mt-3"
                  style={{ color: "#F9FAFB" }}
                >
                  Processing...
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleCapture}
                disabled={isCapturing}
                className="active:opacity-70"
              >
                {/* Capture button with gradient glow */}
                <View>
                  {/* Outer glow */}
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      right: -6,
                      bottom: -6,
                      borderRadius: 50,
                      opacity: 0.6,
                    }}
                  >
                    <LinearGradient
                      colors={[
                        "rgba(180, 255, 57, 0.4)",
                        "rgba(94, 234, 212, 0.4)",
                        "rgba(139, 92, 246, 0.4)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        borderRadius: 50,
                        shadowColor: "#5EEAD4",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 20,
                      }}
                    />
                  </View>

                  {/* Button */}
                  <View
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      padding: 3,
                      overflow: "hidden",
                    }}
                  >
                    <LinearGradient
                      colors={[
                        "rgba(180, 255, 57, 0.5)",
                        "rgba(94, 234, 212, 0.5)",
                        "rgba(139, 92, 246, 0.5)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        borderRadius: 38,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: "#050608",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="scan" size={32} color="#F9FAFB" />
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}
