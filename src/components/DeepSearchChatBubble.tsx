import React, { useState } from "react";
import { View, Text, Pressable, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { DeepSearchSource } from "../api/deepSearch";

// Chat bubble colors - consistent with decode chat loop
const COLORS = {
  background: "#1A1A1A",
  surface: "#242424",
  surfaceHover: "#2E2E2E",
  border: "#333333",
  text: "#E8E8E8",
  textSecondary: "#A0A0A0",
  textMuted: "#707070",
  link: "#8AB4F8",
  green: "#81C995",
  accent: "#10A37F",
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

interface DeepSearchIntroMessageProps {
  personName: string;
  totalResults: number;
}

/**
 * Initial message from assistant introducing the search results
 */
export function DeepSearchIntroMessage({ personName, totalResults }: DeepSearchIntroMessageProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ marginBottom: 8 }}
    >
      <View
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          maxWidth: "85%",
        }}
      >
        <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22 }}>
          I found {totalResults} public profile{totalResults !== 1 ? "s" : ""} that may belong to {personName}. Let me walk you through what I found.
        </Text>
      </View>
    </Animated.View>
  );
}

interface DeepSearchProfileMessageProps {
  source: DeepSearchSource;
  index: number;
  total: number;
  onVerify?: (isVerified: boolean) => void;
  showVerificationButtons?: boolean;
}

/**
 * Individual profile result as a chat message
 */
