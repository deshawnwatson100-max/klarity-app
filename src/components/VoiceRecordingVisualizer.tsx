import React, { useEffect, useMemo, useRef } from "react";
import { View, Animated, Easing } from "react-native";

interface VoiceRecordingVisualizerProps {
  isRecording: boolean;
  barCount?: number;
}

// Individual bar component to properly use hooks
function AnimatedBar({ isRecording, index }: { isRecording: boolean; index: number }) {
  const height = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      const randomDelay = Math.random() * 300;
      const randomDuration = 300 + Math.random() * 400;
      const randomHeight = 0.3 + Math.random() * 0.7;

      // Animate opacity to visible
      Animated.timing(opacity, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Start the height animation after delay
      const timeoutId = setTimeout(() => {
        const startHeightAnimation = () => {
          animationRef.current = Animated.sequence([
            Animated.timing(height, {
              toValue: randomHeight,
              duration: randomDuration,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              useNativeDriver: false, // Can't use native driver for height percentage
            }),
            Animated.timing(height, {
              toValue: 0.2,
              duration: randomDuration,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              useNativeDriver: false,
            }),
          ]);
          animationRef.current.start(() => {
            if (isRecording) {
              startHeightAnimation();
            }
          });
        };
        startHeightAnimation();
      }, randomDelay);

      return () => {
        clearTimeout(timeoutId);
        if (animationRef.current) {
          animationRef.current.stop();
        }
      };
    } else {
      // Stop animation and reset
      if (animationRef.current) {
        animationRef.current.stop();
      }
      Animated.parallel([
        Animated.timing(height, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRecording]);

  // Interpolate height value to percentage string
  const heightInterpolated = height.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={{
        width: 3,
        backgroundColor: "#3B82F6",
        borderRadius: 999,
        height: heightInterpolated,
        opacity: opacity,
      }}
    />
  );
}

export function VoiceRecordingVisualizer({
  isRecording,
  barCount = 40,
}: VoiceRecordingVisualizerProps) {
  const bars = useMemo(() => Array.from({ length: barCount }, (_, i) => i), [barCount]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        height: 128,
      }}
    >
      {bars.map((index) => (
        <AnimatedBar key={index} isRecording={isRecording} index={index} />
      ))}
    </View>
  );
}
