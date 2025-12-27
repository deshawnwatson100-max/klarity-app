import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

interface VoiceRecordingVisualizerProps {
  isRecording: boolean;
  barCount?: number;
}

// Individual bar component to properly use hooks
function AnimatedBar({ isRecording, index }: { isRecording: boolean; index: number }) {
  const height = useSharedValue(0.2);

  useEffect(() => {
    if (isRecording) {
      const randomDelay = Math.random() * 300;
      const randomDuration = 300 + Math.random() * 400;
      const randomHeight = 0.3 + Math.random() * 0.7;

      setTimeout(() => {
        height.value = withRepeat(
          withSequence(
            withTiming(randomHeight, {
              duration: randomDuration,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }),
            withTiming(0.2, {
              duration: randomDuration,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            })
          ),
          -1,
          false
        );
      }, randomDelay);
    } else {
      cancelAnimation(height);
      height.value = withTiming(0.2, { duration: 200 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value * 100}%`,
    opacity: isRecording ? 0.9 : 0.3,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-[3px] bg-blue-500 rounded-full"
    />
  );
}

export function VoiceRecordingVisualizer({
  isRecording,
  barCount = 40,
}: VoiceRecordingVisualizerProps) {
  const bars = useMemo(() => Array.from({ length: barCount }, (_, i) => i), [barCount]);

  return (
    <View className="flex-row items-center justify-center gap-[3px] h-32">
      {bars.map((index) => (
        <AnimatedBar key={index} isRecording={isRecording} index={index} />
      ))}
    </View>
  );
}
