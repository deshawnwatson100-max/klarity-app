import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DeepSearchResult, DeepSearchSource, SAFETY_RESOURCES } from "../api/deepSearch";

// Clean, neutral colors - Google search inspired
const COLORS = {
  background: "#1A1A1A",
  surface: "#242424",
  surfaceHover: "#2E2E2E",
  border: "#333333",
  text: "#E8E8E8",
  textSecondary: "#A0A0A0",
  textMuted: "#707070",
  link: "#8AB4F8", // Google blue link
  linkVisited: "#C58AF9",
  green: "#81C995", // Soft green for URLs
  divider: "#2A2A2A",
  error: "#F28B82",
  errorBg: "rgba(242, 139, 130, 0.1)",
};

interface DeepSearchResultBubbleProps {
  result: DeepSearchResult;
  onAskFollowUp?: () => void;
  showSafetyResources?: boolean;
}

/**
 * Google Search-style results display
 * Clean, link-forward, minimal explanation
 */
export function DeepSearchResultBubble({
  result,
  onAskFollowUp,
  showSafetyResources = false,
}: DeepSearchResultBubbleProps) {
  const getDomainFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return url;
    }
  };

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
    <View style={{ marginVertical: 8, paddingHorizontal: 12 }}>
      {/* Safety Resources - keep this prominent if needed */}
      {showSafetyResources && (
        <View
          style={{
            backgroundColor: COLORS.errorBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderLeftWidth: 3,
            borderLeftColor: COLORS.error,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 8 }}>
            Support is available
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`tel:${SAFETY_RESOURCES.domesticViolence.phone.replace(/-/g, "")}`)}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="call" size={16} color={COLORS.error} />
            <Text style={{ fontSize: 14, color: COLORS.link, marginLeft: 8 }}>
              {SAFETY_RESOURCES.domesticViolence.name}: {SAFETY_RESOURCES.domesticViolence.phone}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Results Header - focus on what was found */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 }}>
          Found {result.sources.length} public profile{result.sources.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Results List - Google style */}
      {result.sources.length > 0 && (
        <View style={{ gap: 20 }}>
          {result.sources.map((source, index) => (
            <SearchResultCard
              key={`${source.platform}-${index}`}
              source={source}
              getDomainFromUrl={getDomainFromUrl}
              getSourceIcon={getSourceIcon}
            />
          ))}
        </View>
      )}

      {/* How does this sit with you? */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>
          How does this sit with you?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["Feels fine", "I'm unsure", "This feels like a lot"].map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                Haptics.selectionAsync();
                if (onAskFollowUp && option !== "Feels fine") {
                  onAskFollowUp();
                }
              }}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor: pressed ? COLORS.surfaceHover : COLORS.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
            >
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Individual search result - Google style card
 */
function SearchResultCard({
  source,
  getDomainFromUrl,
  getSourceIcon,
}: {
  source: DeepSearchSource;
  getDomainFromUrl: (url: string) => string;
  getSourceIcon: (platform: string) => keyof typeof Ionicons.glyphMap;
}) {
  const handlePress = () => {
    Haptics.selectionAsync();
    if (source.url) {
      Linking.openURL(source.url);
    }
  };

  const isSocialMedia = ["linkedin", "twitter", "x.com", "facebook", "instagram", "youtube", "reddit", "github", "tiktok"]
    .some(platform => source.platform.toLowerCase().includes(platform));

  return (
    <View>
      {/* URL / Source line */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons name={getSourceIcon(source.platform)} size={11} color={COLORS.textSecondary} />
        </View>
        <Text style={{ fontSize: 12, color: COLORS.green }} numberOfLines={1}>
          {source.url ? getDomainFromUrl(source.url) : source.platform.toLowerCase()}
        </Text>
      </View>

      {/* Title / Platform - clickable */}
      <Pressable onPress={handlePress} disabled={!source.url}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "400",
            color: source.url ? COLORS.link : COLORS.text,
            marginBottom: 6,
            lineHeight: 22,
          }}
        >
          {source.platform}
        </Text>
      </Pressable>

      {/* Description - short */}
      <Text
        style={{
          fontSize: 13,
          color: COLORS.textSecondary,
          lineHeight: 19,
        }}
        numberOfLines={2}
      >
        {source.summary}
      </Text>

      {/* Quick details as inline pills */}
      {source.relevantDetails.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 6 }}>
          {source.relevantDetails.slice(0, 3).map((detail, i) => (
            <View
              key={i}
              style={{
                backgroundColor: COLORS.surface,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 11, color: COLORS.textSecondary }} numberOfLines={1}>
                {detail.length > 40 ? detail.slice(0, 40) + "..." : detail}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* View Profile Link - always show for social media */}
      {source.url && (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            marginTop: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons
            name={isSocialMedia ? "open-outline" : "arrow-forward"}
            size={14}
            color={COLORS.link}
          />
          <Text style={{ fontSize: 13, color: COLORS.link, marginLeft: 6, fontWeight: "500" }}>
            {isSocialMedia ? "View Profile" : "Visit Site"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Loading state - minimal Google style
 */
export function DeepSearchLoading() {
  return (
    <View style={{ marginVertical: 8, paddingHorizontal: 12 }}>
      {/* Search status */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 8 }}>
          Searching...
        </Text>
      </View>

      {/* Skeleton results */}
      <View style={{ gap: 24 }}>
        {[1, 2, 3].map((i) => (
          <View key={i}>
            {/* URL line skeleton */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: COLORS.surface,
                }}
              />
              <View
                style={{
                  height: 10,
                  width: 120,
                  backgroundColor: COLORS.surface,
                  borderRadius: 4,
                  marginLeft: 8,
                }}
              />
            </View>
            {/* Title skeleton */}
            <View
              style={{
                height: 16,
                width: "70%",
                backgroundColor: COLORS.surface,
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            {/* Description skeleton */}
            <View
              style={{
                height: 12,
                width: "100%",
                backgroundColor: COLORS.surface,
                borderRadius: 4,
                marginBottom: 4,
              }}
            />
            <View
              style={{
                height: 12,
                width: "85%",
                backgroundColor: COLORS.surface,
                borderRadius: 4,
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * No results state
 */
export function DeepSearchNoResults({ personName }: { personName: string }) {
  return (
    <View style={{ marginVertical: 8, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 8 }}>
          No results found
        </Text>
      </View>

      <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 16 }}>
        No public profiles found for {personName}
      </Text>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Try searching with:</Text>
        {["Full name", "Workplace or school", "City or location"].map((suggestion, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-forward" size={12} color={COLORS.textMuted} />
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 }}>
              {suggestion}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
