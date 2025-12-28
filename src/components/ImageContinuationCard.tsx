import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { TypewriterText } from "./TypewriterText";

interface ImageContinuationCardProps {
  continuationSummary: string;
  whatChanged: string;
  approachShift?: string;
}

/**
 * ImageContinuationCard
 *
 * Displays a concise summary when user adds an additional image mid-loop.
 * Shows what changed and any approach shift without re-explaining the full situation.
 */
export function ImageContinuationCard({
  continuationSummary,
  whatChanged,
  approachShift,
}: ImageContinuationCardProps) {
  const [hasAnimatedSummary, setHasAnimatedSummary] = useState(false);
  const [hasAnimatedChanged, setHasAnimatedChanged] = useState(false);
  const [hasAnimatedShift, setHasAnimatedShift] = useState(false);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      className="mb-4"
    >
      <View
        style={{
          backgroundColor: "rgba(30, 30, 35, 0.9)",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(99, 102, 241, 0.2)",
        }}
      >
        {/* Header */}
        <View className="flex-row items-center mb-3">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="layers-outline" size={16} color="#818CF8" />
          </View>
          <Text
            style={{
              color: "#E5E7EB",
              fontSize: 14,
              fontWeight: "600",
              letterSpacing: 0.3,
            }}
          >
            New Message Added
          </Text>
        </View>

        {/* Continuation Summary */}
        <Animated.View entering={FadeIn.delay(100).duration(300)}>
          {!hasAnimatedSummary ? (
            <TypewriterText
              text={continuationSummary}
              style={{
                color: "#D1D5DB",
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 12,
              }}
              speed={25}
              onComplete={() => setHasAnimatedSummary(true)}
            />
          ) : (
            <Text
              style={{
                color: "#D1D5DB",
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 12,
              }}
            >
              {continuationSummary}
            </Text>
          )}
        </Animated.View>

        {/* What Changed */}
        <Animated.View
          entering={FadeIn.delay(200).duration(300)}
          style={{
            backgroundColor: "rgba(99, 102, 241, 0.08)",
            borderRadius: 10,
            padding: 12,
            marginBottom: approachShift ? 12 : 0,
          }}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="pulse-outline"
              size={14}
              color="#A5B4FC"
              style={{ marginRight: 8, marginTop: 2 }}
            />
            {hasAnimatedSummary && !hasAnimatedChanged ? (
              <TypewriterText
                key="whatChanged"
                text={whatChanged}
                style={{
                  color: "#A5B4FC",
                  fontSize: 13,
                  lineHeight: 19,
                  flex: 1,
                }}
                speed={20}
                onComplete={() => setHasAnimatedChanged(true)}
              />
            ) : hasAnimatedChanged ? (
              <Text
                style={{
                  color: "#A5B4FC",
                  fontSize: 13,
                  lineHeight: 19,
                  flex: 1,
                }}
              >
                {whatChanged}
              </Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Approach Shift (only if needed) */}
        {approachShift && (
          <Animated.View
            entering={FadeIn.delay(300).duration(300)}
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.1)",
              borderRadius: 10,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: "rgba(251, 191, 36, 0.5)",
            }}
          >
            <View className="flex-row items-start">
              <Ionicons
                name="arrow-forward-outline"
                size={14}
                color="#FCD34D"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              {hasAnimatedChanged && !hasAnimatedShift ? (
                <TypewriterText
                  key="approachShift"
                  text={approachShift}
                  style={{
                    color: "#FCD34D",
                    fontSize: 13,
                    lineHeight: 19,
                    flex: 1,
                  }}
                  speed={20}
                  onComplete={() => setHasAnimatedShift(true)}
                />
              ) : hasAnimatedShift ? (
                <Text
                  style={{
                    color: "#FCD34D",
                    fontSize: 13,
                    lineHeight: 19,
                    flex: 1,
                  }}
                >
                  {approachShift}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
