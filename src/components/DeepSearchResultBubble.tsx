import React, { useState } from "react";
import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DeepSearchResult, DeepSearchSource, SAFETY_RESOURCES } from "../api/deepSearch";

interface DeepSearchResultBubbleProps {
  result: DeepSearchResult;
  onAskFollowUp?: () => void;
  showSafetyResources?: boolean;
}

/**
 * Displays Deep Search results in Perplexity-style format
 * Clean, minimal design with sources at top and numbered citations
 */
export function DeepSearchResultBubble({
  result,
  onAskFollowUp,
  showSafetyResources = false,
}: DeepSearchResultBubbleProps) {
  const [showAllSources, setShowAllSources] = useState(false);

  const getSourceFavicon = (platform: string): keyof typeof Ionicons.glyphMap => {
    const lower = platform.toLowerCase();
    if (lower.includes("linkedin")) return "logo-linkedin";
    if (lower.includes("twitter") || lower.includes("x.com")) return "logo-twitter";
    if (lower.includes("facebook")) return "logo-facebook";
    if (lower.includes("instagram")) return "logo-instagram";
    if (lower.includes("youtube")) return "logo-youtube";
    if (lower.includes("reddit")) return "logo-reddit";
    if (lower.includes("github")) return "logo-github";
    return "globe-outline";
  };

  const displayedSources = showAllSources ? result.sources : result.sources.slice(0, 4);

  return (
    <View style={{ marginVertical: 12, marginHorizontal: 16 }}>
      {/* Safety Resources Banner (if needed) */}
      {showSafetyResources && (
        <View
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderLeftWidth: 3,
            borderLeftColor: "#EF4444",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#DC2626", marginLeft: 8 }}>
              Your safety matters
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: "#7F1D1D", lineHeight: 18, marginBottom: 10 }}>
            If you need support, help is available:
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`tel:${SAFETY_RESOURCES.domesticViolence.phone.replace(/-/g, "")}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: "#FECACA",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#FEE2E2",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="call" size={18} color="#DC2626" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                {SAFETY_RESOURCES.domesticViolence.name}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {SAFETY_RESOURCES.domesticViolence.phone}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      )}

      {/* Sources Row - Perplexity Style */}
      {result.sources.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {displayedSources.map((source, index) => (
              <Pressable
                key={`${source.platform}-${index}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (source.url) Linking.openURL(source.url);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F3F4F6",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#6B7280" }}>
                    {index + 1}
                  </Text>
                </View>
                <Ionicons name={getSourceFavicon(source.platform)} size={14} color="#6B7280" />
                <Text
                  style={{ fontSize: 13, color: "#374151", maxWidth: 100 }}
                  numberOfLines={1}
                >
                  {source.platform}
                </Text>
              </Pressable>
            ))}
            {result.sources.length > 4 && !showAllSources && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowAllSources(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F3F4F6",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  +{result.sources.length - 4} more
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      {/* Answer Section */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 15,
            color: "#1F2937",
            lineHeight: 24,
            letterSpacing: 0.1,
          }}
        >
          {result.summary}
        </Text>
      </View>

      {/* Detailed Source Cards */}
      {result.sources.length > 0 && (
        <View style={{ gap: 10 }}>
          {result.sources.slice(0, 3).map((source, index) => (
            <SourceCard key={`${source.platform}-${index}`} source={source} index={index} />
          ))}
        </View>
      )}

      {/* Alignment Section */}
      {result.alignmentNotes.length > 0 && (
        <View
          style={{
            marginTop: 16,
            padding: 14,
            backgroundColor: "#F0FDF4",
            borderRadius: 12,
            borderLeftWidth: 3,
            borderLeftColor: "#22C55E",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#166534", marginLeft: 6 }}>
              Matches what you shared
            </Text>
          </View>
          {result.alignmentNotes.map((note, i) => (
            <Text key={i} style={{ fontSize: 14, color: "#15803D", lineHeight: 20 }}>
              {note}
            </Text>
          ))}
        </View>
      )}

      {/* Uncertainties Section */}
      {result.uncertainties.length > 0 && (
        <View
          style={{
            marginTop: 12,
            padding: 14,
            backgroundColor: "#FFFBEB",
            borderRadius: 12,
            borderLeftWidth: 3,
            borderLeftColor: "#F59E0B",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="alert-circle" size={16} color="#D97706" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#92400E", marginLeft: 6 }}>
              Could not verify
            </Text>
          </View>
          {result.uncertainties.map((note, i) => (
            <Text key={i} style={{ fontSize: 14, color: "#B45309", lineHeight: 20 }}>
              {note}
            </Text>
          ))}
        </View>
      )}

      {/* Related / Follow-up */}
      {onAskFollowUp && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#9CA3AF", marginBottom: 10, letterSpacing: 0.5 }}>
            RELATED
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAskFollowUp();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F9FAFB",
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#6B7280" />
            <Text style={{ fontSize: 14, color: "#374151", marginLeft: 10, flex: 1 }}>
              Ask a follow-up question
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Individual source card component
 */
function SourceCard({ source, index }: { source: DeepSearchSource; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const getSourceIcon = (): keyof typeof Ionicons.glyphMap => {
    const lower = source.platform.toLowerCase();
    if (lower.includes("linkedin")) return "logo-linkedin";
    if (lower.includes("twitter") || lower.includes("x.com")) return "logo-twitter";
    if (lower.includes("facebook")) return "logo-facebook";
    if (lower.includes("instagram")) return "logo-instagram";
    return "globe-outline";
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        setExpanded(!expanded);
      }}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Citation Number */}
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              marginTop: 2,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280" }}>
              {index + 1}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {/* Source Header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Ionicons name={getSourceIcon()} size={14} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 4 }}>
                {source.platform}
              </Text>
              {!source.isVerified && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: "#FEF3C7",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, color: "#D97706", fontWeight: "500" }}>
                    Unverified
                  </Text>
                </View>
              )}
            </View>

            {/* Summary */}
            <Text
              style={{ fontSize: 14, color: "#1F2937", lineHeight: 20 }}
              numberOfLines={expanded ? undefined : 2}
            >
              {source.summary}
            </Text>

            {/* Expanded Details */}
            {expanded && source.relevantDetails.length > 0 && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                {source.relevantDetails.map((detail, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "#D1D5DB",
                        marginTop: 7,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ fontSize: 13, color: "#6B7280", flex: 1, lineHeight: 18 }}>
                      {detail}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Expand/Collapse Icon */}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#9CA3AF"
            style={{ marginLeft: 8, marginTop: 2 }}
          />
        </View>

        {/* View Source Link */}
        {expanded && source.url && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (source.url) Linking.openURL(source.url);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              marginLeft: 32,
            }}
          >
            <Ionicons name="open-outline" size={14} color="#3B82F6" />
            <Text style={{ fontSize: 13, color: "#3B82F6", marginLeft: 4, fontWeight: "500" }}>
              View source
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Loading state for Deep Search - Perplexity style
 */
export function DeepSearchLoading() {
  return (
    <View style={{ marginVertical: 12, marginHorizontal: 16 }}>
      {/* Animated Sources Skeleton */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 80,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#F3F4F6",
            }}
          />
        ))}
      </View>

      {/* Loading Indicator */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#EEF2FF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="search" size={12} color="#6366F1" />
        </View>
        <Text style={{ fontSize: 14, color: "#6B7280" }}>
          Searching...
        </Text>
      </View>

      {/* Content Skeleton */}
      <View style={{ gap: 8 }}>
        <View style={{ height: 14, backgroundColor: "#F3F4F6", borderRadius: 4, width: "100%" }} />
        <View style={{ height: 14, backgroundColor: "#F3F4F6", borderRadius: 4, width: "90%" }} />
        <View style={{ height: 14, backgroundColor: "#F3F4F6", borderRadius: 4, width: "75%" }} />
      </View>
    </View>
  );
}

/**
 * No results state - Perplexity style
 */
export function DeepSearchNoResults({ personName }: { personName: string }) {
  return (
    <View style={{ marginVertical: 12, marginHorizontal: 16 }}>
      {/* Empty Sources Row */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F3F4F6",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="globe-outline" size={14} color="#9CA3AF" />
          <Text style={{ fontSize: 13, color: "#9CA3AF", marginLeft: 6 }}>
            No sources found
          </Text>
        </View>
      </View>

      {/* Message */}
      <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 24, marginBottom: 16 }}>
        I searched for publicly available information about {personName}, but could not find definitive results.
      </Text>

      {/* Reasons Card */}
      <View
        style={{
          backgroundColor: "#F9FAFB",
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
          This could mean:
        </Text>
        {[
          "Common name with many matches",
          "Private social media profiles",
          "Minimal online presence",
          "Different name used online",
        ].map((reason, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#9CA3AF",
                marginRight: 10,
              }}
            />
            <Text style={{ fontSize: 14, color: "#6B7280" }}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* Note */}
      <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 14, fontStyle: "italic" }}>
        Not finding information does not mean there is nothing to find.
      </Text>
    </View>
  );
}
