import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VibeOption } from "../types/chat";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeContext";

interface VibeSelectorCardProps {
  acknowledgment: string;
  vibes: VibeOption[];
  selectedVibe?: VibeOption;
  onSelectVibe: (vibe: VibeOption) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function getVibeIconName(label: string): IoniconsName {
  const l = label.toLowerCase();
  if (l.includes("warm") || l.includes("caring") || l.includes("tender")) return "heart-outline";
  if (l.includes("playful") || l.includes("fun") || l.includes("tease") || l.includes("flirt")) return "sparkles-outline";
  if (l.includes("cool") || l.includes("cold") || l.includes("distant") || l.includes("icy")) return "snow-outline";
  if (l.includes("calm") || l.includes("chill") || l.includes("composed") || l.includes("ease")) return "leaf-outline";
  if (l.includes("direct") || l.includes("sharp") || l.includes("honest") || l.includes("blunt")) return "flash-outline";
  if (l.includes("bold") || l.includes("confident") || l.includes("assertive")) return "flame-outline";
  if (l.includes("soft") || l.includes("gentle") || l.includes("sweet")) return "flower-outline";
  if (l.includes("grounded") || l.includes("steady") || l.includes("neutral")) return "radio-button-off-outline";
  if (l.includes("light") || l.includes("bright") || l.includes("happy")) return "sunny-outline";
  if (l.includes("deep") || l.includes("intense") || l.includes("mystery")) return "moon-outline";
  if (l.includes("protect") || l.includes("firm") || l.includes("bound")) return "shield-outline";
  if (l.includes("sincere") || l.includes("genuine") || l.includes("real") || l.includes("authentic")) return "star-outline";
  return "chatbubble-outline";
}

export function VibeSelectorCard({
  acknowledgment,
  vibes,
  selectedVibe,
  onSelectVibe,
}: VibeSelectorCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const { isDark } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const activeVibe = selectedVibe ?? vibes[0];

  // Theme-aware colors
  const acknowledgmentColor = isDark ? "#9CA3AF" : "#6B7280";
  const questionColor = isDark ? "#E5E7EB" : "#111827";
  // Unselected: black (dark) / dark gray (light). Selected: blue always.
  const iconBgSelected = "rgba(59,130,246,0.2)";
  const iconBgUnselected = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const iconColorSelected = "#3B82F6";
  const iconColorUnselected = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
  const labelSelected = "#3B82F6";
  const labelUnselected = isDark ? "rgba(255,255,255,0.35)" : "#111827";

  return (
    <Animated.View
      style={{
        alignSelf: "flex-start",
        maxWidth: "85%",
        marginBottom: 8,
        paddingHorizontal: 4,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Acknowledgment */}
      <Text
        className="text-sm leading-6 mb-3"
        style={{ fontFamily: "SF Pro Display", color: acknowledgmentColor }}
      >
        {acknowledgment}
      </Text>

      {/* Question */}
      <Text
        className="text-base leading-7 mb-4"
        style={{ fontFamily: "SF Pro Display", color: questionColor, fontWeight: "500" }}
      >
        How do you want to show up?
      </Text>

      {/* Vibe buttons */}
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        {vibes.map((vibe) => {
          const isSelected = activeVibe?.label === vibe.label;
          return (
            <Pressable
              key={vibe.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectVibe(vibe);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="active:opacity-60"
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: isSelected ? iconBgSelected : iconBgUnselected,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={getVibeIconName(vibe.label)}
                  size={12}
                  color={isSelected ? iconColorSelected : iconColorUnselected}
                />
              </View>
              <Text
                style={{
                  fontFamily: "SF Pro Display",
                  fontSize: 15,
                  fontWeight: "700",
                  color: isSelected ? labelSelected : labelUnselected,
                  letterSpacing: 0.1,
                }}
              >
                {vibe.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
