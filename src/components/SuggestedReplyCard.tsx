import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";

type IntentionType = "improve" | "distance" | "maintain" | "clarity";

interface SuggestedReply {
  id: string;
  text: string;
}

interface SuggestedReplyCardProps {
  replies: SuggestedReply[];
  intention: IntentionType;
  onSelectReply: (reply: string) => void;
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => void;
}

const intentionColors: Record<IntentionType, string> = {
  improve: "#6BB6FF", // Cool Sky Blue
  distance: "#FF9B6B", // Warm Orange
  maintain: "#FFB84D", // Soft Amber/Gold
  clarity: "#B8A3E8", // Lavender/Soft Purple
};

export function SuggestedReplyCard({
  replies,
  intention,
  onSelectReply,
  onModifyLength,
}: SuggestedReplyCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const color = intentionColors[intention];

  const handlePress = (replyText: string) => {
    onSelectReply(replyText);
  };

  return (
    <Animated.View
      style={[
        {
          alignSelf: "flex-start",
          width: "100%",
          marginBottom: 16,
        },
        animatedStyle,
      ]}
    >
      <View className="gap-3">
        {replies.map((reply, index) => (
          <View key={reply.id} style={{ marginBottom: 16 }}>
            {/* Reply bubble with glow */}
            <View
              style={{
                maxWidth: "85%",
                alignSelf: "flex-start",
              }}
            >
              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: "#050608",
                  borderWidth: 1.5,
                  borderColor: `${color}40`,
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                }}
              >
                {/* Reply text */}
                <View className="px-5 py-4">
                  <Text
                    className="text-base leading-6"
                    style={{ fontFamily: "SF Pro Display", color: "#E5E7EB" }}
                  >
                    {reply.text}
                  </Text>
                </View>

                {/* Adjustment controls inside bubble */}
                {onModifyLength && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: `${color}15`,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                      }}
                    >
                      {/* Shorten button */}
                      <Pressable
                        onPress={() => onModifyLength(reply.id, "shorten")}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={16}
                          color={color}
                        />
                        <Text
                          style={{
                            fontFamily: "SF Pro Display",
                            fontSize: 13,
                            fontWeight: "500",
                            color: color,
                          }}
                        >
                          Shorten Reply
                        </Text>
                      </Pressable>

                      {/* Divider */}
                      <View
                        style={{
                          width: 1,
                          height: 14,
                          backgroundColor: `${color}30`,
                        }}
                      />

                      {/* Lengthen button */}
                      <Pressable
                        onPress={() => onModifyLength(reply.id, "lengthen")}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={16}
                          color={color}
                        />
                        <Text
                          style={{
                            fontFamily: "SF Pro Display",
                            fontSize: 13,
                            fontWeight: "500",
                            color: color,
                          }}
                        >
                          Lengthen Reply
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              {/* Use button below bubble */}
              <View
                style={{
                  marginTop: 8,
                }}
              >
                <Pressable
                  onPress={() => handlePress(reply.text)}
                  className="active:opacity-70"
                  style={{
                    backgroundColor: color,
                    borderRadius: 20,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text
                    className="font-semibold text-sm"
                    style={{
                      fontFamily: "SF Pro Display",
                      color: "#000000",
                    }}
                  >
                    Use this reply
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
