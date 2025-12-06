import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface EmotionalFaceScanBubbleProps {
  onBeginScan: () => void;
}

export function EmotionalFaceScanBubble({
  onBeginScan,
}: EmotionalFaceScanBubbleProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });

    // Subtle pulsing glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePressIn = () => {
    pulseScale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    pulseScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          maxWidth: "100%",
          marginBottom: 16,
          paddingHorizontal: 4,
        },
        animatedStyle,
      ]}
    >
      {/* Premium card bubble */}
      <View
        className="rounded-3xl px-6 py-6 mb-3"
        style={{
          backgroundColor: "#0A0A0C",
          borderWidth: 1.5,
          borderColor: "#7DD3C025",
          shadowColor: "#7DD3C0",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          maxWidth: "95%",
        }}
      >
        {/* Animated glow layer behind card */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderRadius: 26,
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "#7DD3C0",
            },
            glowAnimatedStyle,
          ]}
        />

        {/* Header row */}
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-lg font-medium"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
              fontWeight: "500",
            }}
          >
            Face Scan Emotional Reading
          </Text>
        </View>

        {/* Subtitle */}
        <Text
          className="text-sm leading-5 mb-4"
          style={{
            fontFamily: "SF Pro Display",
            color: "#9CA3AF",
            fontWeight: "400",
          }}
        >
          Scan your face to understand how you are feeling inside.
        </Text>

        {/* Center emotional waveform visual */}
        <View className="items-center justify-center mb-5 py-4">
          <View className="relative">
            {/* Outer aura ring */}
            <Animated.View
              style={[
                {
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 2,
                  borderColor: "#7DD3C030",
                  position: "absolute",
                  top: -10,
                  left: -10,
                },
                glowAnimatedStyle,
              ]}
            />

            {/* Middle aura ring */}
            <Animated.View
              style={[
                {
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  borderWidth: 2,
                  borderColor: "#B8A3E840",
                  position: "absolute",
                  top: -4,
                  left: -4,
                },
                glowAnimatedStyle,
              ]}
            />

            {/* Center circle with gradient */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#111114",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#7DD3C050",
              }}
            >
              <LinearGradient
                colors={["#7DD3C020", "#B8A3E820", "#7DD3C020"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 40,
                }}
              />
              <Ionicons name="scan-outline" size={32} color="#7DD3C0" />
            </View>
          </View>

          {/* Waveform bars visualization */}
          <View className="flex-row items-center gap-2 mt-4">
            {[16, 24, 20, 28, 18, 26, 22].map((height, index) => (
              <Animated.View
                key={index}
                style={[
                  {
                    width: 3,
                    height,
                    borderRadius: 2,
                    backgroundColor: "#7DD3C0",
                    opacity: 0.4,
                  },
                  glowAnimatedStyle,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Primary action button */}
        <Animated.View style={pulseAnimatedStyle}>
          <Pressable
            onPress={onBeginScan}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className="active:opacity-90"
            style={{
              backgroundColor: "#7DD3C018",
              borderWidth: 1.5,
              borderColor: "#7DD3C0",
              borderRadius: 20,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: "#7DD3C0",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
            }}
          >
            <Ionicons name="scan-outline" size={20} color="#7DD3C0" />
            <Text
              className="font-semibold text-base"
              style={{
                fontFamily: "SF Pro Display",
                color: "#E5E7EB",
                fontWeight: "600",
              }}
            >
              Begin Scan
            </Text>
          </Pressable>
        </Animated.View>

        {/* Optional secondary note */}
        <Text
          className="text-xs leading-4 mt-4 text-center"
          style={{
            fontFamily: "SF Pro Display",
            color: "#6B7280",
            fontWeight: "400",
          }}
        >
          Your emotional insights will automatically be logged to your clarity
          calendar.
        </Text>
      </View>
    </Animated.View>
  );
}
