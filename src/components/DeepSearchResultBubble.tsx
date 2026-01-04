import React, { useState } from "react";
import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DeepSearchResult, DeepSearchSource, SAFETY_RESOURCES } from "../api/deepSearch";

// ChatGPT-style colors
const COLORS = {
  background: "#212121",
  surface: "#2F2F2F",
  surfaceHover: "#3A3A3A",
  border: "#3F3F3F",
  text: "#ECECEC",
  textSecondary: "#B4B4B4",
  textMuted: "#8E8E8E",
  accent: "#10A37F", // ChatGPT green
  accentLight: "rgba(16, 163, 127, 0.15)",
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.1)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.1)",
};

interface DeepSearchResultBubbleProps {
  result: DeepSearchResult;
  onAskFollowUp?: () => void;
  showSafetyResources?: boolean;
}

/**
 * Displays Deep Search results in ChatGPT-style format
 * Clean, minimal dark design with subtle accents
 */
export function DeepSearchResultBubble({
  result,
  onAskFollowUp,
  showSafetyResources = false,
}: DeepSearchResultBubbleProps) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const getSourceIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
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

  return (
    <View style={{ marginVertical: 8, paddingHorizontal: 16 }}>
      {/* Safety Resources Banner */}
      {showSafetyResources && (
        <View
          style={{
            backgroundColor: COLORS.errorBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="shield-checkmark" size={18} color={COLORS.error} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text, marginLeft: 12 }}>
              Your safety matters
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 }}>
            If you need support, help is available 24/7:
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`tel:${SAFETY_RESOURCES.domesticViolence.phone.replace(/-/g, "")}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Ionicons name="call" size={20} color={COLORS.error} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.text }}>
                {SAFETY_RESOURCES.domesticViolence.name}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                {SAFETY_RESOURCES.domesticViolence.phone}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Main Answer */}
      <Text
        style={{
          fontSize: 15,
          color: COLORS.text,
          lineHeight: 24,
          marginBottom: 20,
        }}
      >
        {result.summary}
      </Text>

      {/* Sources Section */}
      {result.sources.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="search-outline" size={14} color={COLORS.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: COLORS.textMuted,
                marginLeft: 6,
                letterSpacing: 0.5,
              }}
            >
              {result.sources.length} SOURCE{result.sources.length > 1 ? "S" : ""} FOUND
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {result.sources.map((source, index) => (
              <SourceItem
                key={`${source.platform}-${index}`}
                source={source}
                index={index}
                isExpanded={expandedSource === `${source.platform}-${index}`}
                onToggle={() => {
                  Haptics.selectionAsync();
                  setExpandedSource(
                    expandedSource === `${source.platform}-${index}`
                      ? null
                      : `${source.platform}-${index}`
                  );
                }}
                getSourceIcon={getSourceIcon}
              />
            ))}
          </View>
        </View>
      )}

      {/* Insights Section */}
      {(result.alignmentNotes.length > 0 || result.uncertainties.length > 0) && (
        <View style={{ gap: 10, marginBottom: 16 }}>
          {/* Alignment Notes */}
          {result.alignmentNotes.length > 0 && (
            <View
              style={{
                backgroundColor: COLORS.accentLight,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.accent, marginLeft: 8 }}>
                  Consistent with your info
                </Text>
              </View>
              {result.alignmentNotes.map((note, i) => (
                <Text key={i} style={{ fontSize: 14, color: COLORS.text, lineHeight: 20 }}>
                  {note}
                </Text>
              ))}
            </View>
          )}

          {/* Uncertainties */}
          {result.uncertainties.length > 0 && (
            <View
              style={{
                backgroundColor: COLORS.warningBg,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.warning, marginLeft: 8 }}>
                  Could not verify
                </Text>
              </View>
              {result.uncertainties.map((note, i) => (
                <Text key={i} style={{ fontSize: 14, color: COLORS.text, lineHeight: 20 }}>
                  {note}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Follow-up Action */}
      {onAskFollowUp && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAskFollowUp();
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.surfaceHover : COLORS.surface,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
          })}
        >
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginLeft: 8 }}>
            Ask a follow-up
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Individual source item - ChatGPT style
 */
function SourceItem({
  source,
  index,
  isExpanded,
  onToggle,
  getSourceIcon,
}: {
  source: DeepSearchSource;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  getSourceIcon: (platform: string) => keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.surfaceHover : COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
      })}
    >
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Source Icon */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: COLORS.background,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={getSourceIcon(source.platform)} size={16} color={COLORS.textSecondary} />
          </View>

          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.text }}>
                {source.platform}
              </Text>
              {!source.isVerified && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: COLORS.warningBg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, color: COLORS.warning, fontWeight: "500" }}>
                    Unverified
                  </Text>
                </View>
              )}
            </View>

            {/* Summary */}
            <Text
              style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {source.summary}
            </Text>

            {/* Expanded Content */}
            {isExpanded && (
              <View style={{ marginTop: 12 }}>
                {source.relevantDetails.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    {source.relevantDetails.map((detail, i) => (
                      <View
                        key={i}
                        style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}
                      >
                        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginRight: 8 }}>•</Text>
                        <Text style={{ fontSize: 13, color: COLORS.textSecondary, flex: 1, lineHeight: 18 }}>
                          {detail}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {source.url && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (source.url) Linking.openURL(source.url);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="open-outline" size={14} color={COLORS.accent} />
                    <Text style={{ fontSize: 13, color: COLORS.accent, marginLeft: 6, fontWeight: "500" }}>
                      View source
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Expand Icon */}
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.textMuted}
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Loading state - ChatGPT style
 */
export function DeepSearchLoading() {
  return (
    <View style={{ marginVertical: 8, paddingHorizontal: 16 }}>
      {/* Searching indicator */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: COLORS.accentLight,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="search" size={14} color={COLORS.accent} />
        </View>
        <View>
          <Text style={{ fontSize: 14, color: COLORS.text }}>Searching public sources</Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            This may take a moment...
          </Text>
        </View>
      </View>

      {/* Skeleton lines */}
      <View style={{ gap: 10 }}>
        <View
          style={{
            height: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 4,
            width: "100%",
          }}
        />
        <View
          style={{
            height: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 4,
            width: "85%",
          }}
        />
        <View
          style={{
            height: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 4,
            width: "70%",
          }}
        />
      </View>

      {/* Source skeleton cards */}
      <View style={{ marginTop: 20, gap: 8 }}>
        {[1, 2].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: COLORS.background,
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 12, backgroundColor: COLORS.background, borderRadius: 3, width: 80 }} />
              <View style={{ height: 10, backgroundColor: COLORS.background, borderRadius: 3, width: "90%" }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * No results state - ChatGPT style
 */
export function DeepSearchNoResults({ personName }: { personName: string }) {
  return (
    <View style={{ marginVertical: 8, paddingHorizontal: 16 }}>
      {/* Message */}
      <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 24, marginBottom: 16 }}>
        I searched for publicly available information about {personName}, but could not find definitive results.
      </Text>

      {/* Reasons */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.textSecondary, marginBottom: 10 }}>
          This could mean:
        </Text>
        {[
          "They have a common name",
          "Their profiles are set to private",
          "They maintain a low online presence",
          "They may use a different name online",
        ].map((reason, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginRight: 8 }}>•</Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, flex: 1 }}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* Note */}
      <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 14, fontStyle: "italic" }}>
        Not finding information does not mean there is nothing to find.
      </Text>
    </View>
  );
}
