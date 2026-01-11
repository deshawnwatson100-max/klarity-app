import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
  Linking,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeepSearchSource } from "../api/deepSearch";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

// Colors
const COLORS = {
  background: "#0A0A0A",
  surface: "#1A1A1A",
  surfaceElevated: "#242424",
  border: "#333333",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textMuted: "#666666",
  accent: "#10A37F",
  accentBg: "rgba(16, 163, 127, 0.15)",
  reject: "#EF4444",
  rejectBg: "rgba(239, 68, 68, 0.15)",
  confirm: "#10B981",
  confirmBg: "rgba(16, 185, 129, 0.15)",
  link: "#8AB4F8",
};

interface VerificationCardProps {
  source: DeepSearchSource;
  onConfirm: () => void;
  onReject: () => void;
  onViewProfile: () => void;
  index: number;
  total: number;
}

function VerificationCard({
  source,
  onConfirm,
  onReject,
  onViewProfile,
  index,
  total,
}: VerificationCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

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
    return "globe-outline";
  };

  const getPlatformColor = (platform: string): string => {
    const lower = platform.toLowerCase();
    if (lower.includes("linkedin")) return "#0A66C2";
    if (lower.includes("twitter") || lower.includes("x.com")) return "#1DA1F2";
    if (lower.includes("facebook")) return "#1877F2";
    if (lower.includes("instagram")) return "#E4405F";
    if (lower.includes("youtube")) return "#FF0000";
    if (lower.includes("reddit")) return "#FF4500";
    if (lower.includes("github")) return "#6e5494";
    if (lower.includes("tiktok")) return "#00F2EA";
    return COLORS.accent;
  };

  const extractUsername = (): string | null => {
    if (source.socialStats?.username) return source.socialStats.username;
    if (!source.url) return null;
    try {
      const urlObj = new URL(source.url);
      const parts = urlObj.pathname.split("/").filter(p => p.length > 0);
      if (parts.length > 0 && !["p", "status", "reel", "in"].includes(parts[0])) {
        return parts[parts[0] === "in" ? 1 : 0];
      }
    } catch {
      return null;
    }
    return null;
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
        if (gestureState.dx > 50) {
          setSwipeDirection("right");
        } else if (gestureState.dx < -50) {
          setSwipeDirection("left");
        } else {
          setSwipeDirection(null);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 120) {
          // Swipe right - Confirm
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onConfirm());
        } else if (gestureState.dx < -120) {
          // Swipe left - Reject
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onReject());
        } else {
          // Reset
          setSwipeDirection(null);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  const stats = source.socialStats;
  const username = extractUsername();
  const platformColor = getPlatformColor(source.platform);

  const cardRotation = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  });

  const confirmOpacity = translateX.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const rejectOpacity = translateX.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX }, { rotate: cardRotation }],
        width: CARD_WIDTH,
        alignSelf: "center",
      }}
    >
      {/* Swipe indicators */}
      <Animated.View
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          opacity: confirmOpacity,
          zIndex: 10,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.confirmBg,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: COLORS.confirm,
          }}
        >
          <Text style={{ color: COLORS.confirm, fontWeight: "700", fontSize: 14 }}>
            THIS IS THEM
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          opacity: rejectOpacity,
          zIndex: 10,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.rejectBg,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: COLORS.reject,
          }}
        >
          <Text style={{ color: COLORS.reject, fontWeight: "700", fontSize: 14 }}>
            NOT THEM
          </Text>
        </View>
      </Animated.View>

      {/* Main Card */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Platform Header */}
        <View
          style={{
            backgroundColor: platformColor,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name={getSourceIcon(source.platform)} size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", marginLeft: 8 }}>
              {source.platform}
            </Text>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
            {index + 1} of {total}
          </Text>
        </View>

        {/* Profile Section */}
        <View style={{ padding: 20, alignItems: "center" }}>
          {/* Profile Image */}
          {stats?.profileImageUrl ? (
            <Image
              source={{ uri: stats.profileImageUrl }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 3,
                borderColor: platformColor,
              }}
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: COLORS.surfaceElevated,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: platformColor,
              }}
            >
              <Ionicons name={getSourceIcon(source.platform)} size={40} color={COLORS.textMuted} />
            </View>
          )}

          {/* Display Name */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: COLORS.text,
              marginTop: 16,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {stats?.displayName || source.platform}
          </Text>

          {/* Username */}
          {username && (
            <Text style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 4 }}>
              @{username.replace(/^@/, "")}
            </Text>
          )}

          {/* Verified Badge */}
          {stats?.isVerifiedAccount && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
                backgroundColor: "rgba(29, 161, 242, 0.15)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" />
              <Text style={{ color: "#1DA1F2", fontSize: 12, marginLeft: 4 }}>Verified</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        {(stats?.followers !== undefined || stats?.following !== undefined || stats?.posts !== undefined) && (
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: COLORS.border,
              paddingVertical: 16,
              marginHorizontal: 20,
            }}
          >
            {stats.posts !== undefined && (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>
                  {formatNumber(stats.posts)}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Posts</Text>
              </View>
            )}
            {stats.followers !== undefined && (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>
                  {formatNumber(stats.followers)}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Followers</Text>
              </View>
            )}
            {stats.following !== undefined && (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>
                  {formatNumber(stats.following)}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Following</Text>
              </View>
            )}
          </View>
        )}

        {/* Bio */}
        {(stats?.bio || source.summary) && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.textSecondary,
                lineHeight: 20,
                textAlign: "center",
              }}
              numberOfLines={3}
            >
              {stats?.bio || source.summary}
            </Text>
          </View>
        )}

        {/* Relevant Details Pills */}
        {source.relevantDetails.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {source.relevantDetails.slice(0, 4).map((detail, i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: COLORS.surfaceElevated,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                      {detail.length > 30 ? detail.slice(0, 30) + "..." : detail}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* View Profile Button */}
        {source.url && (
          <Pressable
            onPress={onViewProfile}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              marginBottom: 20,
              backgroundColor: pressed ? COLORS.surfaceElevated : "transparent",
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 12,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="open-outline" size={16} color={COLORS.link} />
            <Text style={{ color: COLORS.link, fontSize: 14, fontWeight: "600", marginLeft: 8 }}>
              View Full Profile
            </Text>
          </Pressable>
        )}

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onReject();
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? COLORS.reject : COLORS.rejectBg,
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="close" size={20} color={COLORS.reject} />
            <Text style={{ color: COLORS.reject, fontSize: 15, fontWeight: "600", marginLeft: 6 }}>
              Not Them
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onConfirm();
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? COLORS.confirm : COLORS.confirmBg,
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="checkmark" size={20} color={COLORS.confirm} />
            <Text style={{ color: COLORS.confirm, fontSize: 15, fontWeight: "600", marginLeft: 6 }}>
              This is Them
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

interface DeepSearchVerificationFlowProps {
  sources: DeepSearchSource[];
  personName: string;
  onVerificationComplete: (verifiedSources: DeepSearchSource[], rejectedSources: DeepSearchSource[]) => void;
  onCancel: () => void;
}

export function DeepSearchVerificationFlow({
  sources,
  personName,
  onVerificationComplete,
  onCancel,
}: DeepSearchVerificationFlowProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifiedSources, setVerifiedSources] = useState<DeepSearchSource[]>([]);
  const [rejectedSources, setRejectedSources] = useState<DeepSearchSource[]>([]);

  const handleConfirm = useCallback(() => {
    const currentSource = sources[currentIndex];
    setVerifiedSources(prev => [...prev, currentSource]);

    if (currentIndex < sources.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All done
      setTimeout(() => {
        onVerificationComplete([...verifiedSources, currentSource], rejectedSources);
      }, 300);
    }
  }, [currentIndex, sources, verifiedSources, rejectedSources, onVerificationComplete]);

  const handleReject = useCallback(() => {
    const currentSource = sources[currentIndex];
    setRejectedSources(prev => [...prev, currentSource]);

    if (currentIndex < sources.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All done
      setTimeout(() => {
        onVerificationComplete(verifiedSources, [...rejectedSources, currentSource]);
      }, 300);
    }
  }, [currentIndex, sources, verifiedSources, rejectedSources, onVerificationComplete]);

  const handleViewProfile = useCallback(() => {
    const url = sources[currentIndex]?.url;
    if (url) {
      Haptics.selectionAsync();
      Linking.openURL(url);
    }
  }, [currentIndex, sources]);

  const progress = ((currentIndex) / sources.length) * 100;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={onCancel} hitSlop={12}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: COLORS.text }}>
              Verify Results
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
              for {personName}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 4,
            backgroundColor: COLORS.surfaceElevated,
            borderRadius: 2,
            marginTop: 16,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: COLORS.accent,
              borderRadius: 2,
            }}
          />
        </View>

        {/* Instructions */}
        <Text
          style={{
            fontSize: 13,
            color: COLORS.textMuted,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Swipe right if this is them, left if not
        </Text>
      </View>

      {/* Card Stack */}
      <View style={{ flex: 1, justifyContent: "center", paddingVertical: 20 }}>
        {sources[currentIndex] && (
          <VerificationCard
            key={currentIndex}
            source={sources[currentIndex]}
            onConfirm={handleConfirm}
            onReject={handleReject}
            onViewProfile={handleViewProfile}
            index={currentIndex}
            total={sources.length}
          />
        )}
      </View>

      {/* Bottom Stats */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          paddingBottom: 30,
          gap: 40,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.confirmBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.confirm }}>
              {verifiedSources.length}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>Verified</Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.rejectBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.reject }}>
              {rejectedSources.length}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>Rejected</Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.surfaceElevated,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textSecondary }}>
              {sources.length - currentIndex}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>Remaining</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Verification Complete Summary Component
 */
