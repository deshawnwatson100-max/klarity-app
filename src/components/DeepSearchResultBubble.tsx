import React, { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { DeepSearchResult, DeepSearchSource, SAFETY_RESOURCES } from "../api/deepSearch";

const AnimatedView = Animated.createAnimatedComponent(View);

interface DeepSearchResultBubbleProps {
  result: DeepSearchResult;
  onAskFollowUp?: () => void;
  showSafetyResources?: boolean;
}

/**
 * Displays Deep Search results in the chat loop
 * Similar to Perplexity-style search results
 */
export function DeepSearchResultBubble({
  result,
  onAskFollowUp,
  showSafetyResources = false,
}: DeepSearchResultBubbleProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const toggleSource = (platform: string) => {
    Haptics.selectionAsync();
    setExpandedSources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

  const getSourceIcon = (type: DeepSearchSource["type"]): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "professional":
        return "briefcase-outline";
      case "social":
        return "people-outline";
      case "dating":
        return "heart-outline";
      case "news":
        return "newspaper-outline";
      default:
        return "globe-outline";
    }
  };

  const getSourceColor = (type: DeepSearchSource["type"]): string => {
    switch (type) {
      case "professional":
        return "#60A5FA"; // Blue
      case "social":
        return "#A78BFA"; // Purple
      case "dating":
        return "#F472B6"; // Pink
      case "news":
        return "#34D399"; // Green
      default:
        return "#9CA3AF"; // Gray
    }
  };

  return (
    <AnimatedView
      entering={FadeInUp.duration(300).springify()}
      style={{
        marginVertical: 8,
        marginHorizontal: 16,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="search" size={16} color="#818CF8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#E5E7EB" }}>
            Deep Search Results
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>
            Public information found
          </Text>
        </View>
      </View>

      {/* Safety Resources (if needed) */}
      {showSafetyResources && (
        <AnimatedView
          entering={FadeInDown.delay(100).duration(200)}
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color="#F87171" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#F87171", marginLeft: 8 }}>
              Your safety comes first
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: "#E5E7EB", lineHeight: 18, marginBottom: 10 }}>
            If you are in immediate danger, please reach out for help:
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`tel:${SAFETY_RESOURCES.domesticViolence.phone.replace(/-/g, "")}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: 8,
              padding: 10,
              marginBottom: 6,
            }}
          >
            <Ionicons name="call" size={16} color="#F87171" />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#E5E7EB" }}>
                {SAFETY_RESOURCES.domesticViolence.name}
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                {SAFETY_RESOURCES.domesticViolence.phone}
              </Text>
            </View>
          </Pressable>
        </AnimatedView>
      )}

      {/* Main Results Card */}
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.06)",
          overflow: "hidden",
        }}
      >
        {/* Summary */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.06)" }}>
          <Text style={{ fontSize: 14, color: "#E5E7EB", lineHeight: 20 }}>
            {result.summary}
          </Text>
        </View>

        {/* Sources */}
        {result.sources.length > 0 && (
          <View style={{ padding: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 10, paddingHorizontal: 4 }}>
              SOURCES FOUND
            </Text>
            {result.sources.map((source, index) => (
              <Pressable
                key={`${source.platform}-${index}`}
                onPress={() => toggleSource(source.platform)}
                style={{
                  backgroundColor: expandedSources.has(source.platform)
                    ? "rgba(255, 255, 255, 0.05)"
                    : "transparent",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: `${getSourceColor(source.type)}20`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons
                      name={getSourceIcon(source.type)}
                      size={14}
                      color={getSourceColor(source.type)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: "#E5E7EB" }}>
                      {source.platform}
                    </Text>
                    {!expandedSources.has(source.platform) && (
                      <Text
                        style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {source.summary}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={expandedSources.has(source.platform) ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6B7280"
                  />
                </View>

                {/* Expanded Details */}
                {expandedSources.has(source.platform) && (
                  <View style={{ marginTop: 10, paddingLeft: 38 }}>
                    <Text style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 18 }}>
                      {source.summary}
                    </Text>
                    {source.relevantDetails.map((detail, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: "#6B7280", marginRight: 6 }}>•</Text>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>
                          {detail}
                        </Text>
                      </View>
                    ))}
                    {source.url && (
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (source.url) Linking.openURL(source.url);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 8,
                        }}
                      >
                        <Ionicons name="open-outline" size={12} color="#818CF8" />
                        <Text style={{ fontSize: 12, color: "#818CF8", marginLeft: 4 }}>
                          View source
                        </Text>
                      </Pressable>
                    )}
                    {!source.isVerified && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 8,
                          backgroundColor: "rgba(251, 191, 36, 0.1)",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                          alignSelf: "flex-start",
                        }}
                      >
                        <Ionicons name="alert-circle-outline" size={12} color="#FBBF24" />
                        <Text style={{ fontSize: 11, color: "#FBBF24", marginLeft: 4 }}>
                          Not verified - could be different person
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Alignment Notes */}
        {result.alignmentNotes.length > 0 && (
          <View
            style={{
              padding: 14,
              backgroundColor: "rgba(16, 185, 129, 0.05)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#34D399" />
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#34D399", marginLeft: 6 }}>
                Aligns with what you shared
              </Text>
            </View>
            {result.alignmentNotes.map((note, i) => (
              <Text key={i} style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 18 }}>
                {note}
              </Text>
            ))}
          </View>
        )}

        {/* Uncertainties */}
        {result.uncertainties.length > 0 && (
          <View
            style={{
              padding: 14,
              backgroundColor: "rgba(251, 191, 36, 0.05)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="help-circle-outline" size={14} color="#FBBF24" />
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#FBBF24", marginLeft: 6 }}>
                Could not verify
              </Text>
            </View>
            {result.uncertainties.map((note, i) => (
              <Text key={i} style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 18 }}>
                {note}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Perception Check */}
      <View
        style={{
          marginTop: 14,
          padding: 14,
          backgroundColor: "rgba(99, 102, 241, 0.08)",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(99, 102, 241, 0.15)",
        }}
      >
        <Text style={{ fontSize: 14, color: "#C7D2FE", fontWeight: "500" }}>
          How does this sit with you?
        </Text>
        <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
          <PerceptionChip label="Feels helpful" icon="checkmark-circle" color="#34D399" />
          <PerceptionChip label="Need more info" icon="search" color="#60A5FA" />
          <PerceptionChip label="Feels like a lot" icon="pause-circle" color="#FBBF24" />
        </View>
      </View>

      {/* Follow Up */}
      {onAskFollowUp && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAskFollowUp();
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 12,
            padding: 12,
          }}
        >
          <Ionicons name="chatbubble-outline" size={14} color="#818CF8" />
          <Text style={{ fontSize: 13, color: "#818CF8", marginLeft: 6 }}>
            Ask a follow-up question
          </Text>
        </Pressable>
      )}
    </AnimatedView>
  );
}

/**
 * Perception check chip
 */
function PerceptionChip({
  label,
  icon,
  color,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  const [selected, setSelected] = useState(false);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        setSelected(!selected);
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: selected ? `${color}20` : "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: selected ? `${color}40` : "rgba(255, 255, 255, 0.08)",
      }}
    >
      <Ionicons name={icon} size={12} color={selected ? color : "#9CA3AF"} />
      <Text
        style={{
          fontSize: 12,
          color: selected ? color : "#9CA3AF",
          marginLeft: 4,
          fontWeight: selected ? "500" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Loading state for Deep Search
 */
export function DeepSearchLoading() {
  return (
    <AnimatedView
      entering={FadeInUp.duration(200)}
      style={{
        marginVertical: 8,
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="search" size={16} color="#818CF8" />
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#E5E7EB" }}>
            Searching public sources...
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
            This may take a moment
          </Text>
        </View>
      </View>

      {/* Animated search indicators */}
      <View style={{ flexDirection: "row", marginTop: 14, gap: 8 }}>
        {["LinkedIn", "Social", "News"].map((source, i) => (
          <View
            key={source}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#818CF8",
                opacity: 0.6,
              }}
            />
            <Text style={{ fontSize: 11, color: "#6B7280", marginLeft: 6 }}>
              {source}
            </Text>
          </View>
        ))}
      </View>
    </AnimatedView>
  );
}

/**
 * No results state
 */
export function DeepSearchNoResults({ personName }: { personName: string }) {
  return (
    <AnimatedView
      entering={FadeInUp.duration(300)}
      style={{
        marginVertical: 8,
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(107, 114, 128, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="search" size={16} color="#6B7280" />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#E5E7EB" }}>
          Limited results found
        </Text>
      </View>

      <Text style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 19 }}>
        I searched for publicly available information about {personName}, but could not find anything definitive.
      </Text>

      <Text style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 19, marginTop: 10 }}>
        This could mean:
      </Text>

      <View style={{ marginTop: 8 }}>
        {[
          "They have a common name",
          "Their profiles are set to private",
          "They keep a low online presence",
          "They may use a different name online",
        ].map((reason, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", marginRight: 6 }}>•</Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{reason}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 19, marginTop: 12 }}>
        Not finding something does not mean there is nothing to find.
      </Text>

      <View
        style={{
          marginTop: 14,
          padding: 12,
          backgroundColor: "rgba(99, 102, 241, 0.08)",
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 13, color: "#C7D2FE" }}>
          How does this sit with you?
        </Text>
      </View>
    </AnimatedView>
  );
}
