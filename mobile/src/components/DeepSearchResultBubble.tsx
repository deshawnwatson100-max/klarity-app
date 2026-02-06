import React, { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { DeepSearchResult, DeepSearchSource, SAFETY_RESOURCES } from "../api/deepSearch";
import { useTheme } from "../theme/ThemeContext";

// Theme-aware color getter
function getColors(isDark: boolean) {
  if (isDark) {
    return {
      text: "#EDEDED",
      textSecondary: "#A0A0A0",
      textMuted: "#6B7280",
      link: "#60A5FA",
      success: "#10B981",
      error: "#EF4444",
      errorBg: "rgba(239, 68, 68, 0.1)",
      buttonBg: "rgba(255, 255, 255, 0.08)",
      buttonBgHover: "rgba(255, 255, 255, 0.12)",
      iconBg: "rgba(255, 255, 255, 0.08)",
    };
  }
  // Light mode colors
  return {
    text: "#1C1C1E",
    textSecondary: "#636366",
    textMuted: "#8E8E93",
    link: "#007AFF",
    success: "#34C759",
    error: "#DC2626",
    errorBg: "rgba(220, 38, 38, 0.08)",
    buttonBg: "rgba(0, 0, 0, 0.05)",
    buttonBgHover: "rgba(0, 0, 0, 0.08)",
    iconBg: "rgba(0, 0, 0, 0.05)",
  };
}

// Platform icons
const getPlatformIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
  const lower = platform.toLowerCase();
  if (lower.includes("linkedin")) return "logo-linkedin";
  if (lower.includes("twitter") || lower.includes("x.com")) return "logo-twitter";
  if (lower.includes("facebook")) return "logo-facebook";
  if (lower.includes("instagram")) return "logo-instagram";
  if (lower.includes("youtube")) return "logo-youtube";
  if (lower.includes("reddit")) return "logo-reddit";
  if (lower.includes("github")) return "logo-github";
  if (lower.includes("tiktok")) return "musical-notes";
  if (lower.includes("tinder") || lower.includes("bumble") || lower.includes("hinge") || lower.includes("dating")) return "heart";
  if (lower.includes("court") || lower.includes("legal") || lower.includes("gov")) return "document-text";
  if (lower.includes("archive")) return "time";
  return "globe-outline";
};

interface DeepSearchResultBubbleProps {
  result: DeepSearchResult;
  onAskFollowUp?: () => void;
  showSafetyResources?: boolean;
}

/**
 * Deep Dive results display - matches the chat bubble style
 */
