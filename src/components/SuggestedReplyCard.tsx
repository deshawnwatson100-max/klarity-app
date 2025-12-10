import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

type IntentionType = "improve" | "distance" | "maintain" | "clarity";

interface SuggestedReply {
  id: string;
  text: string;
  guidanceNote: string;
}

interface SuggestedReplyCardProps {
  replies: SuggestedReply[];
  intention: IntentionType;
  onSelectReply: (reply: string) => void;
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => Promise<void>;
  onGenerateDifferent?: () => void;
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
  onGenerateDifferent,
}: SuggestedReplyCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<{ replyId: string; action: "shorten" | "lengthen" } | null>(null);

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

  const handleReplyPress = (replyId: string) => {
    setExpandedReplyId(expandedReplyId === replyId ? null : replyId);
  };

  const handleModifyLength = async (replyId: string, action: "shorten" | "lengthen") => {
    if (!onModifyLength) return;
    setLoadingAction({ replyId, action });
    try {
      await onModifyLength(replyId, action);
    } finally {
      setLoadingAction(null);
    }
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
              <Pressable onPress={() => handleReplyPress(reply.id)}>
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

                  {/* Guidance Note */}
                  <View
                    className="px-4 py-2.5"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      borderTopWidth: 0.5,
                      borderTopColor: "rgba(156, 163, 175, 0.1)",
                    }}
                  >
                    <View className="flex-row items-start gap-2">
                      <Ionicons
                        name="bulb-outline"
                        size={14}
                        color="#9CA3AF"
                        style={{ marginTop: 2 }}
                      />
                      <Text
                        className="text-xs leading-relaxed flex-1"
                        style={{
                          color: "#9CA3AF",
                          letterSpacing: 0.1,
                          lineHeight: 16,
                        }}
                      >
                        {reply.guidanceNote}
                      </Text>
                    </View>
                  </View>

                  {/* Adjustment controls inside bubble - Only show when expanded */}
                  {onModifyLength && expandedReplyId === reply.id && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
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
                          onPress={() => handleModifyLength(reply.id, "shorten")}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          disabled={loadingAction?.replyId === reply.id}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          {loadingAction?.replyId === reply.id && loadingAction?.action === "shorten" ? (
                            <ActivityIndicator size="small" color={color} />
                          ) : (
                            <>
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
                            </>
                          )}
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
                          onPress={() => handleModifyLength(reply.id, "lengthen")}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          disabled={loadingAction?.replyId === reply.id}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          {loadingAction?.replyId === reply.id && loadingAction?.action === "lengthen" ? (
                            <ActivityIndicator size="small" color={color} />
                          ) : (
                            <>
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
                            </>
                          )}
                        </Pressable>
                      </View>
                    </Animated.View>
                  )}
                </View>
              </Pressable>

              {/* Use button and Generate Different button below bubble */}
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  gap: 8,
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

                {onGenerateDifferent && (
                  <Pressable
                    onPress={onGenerateDifferent}
                    className="active:opacity-70"
                    style={{
                      backgroundColor: "transparent",
                      borderWidth: 1.5,
                      borderColor: color,
                      borderRadius: 20,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      shadowColor: color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}
                  >
                    <Text
                      className="font-semibold text-sm"
                      style={{
                        fontFamily: "SF Pro Display",
                        color: color,
                      }}
                    >
                      Use different reply
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
