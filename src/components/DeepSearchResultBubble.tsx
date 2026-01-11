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

  const isSocialMedia = ["linkedin", "twitter", "x.com", "facebook", "instagram", "youtube", "reddit", "github", "tiktok"]
    .some(platform => source.platform.toLowerCase().includes(platform));

  const stats = source.socialStats;
  const hasStats = stats && (stats.followers !== undefined || stats.following !== undefined || stats.posts !== undefined);
  const username = stats?.username || extractUsernameFromUrl(source.url, source.platform);

  // Format large numbers
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return "";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <View>
      {/* Social Media Enhanced Card */}
      {isSocialMedia && (stats?.profileImageUrl || hasStats || username) ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 14,
          }}
        >
          {/* Header with profile image and basic info */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            {/* Profile Image */}
            {stats?.profileImageUrl ? (
              <Image
                source={{ uri: stats.profileImageUrl }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: COLORS.surfaceHover,
                }}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: COLORS.surfaceHover,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={getSourceIcon(source.platform)} size={22} color={COLORS.textSecondary} />
              </View>
            )}

            {/* Name and Platform */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Pressable onPress={handlePress} disabled={!source.url}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: COLORS.text,
                    }}
                    numberOfLines={1}
                  >
                    {stats?.displayName || source.platform}
                  </Text>
                </Pressable>
                {stats?.isVerifiedAccount && (
                  <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />
                )}
              </View>
              {username && (
                <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                  @{username.replace(/^@/, "")}
                </Text>
              )}
            </View>

            {/* Platform Icon */}
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: COLORS.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={getSourceIcon(source.platform)} size={15} color={COLORS.textSecondary} />
            </View>
          </View>

          {/* Bio if available */}
          {stats?.bio && (
            <Text
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                lineHeight: 18,
                marginBottom: 12,
              }}
              numberOfLines={2}
            >
              {stats.bio}
            </Text>
          )}

          {/* Stats Row */}
          {hasStats && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: COLORS.background,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            >
              {stats.posts !== undefined && (
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
                    {formatNumber(stats.posts)}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Posts</Text>
                </View>
              )}
              {stats.followers !== undefined && (
                <View style={{ flex: 1, alignItems: "center", borderLeftWidth: stats.posts !== undefined ? 1 : 0, borderLeftColor: COLORS.border }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
                    {formatNumber(stats.followers)}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Followers</Text>
                </View>
              )}
              {stats.following !== undefined && (
                <View style={{ flex: 1, alignItems: "center", borderLeftWidth: 1, borderLeftColor: COLORS.border }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
                    {formatNumber(stats.following)}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Following</Text>
                </View>
              )}
            </View>
          )}

          {/* Summary */}
          {source.summary && !stats?.bio && (
            <Text
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                lineHeight: 18,
                marginBottom: 12,
              }}
              numberOfLines={2}
            >
              {source.summary}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* View Profile Button */}
            {source.url && (
              <Pressable
                onPress={handlePress}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.link,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="open-outline" size={15} color="#fff" />
                <Text style={{ fontSize: 13, color: "#fff", fontWeight: "600", marginLeft: 6 }}>
                  View Profile
                </Text>
              </Pressable>
            )}

            {/* Copy Username Button */}
            {username && (
              <Pressable
                onPress={handleCopyUsername}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.background,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons
                  name={copiedUsername ? "checkmark" : "copy-outline"}
                  size={15}
                  color={copiedUsername ? COLORS.green : COLORS.textSecondary}
                />
                {copiedUsername && (
                  <Text style={{ fontSize: 12, color: COLORS.green, marginLeft: 4 }}>Copied</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        /* Standard Result Card for non-social or minimal data */
        <>
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
        </>
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
