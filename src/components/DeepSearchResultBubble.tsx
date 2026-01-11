import React from "react";
import { View, Text, Pressable, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
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

// Platform colors for visual distinction
const PLATFORM_COLORS: Record<string, { bg: string; icon: string }> = {
  instagram: { bg: "#E1306C20", icon: "#E1306C" },
  facebook: { bg: "#1877F220", icon: "#1877F2" },
  twitter: { bg: "#1DA1F220", icon: "#1DA1F2" },
  "x.com": { bg: "#00000040", icon: "#FFFFFF" },
  linkedin: { bg: "#0A66C220", icon: "#0A66C2" },
  tiktok: { bg: "#00F2EA20", icon: "#00F2EA" },
  youtube: { bg: "#FF000020", icon: "#FF0000" },
  reddit: { bg: "#FF450020", icon: "#FF4500" },
  github: { bg: "#FFFFFF15", icon: "#FFFFFF" },
  default: { bg: "#8AB4F815", icon: "#8AB4F8" },
};

interface DeepSearchResultBubbleProps {
  result: DeepSearchResult;
  onAskFollowUp?: () => void;
  showSafetyResources?: boolean;
}

/**
 * Enhanced search results display with profile cards
 */
export function DeepSearchResultBubble({
  result,
  onAskFollowUp,
  showSafetyResources = false,
}: DeepSearchResultBubbleProps) {
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

      {/* Results Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 }}>
          Found {result.sources.length} public profile{result.sources.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Results List - Enhanced Cards */}
      {result.sources.length > 0 && (
        <View style={{ gap: 12 }}>
          {result.sources.map((source, index) => (
            <EnhancedResultCard
              key={`${source.platform}-${index}`}
              source={source}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Enhanced result card - always shows rich details
 */
function EnhancedResultCard({ source }: { source: DeepSearchSource }) {
  const [copiedUsername, setCopiedUsername] = React.useState(false);

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

  // Get platform info
  const platformLower = source.platform.toLowerCase();
  const platformKey = Object.keys(PLATFORM_COLORS).find(k => platformLower.includes(k)) || "default";
  const platformColor = PLATFORM_COLORS[platformKey];

  // Get icon for platform
  const getSourceIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
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

  // Get domain from URL
  const getDomainFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return url;
    }
  };

  const stats = source.socialStats;
  const username = stats?.username || extractUsernameFromUrl(source.url, source.platform);
  const displayName = stats?.displayName || source.platform;
  const bio = stats?.bio || source.summary;
  const hasStats = stats && (stats.followers !== undefined || stats.following !== undefined || stats.posts !== undefined);

  // Format large numbers
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Platform Header Bar */}
      <View
        style={{
          backgroundColor: platformColor.bg,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: COLORS.background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={getSourceIcon(source.platform)} size={16} color={platformColor.icon} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginLeft: 10, flex: 1 }}>
          {source.platform}
        </Text>
        {stats?.isVerifiedAccount && (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1DA1F220", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" />
            <Text style={{ fontSize: 11, color: "#1DA1F2", marginLeft: 4, fontWeight: "500" }}>Verified</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ padding: 14 }}>
        {/* Profile Row */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
          {/* Profile Image/Icon */}
          {stats?.profileImageUrl ? (
            <Image
              source={{ uri: stats.profileImageUrl }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: COLORS.surfaceHover,
              }}
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: platformColor.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={getSourceIcon(source.platform)} size={24} color={platformColor.icon} />
            </View>
          )}

          {/* Name and Username */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Pressable onPress={handlePress} disabled={!source.url}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: COLORS.text,
                }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </Pressable>
            {username && (
              <Pressable onPress={handleCopyUsername} style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                <Text style={{ fontSize: 14, color: COLORS.link }}>
                  @{username.replace(/^@/, "")}
                </Text>
                <Ionicons
                  name={copiedUsername ? "checkmark" : "copy-outline"}
                  size={14}
                  color={copiedUsername ? COLORS.green : COLORS.textMuted}
                  style={{ marginLeft: 6 }}
                />
                {copiedUsername && (
                  <Text style={{ fontSize: 11, color: COLORS.green, marginLeft: 4 }}>Copied!</Text>
                )}
              </Pressable>
            )}
            {/* URL domain */}
            {source.url && (
              <Text style={{ fontSize: 12, color: COLORS.green, marginTop: 4 }} numberOfLines={1}>
                {getDomainFromUrl(source.url)}
              </Text>
            )}
          </View>
        </View>

        {/* Bio/Summary */}
        {bio && (
          <View style={{ backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                lineHeight: 19,
              }}
              numberOfLines={3}
            >
              {bio}
            </Text>
          </View>
        )}

        {/* Stats Row - Always show for social platforms */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: COLORS.background,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>
              {hasStats && stats.posts !== undefined ? formatNumber(stats.posts) : "-"}
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Posts</Text>
          </View>
          <View style={{ width: 1, backgroundColor: COLORS.border }} />
          <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>
              {hasStats && stats.followers !== undefined ? formatNumber(stats.followers) : "-"}
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Followers</Text>
          </View>
          <View style={{ width: 1, backgroundColor: COLORS.border }} />
          <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>
              {hasStats && stats.following !== undefined ? formatNumber(stats.following) : "-"}
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Following</Text>
          </View>
        </View>

        {/* Relevant Details as Tags */}
        {source.relevantDetails.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {source.relevantDetails.slice(0, 4).map((detail, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: COLORS.background,
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                }}
              >
                <Text style={{ fontSize: 11, color: COLORS.textSecondary }} numberOfLines={1}>
                  {detail.length > 35 ? detail.slice(0, 35) + "..." : detail}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Button */}
        {source.url && (
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.link,
              paddingVertical: 12,
              borderRadius: 10,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="open-outline" size={16} color="#fff" />
            <Text style={{ fontSize: 14, color: "#fff", fontWeight: "600", marginLeft: 8 }}>
              View Profile
            </Text>
          </Pressable>
        )}
      </View>
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
 * Loading state - skeleton cards
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

      {/* Skeleton cards */}
      <View style={{ gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Header skeleton */}
            <View style={{ backgroundColor: COLORS.surfaceHover, padding: 14, flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.background }} />
              <View style={{ height: 14, width: 100, backgroundColor: COLORS.background, borderRadius: 4, marginLeft: 10 }} />
            </View>
            {/* Content skeleton */}
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.surfaceHover }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ height: 16, width: "70%", backgroundColor: COLORS.surfaceHover, borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ height: 12, width: "50%", backgroundColor: COLORS.surfaceHover, borderRadius: 4 }} />
                </View>
              </View>
              {/* Stats skeleton */}
              <View style={{ flexDirection: "row", backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                {[1, 2, 3].map((j) => (
                  <View key={j} style={{ flex: 1, alignItems: "center" }}>
                    <View style={{ height: 16, width: 30, backgroundColor: COLORS.surfaceHover, borderRadius: 4, marginBottom: 4 }} />
                    <View style={{ height: 10, width: 50, backgroundColor: COLORS.surfaceHover, borderRadius: 4 }} />
                  </View>
                ))}
              </View>
              {/* Button skeleton */}
              <View style={{ height: 44, backgroundColor: COLORS.surfaceHover, borderRadius: 10 }} />
            </View>
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
