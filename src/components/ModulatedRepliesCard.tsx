import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";

interface ModulatedReply {
  id: string;
  text: string;
  guidanceNote: string;
}

interface ModulatedRepliesCardProps {
  replies: ModulatedReply[];
  tone: "direct" | "gentle" | "neutral";
  onSelectReply: (reply: string) => void;
  selectedIntention?: "improve" | "distance" | "maintain" | "clarity";
  onModifyLength?: (replyId: string, action: "shorten" | "lengthen") => Promise<void>;
  onGenerateDifferent?: () => void;
}

export function ModulatedRepliesCard({
  replies,
  tone,
  onSelectReply,
  selectedIntention,
  onModifyLength,
  onGenerateDifferent,
}: ModulatedRepliesCardProps) {
  // State to track which reply bubble is expanded
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<{ replyId: string; action: "shorten" | "lengthen" } | null>(null);

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

  // Get color based on relationship direction
  const getIntentionColor = () => {
    const colors = {
      improve: "#B4FF39", // Lime green
      distance: "#F97316", // Orange
      maintain: "#6366F1", // Indigo
      clarity: "#5EEAD4", // Teal (default)
    };
    return colors[selectedIntention || "clarity"];
  };

  const intentionColor = getIntentionColor();

  const getToneLabel = () => {
    const labels = {
      direct: "More Direct",
      gentle: "More Gentle",
      neutral: "More Neutral",
    };
    return labels[tone];
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      className="mb-4 mx-4"
    >
      <View
        className="rounded-3xl overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 20, 24, 0.7)",
          borderWidth: 1,
          borderColor: `${intentionColor}15`,
        }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center gap-2">
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: intentionColor,
              }}
            />
            <Text
              className="text-sm font-light"
              style={{
                color: "#E5E7EB",
                letterSpacing: 0.3,
              }}
            >
              {getToneLabel()} Approach
            </Text>
          </View>
        </View>

        {/* Replies */}
        <View className="px-3 pb-3">
          {replies.map((reply, index) => (
            <View
              key={reply.id}
              style={{
                marginTop: index === 0 ? 0 : 16,
                marginBottom: 16,
              }}
            >
              {/* Reply Card Container */}
              <View
                style={{
                  maxWidth: "85%",
                  alignSelf: "flex-start",
                }}
              >
                {/* Reply Card - Wrap in Pressable to make tappable */}
                <Pressable onPress={() => handleReplyPress(reply.id)}>
                  <View
                    className="rounded-2xl overflow-hidden"
                    style={{
                      backgroundColor: `${intentionColor}06`,
                      borderWidth: 1,
                      borderColor: `${intentionColor}15`,
                    }}
                  >
                    {/* Reply Text */}
                    <View className="px-4 pt-3.5 pb-3">
                      <Text
                        className="text-sm leading-relaxed"
                        style={{
                          color: "#F9FAFB",
                          letterSpacing: 0.2,
                          lineHeight: 20,
                        }}
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
                          borderTopColor: `${intentionColor}15`,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          backgroundColor: "rgba(0, 0, 0, 0.15)",
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
                            <ActivityIndicator size="small" color={intentionColor} />
                          ) : (
                            <>
                              <Ionicons
                                name="remove-circle-outline"
                                size={16}
                                color={intentionColor}
                              />
                              <Text
                                style={{
                                  fontFamily: "SF Pro Display",
                                  fontSize: 13,
                                  fontWeight: "500",
                                  color: intentionColor,
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
                            backgroundColor: `${intentionColor}30`,
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
                            <ActivityIndicator size="small" color={intentionColor} />
                          ) : (
                            <>
                              <Ionicons
                                name="add-circle-outline"
                                size={16}
                                color={intentionColor}
                              />
                              <Text
                                style={{
                                  fontFamily: "SF Pro Display",
                                  fontSize: 13,
                                  fontWeight: "500",
                                  color: intentionColor,
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

                {/* Use button below bubble */}
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() => onSelectReply(reply.text)}
                    className="active:opacity-70"
                    style={{
                      backgroundColor: intentionColor,
                      borderRadius: 20,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      shadowColor: intentionColor,
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

                  {/* Use different reply button */}
                  {onGenerateDifferent && (
                    <Pressable
                      onPress={onGenerateDifferent}
                      className="active:opacity-70"
                      style={{
                        backgroundColor: "transparent",
                        borderWidth: 1.5,
                        borderColor: intentionColor,
                        borderRadius: 20,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text
                        className="font-semibold text-sm"
                        style={{
                          fontFamily: "SF Pro Display",
                          color: intentionColor,
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
      </View>
    </Animated.View>
  );
}
