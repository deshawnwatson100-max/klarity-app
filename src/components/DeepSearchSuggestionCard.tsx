import React, { useState, memo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import {
  usePersonContextStore,
} from "../state/personContextStore";
import {
  useLoopsStore,
} from "../state/loopsStore";
import {
  DeepSearchSuggestionState,
  DeepSearchResultMessage,
} from "../types/chat";
import { RelationshipContextType, ContextAnchorType } from "../types/personContext";
import {
  DeepSearchResultBubble,
  DeepSearchLoading,
} from "./DeepSearchResultBubble";

// ChatGPT-style colors
const COLORS = {
  background: "#1A1A1A",
  surface: "#000000",
  surfaceHover: "#1A1A1A",
  border: "rgba(255,255,255,0.08)",
  text: "#ECECEC",
  textSecondary: "#B4B4B4",
  textMuted: "#8E8E8E",
  accent: "#10A37F",
  accentBg: "rgba(16, 163, 127, 0.15)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.15)",
};

const RELATIONSHIP_OPTIONS: {
  value: RelationshipContextType;
  label: string;
}[] = [
  { value: "dating", label: "Dating" },
  { value: "romantic", label: "Partner" },
  { value: "work", label: "Work" },
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

const CONTEXT_ANCHOR_OPTIONS: {
  type: ContextAnchorType;
  label: string;
  placeholder: string;
}[] = [
  { type: "workplace", label: "Workplace or industry", placeholder: "e.g. Tech startup, Hospital" },
  { type: "school", label: "School", placeholder: "e.g. UCLA, Local high school" },
  { type: "dating_app", label: "Dating app you met on", placeholder: "e.g. Hinge, Bumble" },
  { type: "username", label: "Known username or handle", placeholder: "e.g. @handle" },
];

interface DeepSearchSuggestionCardProps {
  messageId: string;
  initialState?: DeepSearchSuggestionState;
  existingPersonContextId?: string;
  searchResult?: DeepSearchResultMessage["searchResult"];
  errorMessage?: string;
  onRunDeepSearch: (personContextId: string) => void;
  onDismiss: () => void;
  onUpdateState: (state: DeepSearchSuggestionState) => void;
}

export const DeepSearchSuggestionCard = memo(function DeepSearchSuggestionCard({
  messageId,
  initialState = "collapsed",
  existingPersonContextId,
  searchResult,
  errorMessage,
  onRunDeepSearch,
  onDismiss,
  onUpdateState,
}: DeepSearchSuggestionCardProps) {
  const createPersonContext = usePersonContextStore((s) => s.createPersonContext);
  const getPersonContextById = usePersonContextStore((s) => s.getPersonContextById);
  const setActiveLoopPersonContext = useLoopsStore((s) => s.setActiveLoopPersonContext);

  // Card state
  const [cardState, setCardState] = useState<DeepSearchSuggestionState>(initialState);

  // Form state
  const [name, setName] = useState("");
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContextType | null>(null);
  const [location, setLocation] = useState("");
  const [selectedAnchorType, setSelectedAnchorType] = useState<ContextAnchorType | null>(null);
  const [anchorValue, setAnchorValue] = useState("");
  const [showBoost, setShowBoost] = useState(false);
  const [knownUsername, setKnownUsername] = useState("");
  const [approximateAge, setApproximateAge] = useState("");
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>(undefined);

  const isFormValid = name.trim().length > 0 && relationshipContext !== null;

  // Get existing person context if available
  const existingPersonContext = existingPersonContextId
    ? getPersonContextById(existingPersonContextId)
    : null;

  // Handle expand to input form
  const handleRunDeepSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (existingPersonContext) {
      // Skip input form and run deep search directly
      setCardState("running");
      onUpdateState("running");
      onRunDeepSearch(existingPersonContext.id);
    } else {
      // Show input form
      setCardState("input");
      onUpdateState("input");
    }
  }, [existingPersonContext, onRunDeepSearch, onUpdateState]);

  // Handle dismiss
  const handleNotNow = useCallback(() => {
    Haptics.selectionAsync();
    onDismiss();
  }, [onDismiss]);

  // Handle image picker
  const handlePickImage = async () => {
    Haptics.selectionAsync();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Handle form submit
  const handleStartDeepSearch = useCallback(() => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    const deepSearchContext: {
      location?: string;
      contextAnchor?: { type: ContextAnchorType; value: string };
      knownUsername?: string;
      approximateAge?: string;
      profileImageUri?: string;
    } = {};

    if (location.trim()) {
      deepSearchContext.location = location.trim();
    }
    if (selectedAnchorType && anchorValue.trim()) {
      deepSearchContext.contextAnchor = {
        type: selectedAnchorType,
        value: anchorValue.trim(),
      };
    }
    if (knownUsername.trim()) {
      deepSearchContext.knownUsername = knownUsername.trim();
    }
    if (approximateAge.trim()) {
      deepSearchContext.approximateAge = approximateAge.trim();
    }
    if (profileImageUri) {
      deepSearchContext.profileImageUri = profileImageUri;
    }

    const newId = createPersonContext(
      name.trim(),
      relationshipContext!,
      undefined,
      Object.keys(deepSearchContext).length > 0 ? deepSearchContext : undefined
    );

    setActiveLoopPersonContext(newId);
    setCardState("running");
    onUpdateState("running");
    onRunDeepSearch(newId);
  }, [
    isFormValid,
    name,
    relationshipContext,
    location,
    selectedAnchorType,
    anchorValue,
    knownUsername,
    approximateAge,
    profileImageUri,
    createPersonContext,
    setActiveLoopPersonContext,
    onUpdateState,
    onRunDeepSearch,
  ]);

  // Handle retry
  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (existingPersonContextId) {
      setCardState("running");
      onUpdateState("running");
      onRunDeepSearch(existingPersonContextId);
    } else {
      setCardState("input");
      onUpdateState("input");
    }
  }, [existingPersonContextId, onRunDeepSearch, onUpdateState]);

  // Handle edit details
  const handleEditDetails = useCallback(() => {
    Haptics.selectionAsync();
    setCardState("input");
    onUpdateState("input");
  }, [onUpdateState]);

  // Render collapsed suggestion card
  if (cardState === "collapsed") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify()}
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          marginVertical: 8,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.accentBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="search" size={16} color={COLORS.accent} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
            Deep Search this person?
          </Text>
        </View>

        {/* Body */}
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 20 }}>
          If you want, I can pull up what is publicly visible so you can explore it yourself.
        </Text>

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={handleRunDeepSearch}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: COLORS.accent,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
              Run Deep Search
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNotNow}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: COLORS.surface,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.textSecondary }}>
              Not now
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // Render input form
  if (cardState === "input") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
        style={{
          marginVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
              Deep Search
            </Text>
          </View>
          <Pressable onPress={handleNotNow} hitSlop={12}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </Pressable>
        </View>

        {/* Profile Image Picker */}
        <View style={{ marginBottom: 20, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3, alignSelf: "flex-start" }}>
            Profile photo
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10, alignSelf: "flex-start" }}>
            Add a photo to help with visual matching.
          </Text>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => ({
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: profileImageUri ? "transparent" : COLORS.surface,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {profileImageUri ? (
              <Image
                source={{ uri: profileImageUri }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Ionicons name="camera-outline" size={24} color={COLORS.textMuted} />
                <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Add photo</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Name (required) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
            Name<Text style={{ color: COLORS.textMuted }}> *</Text>
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
            Use the name they go by publicly.
          </Text>
          <TextInput
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: COLORS.text,
            }}
            placeholder="Their name"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Relationship (required) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
            Relationship<Text style={{ color: COLORS.textMuted }}> *</Text>
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
            How do you know them?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {RELATIONSHIP_OPTIONS.map((option) => {
              const isSelected = relationshipContext === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRelationshipContext(option.value);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                  }}
                >
                  <Text style={{ fontSize: 13, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Location (optional) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
            Location
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
            City or area they are usually in.
          </Text>
          <TextInput
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: COLORS.text,
            }}
            placeholder="e.g. Los Angeles, NYC"
            placeholderTextColor={COLORS.textMuted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Context anchor (optional - select ONE) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
            One detail that might help
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
            Just one thing that could help narrow results.
          </Text>
          <View style={{ gap: 6 }}>
            {CONTEXT_ANCHOR_OPTIONS.map((option) => {
              const isSelected = selectedAnchorType === option.type;
              return (
                <Pressable
                  key={option.type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (isSelected) {
                      setSelectedAnchorType(null);
                      setAnchorValue("");
                    } else {
                      setSelectedAnchorType(option.type);
                    }
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: isSelected ? COLORS.accentBg : COLORS.surface,
                  }}
                >
                  <Text style={{ fontSize: 13, color: isSelected ? COLORS.accent : COLORS.textSecondary }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedAnchorType && (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: COLORS.text,
                }}
                placeholder={CONTEXT_ANCHOR_OPTIONS.find(o => o.type === selectedAnchorType)?.placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={anchorValue}
                onChangeText={setAnchorValue}
              />
            </View>
          )}
        </View>

        {/* Optional boost (collapsed by default) */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowBoost(!showBoost);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            marginBottom: showBoost ? 10 : 0,
          }}
        >
          <Ionicons
            name={showBoost ? "chevron-down" : "chevron-forward"}
            size={16}
            color={COLORS.textMuted}
          />
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 4 }}>
            Additional details (optional)
          </Text>
        </Pressable>

        {showBoost && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
                Known username
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                A handle you know they use.
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: COLORS.text,
                }}
                placeholder="@username"
                placeholderTextColor={COLORS.textMuted}
                value={knownUsername}
                onChangeText={setKnownUsername}
              />
            </View>
            <View>
              <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 3 }}>
                Approximate age
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                Used only to narrow public matches.
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: COLORS.text,
                }}
                placeholder="e.g. Late 20s, Mid 30s"
                placeholderTextColor={COLORS.textMuted}
                value={approximateAge}
                onChangeText={setApproximateAge}
              />
            </View>
          </View>
        )}

        {/* Start Deep Search button */}
        <Pressable
          onPress={handleStartDeepSearch}
          disabled={!isFormValid}
          style={({ pressed }) => ({
            backgroundColor: isFormValid ? COLORS.accent : COLORS.surface,
            paddingVertical: 14,
            borderRadius: 10,
            marginTop: 8,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{
            fontSize: 15,
            fontWeight: "600",
            color: isFormValid ? "#fff" : COLORS.textMuted,
            textAlign: "center"
          }}>
            Start Deep Search
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  // Render running state
  if (cardState === "running") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
      >
        <DeepSearchLoading />
      </Animated.View>
    );
  }

  // Render error state
  if (cardState === "error") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
        style={{
          backgroundColor: COLORS.background,
          borderRadius: 16,
          padding: 16,
          marginVertical: 8,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.errorBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
            Deep Search is not available right now
          </Text>
        </View>

        {/* Body */}
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 20 }}>
          {errorMessage || "Web search did not run successfully. Please try again."}
        </Text>

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: COLORS.accent,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
              Try again
            </Text>
          </Pressable>
          <Pressable
            onPress={handleEditDetails}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: COLORS.surface,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.textSecondary }}>
              Edit details
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // Render results state
  if (cardState === "results" && searchResult) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
      >
        <DeepSearchResultBubble result={searchResult} showSafetyResources={false} />
      </Animated.View>
    );
  }

  // Fallback (should not happen)
  return null;
});