interface VerificationSummaryProps {
  verifiedSources: DeepSearchSource[];
  personName: string;
  onDeepDive: () => void;
  onDone: () => void;
}

export function VerificationSummary({
  verifiedSources,
  personName,
  onDeepDive,
  onDone,
}: VerificationSummaryProps) {
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
    <View style={{ padding: 20 }}>
      {/* Success Header */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: COLORS.confirmBg,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="checkmark-circle" size={36} color={COLORS.confirm} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>
          {verifiedSources.length} Profile{verifiedSources.length !== 1 ? "s" : ""} Verified
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4, textAlign: "center" }}>
          You confirmed these profiles belong to {personName}
        </Text>
      </View>

      {/* Verified Profiles List */}
      <View style={{ marginBottom: 24 }}>
        {verifiedSources.map((source, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            {source.socialStats?.profileImageUrl ? (
              <Image
                source={{ uri: source.socialStats.profileImageUrl }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: COLORS.surfaceElevated,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={getSourceIcon(source.platform)} size={18} color={COLORS.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
                {source.socialStats?.displayName || source.platform}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                {source.platform}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.confirm} />
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={{ gap: 12 }}>
        {verifiedSources.length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDeepDive();
            }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.surfaceElevated : COLORS.accent,
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              Deep Dive with Verified Data
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onDone();
          }}
          style={({ pressed }) => ({
            backgroundColor: pressed ? COLORS.surfaceElevated : COLORS.surface,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
          })}
        >
          <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontWeight: "500" }}>
            {verifiedSources.length > 0 ? "Skip Deep Dive" : "Done"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