export function DeepSearchProfileMessage({
  source,
  index,
  total,
  onVerify,
  showVerificationButtons = true,
}: DeepSearchProfileMessageProps) {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "rejected">("pending");

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

  const handleVerify = (isVerified: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVerificationStatus(isVerified ? "verified" : "rejected");
    onVerify?.(isVerified);
  };

  // Get platform info
  const platformLower = source.platform.toLowerCase();
  const platformKey = Object.keys(PLATFORM_COLORS).find(k => platformLower.includes(k)) || "default";
  const platformColor = PLATFORM_COLORS[platformKey];

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
    return "globe-outline";
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return url;
    }
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const stats = source.socialStats;
  const username = stats?.username || extractUsernameFromUrl(source.url, source.platform);
  const displayName = stats?.displayName || source.platform;
  const bio = stats?.bio || source.summary;
  const hasStats = stats && (stats.followers !== undefined || stats.following !== undefined || stats.posts !== undefined);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 150)}
      style={{ marginBottom: 16 }}
    >
      {/* Profile number indicator */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: platformColor.bg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: platformColor.icon }}>
            {index + 1}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
          {source.platform}
        </Text>
        {stats?.isVerifiedAccount && (
          <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
            <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" />
            <Text style={{ fontSize: 11, color: "#1DA1F2", marginLeft: 2 }}>Verified</Text>
          </View>
        )}
      </View>

      {/* Profile Card */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          overflow: "hidden",
          maxWidth: "90%",
        }}
      >
        {/* Profile Header */}
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
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
                  backgroundColor: platformColor.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={getSourceIcon(source.platform)} size={22} color={platformColor.icon} />
              </View>
            )}

            {/* Name and Username */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: COLORS.text,
                }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {username && (
                <Pressable onPress={handleCopyUsername} style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  <Text style={{ fontSize: 14, color: COLORS.link }}>
                    @{username.replace(/^@/, "")}
                  </Text>
                  <Ionicons
                    name={copiedUsername ? "checkmark" : "copy-outline"}
                    size={12}
                    color={copiedUsername ? COLORS.green : COLORS.textMuted}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>
              )}
              {source.url && (
                <Text style={{ fontSize: 11, color: COLORS.green, marginTop: 2 }} numberOfLines={1}>
                  {getDomainFromUrl(source.url)}
                </Text>
              )}
            </View>
          </View>

          {/* Bio */}
          {bio && (
            <Text
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                lineHeight: 18,
                marginTop: 12,
              }}
              numberOfLines={3}
            >
              {bio}
            </Text>
          )}

          {/* Stats */}
          {hasStats && (
            <View
              style={{
                flexDirection: "row",
                marginTop: 12,
                gap: 16,
              }}
            >
              {stats.posts !== undefined && (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
                    {formatNumber(stats.posts)}
                  </Text>
                  <Text style={{ fontSize: 10, color: COLORS.textMuted }}>posts</Text>
                </View>
              )}
              {stats.followers !== undefined && (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
                    {formatNumber(stats.followers)}
                  </Text>
                  <Text style={{ fontSize: 10, color: COLORS.textMuted }}>followers</Text>
                </View>
              )}
              {stats.following !== undefined && (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
                    {formatNumber(stats.following)}
                  </Text>
                  <Text style={{ fontSize: 10, color: COLORS.textMuted }}>following</Text>
                </View>
              )}
            </View>
          )}

          {/* Relevant Details Tags */}
          {source.relevantDetails.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {source.relevantDetails.slice(0, 3).map((detail, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: COLORS.background,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary }} numberOfLines={1}>
                    {detail.length > 30 ? detail.slice(0, 30) + "..." : detail}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            padding: 12,
            gap: 8,
          }}
        >
          {/* View Profile Button */}
          {source.url && (
            <Pressable
              onPress={handlePress}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? COLORS.surfaceHover : "transparent",
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 10,
                paddingVertical: 10,
              })}
            >
              <Ionicons name="open-outline" size={16} color={COLORS.link} />
              <Text style={{ color: COLORS.link, fontSize: 14, fontWeight: "500", marginLeft: 6 }}>
                View Profile
              </Text>
            </Pressable>
          )}

          {/* Verification Buttons */}
          {showVerificationButtons && verificationStatus === "pending" && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => handleVerify(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                  borderRadius: 10,
                  paddingVertical: 10,
                })}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "500", marginLeft: 4 }}>
                  Not them
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleVerify(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
                  borderRadius: 10,
                  paddingVertical: 10,
                })}
              >
                <Ionicons name="checkmark" size={16} color="#10B981" />
                <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "500", marginLeft: 4 }}>
                  This is them
                </Text>
              </Pressable>
            </View>
          )}

          {/* Verification Status */}
          {verificationStatus !== "pending" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
              }}
            >
              <Ionicons
                name={verificationStatus === "verified" ? "checkmark-circle" : "close-circle"}
                size={18}
                color={verificationStatus === "verified" ? "#10B981" : "#EF4444"}
              />
              <Text
                style={{
                  color: verificationStatus === "verified" ? "#10B981" : "#EF4444",
                  fontSize: 13,
                  fontWeight: "500",
                  marginLeft: 6,
                }}
              >
                {verificationStatus === "verified" ? "Confirmed as them" : "Not them"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

interface DeepSearchSummaryMessageProps {
  verifiedCount: number;
  rejectedCount: number;
  totalCount: number;
  personName: string;
  onDeepDive?: () => void;
}

/**
 * Summary message after verification
 */
export function DeepSearchSummaryMessage({
  verifiedCount,
  rejectedCount,
  totalCount,
  personName,
  onDeepDive,
}: DeepSearchSummaryMessageProps) {
  let summaryText = "";

  if (verifiedCount === 0) {
    summaryText = `None of the ${totalCount} profiles were confirmed as ${personName}. Would you like me to search again with different details?`;
  } else if (verifiedCount === 1) {
    summaryText = `Got it! I confirmed 1 profile belongs to ${personName}. I can dig deeper into this profile if you would like.`;
  } else {
    summaryText = `Got it! I confirmed ${verifiedCount} profiles belong to ${personName}. I can analyze these further if you would like.`;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ marginTop: 8, marginBottom: 8 }}
    >
      <View
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          maxWidth: "85%",
        }}
      >
        <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22 }}>
          {summaryText}
        </Text>

        {verifiedCount > 0 && onDeepDive && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDeepDive();
            }}
            style={({ pressed }) => ({
              marginTop: 12,
              backgroundColor: pressed ? COLORS.surfaceHover : COLORS.accent,
              borderRadius: 10,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginLeft: 8 }}>
              Deep Dive
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

interface DeepSearchNoResultsMessageProps {
  personName: string;
}

/**
 * Message when no results are found
 */
export function DeepSearchNoResultsMessage({ personName }: DeepSearchNoResultsMessageProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ marginBottom: 8 }}
    >
      <View
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          maxWidth: "85%",
        }}
      >
        <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22 }}>
          I was not able to find any public profiles for {personName}. This could mean:
        </Text>
        <View style={{ marginTop: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ color: COLORS.textMuted, marginRight: 8 }}>•</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, flex: 1 }}>
              They use a different name online
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ color: COLORS.textMuted, marginRight: 8 }}>•</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, flex: 1 }}>
              Their profiles are private
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ color: COLORS.textMuted, marginRight: 8 }}>•</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, flex: 1 }}>
              Additional details might help narrow the search
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
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
