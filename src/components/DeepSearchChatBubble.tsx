import React, { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { DeepSearchSource } from "../api/deepSearch";

// Colors matching the app's ChatGPT-style aesthetic
const COLORS = {
  text: "#EDEDED",
  textSecondary: "#A0A0A0",
  textMuted: "#6B7280",
  link: "#60A5FA",
  success: "#10B981",
  error: "#EF4444",
  buttonBg: "rgba(255, 255, 255, 0.08)",
  buttonBgHover: "rgba(255, 255, 255, 0.12)",
};

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
  return "globe-outline";
};

interface DeepSearchIntroMessageProps {
  personName: string;
  totalResults: number;
}

/**
 * Intro message - ChatGPT style flowing text
 */
export function DeepSearchIntroMessage({ personName, totalResults }: DeepSearchIntroMessageProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ marginBottom: 24 }}
    >
      <Text
        style={{
          fontSize: 17,
          lineHeight: 26,
          color: COLORS.text,
          letterSpacing: 0.2,
        }}
      >
        I found {totalResults} public profile{totalResults !== 1 ? "s" : ""} that may belong to{" "}
        <Text style={{ fontWeight: "600" }}>{personName}</Text>. Let me show you what I found so you can verify which ones are actually them.
      </Text>
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
 * Profile result - clean inline format like ChatGPT
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
    <Animated.View
      entering={FadeInUp.duration(350).delay(index * 100)}
      style={{ marginBottom: 28 }}
    >
      {/* Profile header line */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.buttonBg,
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

      {/* Action row - view profile + verification */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* View profile link */}
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
            })}
          >
            <Ionicons name="open-outline" size={14} color={COLORS.link} />
            <Text style={{ color: COLORS.link, fontSize: 13, marginLeft: 4 }}>
              View
            </Text>
          </Pressable>
        )}

        {/* Verification buttons */}
        {showVerificationButtons && verificationStatus === "pending" && (
          <>
            <Pressable
              onPress={() => handleVerify(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: pressed ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
              })}
            >
              <Ionicons name="checkmark" size={14} color={COLORS.success} />
              <Text style={{ color: COLORS.success, fontSize: 13, marginLeft: 4 }}>
                This is them
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleVerify(false)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: pressed ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
              })}
            >
              <Ionicons name="close" size={14} color={COLORS.error} />
              <Text style={{ color: COLORS.error, fontSize: 13, marginLeft: 4 }}>
                Not them
              </Text>
            </Pressable>
          </>
        )}

        {/* Verification status indicator */}
        {verificationStatus !== "pending" && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name={verificationStatus === "verified" ? "checkmark-circle" : "close-circle"}
              size={16}
              color={verificationStatus === "verified" ? COLORS.success : COLORS.error}
            />
            <Text
              style={{
                color: verificationStatus === "verified" ? COLORS.success : COLORS.error,
                fontSize: 13,
                marginLeft: 4,
              }}
            >
              {verificationStatus === "verified" ? "Confirmed" : "Not them"}
            </Text>
          </View>
        )}
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
 * Summary message - ChatGPT style
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
    summaryText = `Got it! I confirmed 1 profile belongs to ${personName}. I can dig deeper into this profile if you'd like.`;
  } else {
    summaryText = `Got it! I confirmed ${verifiedCount} profiles belong to ${personName}. I can analyze these further if you'd like.`;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ marginBottom: 24 }}
    >
      <Text
        style={{
          fontSize: 17,
          lineHeight: 26,
          color: COLORS.text,
          letterSpacing: 0.2,
        }}
      >
        {summaryText}
      </Text>

      {verifiedCount > 0 && onDeepDive && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDeepDive();
          }}
          style={({ pressed }) => ({
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: pressed ? COLORS.buttonBgHover : COLORS.buttonBg,
          })}
        >
          <Ionicons name="search" size={16} color={COLORS.link} />
          <Text style={{ color: COLORS.link, fontSize: 14, fontWeight: "500", marginLeft: 8 }}>
            Deep Dive
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

interface DeepSearchNoResultsMessageProps {
  personName: string;
}

/**
 * No results message - ChatGPT style
 */
export function DeepSearchNoResultsMessage({ personName }: DeepSearchNoResultsMessageProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ marginBottom: 24 }}
    >
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
