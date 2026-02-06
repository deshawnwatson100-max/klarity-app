import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BoundaryClarity } from "../types/chat";

interface BoundaryClaritySummaryBubbleProps {
  boundaryClarity: BoundaryClarity;
}

export function BoundaryClaritySummaryBubble({
  boundaryClarity,
}: BoundaryClaritySummaryBubbleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  // Section animations
  const section1Opacity = useSharedValue(0);
  const section2Opacity = useSharedValue(0);
  const section3Opacity = useSharedValue(0);
  const transitionOpacity = useSharedValue(0);

  useEffect(() => {
    // Main card animation
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12 });

    // Staggered section animations
    section1Opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    section2Opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    section3Opacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    transitionOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const section1Style = useAnimatedStyle(() => ({
    opacity: section1Opacity.value,
  }));

  const section2Style = useAnimatedStyle(() => ({
    opacity: section2Opacity.value,
  }));

  const section3Style = useAnimatedStyle(() => ({
    opacity: section3Opacity.value,
  }));

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: transitionOpacity.value,
  }));

  return (
    <Animated.View style={animatedStyle} className="mb-4">
      <View
        className="rounded-3xl p-6 overflow-hidden"
        style={{
          backgroundColor: "#1A1A1C",
          borderWidth: 1.5,
          borderColor: "#9CA3AF30",
          shadowColor: "#9CA3AF",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
        }}
      >
        {/* Subtle inner glow at top */}
        <View
          className="absolute top-0 left-0 right-0 h-px"
          style={{ backgroundColor: "#9CA3AF", opacity: 0.3 }}
        />

        {/* Header with Icon */}
        <View className="flex-row items-center mb-1">
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: "#9CA3AF15" }}
          >
            <Ionicons name="bulb-outline" size={14} color="#9CA3AF" />
          </View>
          <Text
            className="text-lg font-bold flex-1"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            Understanding Your Boundaries
          </Text>
        </View>
        <Text
          className="text-xs uppercase tracking-wider mb-5"
          style={{
            fontFamily: "SF Pro Display",
            color: "#9CA3AF",
          }}
        >
          Boundary Clarity Summary
        </Text>

        {/* Section 1: What Boundary May Have Been Crossed */}
        <Animated.View style={section1Style} className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            What Boundary May Have Been Crossed
          </Text>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: "#0F0F11",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm leading-5"
              style={{
                fontFamily: "SF Pro Display",
                color: "#D1D5DB",
              }}
            >
              {boundaryClarity.whatBoundaryCrossed}
            </Text>
          </View>
        </Animated.View>

        {/* Section 2: How This Might Impact You */}
        <Animated.View style={section2Style} className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            How This Might Impact You
          </Text>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: "#0F0F11",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm leading-5"
              style={{
                fontFamily: "SF Pro Display",
                color: "#D1D5DB",
              }}
            >
              {boundaryClarity.howItImpactsYou}
            </Text>
          </View>
        </Animated.View>

        {/* Section 3: How This Could Affect the Relationship */}
        <Animated.View style={section3Style} className="mb-5">
          <Text
            className="text-sm font-semibold mb-2"
            style={{
              fontFamily: "SF Pro Display",
              color: "#E5E7EB",
            }}
          >
            How This Could Affect the Relationship
          </Text>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: "#0F0F11",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm leading-5"
              style={{
                fontFamily: "SF Pro Display",
                color: "#D1D5DB",
              }}
            >
              {boundaryClarity.howItAffectsRelationship}
            </Text>
          </View>
        </Animated.View>

        {/* Transition Line */}
        <Animated.View style={transitionStyle}>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: "#9CA3AF10",
              borderWidth: 1,
              borderColor: "#9CA3AF20",
            }}
          >
            <Text
              className="text-sm leading-5 text-center"
              style={{
                fontFamily: "SF Pro Display",
                color: "#E5E7EB",
                fontStyle: "italic",
              }}
            >
              {boundaryClarity.transitionLine}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