export function DeepSearchResultBubble({
  result,
  onAskFollowUp,
  showSafetyResources = false,
}: DeepSearchResultBubbleProps) {
  const { isDark } = useTheme();
  const COLORS = getColors(isDark);

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Safety Resources */}
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

      {/* Intro text */}
      <Text
        style={{
          fontSize: 17,
          lineHeight: 26,
          color: COLORS.text,
          letterSpacing: 0.2,
          marginBottom: 24,
        }}
      >
        Here is what I found from the verified profiles:
      </Text>

      {/* Results List - ChatGPT inline style */}
      {result.sources.length > 0 && (
        <View style={{ gap: 28 }}>
          {result.sources.map((source, index) => (
            <DeepDiveProfileCard
              key={`${source.platform}-${index}`}
              source={source}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Profile card - matches DeepSearchProfileMessage style exactly
 */
function DeepDiveProfileCard({ source, isDark }: { source: DeepSearchSource; isDark: boolean }) {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const COLORS = getColors(isDark);

  const handlePress = () => {
    Haptics.selectionAsync();
    if (source.url) {
      Linking.openURL(source.url);
    }
  };

  const handleCopyUsername = async () => {
    const username = source.socialStats?.username || extractUsernameFromUrl(source.url, source.platform);
    if (username) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Clipboard.setStringAsync(username);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  };

  const stats = source.socialStats;
  const username = stats?.username || extractUsernameFromUrl(source.url, source.platform);
  const displayName = stats?.displayName || source.platform;
  const bio = stats?.bio || source.summary;

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return "";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Build stats string
  const statsStr = [
    stats?.followers !== undefined ? `${formatNumber(stats.followers)} followers` : null,
    stats?.posts !== undefined ? `${formatNumber(stats.posts)} posts` : null,
  ].filter(Boolean).join(" · ");

  return (
    <View>
      {/* Profile header line */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={getPlatformIcon(source.platform)} size={16} color={COLORS.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>
            {displayName}
          </Text>
          {username && (
            <Pressable onPress={handleCopyUsername} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: COLORS.link }}>
                @{username.replace(/^@/, "")}
              </Text>
              {copiedUsername && (
                <Ionicons name="checkmark" size={12} color={COLORS.success} style={{ marginLeft: 4 }} />
              )}
            </Pressable>
          )}
        </View>
        {stats?.isVerifiedAccount && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
          </View>
        )}
      </View>

      {/* Bio/Summary */}
      {bio && (
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: COLORS.textSecondary,
            marginBottom: 8,
          }}
          numberOfLines={3}
        >
          {bio}
        </Text>
      )}

      {/* Stats */}
      {statsStr && (
        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>
          {statsStr}
        </Text>
      )}

      {/* Relevant details as inline tags */}
      {source.relevantDetails.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {source.relevantDetails.slice(0, 3).map((detail, i) => (
            <Text
              key={i}
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                backgroundColor: COLORS.buttonBg,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              {detail.length > 35 ? detail.slice(0, 35) + "..." : detail}
            </Text>
          ))}
        </View>
      )}

      {/* View profile button */}
      {source.url && (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 6,
            backgroundColor: pressed ? COLORS.buttonBgHover : COLORS.buttonBg,
            alignSelf: "flex-start",
          })}
        >
          <Ionicons name="open-outline" size={14} color={COLORS.link} />
          <Text style={{ color: COLORS.link, fontSize: 13, marginLeft: 4 }}>
            View
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Extract username from URL for various platforms
 */
function extractUsernameFromUrl(url: string | undefined, platform: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split("/").filter(p => p.length > 0);

    const platformLower = platform.toLowerCase();

    // Instagram, Twitter/X, TikTok, GitHub: first path segment is username
    if (["instagram", "twitter", "x.com", "tiktok", "github"].some(p => platformLower.includes(p))) {
      if (parts.length > 0 && !["p", "status", "reel", "explore", "settings"].includes(parts[0])) {
        return parts[0];
      }
    }

    // LinkedIn: /in/username
    if (platformLower.includes("linkedin") && parts[0] === "in" && parts.length > 1) {
      return parts[1];
    }

    // Facebook: /profile.php?id= or /username
    if (platformLower.includes("facebook")) {
      const idParam = urlObj.searchParams.get("id");
      if (idParam) return idParam;
      if (parts.length > 0 && !["pages", "groups", "events"].includes(parts[0])) {
        return parts[0];
      }
    }

    // YouTube: /c/username or /channel/ or /@username
    if (platformLower.includes("youtube")) {
      if (parts[0] === "c" && parts.length > 1) return parts[1];
      if (parts[0]?.startsWith("@")) return parts[0].substring(1);
      if (parts[0] === "channel" && parts.length > 1) return parts[1];
    }

    // Reddit: /user/username
    if (platformLower.includes("reddit") && parts[0] === "user" && parts.length > 1) {
      return parts[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Loading state - simple text
 */
export function DeepSearchLoading() {
  const { isDark } = useTheme();
  const COLORS = getColors(isDark);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 17,
          lineHeight: 26,
          color: COLORS.textMuted,
          letterSpacing: 0.2,
        }}
      >
        Searching...
      </Text>
    </View>
  );
}

/**
 * No results state
 */
export function DeepSearchNoResults({ personName }: { personName: string }) {
  const { isDark } = useTheme();
  const COLORS = getColors(isDark);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 17,
          lineHeight: 26,
          color: COLORS.text,
          letterSpacing: 0.2,
          marginBottom: 16,
        }}
      >
        I was not able to find any public profiles for <Text style={{ fontWeight: "600" }}>{personName}</Text>. This could mean:
      </Text>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Text style={{ color: COLORS.textMuted, marginRight: 8 }}>•</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, flex: 1 }}>
            They use a different name online
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Text style={{ color: COLORS.textMuted, marginRight: 8 }}>•</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, flex: 1 }}>
            Their profiles are set to private
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Text style={{ color: COLORS.textMuted, marginRight: 8 }}>•</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, flex: 1 }}>
            Additional details might help narrow the search
          </Text>
        </View>
      </View>
    </View>
  );
}
