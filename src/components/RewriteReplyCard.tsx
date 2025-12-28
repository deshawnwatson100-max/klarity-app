import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { TypewriterText } from "./TypewriterText";

interface RewriteReplyCardProps {
  rewrittenReply: string;
  originalIntent: string;
  onUseReply: (reply: string) => void;
}

export function RewriteReplyCard({
  rewrittenReply,
  originalIntent,
  onUseReply,
}: RewriteReplyCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [hasAnimatedReply, setHasAnimatedReply] = React.useState(false);
  const [hasAnimatedIntent, setHasAnimatedIntent] = React.useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  React.useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCopy = async () => {
    await Clipboard.setStringAsync(rewrittenReply);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseReply = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withTiming(1, { duration: 100 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUseReply(rewrittenReply);
  };

  return (
    <Animated.View style={[{ marginBottom: 12, paddingRight: 20 }, animatedStyle]}>
      {/* Reply Card */}
      <View
        style={{
          backgroundColor: "#1A1A1C",
          borderRadius: 16,
          padding: 16,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 12,
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Polished Reply
          </Text>
          <Pressable
            onPress={handleCopy}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {copied ? (
              <Ionicons name="checkmark" size={16} color="#22C55E" />
            ) : (
              <Ionicons name="copy-outline" size={16} color="#6B7280" />
            )}
          </Pressable>
        </View>

        {/* Rewritten Reply */}
        {!hasAnimatedReply ? (
          <TypewriterText
            text={rewrittenReply}
            style={{
              color: "#EDEDED",
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 12,
            }}
            speed={45}
            onComplete={() => setHasAnimatedReply(true)}
          />
        ) : (
          <Text
            style={{
              color: "#EDEDED",
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 12,
            }}
          >
            {rewrittenReply}
          </Text>
        )}

        {/* Original Intent Note */}
        <View
          style={{
            backgroundColor: "#0D0D0E",
            borderRadius: 8,
            padding: 10,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: "#6B7280",
              fontSize: 12,
              fontWeight: "500",
              marginBottom: 2,
            }}
          >
            Your intent:
          </Text>
          {hasAnimatedReply && !hasAnimatedIntent ? (
            <TypewriterText
              key="originalIntent"
              text={originalIntent}
              style={{
                color: "#9CA3AF",
                fontSize: 13,
                lineHeight: 18,
              }}
              speed={40}
              onComplete={() => setHasAnimatedIntent(true)}
            />
          ) : hasAnimatedIntent ? (
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {originalIntent}
            </Text>
          ) : null}
        </View>

        {/* Use This Reply Button */}
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={handleUseReply}
            style={{
              backgroundColor: "#2563EB",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Use this reply
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
